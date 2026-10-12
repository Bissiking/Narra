export interface StudioNode {
  id: string; type: string; title: string; order: number; children: StudioNode[];
}
export interface StudioScene {
  id: string; title: string; order: number; node: { id: string; title: string } | null;
}
export interface StudioGroup<T extends StudioScene> {
  id: string; title: string; nodeId: string | null; scenes: T[]; children: StudioGroup<T>[];
}
export interface StudioEpisode<T extends StudioScene> {
  id: string; title: string; path: string[]; groups: StudioGroup<T>[]; scenes: T[];
}
const compare = (a: {order: number; title: string}, b: {order: number; title: string}) => a.order - b.order || a.title.localeCompare(b.title, 'fr');

/** Uses existing node/scene identities; never infers structure from scene titles. */
export function buildStudioEpisodes<T extends StudioScene>(nodes: StudioNode[], scenes: T[]): StudioEpisode<T>[] {
  const episodes: StudioEpisode<T>[] = [];
  const assigned = new Set<string>();
  const descendants = (node: StudioNode): StudioGroup<T> => {
    const direct = scenes.filter(s => s.node?.id === node.id).sort(compare);
    direct.forEach(s => assigned.add(s.id));
    return { id: node.id, title: node.title, nodeId: node.id, scenes: direct,
      children: [...node.children].sort(compare).filter(n => n.type !== 'episode').map(descendants) };
  };
  const collect = (group: StudioGroup<T>): T[] => [...group.scenes, ...group.children.flatMap(collect)];
  const visit = (node: StudioNode, path: string[]) => {
    const nextPath = [...path, node.title];
    if (node.type === 'episode') {
      const root = descendants(node);
      episodes.push({id: node.id, title: node.title, path: nextPath,
        groups: [...(root.scenes.length ? [{...root, title: 'Sans bloc', children: []}] : []), ...root.children], scenes: collect(root)});
    }
    [...node.children].sort(compare).forEach(child => visit(child, nextPath));
  };
  [...nodes].sort(compare).forEach(node => visit(node, []));
  // Older projects may have no episode nodes. Keep their actual hierarchy visible.
  const legacy = (node: StudioNode): StudioGroup<T> => ({id: node.id, title: node.title, nodeId: node.id,
    scenes: scenes.filter(s => !assigned.has(s.id) && s.node?.id === node.id).sort(compare),
    children: [...node.children].sort(compare).filter(n => n.type !== 'episode').map(legacy)});
  for (const node of [...nodes].sort(compare)) {
    if (node.type === 'episode') continue;
    const group = legacy(node); const remaining = collect(group);
    if (remaining.length) { remaining.forEach(s => assigned.add(s.id)); episodes.push({id: 'legacy-'+node.id, title: node.title, path: [node.title], groups: [group], scenes: remaining}); }
  }
  const unattached = scenes.filter(s => !assigned.has(s.id)).sort(compare);
  if (unattached.length) episodes.push({id: 'unassigned', title: 'Sans rattachement', path: [], groups: [{id: 'unassigned', title: 'Sans bloc', nodeId: null, scenes: unattached, children: []}], scenes: unattached});
  return episodes;
}

export function findStudioGroup<T extends StudioScene>(groups: StudioGroup<T>[], sceneId: string): StudioGroup<T> | undefined {
  for (const group of groups) {
    if (group.scenes.some(s => s.id === sceneId)) return group;
    const nested = findStudioGroup(group.children, sceneId);
    if (nested) return nested;
  }
}
