import {
  buildCompositePlans,
  type ComposableSceneBlock,
} from "./scene-composition";
export interface MusicBlock extends ComposableSceneBlock {
  audioAction?: string | null;
  audioStartBlockId?: string | null;
  audioGroupId?: string | null;
  mediaUrl?: string | null;
  loop?: boolean | null;
  volume?: number | null;
  fadeDuration?: number | null;
  content?: string;
}
export interface MusicCue<T> {
  id: string;
  planIndex: number;
  tracks: T[];
  stop: boolean;
}
/** Existing unanchored music remains a scene-wide playlist; new groups have explicit plan cues. */
export function buildMusicCues<T extends MusicBlock>(
  blocks: T[],
): MusicCue<T>[] {
  const plans = buildCompositePlans(blocks),
    positions = new Map(
      plans.flatMap((plan, index) =>
        plan.blocks.map((block) => [block.id, index] as const),
      ),
    );
  const cues = new Map<string, MusicCue<T>>();
  for (const block of blocks.filter((block) => block.type === "music")) {
    const id =
      block.audioGroupId ||
      (block.audioAction === "stop" ? block.id : "legacy");
    let cue = cues.get(id);
    if (!cue) {
      cue = {
        id,
        planIndex: block.audioStartBlockId
          ? (positions.get(block.audioStartBlockId) ?? 0)
          : 0,
        tracks: [],
        stop: block.audioAction === "stop",
      };
      cues.set(id, cue);
    }
    cue.tracks.push(block);
  }
  return [...cues.values()].sort((a, b) => a.planIndex - b.planIndex);
}
export function activeMusicCue<T extends MusicBlock>(
  blocks: T[],
  planIndex: number,
) {
  return (
    buildMusicCues(blocks)
      .filter((cue) => cue.planIndex <= planIndex)
      .at(-1) || null
  );
}
export function musicTracksAt<T extends MusicBlock>(
  cues: MusicCue<T>[],
  planIndex: number,
): T[] {
  const cue = cues.filter((cue) => cue.planIndex <= planIndex).at(-1);
  return cue && !cue.stop
    ? cue.tracks.filter(
        (track) => track.mediaUrl && track.audioAction !== "stop",
      )
    : [];
}

export function activeMusicTracks<T extends MusicBlock>(
  blocks: T[],
  planIndex: number,
): T[] {
  return musicTracksAt(buildMusicCues(blocks), planIndex);
}
