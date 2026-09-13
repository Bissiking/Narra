"use client";

// FORM KEY: pinned-adaptive-reader-v1 — the project type selects the reading grammar.

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import styles from "./project-reader.module.css";

type Character = {
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  nameColor: string;
  portraitUrl: string | null;
  images: { emotion: string; url: string }[];
};

type Block = {
  id: string;
  type: string;
  content: string;
  emotion: string | null;
  position: string | null;
  speakerNote: string | null;
  mediaUrl: string | null;
  audioAction: string | null;
  volume: number | null;
  fadeDuration: number | null;
  loop: boolean | null;
  character: Character | null;
};

type Scene = {
  id: string;
  title: string;
  node: { title: string } | null;
  location: { name: string; imageUrl: string | null } | null;
  blocks: Block[];
};

type Project = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  pageTitle: string | null;
  pageSubtitle: string | null;
  pageBackgroundUrl: string | null;
  pageBackgroundColor: string;
  pageTextColor: string;
  pageAccentColor: string;
  pageTheme: string;
};

const TYPE_LABELS: Record<string, string> = {
  story: "Histoire",
  novel: "Roman",
  screenplay: "Scénario",
  vn: "Visual Novel",
  comic: "Bande dessinée",
  universe: "Univers narratif",
};

function characterName(character: Character | null) {
  if (!character) return null;
  return character.alias || `${character.firstName || ""} ${character.lastName || ""}`.trim() || null;
}

function countWords(scenes: Scene[]) {
  return scenes.reduce(
    (total, scene) => total + scene.blocks.reduce((sum, block) => sum + (isReaderCommand(block) ? 0 : block.content.split(/\s+/).filter(Boolean).length), 0),
    0,
  );
}

function isAudioCommand(block: Block) {
  return block.type === "music" || block.type === "sfx";
}

function isReaderCommand(block: Block) {
  return isAudioCommand(block) || block.type === "background";
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6M9 12h11" /></svg>;
}

function ExpandIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>;
}

function RestartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M5.5 15a7 7 0 1 0 1.2-7.9L4 10" /></svg>;
}

export default function ProjectReader({ project, scenes }: { project: Project; scenes: Scene[] }) {
  const variables = {
    "--reader-bg": project.pageBackgroundColor,
    "--reader-ink": project.pageTextColor,
    "--reader-accent": project.pageAccentColor,
  } as CSSProperties;

  if (scenes.length === 0) {
    return <EmptyReader project={project} variables={variables} />;
  }

  if (project.type === "vn" || project.pageTheme === "visual-novel") {
    return <VisualNovelReader project={project} scenes={scenes} variables={variables} />;
  }

  return <DocumentReader project={project} scenes={scenes} variables={variables} />;
}

function ReaderBar({ project, scenes }: { project: Project; scenes: Scene[] }) {
  return (
    <header className={styles.readerBar}>
      <Link href={`/project/${project.id}`} className={styles.backLink} aria-label={`Quitter la lecture de ${project.name}`}>
        <ArrowLeftIcon />
        <span>Quitter la lecture</span>
      </Link>
      <div className={styles.readerIdentity}>
        <strong>{project.name}</strong>
        <span>{TYPE_LABELS[project.type] || "Projet narratif"}</span>
      </div>
      <div className={styles.readerStats} aria-label="Statistiques de lecture">
        <span>{scenes.length} {scenes.length > 1 ? "scènes" : "scène"}</span>
        <span>{countWords(scenes).toLocaleString("fr-FR")} mots</span>
      </div>
    </header>
  );
}

function EmptyReader({ project, variables }: { project: Project; variables: CSSProperties }) {
  return (
    <div className={styles.emptyReader} style={variables}>
      <Link href={`/project/${project.id}`} className={styles.backLink}><ArrowLeftIcon />Retour au projet</Link>
      <div>
        <span className={styles.formatLabel}>{TYPE_LABELS[project.type] || "Projet narratif"}</span>
        <h1>{project.pageTitle || project.name}</h1>
        <p>La première scène attend encore d’être écrite.</p>
        <Link href={`/project/${project.id}/scenes`} className={styles.primaryAction}>Commencer à écrire</Link>
      </div>
    </div>
  );
}

