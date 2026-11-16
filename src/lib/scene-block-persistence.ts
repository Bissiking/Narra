import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createSceneBlockSchema } from "./validations";
export const saveBlocksSchema = z.object({
  blocks: z
    .array(
      createSceneBlockSchema.extend({
        id: z.string().max(100).optional(),
        showPortrait: z.boolean().nullish(),
      }),
    )
    .max(10000),
});
export const blockInclude = {
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
export class EditorConflict extends Error {}
export function countWords(blocks: { type: string; content: string }[]) {
  return blocks.reduce(
    (total, block) =>
      total +
      (["music", "sfx", "background"].includes(block.type)
        ? 0
        : block.content.split(/\s+/).filter(Boolean).length),
    0,
  );
}
export async function persistSceneBlocks(
  tx: Prisma.TransactionClient,
  sceneId: string,
  projectId: string,
  blocks: z.infer<typeof saveBlocksSchema>["blocks"],
) {
  const existing = await tx.sceneBlock.findMany({
      where: { sceneId },
      select: { id: true },
    }),
    existingIds = new Set(existing.map((block) => block.id));
  const supplied = blocks
    .map((block) => block.id)
    .filter((id): id is string => !!id);
  if (new Set(supplied).size !== supplied.length)
    throw new EditorConflict("Un élément est présent plusieurs fois.");
  const characters = [
    ...new Set(
      blocks
        .map((block) => block.characterId)
        .filter((id): id is string => !!id && id !== "__unknown__"),
    ),
  ];
  if (
    characters.length !==
    (await tx.character.count({
      where: { id: { in: characters }, projectId, deletedAt: null },
    }))
  )
    throw new EditorConflict("Un personnage n’appartient pas à ce projet.");
  for (const id of supplied)
    if (!id.startsWith("temp-") && !existingIds.has(id))
      throw new EditorConflict(
        "La scène a changé. Rechargez avant de réessayer.",
      );
  const ids = new Map(
    blocks
      .filter((block) => block.id)
      .map((block) => [
        block.id!,
        existingIds.has(block.id!) ? block.id! : randomUUID(),
      ]),
  );
  const retained = blocks
    .map((block) => ids.get(block.id || ""))
    .filter((id): id is string => !!id && existingIds.has(id));
  await tx.sceneBlock.deleteMany({
    where: { sceneId, id: { notIn: retained } },
  });
  for (const [order, block] of blocks.entries()) {
    const { id: ignored, ...fields } = block;
    const anchor = block.audioStartBlockId
      ? ids.get(block.audioStartBlockId)
      : null;
    if (
      block.audioStartBlockId &&
      (!anchor ||
        !blocks.some(
          (item) =>
            item.id === block.audioStartBlockId && item.type !== "music",
        ))
    )
      throw new EditorConflict("Le plan de départ musical est introuvable.");
    const data = {
      ...fields,
      order,
      characterId:
        block.characterId === "__unknown__" ? null : block.characterId || null,
      speakerNote:
        block.characterId === "__unknown__"
          ? block.speakerNote || "Inconnu"
          : block.speakerNote || null,
      showPortrait: block.showPortrait !== false,
      animationConfig: (block.animationConfig ?? []) as Prisma.InputJsonValue,
      audioStartBlockId: anchor || null,
    };
    const id = ids.get(block.id || "") || randomUUID();
    if (existingIds.has(id))
      await tx.sceneBlock.update({ where: { id }, data });
    else await tx.sceneBlock.create({ data: { ...data, id, sceneId } });
  }
  await tx.scene.update({
    where: { id: sceneId },
    data: { wordCount: countWords(blocks) },
  });
  return {
    ids,
    blocks: await tx.sceneBlock.findMany({
      where: { sceneId },
      include: blockInclude,
      orderBy: { order: "asc" },
    }),
  };
}
