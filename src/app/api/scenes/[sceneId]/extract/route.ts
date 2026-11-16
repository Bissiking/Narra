import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import {
  saveBlocksSchema,
  persistSceneBlocks,
  countWords,
  EditorConflict,
  blockInclude,
} from "@/lib/scene-block-persistence";
import { repairAudioAnchors } from "@/lib/studio-selection";
const schema = saveBlocksSchema.extend({
  title: z.string().trim().min(1).max(200),
  selectedIds: z.array(z.string().max(100)).min(1).max(10000),
  baseVersions: z
    .array(
      z.object({ id: z.string().uuid(), updatedAt: z.string().datetime() }),
    )
    .max(10000),
});
export async function POST(
  request: NextRequest,
  { params }: { params: { sceneId: string } },
) {
  try {
    const original = await db.scene.findFirst({
      where: { id: params.sceneId, deletedAt: null },
    });
    if (!original)
      return NextResponse.json(
        { error: "Sous-bloc introuvable" },
        { status: 404 },
      );
    const access = await requireProjectAccess(
      request,
      original.projectId,
      true,
    );
    if (access instanceof NextResponse) return access;
    const data = schema.parse(await request.json());
    const result = await db.$transaction(
      async (tx) => {
        const source = await tx.scene.findFirst({
          where: { id: original.id, deletedAt: null },
        });
        if (!source)
          throw new EditorConflict("Ce sous-bloc a été supprimé ailleurs.");
        const current = await tx.sceneBlock.findMany({
          where: { sceneId: source.id },
          select: { id: true, updatedAt: true },
        });
        const versions = new Map(
          data.baseVersions.map((block) => [block.id, block.updatedAt]),
        );
        if (
          versions.size !== current.length ||
          current.some(
            (block) => versions.get(block.id) !== block.updatedAt.toISOString(),
          )
        )
          throw new EditorConflict(
            "Ce sous-bloc a été modifié ailleurs. Rechargez avant de déplacer la sélection.",
          );
        if (
          new Set(data.selectedIds).size !== data.selectedIds.length ||
          data.selectedIds.some(
            (id) => !data.blocks.some((block) => block.id === id),
          )
        )
          throw new EditorConflict("La sélection a changé.");
        const saved = await persistSceneBlocks(
          tx,
          source.id,
          source.projectId,
          data.blocks,
        );
        const selected = new Set(
          data.selectedIds.map((id) => saved.ids.get(id)!),
        );
        const moved = repairAudioAnchors(
          saved.blocks.filter((block) => selected.has(block.id)),
        );
        const remaining = repairAudioAnchors(
          saved.blocks.filter((block) => !selected.has(block.id)),
        );
        await tx.scene.updateMany({
          where: {
            projectId: source.projectId,
            nodeId: source.nodeId,
            deletedAt: null,
            order: { gt: source.order },
          },
          data: { order: { increment: 1 } },
        });
        const created = await tx.scene.create({
          data: {
            projectId: source.projectId,
            nodeId: source.nodeId,
            locationId: source.locationId,
            title: data.title,
            order: source.order + 1,
            wordCount: countWords(moved),
          },
        });
        for (const [order, block] of moved.entries())
          await tx.sceneBlock.update({
            where: { id: block.id },
            data: {
              sceneId: created.id,
              order,
              audioStartBlockId: block.audioStartBlockId,
            },
          });
        for (const [order, block] of remaining.entries())
          await tx.sceneBlock.update({
            where: { id: block.id },
            data: { order, audioStartBlockId: block.audioStartBlockId },
          });
        await tx.scene.update({
          where: { id: source.id },
          data: { wordCount: countWords(remaining) },
        });
        const scene = await tx.scene.findUniqueOrThrow({
          where: { id: created.id },
          include: {
            node: { select: { id: true, title: true } },
            location: true,
            characters: { include: { character: true } },
            _count: { select: { blocks: true } },
          },
        });
        return {
          scene,
          blocks: await tx.sceneBlock.findMany({
            where: { sceneId: source.id },
            include: blockInclude,
            orderBy: { order: "asc" },
          }),
          wordCount: countWords(remaining),
        };
      },
      { isolationLevel: "Serializable", timeout: 30000 },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 },
      );
    if (error instanceof EditorConflict)
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Extract failed", error);
    return NextResponse.json(
      {
        error:
          "Déplacement non enregistré. La sélection reste dans le sous-bloc d’origine.",
      },
      { status: 409 },
    );
  }
}
