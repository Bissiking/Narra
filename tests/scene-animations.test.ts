import assert from "node:assert/strict";
import { test } from "node:test";
import { animationConfigSchema, animationFrames, animationIds, animationTiming, createAnimationTrack, getAnimationTracks } from "../src/lib/scene-animations";

test("all requested effects produce animatable frames and validated tracks", () => {
  assert.equal(animationIds.length, 38);
  for (const effect of animationIds) {
    const track = createAnimationTrack(effect);
    assert.ok(animationConfigSchema.safeParse([track]).success, effect);
    const frames = animationFrames(track);
    assert.ok(frames.length >= 2, effect);
    assert.ok(frames.every((f) => Object.keys(f).length > 0), effect);
  }
});
test("entry is one-shot, continuous loops or repeats with adjusted speed and delay", () => {
  const t = createAnimationTrack("fade-in", "entry");
  t.repeat = "loop";
  assert.equal(animationTiming(t).iterations, 1);
  t.behavior = "continuous"; t.speed = "custom"; t.rate = 2; t.delay = 700;
  assert.equal(animationTiming(t).iterations, Infinity);
  assert.equal(animationTiming(t).duration, t.duration / 2);
  assert.equal(animationTiming(t).delay, 700);
  t.repeat = 3;
  assert.equal(animationTiming(t).iterations, 3);
});
test("legacy presets retain deterministic identity and movement direction", () => {
  assert.deepEqual(getAnimationTracks(undefined, "fade-in"), getAnimationTracks(undefined, "fade-in"));
  assert.equal(getAnimationTracks([], "drift-up")[0].direction, "up");
  assert.equal(getAnimationTracks([], "pan-right-left")[0].direction, "left");
  assert.deepEqual(getAnimationTracks([], "none"), []);
});
test("fade in and delayed fade out coexist and invalid parameters are rejected", () => {
  const fadeIn = createAnimationTrack("fade-in", "entry");
  const fadeOut = { ...createAnimationTrack("fade-out", "entry"), delay: 3000 };
  const tracks = [fadeIn, fadeOut, createAnimationTrack("rain")];
  assert.deepEqual(getAnimationTracks(tracks), tracks);
  assert.equal(animationTiming(fadeOut).delay, 3000);
  assert.equal(animationConfigSchema.safeParse([{ ...fadeIn, intensity: 101 }]).success, false);
  assert.equal(animationConfigSchema.safeParse([{ ...fadeIn, effect: "unknown" }]).success, false);
  assert.equal(animationConfigSchema.safeParse(Array(25).fill(fadeIn)).success, false);
});
