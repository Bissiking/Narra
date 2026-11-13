const TEXT_TYPES = new Set(["heading", "action", "dialogue", "narration", "note", "transition"]);

export function timelineTypeForTrack(track: string) {
  return ({video: "action", dialogue: "dialogue", action: "action", note: "note"} as Record<string, string>)[track] || null;
}

export function canConvertTimelineBlock(from: string, to: string) {
  return from !== to && TEXT_TYPES.has(from) && TEXT_TYPES.has(to);
}