function VisualNovelReader({ project, scenes, variables }: { project: Project; scenes: Scene[]; variables: CSSProperties }) {
  const beats = useMemo(
    () => {
      let activeMusic: Block | null = null;
      let pendingSfx: Block[] = [];
      const visible: { block: Block; scene: Scene; sceneIndex: number; activeMusic: Block | null; sfx: Block[]; backdrop: string | null }[] = [];
      scenes.forEach((scene, sceneIndex) => {
        let activeBackdrop = scene.location?.imageUrl || project.pageBackgroundUrl;
        scene.blocks.forEach((block) => {
          if (block.type === "music") activeMusic = block;
          else if (block.type === "sfx") pendingSfx.push(block);
          else if (block.type === "background") activeBackdrop = block.mediaUrl || scene.location?.imageUrl || project.pageBackgroundUrl;
          else {
            visible.push({ block, scene, sceneIndex, activeMusic, sfx: pendingSfx, backdrop: activeBackdrop });
            pendingSfx = [];
          }
        });
      });
      return visible;
    },
    [project.pageBackgroundUrl, scenes],
  );
  const [index, setIndex] = useState(0);
  const [showHud, setShowHud] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicPoolRef = useRef<Set<HTMLAudioElement>>(new Set());
  const activeMusicIdRef = useRef<string | null>(null);
  const sfxRef = useRef<Set<HTMLAudioElement>>(new Set());
  const fadeTimersRef = useRef<Map<HTMLAudioElement, number>>(new Map());
  const current = beats[index];
  const hasAudio = scenes.some((scene) => scene.blocks.some(isAudioCommand));

  const goNext = () => setIndex((value) => Math.min(value + 1, beats.length));
  const goPrevious = () => setIndex((value) => Math.max(value - 1, 0));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (hasAudio && !audioUnlocked) {
          setAudioUnlocked(true);
          return;
        }
        setIndex((value) => Math.min(value + 1, beats.length));
      }
      if (event.key === "ArrowLeft" || event.key === "Backspace") {
        event.preventDefault();
        setIndex((value) => Math.max(value - 1, 0));
      }
      if (event.key.toLowerCase() === "h") setShowHud((value) => !value);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioUnlocked, beats.length, hasAudio]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!audioUnlocked) return;
    if (!current) {
      musicPoolRef.current.forEach((audio) => audio.pause());
      musicPoolRef.current.clear();
      musicRef.current = null;
      activeMusicIdRef.current = null;
      return;
    }

    const fade = (audio: HTMLAudioElement, target: number, seconds: number, done?: () => void) => {
      const duration = Math.max(0, Math.min(30, seconds));
      const previousTimer = fadeTimersRef.current.get(audio);
      if (previousTimer) window.clearInterval(previousTimer);
      if (duration === 0) {
        audio.volume = target;
        done?.();
        return;
      }
      const start = audio.volume;
      const steps = Math.max(1, Math.round(duration * 20));
      let step = 0;
      const timer = window.setInterval(() => {
        step += 1;
        audio.volume = Math.max(0, Math.min(1, start + (target - start) * (step / steps)));
        if (step >= steps) {
          window.clearInterval(timer);
          fadeTimersRef.current.delete(audio);
          done?.();
        }
      }, 50);
      fadeTimersRef.current.set(audio, timer);
    };

    const music = current.activeMusic;
    if (activeMusicIdRef.current !== (music?.id || null)) {
      activeMusicIdRef.current = music?.id || null;
      const previous = musicRef.current;
      const fadeSeconds = music?.fadeDuration ?? 1;

      if (!music || music.audioAction === "stop" || !music.mediaUrl) {
        if (previous) fade(previous, 0, fadeSeconds, () => { previous.pause(); musicPoolRef.current.delete(previous); });
        musicRef.current = null;
      } else {
        const next = new Audio(music.mediaUrl);
        const targetVolume = Math.max(0, Math.min(1, (music.volume ?? 100) / 100));
        next.loop = music.loop ?? true;
        next.volume = fadeSeconds > 0 ? 0 : targetVolume;
        musicPoolRef.current.add(next);
        musicRef.current = next;
        setAudioError(null);
        void next.play().then(() => fade(next, targetVolume, fadeSeconds)).catch(() => setAudioError("Impossible de lire la musique sélectionnée."));
        if (previous) fade(previous, 0, fadeSeconds, () => { previous.pause(); musicPoolRef.current.delete(previous); });
      }
    }

    current.sfx.forEach((command) => {
      if (!command.mediaUrl) return;
      const audio = new Audio(command.mediaUrl);
      audio.volume = Math.max(0, Math.min(1, (command.volume ?? 100) / 100));
      sfxRef.current.add(audio);
      const release = () => sfxRef.current.delete(audio);
      audio.addEventListener("ended", release, { once: true });
      audio.addEventListener("error", release, { once: true });
      void audio.play().catch(() => { release(); setAudioError("Impossible de lire un effet sonore."); });
    });
  }, [audioUnlocked, current]);

  useEffect(() => () => {
    fadeTimersRef.current.forEach((timer) => window.clearInterval(timer));
    musicPoolRef.current.forEach((audio) => audio.pause());
    sfxRef.current.forEach((audio) => audio.pause());
  }, []);

  if (beats.length === 0) {
    return (
      <div className={styles.emptyReader} style={variables}>
        <Link href={`/project/${project.id}`} className={styles.backLink}><ArrowLeftIcon />Retour au projet</Link>
        <div>
          <span className={styles.formatLabel}>Visual Novel</span>
          <h1>Aucun passage à jouer</h1>
          <p>Les scènes existent, mais elles ne contiennent pas encore de narration ou de dialogue.</p>
          <Link href={`/project/${project.id}/edit`} className={styles.primaryAction}>Écrire un passage</Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className={styles.vnEnding} style={variables}>
        <div>
          <span>Fin</span>
          <h1>{project.pageTitle || project.name}</h1>
          <p>{beats.length} passages lus</p>
          <button type="button" onClick={() => setIndex(0)}><RestartIcon />Recommencer</button>
          <Link href={`/project/${project.id}`}>Retour au projet</Link>
        </div>
      </div>
    );
  }

  const { block, scene, sceneIndex } = current;
  const speaker = characterName(block.character);
  const emotionPortrait = block.character?.images.find(
    (image) => block.emotion && image.emotion.toLocaleLowerCase("fr") === block.emotion.toLocaleLowerCase("fr"),
  )?.url;
  const portrait = emotionPortrait || block.character?.portraitUrl;
  const backdrop = current.backdrop;
  const portraitPosition = block.position === "left" ? styles.portraitLeft : block.position === "right" ? styles.portraitRight : styles.portraitCenter;
  const progress = beats.length ? ((index + 1) / beats.length) * 100 : 0;

  async function toggleFullscreen() {
    setFullscreenError(null);
    try {
      if (!document.fullscreenElement) await stageRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setFullscreenError("Le plein écran a été refusé par le navigateur.");
    }
  }

  if (hasAudio && !audioUnlocked) {
    return (
      <div
        ref={stageRef}
        className={styles.vnStage}
        style={{ ...variables, backgroundImage: backdrop ? `url("${backdrop.replace(/["\\]/g, "")}")` : undefined }}
      >
        <div className={styles.vnShade} aria-hidden="true" />
        <section className={styles.vnTitleBeat}>
          <span>{scene.node?.title || "Visual Novel"}</span>
          <h1>{scene.title}</h1>
          <button type="button" onClick={() => setAudioUnlocked(true)}>Commencer avec le son</button>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className={styles.vnStage}
      style={{
        ...variables,
        backgroundImage: backdrop ? `url("${backdrop.replace(/["\\]/g, "")}")` : undefined,
      }}
    >
      <div className={styles.vnShade} aria-hidden="true" />
      <div className={styles.vnProgress} aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>

      {showHud && (
        <div className={styles.vnHud}>
          <Link href={`/project/${project.id}`} className={styles.vnIconButton} aria-label="Quitter la lecture"><ArrowLeftIcon /></Link>
          <div className={styles.vnChapter}>
            <span>{scene.node?.title || `Scène ${sceneIndex + 1}`}</span>
            <strong>{scene.title}</strong>
          </div>
          <div className={styles.vnHudActions}>
            <button type="button" onClick={() => setIndex(0)} className={styles.vnIconButton} aria-label="Recommencer"><RestartIcon /></button>
            <button type="button" onClick={toggleFullscreen} className={styles.vnIconButton} aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"} aria-pressed={isFullscreen}><ExpandIcon /></button>
          </div>
        </div>
      )}

      {fullscreenError && <p role="alert" className={styles.vnError}>{fullscreenError}</p>}
      {audioError && <p role="alert" className={styles.vnError}>{audioError}</p>}

      {scene.location && <div className={styles.locationTag}>{scene.location.name}</div>}

      {portrait && block.type === "dialogue" && (
        <img
          key={`${block.id}-${portrait}`}
          src={portrait}
          alt={speaker || "Personnage"}
          className={`${styles.vnPortrait} ${portraitPosition}`}
        />
      )}

      <button type="button" className={styles.vnAdvanceLayer} onClick={goNext} aria-label="Afficher la suite" />

      {block.type === "heading" ? (
        <section key={block.id} className={styles.vnTitleBeat} aria-live="polite">
          <span>{scene.node?.title || `Scène ${sceneIndex + 1}`}</span>
          <h1>{block.content}</h1>
          <button type="button" onClick={goNext}>Entrer dans la scène <span aria-hidden="true">›</span></button>
        </section>
      ) : (
        <section
          key={block.id}
          className={`${styles.vnDialogue} ${block.type === "transition" ? styles.vnTransition : ""}`}
          aria-live="polite"
        >
          {speaker && block.type === "dialogue" && (
            <div className={styles.vnSpeaker} style={{ color: block.character?.nameColor || project.pageAccentColor }}>
              <strong>{speaker}</strong>
              {block.emotion && <span>{block.emotion}</span>}
            </div>
          )}
          {block.type === "action" && <span className={styles.vnBlockType}>Action</span>}
          <p>{block.content}</p>
          <div className={styles.vnDialogueFooter}>
            <span>{index + 1} / {beats.length}</span>
            <button type="button" onClick={goPrevious} disabled={index === 0}>Précédent</button>
            <button type="button" onClick={goNext}>Continuer <span aria-hidden="true">›</span></button>
          </div>
        </section>
      )}
    </div>
  );
}

