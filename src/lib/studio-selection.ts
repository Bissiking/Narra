import {
  buildCompositePlans,
  type ComposableSceneBlock,
} from "./scene-composition";
export interface SelectableBlock extends ComposableSceneBlock {
  order: number;
  audioStartBlockId?: string | null;
  audioGroupId?: string | null;
}
export function selectedBlockIds<T extends SelectableBlock>(
  blocks: T[],
  current: string[],
  anchor: string | null,
  target: string,
  range = false,
  toggle = false,
) {
  const index = blocks.findIndex((block) => block.id === target),
    start = blocks.findIndex((block) => block.id === anchor);
  if (index < 0) return current;
  const wanted =
    range && start >= 0
      ? blocks
          .slice(Math.min(start, index), Math.max(start, index) + 1)
          .map((block) => block.id)
      : [target];
  const expanded = new Set(wanted);
  for (const plan of buildCompositePlans(blocks))
    if (expanded.has(plan.lead.id))
      for (const block of plan.blocks) expanded.add(block.id);
  for (const block of blocks)
    if (
      block.type === "music" &&
      block.audioStartBlockId &&
      expanded.has(block.audioStartBlockId)
    )
      expanded.add(block.id);
  if (toggle) {
    const next = new Set(current);
    const remove = [...expanded].every((id) => next.has(id));
    for (const id of expanded) remove ? next.delete(id) : next.add(id);
    return blocks
      .filter((block) => next.has(block.id))
      .map((block) => block.id);
  }
  return blocks
    .filter((block) => expanded.has(block.id))
    .map((block) => block.id);
}
export function cloneSelection<T extends SelectableBlock>(
  blocks: T[],
  makeId: () => string,
  anchor: string | null = null,
): T[] {
  const ids = new Map(blocks.map((block) => [block.id, makeId()])),
    groups = new Map<string, string>();
  return blocks.map((block) => {
    if (block.audioGroupId && !groups.has(block.audioGroupId))
      groups.set(block.audioGroupId, makeId());
    return {
      ...structuredClone(block),
      id: ids.get(block.id)!,
      audioStartBlockId: block.audioStartBlockId
        ? ids.get(block.audioStartBlockId) || anchor
        : null,
      audioGroupId: block.audioGroupId ? groups.get(block.audioGroupId)! : null,
    };
  });
}
export function repairAudioAnchors<T extends SelectableBlock>(
  blocks: T[],
): T[] {
  const ids = new Set(
    blocks.filter((block) => block.type !== "music").map((block) => block.id),
  );
  const first = blocks.find((block) => block.type !== "music")?.id || null;
  return blocks.map((block) =>
    block.audioStartBlockId && !ids.has(block.audioStartBlockId)
      ? { ...block, audioStartBlockId: first }
      : block,
  );
}
