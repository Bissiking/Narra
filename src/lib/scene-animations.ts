import { z } from "zod";

export const ANIMATION_GROUPS = {
  Caméra: { "zoom-in": "Zoom avant", "zoom-out": "Zoom arrière", pan: "Pan horizontal", "pan-vertical": "Pan vertical", drift: "Drift", rotation: "Rotation", "ken-burns": "Ken Burns", focus: "Focus" },
  Action: { "shake-light": "Tremblement léger", "shake-heavy": "Tremblement violent", "shake-directional": "Secousse directionnelle", recoil: "Recul", impulse: "Impulsion", vibration: "Vibration continue", sway: "Balancement" },
  Transitions: { "fade-in": "Fade in", "fade-out": "Fade out", "flash-white": "Flash blanc", "flash-black": "Flash noir", slide: "Glissement", crossfade: "Fondu enchaîné", "blur-in": "Flou entrant", "blur-out": "Flou sortant", glitch: "Glitch" },
  Cinéma: { pulse: "Pulsation lumineuse", flicker: "Scintillement", darken: "Assombrissement", saturation: "Variation de saturation", chromatic: "Aberration chromatique", "motion-blur": "Flou de mouvement", vignette: "Vignettage progressif" },
  Environnement: { smoke: "Fumée", dust: "Poussière", sparks: "Étincelles", rain: "Pluie", snow: "Neige", embers: "Braises", fog: "Brouillard" },
} as const;
export const animationIds = Object.values(ANIMATION_GROUPS).flatMap((group) => Object.keys(group)) as [string, ...string[]];
export const animationTrackSchema = z.object({
  id: z.string().min(1).max(100),
  effect: z.enum(animationIds),
  behavior: z.enum(["entry", "continuous"]),
  duration: z.number().int().min(50).max(300000),
  intensity: z.number().min(0).max(100),
  direction: z.enum(["left", "right", "up", "down"]),
  speed: z.enum(["slow", "normal", "fast", "custom"]),
  rate: z.number().min(0.1).max(10),
  easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]),
  repeat: z.union([z.literal("loop"), z.number().int().min(1).max(100)]),
  delay: z.number().int().min(0).max(300000),
  anchorX: z.number().min(0).max(100),
  anchorY: z.number().min(0).max(100),
});
export const animationConfigSchema = z.array(animationTrackSchema).max(24).refine((tracks) => new Set(tracks.map((t) => t.id)).size === tracks.length, "Chaque piste doit avoir un identifiant unique");
export type AnimationTrack = z.infer<typeof animationTrackSchema>;
export function createAnimationTrack(effect = "zoom-in", behavior: AnimationTrack["behavior"] = "continuous"): AnimationTrack {
  return { id: globalThis.crypto.randomUUID(), effect, behavior, duration: behavior === "entry" ? 1200 : 14000, intensity: behavior === "entry" ? 100 : 50, direction: "right", speed: "normal", rate: 1, easing: "ease-in-out", repeat: behavior === "entry" ? 1 : "loop", delay: 0, anchorX: 50, anchorY: 50 };
}
export function getAnimationTracks(config?: unknown, legacy?: string | null): AnimationTrack[] {
  const parsed = animationConfigSchema.safeParse(config);
  if (parsed.success && parsed.data.length) return parsed.data;
  if (!legacy || legacy === "none") return [];
  const aliases: Record<string, string> = { "pan-left-right": "pan", "pan-right-left": "pan", "drift-up": "drift", float: "sway" };
  const effect = aliases[legacy] || legacy;
  if (!animationIds.includes(effect)) return [];
  // Stable ID: legacy conversion must never restart an animation between dialogues.
  return [{ id: `legacy-${legacy}`, effect, behavior: legacy === "fade-in" ? "entry" : "continuous", duration: legacy === "fade-in" ? 1200 : 14000, intensity: 50, direction: legacy === "pan-right-left" ? "left" : legacy === "drift-up" ? "up" : "right", speed: "normal", rate: 1, easing: "ease-in-out", repeat: legacy === "fade-in" ? 1 : "loop", delay: 0, anchorX: 50, anchorY: 50 }];
}
export function animationTiming(track: AnimationTrack): KeyframeAnimationOptions {
  const rate = track.speed === "slow" ? .5 : track.speed === "fast" ? 2 : track.speed === "custom" ? track.rate : 1;
  return { duration: track.duration / rate, delay: track.delay, easing: track.easing, iterations: track.behavior === "entry" ? 1 : track.repeat === "loop" ? Infinity : track.repeat, fill: "both", direction: track.behavior === "continuous" && !["rain", "snow", "sparks", "embers", "vibration", "flicker", "glitch"].includes(track.effect) ? "alternate" : "normal" };
}
export function animationFrames(t: AnimationTrack): Keyframe[] {
  const i = t.intensity / 100;
  const x = t.direction === "left" ? -1 : t.direction === "right" ? 1 : 0;
  const y = t.direction === "up" ? -1 : t.direction === "down" ? 1 : 0;
  const move = (n: number) => `translate(${x * n * i}%, ${y * n * i}%)`;
  const transform = (a: string, b: string): Keyframe[] => [{ transform: a }, { transform: b }];
  switch (t.effect) {
    case "zoom-in": return transform("scale(1)", `scale(${1 + .25 * i})`);
    case "zoom-out": return transform(`scale(${1 + .25 * i})`, "scale(1)");
    case "pan": return transform(`scale(1.15) translateX(${(t.direction === "left" ? 1 : -1) * 6 * i}%)`, `scale(1.15) translateX(${(t.direction === "left" ? -1 : 1) * 6 * i}%)`);
    case "pan-vertical": return transform(`scale(1.15) translateY(${(t.direction === "up" ? 1 : -1) * 6 * i}%)`, `scale(1.15) translateY(${(t.direction === "up" ? -1 : 1) * 6 * i}%)`);
    case "drift": return transform("scale(1.1)", `scale(1.1) ${move(5)}`);
    case "rotation": return transform("scale(1.1) rotate(0deg)", `scale(1.1) rotate(${(t.direction === "left" ? -1 : 1) * 6 * i}deg)`);
    case "ken-burns": return transform("scale(1.05)", `scale(${1.05 + .2 * i}) ${move(5)}`);
    case "focus": return transform("scale(1)", `scale(${1 + .5 * i})`);
    case "shake-light": case "shake-heavy": case "vibration": {
      const n = (t.effect === "shake-heavy" ? 22 : t.effect === "vibration" ? 3 : 6) * i;
      return Array.from({ length: 21 }, (_, k) => ({ transform: `translate(${k === 0 || k === 20 ? 0 : Math.sin(k * 7) * n}px, ${k === 0 || k === 20 ? 0 : Math.cos(k * 11) * n}px)` }));
    }
    case "shake-directional": return [{ transform: move(0) }, { transform: move(4) }, { transform: move(-2) }, { transform: move(1) }, { transform: move(0) }];
    case "recoil": return [{ transform: "scale(1)" }, { transform: `${move(3)} scale(${1 - .06 * i})`, offset: .2 }, { transform: "scale(1)" }];
    case "impulse": return [{ transform: "scale(1)" }, { transform: `scale(${1 + .18 * i})`, offset: .25 }, { transform: "scale(1)" }];
    case "sway": return transform(`scale(1.05) rotate(${-2 * i}deg)`, `scale(1.05) rotate(${2 * i}deg)`);
    case "fade-in": case "crossfade": return [{ opacity: 1 - i }, { opacity: 1 }];
    case "fade-out": return [{ opacity: 1 }, { opacity: 1 - i }];
    case "slide": return transform(move(-100), move(0));
    case "blur-in": return [{ filter: `blur(${20 * i}px)` }, { filter: "blur(0px)" }];
    case "blur-out": case "motion-blur": return [{ filter: "blur(0px)" }, { filter: `blur(${(t.effect === "motion-blur" ? 8 : 20) * i}px)` }];
    case "darken": return [{ filter: "brightness(1)" }, { filter: `brightness(${1 - .85 * i})` }];
    case "saturation": return [{ filter: "saturate(1)" }, { filter: `saturate(${1 - i})` }];
    case "pulse": return [{ filter: "brightness(1)" }, { filter: `brightness(${1 + i})` }, { filter: "brightness(1)" }];
    case "flicker": return [1, .3, 1, .6, .2, 1, .8, 1].map((n) => ({ filter: `brightness(${1 - (1 - n) * i})` }));
    case "chromatic": return [{ filter: "drop-shadow(0 0 0 transparent)" }, { filter: `drop-shadow(${8 * i}px 0 0 #ef4444) drop-shadow(${-8 * i}px 0 0 #22d3ee)` }];
    case "glitch": return [0, 1, -1, 0, -2, 0].map((n) => ({ transform: `translateX(${n * 10 * i}px)`, filter: `hue-rotate(${n * 90 * i}deg)`, clipPath: n ? "inset(2% 0 3% 0)" : "inset(0)" }));
    case "flash-white": case "flash-black": return [{ opacity: 0 }, { opacity: i, offset: .15 }, { opacity: 0 }];
    case "vignette": return [{ opacity: 0 }, { opacity: i }];
    default: return [{ transform: "translate(0, -5%)", opacity: .3 * i }, { transform: `translate(${x * 10}%, ${t.effect === "rain" || t.effect === "snow" ? 30 : -15}%)`, opacity: i }];
  }
}