function DocumentReader({ project, scenes, variables }: { project: Project; scenes: Scene[]; variables: CSSProperties }) {
  const coverStyle = {
    backgroundImage: project.pageBackgroundUrl ? `url("${project.pageBackgroundUrl.replace(/["\\]/g, "")}")` : undefined,
  };
  const typeClass = styles[`format_${project.type}`] || styles.format_story;

  return (
    <div className={`${styles.documentReader} ${typeClass}`} style={variables}>
      <ReaderBar project={project} scenes={scenes} />
      <section className={styles.documentCover} style={coverStyle}>
        <div className={styles.documentCoverShade} aria-hidden="true" />
        <div className={styles.documentCoverContent}>
          <span className={styles.formatLabel}>{TYPE_LABELS[project.type] || "Projet narratif"}</span>
          <h1>{project.pageTitle || project.name}</h1>
          {(project.pageSubtitle || project.description) && <p>{project.pageSubtitle || project.description}</p>}
          <a href="#lecture">Commencer la lecture <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <main id="lecture" className={styles.documentContent}>
        {scenes.map((scene, index) => (
          <SceneArticle key={scene.id} scene={scene} index={index} type={project.type} />
        ))}
        <footer className={styles.endMark}><span>Fin</span><Link href={`/project/${project.id}`}>Retour au projet</Link></footer>
      </main>
    </div>
  );
}

