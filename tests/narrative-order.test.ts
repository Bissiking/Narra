import test from "node:test";
import assert from "node:assert/strict";
import {
  orderNarrativeScenes,
  type OrderedNarrativeNode,
} from "../src/lib/narrative-order";
const node = (
  id: string,
  parentId: string | null,
  order: number,
): OrderedNarrativeNode => ({ id, parentId, order, title: id });
const scene = (id: string, nodeId: string | null, order: number) => ({
  id,
  nodeId,
  order,
  title: id,
  blocks: [{ id: "block-" + id }],
});
const ids = (scenes: ReturnType<typeof scene>[]) =>
  scenes.map((scene) => scene.id);
const nodes = [
  node("season", null, 0),
  node("intro", "season", 0),
  node("ep1", "season", 1),
  node("ep2", "season", 2),
  node("ep3", "season", 3),
  node("ep4", "season", 4),
  node("ep4-b2", "ep4", 1),
  node("ep4-b3", "ep4", 2),
  node("ep4-b1", "ep4", 0),
];
test("global local-order sorting reproduces episode interleaving; hierarchy keeps full episodes together", () => {
  const scenes = [
    scene("ep4-a", "ep4", 0),
    scene("ep2-a", "ep2", 1),
    scene("ep4-b", "ep4", 1),
    scene("ep2-b", "ep2", 2),
    scene("ep1-a", "ep1", 8),
    scene("intro-a", "intro", 99),
    scene("ep3-a", "ep3", 0),
  ];
  assert.deepEqual(
    ids([...scenes].sort((a, b) => a.order - b.order)).slice(0, 4),
    ["ep4-a", "ep3-a", "ep2-a", "ep4-b"],
  );
  assert.deepEqual(ids(orderNarrativeScenes(scenes, nodes)), [
    "intro-a",
    "ep1-a",
    "ep2-a",
    "ep2-b",
    "ep3-a",
    "ep4-a",
    "ep4-b",
  ]);
});
test("all Episode 4 B3 scenes stay after B2, before the next episode despite reset orders", () => {
  const tree = [...nodes, node("ep5", "season", 5)];
  const scenes = [
    scene("b3-second", "ep4-b3", 1),
    scene("ep5", "ep5", 0),
    scene("b2-first", "ep4-b2", 0),
    scene("b1-last", "ep4-b1", 10),
    scene("b3-first", "ep4-b3", 0),
    scene("b2-second", "ep4-b2", 1),
  ];
  assert.deepEqual(ids(orderNarrativeScenes(scenes, tree)), [
    "b1-last",
    "b2-first",
    "b2-second",
    "b3-first",
    "b3-second",
    "ep5",
  ]);
});
test("authored node order wins over episode numbers and titles", () => {
  const tree = [node("Épisode 4", null, 0), node("Épisode 2", null, 1)];
  assert.deepEqual(
    ids(
      orderNarrativeScenes(
        [scene("two", "Épisode 2", 0), scene("four", "Épisode 4", 9)],
        tree,
      ),
    ),
    ["four", "two"],
  );
});
test("each season completes before the next and direct scenes precede its nested sections", () => {
  const tree = [
    node("s2", null, 1),
    node("s2-e1", "s2", 0),
    node("s1", null, 0),
    node("s1-e2", "s1", 1),
    node("s1-e1", "s1", 0),
    node("s1-e1-b1", "s1-e1", 0),
  ];
  const scenes = tree.map((n) => scene(n.id, n.id, 0)).reverse();
  assert.deepEqual(ids(orderNarrativeScenes(scenes, tree)), [
    "s1",
    "s1-e1",
    "s1-e1-b1",
    "s1-e2",
    "s2",
    "s2-e1",
  ]);
});
test("missing or deleted nodes, orphan parents and cycles do not drop or duplicate scenes", () => {
  const tree = [
    node("root", null, 0),
    node("orphan", "deleted-parent", 0),
    node("cycle-a", "cycle-b", 0),
    node("cycle-b", "cycle-a", 0),
  ];
  const scenes = [
    scene("free", null, 0),
    scene("gone", "missing", 2),
    scene("a", "cycle-a", 0),
    scene("b", "cycle-b", 0),
    scene("orphan", "orphan", 0),
    scene("root", "root", 0),
  ];
  const result = orderNarrativeScenes(scenes, tree);
  assert.deepEqual(ids(result), ["root", "orphan", "a", "b", "free", "gone"]);
  assert.equal(new Set(ids(result)).size, scenes.length);
  assert.deepEqual(
    ids(orderNarrativeScenes(scenes, [])),
    ids(
      [...scenes].sort(
        (a, b) =>
          a.order - b.order ||
          a.title.localeCompare(b.title, "fr") ||
          a.id.localeCompare(b.id),
      ),
    ),
  );
});
test("ties are deterministic, inputs untouched and block identities stay valid for checkpoints", () => {
  const a = { ...scene("z", "ep2", 0), title: "Même nom" },
    b = { ...scene("a", "ep2", 0), title: "Même nom" };
  const scenes = [a, b],
    tree = [...nodes].reverse(),
    before = structuredClone({ scenes, tree });
  const result = orderNarrativeScenes(scenes, tree);
  assert.deepEqual(ids(result), ["a", "z"]);
  assert.strictEqual(result[0], b);
  assert.strictEqual(result[0].blocks, b.blocks);
  assert.deepEqual({ scenes, tree }, before);
  assert.deepEqual(
    ids(orderNarrativeScenes([...scenes].reverse(), [...tree].reverse())),
    ["a", "z"],
  );
});
test("deep legacy nesting is traversed without a recursive stack overflow", () => {
  const tree = Array.from({ length: 12000 }, (_, i) =>
    node("n" + i, i ? "n" + (i - 1) : null, 0),
  );
  assert.deepEqual(
    ids(orderNarrativeScenes([scene("last", "n11999", 0)], tree)),
    ["last"],
  );
});
