import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { updateSceneBlockSchema } from "@/lib/validations";

const blockInclude = {
  character: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      alias: true,
      nameColor: true,
      portraitUrl: true,
      images: {
        select: { id: true, label: true, emotion: true, url: true },
        orderBy: { order: "asc" as const },
      },
    },
  },
};

async function refreshWordCount(sceneId: string) {
  const blocks = await db.sceneBlock.findMany({ where: { sceneId }, select: { type: true, content: true } });
  const wordCount = blocks.reduce((total, block) =>
    block.type === "music" || block.type === "sfx" || block.type === "background"
      ? total
      : total + block.content.split(/\s+/).filter(Boolean).length, 0);
  await db.scene.update({ where: { id: sceneId }, data: { wordCount } });
}

type Context = { params: { sceneId: string; blockId: string } };

async function writableScene(request: NextRequest, sceneId: string) {
  const scene = await db.scene.findUnique({ where: { id: sceneId }, select: { projectId: true } });
  if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
  const access = await requireProjectAccess(request, scene.projectId, true);
  if (access instanceof NextResponse) return access;
  return scene;
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const scene = await writableScene(request, params.sceneId);
    if (scene instanceof NextResponse) return scene;
    const data = updateSceneBlockSchema.omit({ order: true }).parse(await request.json());

    if (data.characterId === "__unknown__") {
      data.characterId = null;
      if (!data.speakerNote) data.speakerNote = "Inconnu";
    } else if (data.characterId) {
      const character = await db.character.findFirst({
        where: { id: data.characterId, projectId: scene.projectId, deletedAt: null },
        select: { id: true },
      });
      if (!character) return NextResponse.json({ error: "Personnage invalide" }, { status: 400 });
    }

    const exists = await db.sceneBlock.findFirst({
      where: { id: params.blockId, sceneId: params.sceneId },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Bloc introuvable" }, { status: 404 });

    const block = await db.sceneBlock.update({
      where: { id: params.blockId },
      data,
      include: blockInclude,
    });
    await refreshWordCount(params.sceneId);
    return NextResponse.json(block);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Error updating block:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer le bloc" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const scene = await writableScene(request, params.sceneId);
    if (scene instanceof NextResponse) return scene;
    const block = await db.sceneBlock.findFirst({
      where: { id: params.blockId, sceneId: params.sceneId },
      select: { id: true, order: true },
    });
    if (!block) return NextResponse.json({ error: "Bloc introuvable" }, { status: 404 });

    await db.$transaction([
      db.sceneBlock.delete({ where: { id: block.id } }),
      db.sceneBlock.updateMany({
        where: { sceneId: params.sceneId, order: { gt: block.order } },
        data: { order: { decrement: 1 } },
      }),
    ]);
    await refreshWordCount(params.sceneId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting block:", error);
    return NextResponse.json({ error: "Impossible de supprimer le bloc" }, { status: 500 });
  }
}
