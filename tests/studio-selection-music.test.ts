import test from "node:test";
import assert from "node:assert/strict";
import {
  selectedBlockIds,
  cloneSelection,
  repairAudioAnchors,
} from "../src/lib/studio-selection";
import { activeMusicTracks, buildMusicCues, type MusicBlock } from "../src/lib/scene-music";
const b = (id: string, type = "dialogue", extra: Partial<MusicBlock> = {}) => ({
  id,
  type,
  order: 0,
  content: id,
  ...extra,
});
test("Shift selects inclusive source order, layers and anchored cues follow their plan", () => {
  const blocks = [
    b("a"),
    b("bg", "background", { displayMode: "layer" }),
    b("sfx", "sfx"),
    b("b"),
    b("c"),
    b("music", "music", { audioStartBlockId: "b" }),
  ].map((v, order) => ({ ...v, order }));
  assert.deepEqual(selectedBlockIds(blocks, ["a"], "a", "b", true), [
    "a",
    "bg",
    "sfx",
    "b",
    "music",
  ]);
  assert.deepEqual(selectedBlockIds(blocks, [], "c", "b"), [
    "bg",
    "sfx",
    "b",
    "music",
  ]);
  assert.deepEqual(
    selectedBlockIds(
      blocks,
      ["bg", "sfx", "b", "music"],
      "b",
      "b",
      false,
      true,
    ),
    [],
  );
  assert.deepEqual(selectedBlockIds(blocks, [], "c", "a", true), [
    "a",
    "bg",
    "sfx",
    "b",
    "c",
    "music",
  ]);
});
test("Pasting remaps identities, internal cues and playlist groups without mutating clipboard", () => {
  let id = 0;
  const original = [
    b("a"),
    b("m1", "music", { audioStartBlockId: "a", audioGroupId: "playlist" }),
    b("m2", "music", { audioStartBlockId: "a", audioGroupId: "playlist" }),
  ];
  const copied = cloneSelection(original, () => `temp-${++id}`);
  assert.notEqual(copied[0].id, original[0].id);
  assert.equal(copied[1].audioStartBlockId, copied[0].id);
  assert.equal(copied[1].audioGroupId, copied[2].audioGroupId);
  assert.notEqual(copied[1].audioGroupId, "playlist");
  assert.equal(original[1].id, "m1");
  assert.equal(
    cloneSelection([original[1]], () => `temp-${++id}`, "destination")[0]
      .audioStartBlockId,
    "destination",
  );
});
test("Removing an anchor repairs its cue locally to the first remaining plan", () => {
  assert.equal(
    repairAudioAnchors([
      b("a"),
      b("m", "music", { audioStartBlockId: "gone" }),
    ])[1].audioStartBlockId,
    "a",
  );
  assert.equal(
    repairAudioAnchors([b("m", "music", { audioStartBlockId: "gone" })])[0]
      .audioStartBlockId,
    null,
  );
});
test("Legacy playlists continue from the scene start, later cues replace and stop playback", () => {
  const blocks = [
    b("a"),
    b("b"),
    b("c"),
    b("d"),
    b("m1", "music", { mediaUrl: "one" }),
    b("m2", "music", { mediaUrl: "two" }),
    b("m3", "music", {
      mediaUrl: "three",
      audioStartBlockId: "b",
      audioGroupId: "new",
    }),
    b("m4", "music", {
      mediaUrl: "four",
      audioStartBlockId: "b",
      audioGroupId: "new",
    }),
    b("stop", "music", { audioAction: "stop", audioStartBlockId: "d" }),
  ];
  assert.deepEqual(
    buildMusicCues(blocks).map((c) => [c.planIndex, c.tracks.length, c.stop]),
    [
      [0, 2, false],
      [1, 2, false],
      [3, 1, true],
    ],
  );
  assert.deepEqual(
    activeMusicTracks(blocks, 0).map((b) => b.id),
    ["m1", "m2"],
  );
  assert.deepEqual(
    activeMusicTracks(blocks, 1).map((b) => b.id),
    ["m3", "m4"],
  );
  assert.deepEqual(
    activeMusicTracks(blocks, 2).map((b) => b.id),
    ["m3", "m4"],
  );
  assert.deepEqual(activeMusicTracks(blocks, 3), []);
});
test("Cue follows its plan when plans are reordered, last cue wins at the same plan", () => {
  const music = [
    b("m1", "music", {
      mediaUrl: "one",
      audioStartBlockId: "b",
      audioGroupId: "first",
    }),
    b("m2", "music", {
      mediaUrl: "two",
      audioStartBlockId: "b",
      audioGroupId: "second",
    }),
  ];
  assert.equal(buildMusicCues([b("b"), b("a"), ...music])[0].planIndex, 0);
  assert.deepEqual(activeMusicTracks([b("a"), b("b"), ...music], 0), []);
  assert.deepEqual(
    activeMusicTracks([b("a"), b("b"), ...music], 1).map((b) => b.id),
    ["m2"],
  );
});
