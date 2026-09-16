import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { createSceneBlockSchema } from "@/lib/validations";
import { z, ZodError } from "zod";

const saveBlocksSchema = z.object({
  blocks: z.array(createSceneBlockSchema.extend({ id: z.string().max(100).optional(), showPortrait: z.boolean().nullish() })).max(10000),
});

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

export async function GET(
  request: NextRequest,
  { params }: { params: { sceneId: string } }
) {
  try {
    const scene = await db.scene.findUnique({ where: { id: params.sceneId }, select: { projectId: true } });
    if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
    const access = await requireProjectAccess(request, scene.projectId);
    if (access instanceof NextResponse) return access;

    const blocks = await db.sceneBlock.findMany({
      where: { sceneId: params.sceneId },
      include: blockInclude,
      orderBy: { order: "asc" },
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error("Error fetching blocks:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des blocs" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sceneId: string } }
) {
  try {
    const scene = await db.scene.findUnique({ where: { id: params.sceneId }, select: { projectId: true } });
    if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
    const access = await requireProjectAccess(request, scene.projectId, true);
    if (access instanceof NextResponse) return access;

    const data = createSceneBlockSchema.parse(await request.json());
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

    const block = await db.$transaction(async (tx) => {
      await tx.sceneBlock.updateMany({
        where: { sceneId: params.sceneId, order: { gte: data.order } },
        data: { order: { increment: 1 } },
      });
      return tx.sceneBlock.create({
        data: { ...data, sceneId: params.sceneId },
        include: blockInclude,
      });
    });
    await refreshWordCount(params.sceneId);
    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Error creating block:", error);
    return NextResponse.json({ error: "Impossible de créer le bloc" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sceneId: string } }
) {
  try {
    const scene = await db.scene.findUnique({ where: { id: params.sceneId }, select: { projectId: true } });
    if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
    const access = await requireProjectAccess(request, scene.projectId, true);
    if (access instanceof NextResponse) return access;

    const { blocks } = saveBlocksSchema.parse(await request.json());
    for (const block of blocks) {
      if (block.characterId === "__unknown__") {
        block.characterId = null;
        if (!block.speakerNote) block.speakerNote = "Inconnu";
      }
    }
    const existing = await db.sceneBlock.findMany({ where: { sceneId: params.sceneId }, select: { id: true } });
    const existingIds = new Set(existing.map((block) => block.id));
    const retainedIds = blocks.map((block) => block.id).filter((id): id is string => Boolean(id && existingIds.has(id)));

    await db.$transaction(async (tx) => {
      await tx.sceneBlock.deleteMany({ where: { sceneId: params.sceneId, id: { notIn: retainedIds } } });
      for (const block of blocks) {
        const data = {
          type: block.type,
          content: block.content,
          order: block.order,
          characterId: block.characterId || null,
          emotion: block.emotion || null,
          position: block.position || null,
          speakerNote: block.speakerNote || null,
          mediaUrl: block.mediaUrl || null,
          displayMode: block.displayMode || null,
          showPortrait: block.showPortrait !== false,
          portraitImageUrl: block.portraitImageUrl || null,
          audioAction: block.audioAction || null,
          volume: block.volume ?? null,
          fadeDuration: block.fadeDuration ?? null,
          loop: block.loop ?? null,
        };
        if (block.id && existingIds.has(block.id)) await tx.sceneBlock.update({ where: { id: block.id }, data });
        else await tx.sceneBlock.create({ data: { ...data, sceneId: params.sceneId } });
      }
    });

    const allBlocks = await db.sceneBlock.findMany({ where: { sceneId: params.sceneId }, include: blockInclude, orderBy: { order: "asc" } });

    const wordCount = allBlocks.reduce(
      (acc, block) =>
        block.type === "music" || block.type === "sfx" || block.type === "background"
          ? acc
          : acc + block.content.split(/\s+/).filter(Boolean).length,
      0
    );

    await db.scene.update({
      where: { id: params.sceneId },
      data: { wordCount },
    });

    return NextResponse.json({ ok: true, wordCount, blocks: allBlocks });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Error saving blocks:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des blocs" },
      { status: 500 }
    );
  }
}
