"use client";

import { ANIMATION_GROUPS, createAnimationTrack, getAnimationTracks, type AnimationTrack } from "@/lib/scene-animations";
import styles from "./animation-track-editor.module.css";

export default function AnimationTrackEditor({ config, legacy, onChange, disabled = false }: { config?: unknown; legacy?: string | null; onChange: (tracks: AnimationTrack[]) => void; disabled?: boolean }) {
  const tracks = getAnimationTracks(config, legacy);
  const update = (id: string, patch: Partial<AnimationTrack>) => onChange(tracks.map((t) => t.id === id ? { ...t, ...patch } : t));
  return <fieldset className={styles.editor} disabled={disabled}>
    <legend>Animations combinées</legend>
    <p>Les effets d’entrée se jouent une fois à l’apparition du décor. Les effets continus restent actifs pendant les dialogues. Chaque piste se superpose aux autres.</p>
    {(["entry", "continuous"] as const).map((behavior) => <section key={behavior} aria-label={behavior === "entry" ? "Animations d’entrée" : "Animations continues"}>
      <h3>{behavior === "entry" ? "Entrée · une fois" : "Continue · pendant les dialogues"}</h3>
      {tracks.filter((t) => t.behavior === behavior).map((track, index) => <details key={track.id} open={index === 0} className={styles.track}>
        <summary>{index + 1}. {Object.values(ANIMATION_GROUPS).flatMap((g) => Object.entries(g)).find(([key]) => key === track.effect)?.[1]}</summary>
        <label>Effet<select value={track.effect} onChange={(e) => update(track.id, { effect: e.target.value })}>{Object.entries(ANIMATION_GROUPS).map(([name, effects]) => <optgroup key={name} label={name}>{Object.entries(effects).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</optgroup>)}</select></label>
        <label>Intensité · {track.intensity}%<input type="range" min="0" max="100" value={track.intensity} onChange={(e) => update(track.id, { intensity: Number(e.target.value) })} /></label>
        <div className={styles.grid}>
          <label>Durée (ms)<input type="number" min="50" max="300000" value={track.duration} onChange={(e) => update(track.id, { duration: Math.max(50, Math.min(300000, Number(e.target.value))) })} /></label>
          <label>Délai (ms)<input type="number" min="0" max="300000" value={track.delay} onChange={(e) => update(track.id, { delay: Math.max(0, Math.min(300000, Number(e.target.value))) })} /></label>
          <label>Direction<select value={track.direction} onChange={(e) => update(track.id, { direction: e.target.value as AnimationTrack["direction"] })}><option value="left">Gauche</option><option value="right">Droite</option><option value="up">Haut</option><option value="down">Bas</option></select></label>
          <label>Vitesse<select value={track.speed} onChange={(e) => update(track.id, { speed: e.target.value as AnimationTrack["speed"] })}><option value="slow">Lente</option><option value="normal">Normale</option><option value="fast">Rapide</option><option value="custom">Personnalisée</option></select></label>
          {track.speed === "custom" && <label>Multiplicateur<input type="number" min=".1" max="10" step=".1" value={track.rate} onChange={(e) => update(track.id, { rate: Math.max(.1, Math.min(10, Number(e.target.value))) })} /></label>}
          <label>Progression<select value={track.easing} onChange={(e) => update(track.id, { easing: e.target.value as AnimationTrack["easing"] })}><option value="linear">Linéaire</option><option value="ease-in">Accélération</option><option value="ease-out">Décélération</option><option value="ease-in-out">Accélération + décélération</option></select></label>
          {behavior === "continuous" && <label>Répétition<select value={track.repeat === "loop" ? "loop" : track.repeat === 1 ? "once" : "count"} onChange={(e) => update(track.id, { repeat: e.target.value === "loop" ? "loop" : e.target.value === "once" ? 1 : 3 })}><option value="once">Aucune</option><option value="loop">Boucle</option><option value="count">Nombre défini</option></select></label>}
          {behavior === "continuous" && track.repeat !== "loop" && track.repeat > 1 && <label>Nombre<input type="number" min="2" max="100" value={track.repeat} onChange={(e) => update(track.id, { repeat: Math.max(2, Math.min(100, Number(e.target.value))) })} /></label>}
          <label>Ancrage X (%)<input type="number" min="0" max="100" value={track.anchorX} onChange={(e) => update(track.id, { anchorX: Math.max(0, Math.min(100, Number(e.target.value))) })} /></label>
          <label>Ancrage Y (%)<input type="number" min="0" max="100" value={track.anchorY} onChange={(e) => update(track.id, { anchorY: Math.max(0, Math.min(100, Number(e.target.value))) })} /></label>
        </div>
        <div className={styles.actions}><button type="button" onClick={() => onChange([...tracks, { ...track, id: crypto.randomUUID() }])} disabled={tracks.length >= 24}>Dupliquer</button><button type="button" onClick={() => onChange(tracks.filter((t) => t.id !== track.id))}>Retirer l’effet</button></div>
      </details>)}
      <button type="button" disabled={tracks.length >= 24} onClick={() => onChange([...tracks, createAnimationTrack(behavior === "entry" ? "fade-in" : "zoom-in", behavior)])}>Ajouter un effet {behavior === "entry" ? "d’entrée" : "continu"}</button>
    </section>)}
    <p>Pour une apparition puis une disparition, ajoutez Fade in et Fade out avec un délai sur Fade out. L’ancrage X/Y cible le sujet du zoom Focus.</p>
  </fieldset>;
}
