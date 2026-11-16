/** Scene.order is local to its narrative node, never a project-wide reading position. */
export interface OrderedNarrativeNode {
  id: string;
  parentId: string | null;
  title: string;
  order: number;
}
interface OrderedScene {
  id: string;
  title: string;
  order: number;
  nodeId: string | null;
}
function compare(
  a: { id: string; title: string; order: number },
  b: { id: string; title: string; order: number },
) {
  return (
    a.order - b.order ||
    a.title.localeCompare(b.title, "fr") ||
    a.id.localeCompare(b.id)
  );
}

/** Depth-first narrative order: direct scenes, then children in their authored order.
 * Missing parents and malformed legacy cycles remain readable, once, after valid roots.
 * Unassigned scenes follow the narrative. Original records and their local orders are untouched.
 */
export function orderNarrativeScenes<T extends OrderedScene>(
  scenes: T[],
  nodes: OrderedNarrativeNode[],
): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string | null, OrderedNarrativeNode[]>();
  const sceneGroups = new Map<string | null, T[]>();
  for (const node of nodes) {
    const siblings = children.get(node.parentId) || [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const group of children.values()) group.sort(compare);
  for (const scene of scenes) {
    const group = sceneGroups.get(scene.nodeId) || [];
    group.push(scene);
    sceneGroups.set(scene.nodeId, group);
  }
  for (const group of sceneGroups.values()) group.sort(compare);
  const result: T[] = [],
    visited = new Set<string>();
  // Iterative traversal also tolerates deeply nested imported structures.
  function visit(roots: OrderedNarrativeNode[]) {
    const stack = [...roots].reverse();
    while (stack.length) {
      const node = stack.pop()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push(...(sceneGroups.get(node.id) || []));
      const nested = children.get(node.id) || [];
      for (let index = nested.length - 1; index >= 0; index--)
        stack.push(nested[index]);
    }
  }
  visit(children.get(null) || []);
  visit(
    nodes
      .filter((node) => node.parentId && !byId.has(node.parentId))
      .sort(compare),
  );
  visit([...nodes].sort(compare));
  result.push(
    ...scenes
      .filter((scene) => !scene.nodeId || !byId.has(scene.nodeId))
      .sort(compare),
  );
  return result;
}
