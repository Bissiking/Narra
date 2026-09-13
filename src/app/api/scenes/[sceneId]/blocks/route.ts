import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

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
      include: {
        character: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            alias: true,
            nameColor: true,
            portraitUrl: true,
            images: {
              select: {
                emotion: true,
                url: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { sceneId: string } }
) {
  try {
    const scene = await db.scene.findUnique({ where: { id: params.sceneId }, select: { projectId: true } });
    if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
    const access = await requireProjectAccess(request, scene.projectId, true);
    if (access instanceof NextResponse) return access;

    const { blocks } = await request.json();

    // Delete existing blocks and recreate
    await db.sceneBlock.deleteMany({
      where: { sceneId: params.sceneId },
    });

    if (blocks && blocks.length > 0) {
      await db.sceneBlock.createMany({
        data: blocks.map((block: any) => ({
          sceneId: params.sceneId,
          type: block.type,
          content: block.content,
          order: block.order,
          characterId: block.characterId || null,
          emotion: block.emotion || null,
          position: block.position || null,
          speakerNote: block.speakerNote || null,
          mediaUrl: block.mediaUrl || null,
          audioAction: block.audioAction || null,
          volume: typeof block.volume === "number" ? Math.max(0, Math.min(100, block.volume)) : null,
          fadeDuration: typeof block.fadeDuration === "number" ? Math.max(0, Math.min(30, block.fadeDuration)) : null,
          loop: typeof block.loop === "boolean" ? block.loop : null,
        })),
      });
    }

    // Update word count
    const allBlocks = await db.sceneBlock.findMany({
      where: { sceneId: params.sceneId },
    });

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

    return NextResponse.json({ ok: true, wordCount });
  } catch (error) {
    console.error("Error saving blocks:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des blocs" },
      { status: 500 }
    );
  }
}