function SceneArticle({ scene, index, type }: { scene: Scene; index: number; type: string }) {
  if (type === "comic") {
    return (
      <article className={styles.comicScene}>
        <header><span>{scene.node?.title || `Séquence ${index + 1}`}</span><h2>{scene.title}</h2></header>
        <div className={styles.comicGrid}>
          {scene.blocks.filter((block) => !isReaderCommand(block)).map((block, blockIndex) => {
            const speaker = characterName(block.character);
            const image = block.character?.portraitUrl || scene.location?.imageUrl;
            return (
              <section key={block.id} className={styles.comicPanel} style={{ backgroundImage: image ? `url("${image.replace(/["\\]/g, "")}")` : undefined }}>
                <span className={styles.panelNumber}>{index + 1}.{blockIndex + 1}</span>
                <div className={styles.comicCaption}>
                  {speaker && <strong style={{ color: block.character?.nameColor }}>{speaker}</strong>}
                  <p>{block.content}</p>
                </div>
              </section>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <article className={styles.sceneArticle}>
      <header className={styles.sceneHeader}>
        <div><span>{scene.node?.title || `Scène ${index + 1}`}</span><h2>{scene.title}</h2></div>
        {scene.location && <p>{scene.location.name}</p>}
      </header>
      <div className={styles.blocks}>
        {scene.blocks.filter((block) => !isReaderCommand(block)).map((block) => <RenderedBlock key={block.id} block={block} type={type} />)}
      </div>
    </article>
  );
}

function RenderedBlock({ block, type }: { block: Block; type: string }) {
  const speaker = characterName(block.character);
  const className = `${styles.block} ${styles[`block_${block.type}`] || ""}`;

  if (block.type === "heading") return <h3 className={className}>{block.content}</h3>;
  if (block.type === "transition") return <p className={className}>{block.content}</p>;

  if (block.type === "dialogue") {
    return (
      <div className={className}>
        {speaker && <strong style={{ color: block.character?.nameColor }}>{speaker}{type === "screenplay" && ":"}</strong>}
        {block.emotion && <span className={styles.emotion}>({block.emotion})</span>}
        <p>{block.content}</p>
      </div>
    );
  }

  return <p className={className}>{block.content}</p>;
}
