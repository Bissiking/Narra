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
  kind: 'episode' | 'outside' | 'legacy' | 'unassigned';
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
      episodes.push({id: node.id, title: node.title, path: nextPath, kind: 'episode',
        groups: [...(root.scenes.length ? [{...root, title: 'Sous-blocs directs', children: []}] : []), ...root.children], scenes: collect(root)});
    }
    [...node.children].sort(compare).forEach(child => visit(child, nextPath));
  };
  [...nodes].sort(compare).forEach(node => visit(node, []));
  // Older projects may have no episode nodes. Keep their actual hierarchy visible.
  const legacy = (node: StudioNode): StudioGroup<T> => ({id: node.id, title: node.title, nodeId: node.id,
    scenes: scenes.filter(s => !assigned.has(s.id) && s.node?.id === node.id).sort(compare),
    children: [...node.children].sort(compare).filter(n => n.type !== 'episode').map(legacy)});
  const hasEpisode = (node: StudioNode): boolean => node.type === 'episode' || node.children.some(hasEpisode);
  for (const node of [...nodes].sort(compare)) {
    if (node.type === 'episode') continue;
    const group = legacy(node); const remaining = collect(group);
    if (remaining.length) {
      remaining.forEach(s => assigned.add(s.id));
      const outside = hasEpisode(node);
      episodes.push({id: 'legacy-'+node.id, kind: outside ? 'outside' : 'legacy',
        title: outside ? 'Hors épisodes · '+node.title : node.title,
        path: outside ? [node.title, 'Hors épisodes'] : [node.title],
        groups: outside && !group.scenes.length ? group.children : [group], scenes: remaining});
    }
  }
  const unattached = scenes.filter(s => !assigned.has(s.id)).sort(compare);
  if (unattached.length) episodes.push({id: 'unassigned', kind: 'unassigned', title: 'Sans rattachement', path: [], groups: [{id: 'unassigned', title: 'Sans bloc', nodeId: null, scenes: unattached, children: []}], scenes: unattached});
  return episodes;
}

/** Prefer an actual episode over season-level prologues, even when that episode is empty. */
export function defaultStudioEpisode<T extends StudioScene>(episodes: StudioEpisode<T>[]) {
  return episodes.find(episode => episode.kind === 'episode') || episodes[0];
}

/** A changed scene assignment must also move its navigation context to the new episode. */
export function activeStudioEpisode<T extends StudioScene>(episodes: StudioEpisode<T>[], episodeId: string | null, sceneId: string | null) {
  return episodes.find(episode => episode.scenes.some(scene => scene.id === sceneId))
    || episodes.find(episode => episode.id === episodeId) || defaultStudioEpisode(episodes);
}

/** Library rows belong to the active episode's actual nodes, never to the whole season. */
export function studioLibraryGroups<T extends StudioScene>(episode: StudioEpisode<T> | undefined) {
  const groups: {id: string; title: string; scenes: T[]}[] = [];
  const visit = (group: StudioGroup<T>, path: string[]) => {
    const nextPath = [...path, group.title];
    if (group.scenes.length) groups.push({id: group.id,
      title: group.id === episode?.id && group.title === 'Sans bloc' ? 'Sous-blocs directs' : nextPath.join(' / '), scenes: group.scenes});
    group.children.forEach(child => visit(child, nextPath));
  };
  episode?.groups.forEach(group => visit(group, []));
  return groups;
}

export function findStudioGroup<T extends StudioScene>(groups: StudioGroup<T>[], sceneId: string): StudioGroup<T> | undefined {
  for (const group of groups) {
    if (group.scenes.some(s => s.id === sceneId)) return group;
    const nested = findStudioGroup(group.children, sceneId);
    if (nested) return nested;
  }
}
