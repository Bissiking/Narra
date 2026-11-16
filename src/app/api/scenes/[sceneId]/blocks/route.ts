import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { createSceneBlockSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { saveBlocksSchema, blockInclude, persistSceneBlocks, EditorConflict } from "@/lib/scene-block-persistence";

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
    if(data.audioStartBlockId&&!await db.sceneBlock.findFirst({where:{id:data.audioStartBlockId,sceneId:params.sceneId,type:{not:"music"}}}))return NextResponse.json({error:"Plan musical invalide"},{status:400});
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
    const result=await db.$transaction(tx=>persistSceneBlocks(tx,params.sceneId,scene.projectId,blocks),{isolationLevel:'Serializable',timeout:30000});
    const allBlocks=result.blocks;
    const wordCount=allBlocks.reduce((n,b)=>n+(['music','sfx','background'].includes(b.type)?0:b.content.split(/\s+/).filter(Boolean).length),0);
    return NextResponse.json({ ok: true, wordCount, blocks: allBlocks });
  } catch (error) {
    if(error instanceof EditorConflict)return NextResponse.json({error:error.message},{status:409});
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
