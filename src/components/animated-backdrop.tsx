"use client";

import { useEffect, useRef, useState, useId, type ReactNode, type CSSProperties } from "react";
import { animationFrames, animationTiming, getAnimationTracks, type AnimationTrack } from "@/lib/scene-animations";
import styles from "./animated-backdrop.module.css";

const overlays = new Set(["flash-white", "flash-black", "vignette", "smoke", "dust", "sparks", "rain", "snow", "embers", "fog"]);
function EffectLayer({ track, children }: { track: AnimationTrack; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const filterId = `chromatic-${useId().replace(/:/g, "")}`;
  const signature = JSON.stringify(track);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const update = () => {
      animation?.cancel();
      if (!preference.matches) animation = node.animate(track.effect === "chromatic"
        ? [{ filter: `url(#${filterId})`, opacity: 1 }, { filter: `url(#${filterId})`, opacity: 1 }]
        : animationFrames(track), animationTiming(track));
    };
    update(); preference.addEventListener("change", update);
    return () => { animation?.cancel(); preference.removeEventListener("change", update); };
    // Serialized parameters keep animation clocks alive across dialogue renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const overlay = overlays.has(track.effect);
  const timing = animationTiming(track);
  const particleStyle = { "--particle-duration": `${Number(timing.duration)}ms`, "--particle-delay": `${track.delay}ms`, "--particle-repeat": track.behavior === "entry" ? 1 : track.repeat === "loop" ? "infinite" : track.repeat, "--particle-easing": track.easing } as CSSProperties;
  return <div ref={ref} className={`${styles.layer} ${overlay ? styles.overlay : ""}`} data-effect={track.effect} data-behavior={track.behavior} style={{ transformOrigin: `${track.anchorX}% ${track.anchorY}%`, opacity: overlay ? 0 : undefined, ...particleStyle }}>
    {overlay && ["smoke", "dust", "sparks", "rain", "snow", "embers", "fog"].includes(track.effect) && Array.from({ length: track.effect === "fog" || track.effect === "smoke" ? 8 : 40 }, (_, n) => <i key={n} style={{ left: `${(n * 37) % 100}%`, top: `${(n * 23) % 100}%`, animationDelay: `${-(n % 8)}s` }} />)}
    {track.effect === "chromatic" && <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}><defs><filter id={filterId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
      <feOffset in="red" dx={track.intensity * .08} result="redShift" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyan" />
      <feOffset in="cyan" dx={-track.intensity * .08} result="cyanShift" />
      <feBlend in="redShift" in2="cyanShift" mode="screen" />
    </filter></defs></svg>}
    {children}
  </div>;
}

export default function AnimatedBackdrop({ url, config, legacy, identity }: { url: string; config?: unknown; legacy?: string | null; identity: string }) {
  const [previous, setPrevious] = useState<string | null>(null);
  const last = useRef(url);
  const tracks = getAnimationTracks(config, legacy);
  const signature = JSON.stringify(tracks);
  useEffect(() => {
    if (last.current === url) return;
    const old = last.current;
    last.current = url;
    const crossfade = getAnimationTracks(config, legacy).find((track) => track.effect === "crossfade");
    if (!crossfade) { setPrevious(null); return; }
    setPrevious(old);
    const duration = Number(animationTiming(crossfade).duration) + crossfade.delay;
    const timer = window.setTimeout(() => setPrevious(null), duration);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, signature]);
  const image = <div className={styles.image} style={{ backgroundImage: `url(${JSON.stringify(url)})` }} />;
  const content = tracks.filter((t) => !overlays.has(t.effect)).reduceRight<ReactNode>((child, track) => <EffectLayer key={track.id} track={track}>{child}</EffectLayer>, image);
  return <div className={styles.root} aria-hidden="true" data-backdrop-identity={identity}>
    {previous && <div className={styles.image} style={{ backgroundImage: `url(${JSON.stringify(previous)})` }} />}
    <div key={`${identity}:${url}`} className={styles.layer}>{content}{tracks.filter((t) => overlays.has(t.effect)).map((track) => <EffectLayer key={track.id} track={track} />)}</div>
  </div>;
}
