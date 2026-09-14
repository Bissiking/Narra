export interface ComposableSceneBlock {
  id: string;
  type: string;
}

export interface CompositePlan<T extends ComposableSceneBlock> {
  id: string;
  lead: T;
  layers: T[];
  blocks: T[];
}

export const PLAN_EFFECT_TYPES = new Set(["background", "sfx"]);

export function buildCompositePlans<T extends ComposableSceneBlock>(blocks: T[]): CompositePlan<T>[] {
  const plans: CompositePlan<T>[] = [];
  let pendingLayers: T[] = [];

  blocks.filter((block) => block.type !== "music").forEach((block) => {
    if (PLAN_EFFECT_TYPES.has(block.type)) {
      pendingLayers.push(block);
      return;
    }
    plans.push({ id: `plan-${block.id}`, lead: block, layers: pendingLayers, blocks: [...pendingLayers, block] });
    pendingLayers = [];
  });

  if (pendingLayers.length > 0) {
    const last = plans.at(-1);
    if (last) {
      last.layers.push(...pendingLayers);
      last.blocks.push(...pendingLayers);
    } else {
      const lead = pendingLayers[0];
      plans.push({ id: `plan-${lead.id}`, lead, layers: pendingLayers.slice(1), blocks: pendingLayers });
    }
  }

  return plans;
}
