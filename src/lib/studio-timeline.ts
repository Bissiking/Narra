const TEXT_TYPES = new Set(["heading", "action", "dialogue", "narration", "note", "transition"]);

export type TimelineZoom = number | "fit";

/** A short, three-second plan occupies 192px at the normal working scale. */
export function timelineLayout(duration: number, availableWidth: number, zoom: TimelineZoom) {
  const extent = Math.max(20, duration);
  const available = Math.max(1, availableWidth);
  const fitScale = available / extent;
  const scale = zoom === "fit" ? fitScale : Math.max(fitScale, 64 * Math.max(.5, Math.min(3, zoom)));
  const minimumTick = 96 / scale;
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];
  const tick = steps.find(step => step >= minimumTick) || Math.ceil(minimumTick / 3600) * 3600;
  return { extent, scale, width: extent * scale, tick };
}

/** Never make a clip wider than its time slot, including in the overview. */
export function timelineClip(start: number, duration: number, scale: number) {
  const span = Math.max(0, duration * scale);
  return { left: start * scale, width: span - Math.min(4, span * .15) };
}

export function timelineTypeForTrack(track: string) {
  return ({video: "action", dialogue: "dialogue", action: "action", note: "note"} as Record<string, string>)[track] || null;
}

export function canConvertTimelineBlock(from: string, to: string) {
  return from !== to && TEXT_TYPES.has(from) && TEXT_TYPES.has(to);
}

/** Pack simultaneous clips into separate lanes; adjacent intervals reuse a lane. */
export function timelineLanes<T extends {id:string;start:number;duration:number}>(clips:T[]) {
  const ends:number[]=[];
  const items=[...clips].sort((a,b)=>a.start-b.start).map(clip=>{
    let lane=ends.findIndex(end=>end<=clip.start);
    if(lane<0)lane=ends.length;
    ends[lane]=clip.start+clip.duration;
    return {...clip,lane};
  });
  return {items,count:Math.max(1,ends.length)};
}
