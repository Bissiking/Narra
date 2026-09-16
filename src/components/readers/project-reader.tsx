"use client";

// FORM KEY: pinned-adaptive-reader-v1 — the project type selects the reading grammar.

import Link from "next/link";
import { CSSProperties, type ChangeEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCompositePlans } from "@/lib/scene-composition";
import styles from "./project-reader.module.css";

type Character = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  nameColor: string;
  portraitUrl: string | null;
  images: { id: string; label: string; emotion: string; url: string }[];
};

type Block = {
  id: string;
  type: string;
  content: string;
  order: number;
  characterId: string | null;
  emotion: string | null;
  position: string | null;
  speakerNote: string | null;
  mediaUrl: string | null;
  displayMode: string | null;
  showPortrait: boolean;
  portraitImageUrl: string | null;
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

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type BlockUpdate = Partial<Omit<Block, "id" | "order">>;
type ReaderMode = "read" | "edit";

const EDITABLE_FIELDS = ["type", "content", "characterId", "emotion", "position", "speakerNote", "mediaUrl", "displayMode", "showPortrait", "portraitImageUrl", "audioAction", "volume", "fadeDuration", "loop"] as const;
const INSERT_TYPES = [
  ["heading", "Plan"], ["action", "Action"], ["narration", "Narration"],
  ["dialogue", "Dialogue"], ["transition", "Transition"], ["note", "Note"],
] as const;

function editablePayload(block: Block) {
  return Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, block[field]]));
}

function saveLabel(state: SaveState) {
  if (state === "dirty") return "Modification…";
  if (state === "saving") return "Sauvegarde…";
  if (state === "saved") return "Sauvegardé";
  if (state === "error") return "Erreur — réessayer";
  return "";
}

const TYPE_LABELS: Record<string, string> = {
  story: "Histoire",
  novel: "Roman",
  screenplay: "Scénario",
  vn: "Visual Novel",
  comic: "Bande dessinée (DEV)",
  universe: "Univers narratif",
};

function characterName(character: Character | null, speakerNote?: string | null) {
  if (!character) return speakerNote || null;
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

export default function ProjectReader({ project, scenes, characters = [], canEdit = false, exitHref }: { project: Project; scenes: Scene[]; characters?: Character[]; canEdit?: boolean; exitHref?: string }) {
  const [readerScenes, setReaderScenes] = useState(scenes);
  const [mode, setMode] = useState<ReaderMode>("read");
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const sceneStateRef = useRef(readerScenes);
  const timersRef = useRef<Map<string, number>>(new Map());
  const revisionsRef = useRef<Map<string, number>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const wsSceneRef = useRef<string | null>(null);

  useEffect(() => { setReaderScenes(scenes); sceneStateRef.current = scenes; }, [scenes]);
  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const activeSceneId = useMemo(() => {
    const owner = readerScenes.find((scene) => scene.blocks.some((block) => block.id === activeBlockId));
    return owner?.id || readerScenes[0]?.id || null;
  }, [activeBlockId, readerScenes]);

  const activeSceneIdRef = useRef(activeSceneId);
  activeSceneIdRef.current = activeSceneId;

  const sendWs = useCallback((sceneId: string, message: object) => {
    if (wsSceneRef.current === sceneId && wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    if (!activeSceneId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let disposed = false;
    const connect = () => {
      socket = new WebSocket(`${protocol}//${window.location.host}/api/ws/scenes/${activeSceneId}`);
      wsRef.current = socket;
      wsSceneRef.current = activeSceneId;
      socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type: string; block?: Block; blockId?: string; blocks?: { id: string; order: number }[] };
        const currentSceneId = activeSceneIdRef.current;
        if (message.type === "block:delete" && message.blockId) {
          const timer = timersRef.current.get(message.blockId);
          if (timer) window.clearTimeout(timer);
          timersRef.current.delete(message.blockId);
          pendingRef.current.delete(message.blockId);
          revisionsRef.current.delete(message.blockId);
        }
        setReaderScenes((current) => {
          let next = current;
          if (message.type === "block:update" && message.block) {
            if (pendingRef.current.has(message.block.id)) return current;
            next = current.map((scene) => scene.id === currentSceneId ? { ...scene, blocks: scene.blocks.map((block) => block.id === message.block!.id ? message.block! : block) } : scene);
          } else if (message.type === "block:create" && message.block) {
            next = current.map((scene) => scene.id === currentSceneId ? { ...scene, blocks: [...scene.blocks, message.block!].sort((a, b) => a.order - b.order).map((block, order) => ({ ...block, order })) } : scene);
          } else if (message.type === "block:delete" && message.blockId) {
            next = current.map((scene) => scene.id === currentSceneId ? { ...scene, blocks: scene.blocks.filter((block) => block.id !== message.blockId).map((block, order) => ({ ...block, order })) } : scene);
          } else if (message.type === "block:reorder" && message.blocks) {
            const orders = new Map(message.blocks.map((block) => [block.id, block.order]));
            next = current.map((scene) => scene.id === currentSceneId ? { ...scene, blocks: scene.blocks.map((block) => ({ ...block, order: orders.get(block.id) ?? block.order })).sort((a, b) => a.order - b.order) } : scene);
          }
          sceneStateRef.current = next;
          return next;
        });
      } catch {}
      };
      socket.onclose = () => { if (!disposed) reconnectTimer = window.setTimeout(connect, 3000); };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
      if (wsRef.current === socket) { wsRef.current = null; wsSceneRef.current = null; }
    };
  }, [activeSceneId]);

  const persistBlock = useCallback(async (sceneId: string, blockId: string, revision: number) => {
    const block = sceneStateRef.current.find((scene) => scene.id === sceneId)?.blocks.find((item) => item.id === blockId);
    if (!block) return;
    setSaveState("saving");
    pendingRef.current.add(blockId);
    try {
      const response = await fetch(`/api/scenes/${sceneId}/blocks/${blockId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editablePayload(block)),
      });
      if (!response.ok) throw new Error("save");
      const saved = await response.json() as Block;
      sendWs(sceneId, { type: "block:update", blockId, block: saved });
      if (revisionsRef.current.get(blockId) === revision) {
        setReaderScenes((current) => {
          const next = current.map((scene) => scene.id === sceneId ? { ...scene, blocks: scene.blocks.map((item) => item.id === blockId ? saved : item) } : scene);
          sceneStateRef.current = next; return next;
        });
        pendingRef.current.delete(blockId);
        if (pendingRef.current.size === 0) setSaveState("saved");
      }
    } catch {
      if (revisionsRef.current.get(blockId) === revision) setSaveState("error");
    }
  }, [sendWs]);

  const updateBlock = useCallback((sceneId: string, blockId: string, updates: BlockUpdate) => {
    const revision = (revisionsRef.current.get(blockId) || 0) + 1;
    revisionsRef.current.set(blockId, revision);
    pendingRef.current.add(blockId);
    setReaderScenes((current) => {
      const next = current.map((scene) => scene.id === sceneId ? { ...scene, blocks: scene.blocks.map((block) => block.id === blockId ? { ...block, ...updates } : block) } : scene);
      sceneStateRef.current = next;
      return next;
    });
    setSaveState("dirty");
    const previous = timersRef.current.get(blockId);
    if (previous) window.clearTimeout(previous);
    timersRef.current.set(blockId, window.setTimeout(() => { timersRef.current.delete(blockId); void persistBlock(sceneId, blockId, revision); }, 600));
  }, [persistBlock]);

  const saveActive = useCallback(() => {
    if ((!activeBlockId || !activeSceneId) && pendingRef.current.size === 0) return;
    if ((!activeBlockId || !pendingRef.current.has(activeBlockId)) && pendingRef.current.size > 0) {
      pendingRef.current.forEach((blockId) => {
        const scene = sceneStateRef.current.find((item) => item.blocks.some((block) => block.id === blockId));
        if (scene) void persistBlock(scene.id, blockId, revisionsRef.current.get(blockId) || 0);
      });
      return;
    }
    if (!activeBlockId || !activeSceneId) return;
    const timer = timersRef.current.get(activeBlockId);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(activeBlockId);
    const revision = revisionsRef.current.get(activeBlockId) || 0;
    void persistBlock(activeSceneId, activeBlockId, revision);
  }, [activeBlockId, activeSceneId, persistBlock]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (mode !== "edit") return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveActive(); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); saveActive(); setEditingBlockId(null); }
      if (event.key === "Escape") setEditingBlockId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, saveActive]);

  const createBlock = useCallback(async (sceneId: string, type: string, order: number, source?: Block) => {
    setSaveState("saving");
    const payload = source ? { ...editablePayload(source), type, order } : {
      type, content: "", order, characterId: type === "dialogue" ? characters[0]?.id : undefined,
      showPortrait: type === "dialogue", position: type === "dialogue" ? "center" : undefined,
    };
    try {
      const response = await fetch(`/api/scenes/${sceneId}/blocks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("create");
      const created = await response.json() as Block;
      setReaderScenes((current) => {
        const next = current.map((scene) => scene.id === sceneId ? { ...scene, blocks: [...scene.blocks, created].sort((a, b) => a.order - b.order).map((block, blockOrder) => ({ ...block, order: blockOrder })) } : scene);
        sceneStateRef.current = next; return next;
      });
      setActiveBlockId(created.id); setEditingBlockId(created.id); setSaveState("saved");
      sendWs(sceneId, { type: "block:create", block: created });
      requestAnimationFrame(() => document.getElementById(`block-${created.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch { setSaveState("error"); }
  }, [characters, sendWs]);

  const deleteBlock = useCallback(async (sceneId: string, blockId: string) => {
    const scene = sceneStateRef.current.find((item) => item.id === sceneId);
    const index = scene?.blocks.findIndex((block) => block.id === blockId) ?? -1;
    const block = scene?.blocks[index];
    if (!block || (block.content.trim() && !window.confirm("Supprimer ce bloc et son contenu ?"))) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/scenes/${sceneId}/blocks/${blockId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      const nextSelection = scene?.blocks[index - 1]?.id || scene?.blocks[index + 1]?.id || null;
      setReaderScenes((current) => { const next = current.map((item) => item.id === sceneId ? { ...item, blocks: item.blocks.filter((candidate) => candidate.id !== blockId).map((candidate, order) => ({ ...candidate, order })) } : item); sceneStateRef.current = next; return next; });
      setActiveBlockId(nextSelection); setEditingBlockId(null); setSaveState("saved");
      sendWs(sceneId, { type: "block:delete", blockId });
    } catch { setSaveState("error"); }
  }, [sendWs]);

  const moveBlock = useCallback(async (sceneId: string, blockId: string, direction: -1 | 1) => {
    const scene = sceneStateRef.current.find((item) => item.id === sceneId);
    if (!scene) return;
    const from = scene.blocks.findIndex((block) => block.id === blockId); const to = from + direction;
    if (from < 0 || to < 0 || to >= scene.blocks.length) return;
    const reordered = [...scene.blocks]; [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    const ordered = reordered.map((block, order) => ({ ...block, order }));
    setReaderScenes((current) => { const next = current.map((item) => item.id === sceneId ? { ...item, blocks: ordered } : item); sceneStateRef.current = next; return next; });
    setSaveState("saving");
    try {
      const blocks = ordered.map(({ id, order }) => ({ id, order }));
      const response = await fetch(`/api/scenes/${sceneId}/blocks/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks }) });
      if (!response.ok) throw new Error("reorder");
      setSaveState("saved"); sendWs(sceneId, { type: "block:reorder", blocks });
    } catch { setSaveState("error"); }
  }, [sendWs]);

  const setReaderMode = useCallback((next: ReaderMode) => { setMode(next); if (next === "read") setEditingBlockId(null); }, []);
  const variables = useMemo(() => ({
    "--reader-bg": project.pageBackgroundColor,
    "--reader-ink": project.pageTextColor,
    "--reader-accent": project.pageAccentColor,
  } as CSSProperties), [project.pageBackgroundColor, project.pageTextColor, project.pageAccentColor]);

  if (readerScenes.length === 0) {
    return <EmptyReader project={project} variables={variables} exitHref={exitHref} />;
  }

  const editor = useMemo(() => ({ mode, setMode: setReaderMode, saveState, saveActive, activeBlockId, setActiveBlockId, editingBlockId, setEditingBlockId, updateBlock, createBlock, deleteBlock, moveBlock, characters, canEdit }), [mode, setReaderMode, saveState, saveActive, activeBlockId, editingBlockId, updateBlock, createBlock, deleteBlock, moveBlock, characters, canEdit]);

  if (project.type === "vn" || project.pageTheme === "visual-novel") {
    return <VisualNovelReader project={project} scenes={readerScenes} variables={variables} exitHref={exitHref} editor={editor} />;
  }

  return <DocumentReader project={project} scenes={readerScenes} variables={variables} exitHref={exitHref} editor={editor} />;
}

type EditorControls = {
  mode: ReaderMode; setMode: (mode: ReaderMode) => void; saveState: SaveState; saveActive: () => void;
  activeBlockId: string | null; setActiveBlockId: (id: string | null) => void;
  editingBlockId: string | null; setEditingBlockId: (id: string | null) => void;
  updateBlock: (sceneId: string, blockId: string, updates: BlockUpdate) => void;
  createBlock: (sceneId: string, type: string, order: number, source?: Block) => void;
  deleteBlock: (sceneId: string, blockId: string) => void;
  moveBlock: (sceneId: string, blockId: string, direction: -1 | 1) => void;
  characters: Character[]; canEdit: boolean;
};

function ModeControls({ editor }: { editor: EditorControls }) {
  if (!editor.canEdit) return null;
  return <div className={styles.modeControls}>
    <div className={styles.modeSwitch} aria-label="Mode du lecteur">
      <button type="button" onClick={() => editor.setMode("read")} aria-pressed={editor.mode === "read"}>Lecture</button>
      <button type="button" onClick={() => editor.setMode("edit")} aria-pressed={editor.mode === "edit"}>Édition</button>
    </div>
    {editor.mode === "edit" && editor.saveState !== "idle" && (editor.saveState === "error"
      ? <button type="button" className={`${styles.saveStatus} ${styles.saveError}`} onClick={editor.saveActive}>{saveLabel(editor.saveState)}</button>
      : <span className={styles.saveStatus} role="status">{saveLabel(editor.saveState)}</span>)}
  </div>;
}

function ReaderBar({ project, scenes, exitHref, editor }: { project: Project; scenes: Scene[]; exitHref?: string; editor: EditorControls }) {
  return (
    <header className={styles.readerBar}>
      <Link href={exitHref || `/project/${project.id}`} className={styles.backLink} aria-label={`Quitter la lecture de ${project.name}`}>
        <ArrowLeftIcon />
        <span>Quitter la lecture</span>
      </Link>
      <div className={styles.readerIdentity}>
        <strong>{project.name}</strong>
        <span>{TYPE_LABELS[project.type] || "Projet narratif"}</span>
      </div>
      <div className={styles.readerActions}>
        <div className={styles.readerStats} aria-label="Statistiques de lecture">
          <span>{scenes.length} {scenes.length > 1 ? "scènes" : "scène"}</span>
          <span>{countWords(scenes).toLocaleString("fr-FR")} mots</span>
        </div>
        <ModeControls editor={editor} />
      </div>
    </header>
  );
}

function EmptyReader({ project, variables, exitHref }: { project: Project; variables: CSSProperties; exitHref?: string }) {
  return (
    <div className={styles.emptyReader} style={variables}>
      <Link href={exitHref || `/project/${project.id}`} className={styles.backLink}><ArrowLeftIcon />Retour à l’histoire</Link>
      <div>
        <span className={styles.formatLabel}>{TYPE_LABELS[project.type] || "Projet narratif"}</span>
        <h1>{project.pageTitle || project.name}</h1>
        <p>La première scène attend encore d’être écrite.</p>
        <Link href={`/project/${project.id}/scenes`} className={styles.primaryAction}>Commencer à écrire</Link>
      </div>
    </div>
  );
}

function VisualNovelReader({ project, scenes, variables, exitHref, editor }: { project: Project; scenes: Scene[]; variables: CSSProperties; exitHref?: string; editor: EditorControls }) {
  const beats = useMemo(
    () => {
      let pendingSfx: Block[] = [];
      const visible: { block: Block; scene: Scene; sceneIndex: number; musicPlaylist: Block[]; sfx: Block[]; backdrop: string | null }[] = [];
      scenes.forEach((scene, sceneIndex) => {
        let activeBackdrop = scene.location?.imageUrl || project.pageBackgroundUrl;
        const musicPlaylist = scene.blocks.filter((block) => block.type === "music" && block.audioAction !== "stop" && block.mediaUrl);
        buildCompositePlans(scene.blocks).forEach((plan) => {
          const background = plan.layers.filter((layer) => layer.type === "background" && layer.mediaUrl).at(-1);
          if (background) activeBackdrop = background.mediaUrl || activeBackdrop;
          pendingSfx.push(...plan.layers.filter((layer) => layer.type === "sfx"));
          visible.push({ block: plan.lead, scene, sceneIndex, musicPlaylist, sfx: pendingSfx, backdrop: activeBackdrop });
          pendingSfx = [];
        });
      });
      return visible;
    },
    [project.pageBackgroundUrl, scenes],
  );
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const requested = new URLSearchParams(window.location.search).get("block");
    const found = requested ? beats.findIndex((beat) => beat.block.id === requested) : -1;
    return found >= 0 ? found : 0;
  });
  const [showHud, setShowHud] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicPoolRef = useRef<Set<HTMLAudioElement>>(new Set());
  const activeMusicIdRef = useRef<string | null>(null);
  const sfxRef = useRef<Set<HTMLAudioElement>>(new Set());
  const fadeTimersRef = useRef<Map<HTMLAudioElement, number>>(new Map());
  const playedSfxRef = useRef<Set<string>>(new Set());
  const currentBeatIdRef = useRef<string | null>(null);
  const current = useMemo(() => beats[index], [beats, index]);
  const hasAudio = scenes.some((scene) => scene.blocks.some(isAudioCommand));

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("block")) return;
    const controller = new AbortController();
    fetch(`/api/projects/${project.id}/progress`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const saved = await response.json() as { blockId?: string | null };
      const savedIndex = saved.blockId ? beats.findIndex((beat) => beat.block.id === saved.blockId) : -1;
      if (savedIndex >= 0) setIndex(savedIndex);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [beats, project.id]);

  useEffect(() => {
    if (!current) return;
    editor.setActiveBlockId(current.block.id);
    const url = new URL(window.location.href);
    if (url.searchParams.get("block") !== current.block.id) {
      url.searchParams.set("block", current.block.id);
      window.history.replaceState(null, "", url);
    }
    sessionStorage.setItem(`narra:reader-position:${current.scene.id}`, JSON.stringify({ blockId: current.block.id, offset: 0 }));
  }, [current?.block.id, current?.scene.id]);

  useEffect(() => {
    if (!editor.activeBlockId || editor.activeBlockId === current?.block.id) return;
    const requestedIndex = beats.findIndex((beat) => beat.block.id === editor.activeBlockId);
    if (requestedIndex >= 0) setIndex(requestedIndex);
  }, [beats, current?.block.id, editor.activeBlockId]);

  useEffect(() => {
    if (!current) return;
    void fetch(`/api/projects/${project.id}/progress`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sceneId: current.scene.id, blockId: current.block.id, percentage: ((index + 1) / beats.length) * 100 }) });
  }, [beats.length, current, index, project.id]);

  const goNext = useCallback(() => { if (editor.mode === "read") setIndex((value) => Math.min(value + 1, beats.length)); }, [editor.mode, beats.length]);
  const goPrevious = useCallback(() => setIndex((value) => Math.max(value - 1, 0)), []);

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
  }, [audioUnlocked, beats.length, hasAudio, editor.mode]);

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
      currentBeatIdRef.current = null;
      playedSfxRef.current.clear();
      return;
    }

    if (currentBeatIdRef.current !== current.block.id) {
      playedSfxRef.current.clear();
      currentBeatIdRef.current = current.block.id;
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

    const playlist = current.musicPlaylist;
    const playlistKey = `${current.scene.id}:${playlist.map((track) => `${track.id}:${track.mediaUrl}:${track.volume}:${track.loop}`).join("|")}`;
    if (activeMusicIdRef.current !== playlistKey) {
      activeMusicIdRef.current = playlistKey;
      const previous = musicRef.current;
      if (previous) previous.onended = null;

      if (playlist.length === 0) {
        if (previous) fade(previous, 0, 1, () => { previous.pause(); musicPoolRef.current.delete(previous); });
        musicRef.current = null;
        setCurrentTrackIndex(0);
      } else {
        const playlistLoops = playlist.every((track) => track.loop !== false);
        const startTrack = (trackIndex: number, fadeIn: boolean) => {
          const music = playlist[trackIndex];
          if (!music?.mediaUrl) return;
          const next = new Audio(music.mediaUrl);
          const targetVolume = Math.max(0, Math.min(1, (music.volume ?? 100) / 100));
          const fadeSeconds = fadeIn ? music.fadeDuration ?? 1 : 0;
          next.volume = fadeSeconds > 0 ? 0 : targetVolume;
          setCurrentTrackIndex(trackIndex);
          next.onended = () => {
            musicPoolRef.current.delete(next);
            if (trackIndex < playlist.length - 1) startTrack(trackIndex + 1, false);
            else if (playlistLoops) startTrack(0, false);
            else musicRef.current = null;
          };
          musicPoolRef.current.add(next);
          musicRef.current = next;
          setAudioError(null);
          void next.play().then(() => fade(next, targetVolume, fadeSeconds)).catch(() => setAudioError("Impossible de lire la playlist musicale."));
        };
        startTrack(0, true);
        if (previous) fade(previous, 0, playlist[0].fadeDuration ?? 1, () => { previous.pause(); musicPoolRef.current.delete(previous); });
      }
    }

    current.sfx.forEach((command) => {
      if (!command.mediaUrl) return;
      if (playedSfxRef.current.has(command.id)) return;
      playedSfxRef.current.add(command.id);
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
    playedSfxRef.current.clear();
    currentBeatIdRef.current = null;
  }, []);

  if (beats.length === 0) {
    return (
      <div className={styles.emptyReader} style={variables}>
        <Link href={exitHref || `/project/${project.id}`} className={styles.backLink}><ArrowLeftIcon />Retour à l’histoire</Link>
        <div className={styles.emptyModeControls}><ModeControls editor={editor} /></div>
        <div>
          <span className={styles.formatLabel}>Visual Novel</span>
          <h1>Aucun passage à jouer</h1>
          <p>Les scènes existent, mais elles ne contiennent pas encore de narration ou de dialogue.</p>
          {editor.mode === "edit" ? <FirstBlockControl scene={scenes[0]} editor={editor} /> : <Link href={`/project/${project.id}/edit`} className={styles.primaryAction}>Écrire un passage</Link>}
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
          <Link href={exitHref || `/project/${project.id}`}>Retour à l’histoire</Link>
        </div>
      </div>
    );
  }

  const { block, scene, sceneIndex } = current;
  const speaker = characterName(block.character, block.speakerNote);
  const emotionPortrait = block.character?.images.find(
    (image) => block.emotion && image.emotion.toLocaleLowerCase("fr") === block.emotion.toLocaleLowerCase("fr"),
  )?.url;
  const portrait = block.showPortrait === false ? null : block.portraitImageUrl || emotionPortrait || block.character?.portraitUrl;
  const backdrop = current.backdrop;
  const isBackdropBeat = block.type === "background";
  const isBackdropSolo = isBackdropBeat && (block.displayMode || (block.content.trim() ? "caption" : "solo")) === "solo";
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
        data-project-letter={project.name.charAt(0)}
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
      data-project-letter={project.name.charAt(0)}
      style={{
        ...variables,
        backgroundImage: backdrop ? `url("${backdrop.replace(/["\\]/g, "")}")` : undefined,
      }}
    >
      <div className={`${styles.vnShade} ${isBackdropSolo ? styles.vnShadeBackdrop : ""}`} aria-hidden="true" />
      <div className={styles.vnProgress} aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>

      {showHud && (
        <div className={styles.vnHud}>
          <Link href={exitHref || `/project/${project.id}`} className={styles.vnIconButton} aria-label="Quitter la lecture"><ArrowLeftIcon /></Link>
          <div className={styles.vnChapter}>
            <span>{scene.node?.title || `Scène ${sceneIndex + 1}`}</span>
            <strong>{scene.title}</strong>
          </div>
          <div className={styles.vnHudActions}>
            {current.musicPlaylist.length > 0 && (
              <button type="button" onClick={() => setShowPlaylist((v) => !v)} className={styles.vnIconButton} aria-label="Playlist musicale" aria-pressed={showPlaylist}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>
              </button>
            )}
            <ModeControls editor={editor} />
            <button type="button" onClick={() => setIndex(0)} className={styles.vnIconButton} aria-label="Recommencer"><RestartIcon /></button>
            <button type="button" onClick={toggleFullscreen} className={styles.vnIconButton} aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"} aria-pressed={isFullscreen}><ExpandIcon /></button>
          </div>
        </div>
      )}

      {fullscreenError && <p role="alert" className={styles.vnError}>{fullscreenError}</p>}
      {audioError && <p role="alert" className={styles.vnError}>{audioError}</p>}

      {showPlaylist && current.musicPlaylist.length > 0 && (
        <div className={styles.vnPlaylist}>
          <div className={styles.vnPlaylistHeader}>
            <strong>Playlist</strong>
            <button type="button" onClick={() => setShowPlaylist(false)} className={styles.vnIconButton} aria-label="Fermer la playlist">×</button>
          </div>
          <div className={styles.vnPlaylistTracks}>
            {current.musicPlaylist.map((track, i) => {
              const label = track.content.trim().split("\n")[0] || track.mediaUrl?.split("/").at(-1) || `Piste ${i + 1}`;
              return (
                <div key={track.id} className={`${styles.vnPlaylistTrack} ${i === currentTrackIndex ? styles.vnPlaylistTrackActive : ""}`}>
                  <span className={styles.vnPlaylistTrackIndex}>{i === currentTrackIndex ? "▶" : `${i + 1}`}</span>
                  <span className={styles.vnPlaylistTrackName}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {scene.location && <div className={styles.locationTag}>{scene.location.name}</div>}

      {editor.mode === "read" && <button type="button" className={styles.vnAdvanceLayer} onClick={goNext} aria-label="Afficher la suite" />}

      {block.type === "heading" ? (
        <section key={block.id} id={`block-${block.id}`} data-block-id={block.id} className={`${styles.vnTitleBeat} ${editor.mode === "edit" ? styles.editableBlock : ""} ${editor.activeBlockId === block.id ? styles.selectedBlock : ""}`} aria-live="polite">
          <span>{scene.node?.title || `Scène ${sceneIndex + 1}`}</span>
          {editor.mode === "edit" && editor.editingBlockId === block.id ? <textarea autoFocus value={block.content} onChange={(event) => editor.updateBlock(scene.id, block.id, { content: event.target.value })} className={styles.vnTitleEditor} /> : <h1 onClick={() => editor.mode === "edit" && editor.setEditingBlockId(block.id)}>{block.content}</h1>}
          {editor.mode === "read" && <button type="button" onClick={goNext}>Entrer dans la scène <span aria-hidden="true">›</span></button>}
          {editor.mode === "edit" && <BlockToolbar block={block} sceneId={scene.id} index={scene.blocks.findIndex((item) => item.id === block.id)} blockCount={scene.blocks.length} editor={editor} />}
        </section>
      ) : isBackdropSolo ? (
        <section key={block.id} className={styles.vnBackdropBeat} aria-live="polite">
          <span className="sr-only">Nouveau décor</span>
          <div className={styles.vnBackdropControls}>
            <span>{index + 1} / {beats.length}</span>
            <button type="button" onClick={goPrevious} disabled={index === 0}>Précédent</button>
            <button type="button" onClick={goNext}>Continuer <span aria-hidden="true">›</span></button>
          </div>
        </section>
      ) : (
        <div key={block.id} id={`block-${block.id}`} data-block-id={block.id} className={`${styles.vnDialogueFrame} ${block.type === "transition" ? styles.vnDialogueFrameTransition : ""} ${editor.mode === "edit" ? styles.editableBlock : ""} ${editor.activeBlockId === block.id ? styles.selectedBlock : ""}`}>
          {portrait && block.type === "dialogue" && (
            <img
              src={portrait}
              alt={speaker ? `Portrait de ${speaker}` : "Portrait du personnage"}
              className={styles.vnPortrait}
            />
          )}
          <section
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
            {editor.mode === "edit" && editor.editingBlockId === block.id ? (
              <EditorFields block={block} sceneId={scene.id} editor={editor} visualNovel />
            ) : <p onClick={() => editor.mode === "edit" && editor.setEditingBlockId(block.id)}>{block.content}</p>}
            {editor.mode === "edit" && <BlockToolbar block={block} sceneId={scene.id} index={scene.blocks.findIndex((item) => item.id === block.id)} blockCount={scene.blocks.length} editor={editor} />}
            <div className={styles.vnDialogueFooter}>
              <span>{index + 1} / {beats.length}</span>
              <button type="button" onClick={goPrevious} disabled={index === 0}>Précédent</button>
              {editor.mode === "read" && <button type="button" onClick={goNext}>Continuer <span aria-hidden="true">›</span></button>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function DocumentReader({ project, scenes, variables, exitHref, editor }: { project: Project; scenes: Scene[]; variables: CSSProperties; exitHref?: string; editor: EditorControls }) {
  const coverStyle = {
    backgroundImage: project.pageBackgroundUrl ? `url("${project.pageBackgroundUrl.replace(/["\\]/g, "")}")` : undefined,
  };
  const typeClass = styles[`format_${project.type}`] || styles.format_story;
  const lastSceneRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const observedBlockIds = useMemo(() => scenes.flatMap((scene) => scene.blocks.filter((block) => !isReaderCommand(block)).map((block) => block.id)).join(":"), [scenes]);

  useEffect(() => {
    const requestedBlock = new URLSearchParams(window.location.search).get("block");
    if (requestedBlock && !restoredRef.current) {
      restoredRef.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const element = document.getElementById(`block-${requestedBlock}`);
        if (!element) return;
        const sceneId = element.closest<HTMLElement>("[data-reader-scene]")?.dataset.readerScene;
        let offset = 0;
        if (sceneId) {
          try {
            const saved = JSON.parse(sessionStorage.getItem(`narra:reader-position:${sceneId}`) || "null") as { blockId?: string; offset?: number } | null;
            if (saved?.blockId === requestedBlock) offset = saved.offset || 0;
          } catch {}
        }
        element.scrollIntoView({ behavior: "auto", block: "center" });
        if (offset) window.scrollBy({ top: offset, behavior: "auto" });
      }));
    }

    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-block-id]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const target = visible.target as HTMLElement;
      const blockId = target.dataset.blockId;
      const sceneId = target.closest<HTMLElement>("[data-reader-scene]")?.dataset.readerScene;
      const currentScenes = scenesRef.current;
      const sceneIndex = currentScenes.findIndex((scene) => scene.id === sceneId);
      if (!sceneId || !blockId || sceneIndex < 0) return;
      const ed = editorRef.current;
      if (ed.mode === "edit" && ed.editingBlockId) return;
      ed.setActiveBlockId(blockId);
      const url = new URL(window.location.href);
      if (url.searchParams.get("block") !== blockId) { url.searchParams.set("block", blockId); window.history.replaceState(null, "", url); }
      sessionStorage.setItem(`narra:reader-position:${sceneId}`, JSON.stringify({ blockId, offset: Math.round(target.getBoundingClientRect().top - window.innerHeight / 2) }));
      if (lastSceneRef.current !== sceneId) {
        lastSceneRef.current = sceneId;
        void fetch(`/api/projects/${project.id}/progress`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sceneId, blockId, percentage: ((sceneIndex + 1) / currentScenes.length) * 100 }) });
      }
    }, { threshold: [.25, .5, .75] });
    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, [observedBlockIds, project.id]);

  return (
    <div className={`${styles.documentReader} ${typeClass}`} style={variables}>
      <ReaderBar project={project} scenes={scenes} exitHref={exitHref} editor={editor} />
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
          <SceneArticle key={scene.id} scene={scene} index={index} type={project.type} editor={editor} />
        ))}
        <footer className={styles.endMark}><span>Fin</span><Link href={exitHref || `/project/${project.id}`}>Retour à l’histoire</Link></footer>
      </main>
    </div>
  );
}

function SceneArticle({ scene, index, type, editor }: { scene: Scene; index: number; type: string; editor: EditorControls }) {
  if (type === "comic") {
    return (
      <article className={styles.comicScene}>
        <header><span>{scene.node?.title || `Séquence ${index + 1}`}</span><h2>{scene.title}</h2></header>
        <div className={styles.comicGrid}>
          {scene.blocks.filter((block) => !isReaderCommand(block)).map((block, blockIndex) => {
            const speaker = characterName(block.character, block.speakerNote);
            const image = block.character?.portraitUrl || scene.location?.imageUrl;
            return (
              <section key={block.id} id={`block-${block.id}`} data-block-id={block.id} onClick={() => editor.mode === "edit" && editor.setActiveBlockId(block.id)} className={`${styles.comicPanel} ${editor.mode === "edit" ? styles.editableBlock : ""} ${editor.activeBlockId === block.id ? styles.selectedBlock : ""}`} style={{ backgroundImage: image ? `url("${image.replace(/["\\]/g, "")}")` : undefined }}>
                <span className={styles.panelNumber}>{index + 1}.{blockIndex + 1}</span>
                <div className={styles.comicCaption}>
                  {speaker && <strong style={{ color: block.character?.nameColor }}>{speaker}</strong>}
                  {editor.mode === "edit" && editor.editingBlockId === block.id ? <EditorFields block={block} sceneId={scene.id} editor={editor} /> : <p onClick={() => editor.mode === "edit" && editor.setEditingBlockId(block.id)}>{block.content}</p>}
                </div>
                {editor.mode === "edit" && <BlockToolbar block={block} sceneId={scene.id} index={blockIndex} blockCount={scene.blocks.length} editor={editor} />}
              </section>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <article id={scene.id} data-reader-scene={scene.id} className={styles.sceneArticle}>
      <header className={styles.sceneHeader}>
        <div><span>{scene.node?.title || `Scène ${index + 1}`}</span><h2>{scene.title}</h2></div>
        {scene.location && <p>{scene.location.name}</p>}
      </header>
      <div className={styles.blocks}>
        {scene.blocks.filter((block) => !isReaderCommand(block)).map((block, blockIndex, visibleBlocks) => <RenderedBlock key={block.id} block={block} sceneId={scene.id} blockIndex={blockIndex} blockCount={visibleBlocks.length} type={type} editor={editor} />)}
        {editor.mode === "edit" && !scene.blocks.some((block) => !isReaderCommand(block)) && <FirstBlockControl scene={scene} editor={editor} />}
      </div>
    </article>
  );
}

const RenderedBlock = memo(function RenderedBlock({ block, sceneId, blockIndex, blockCount, type, editor }: { block: Block; sceneId: string; blockIndex: number; blockCount: number; type: string; editor: EditorControls }) {
  const speaker = characterName(block.character, block.speakerNote);
  const className = `${styles.block} ${styles[`block_${block.type}`] || ""}`;
  const editing = editor.mode === "edit" && editor.editingBlockId === block.id;

  return (
    <div
      id={`block-${block.id}`}
      data-block-id={block.id}
      className={`${styles.blockShell} ${editor.mode === "edit" ? styles.editableBlock : ""} ${editor.activeBlockId === block.id ? styles.selectedBlock : ""}`}
      onClick={() => { if (editor.mode === "edit") editor.setActiveBlockId(block.id); }}
    >
      {editing ? <EditorFields block={block} sceneId={sceneId} editor={editor} /> : <BlockContent block={block} type={type} className={className} speaker={speaker} onEdit={() => { editor.setActiveBlockId(block.id); editor.setEditingBlockId(block.id); }} editable={editor.mode === "edit"} />}
      {editor.mode === "edit" && <BlockToolbar block={block} sceneId={sceneId} index={blockIndex} blockCount={blockCount} editor={editor} />}
    </div>
  );
});

function BlockContent({ block, type, className, speaker, onEdit, editable }: { block: Block; type: string; className: string; speaker: string | null; onEdit: () => void; editable: boolean }) {
  const props = { className, onClick: editable ? onEdit : undefined };

  if (block.type === "heading") return <h3 {...props}>{block.content}</h3>;
  if (block.type === "transition") return <p {...props}>{block.content}</p>;

  if (block.type === "dialogue") {
    return (
      <div {...props}>
        {speaker && <strong style={{ color: block.character?.nameColor }}>{speaker}{type === "screenplay" && ":"}</strong>}
        {block.emotion && <span className={styles.emotion}>({block.emotion})</span>}
        <p>{block.content}</p>
      </div>
    );
  }

  return <p {...props}>{block.content}</p>;
}

function EditorFields({ block, sceneId, editor, visualNovel = false }: { block: Block; sceneId: string; editor: EditorControls; visualNovel?: boolean }) {
  const characterImages = block.character?.images || [];
  const emotions = characterImages.length > 0
    ? Array.from(new Map(characterImages.map((image) => [image.emotion, image.label || image.emotion] as [string, string])).entries()).filter(([value]) => value)
    : [["neutral", "Neutre"], ["happy", "Joyeux"], ["sad", "Triste"], ["angry", "En colère"], ["surprised", "Surpris"], ["worried", "Inquiet"]];
  return <div className={`${styles.editorFields} ${visualNovel ? styles.vnEditorFields : ""}`} onClick={(event) => event.stopPropagation()}>
    {block.type === "dialogue" && <div className={styles.dialogueFields}>
      <select aria-label="Personnage" value={block.characterId || ""} onChange={(event) => {
        const val = event.target.value;
        if (val === "__unknown__") {
          editor.updateBlock(sceneId, block.id, { characterId: null, character: null, speakerNote: "Inconnu", portraitImageUrl: null });
        } else {
          const character = editor.characters.find((item) => item.id === val) || null;
          editor.updateBlock(sceneId, block.id, { characterId: character?.id || null, character, portraitImageUrl: null });
        }
      }}>
        <option value="">Personnage…</option>
        <option value="__unknown__">Inconnu</option>
        {editor.characters.map((character) => <option key={character.id} value={character.id}>{characterName(character) || "Personnage sans nom"}</option>)}
      </select>
      <select aria-label="Émotion" value={block.emotion || ""} onChange={(event) => editor.updateBlock(sceneId, block.id, { emotion: event.target.value || null, portraitImageUrl: null })}>
        <option value="">Émotion…</option>
        {emotions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Position" value={block.position || "center"} onChange={(event) => editor.updateBlock(sceneId, block.id, { position: event.target.value })}>
        <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
      </select>
      <label className={styles.portraitToggle}><input type="checkbox" checked={block.showPortrait !== false} onChange={(event) => editor.updateBlock(sceneId, block.id, { showPortrait: event.target.checked })} /> Portrait</label>
    </div>}
    <textarea
      autoFocus value={block.content} rows={Math.max(2, block.content.split("\n").length)}
      aria-label="Contenu du bloc" onChange={(event) => editor.updateBlock(sceneId, block.id, { content: event.target.value })}
      onFocus={(event) => requestAnimationFrame(() => event.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" }))}
    />
  </div>;
}

function BlockToolbar({ block, sceneId, index, blockCount, editor }: { block: Block; sceneId: string; index: number; blockCount: number; editor: EditorControls }) {
  const insert = (event: ChangeEvent<HTMLSelectElement>, order: number) => {
    if (event.target.value) void editor.createBlock(sceneId, event.target.value, order);
    event.target.value = "";
  };
  return <div className={styles.blockToolbar} role="toolbar" aria-label="Actions du bloc" onClick={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => editor.setEditingBlockId(block.id)}>Modifier</button>
    <select defaultValue="" onChange={(event) => insert(event, block.order)} aria-label="Ajouter avant"><option value="" disabled>+ Avant</option>{INSERT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <select defaultValue="" onChange={(event) => insert(event, block.order + 1)} aria-label="Ajouter après"><option value="" disabled>+ Après</option>{INSERT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    <button type="button" onClick={() => void editor.createBlock(sceneId, block.type, block.order + 1, block)}>Dupliquer</button>
    <button type="button" onClick={() => void editor.moveBlock(sceneId, block.id, -1)} disabled={index <= 0}>Monter</button>
    <button type="button" onClick={() => void editor.moveBlock(sceneId, block.id, 1)} disabled={index === blockCount - 1}>Descendre</button>
    <button type="button" className={styles.deleteAction} onClick={() => void editor.deleteBlock(sceneId, block.id)}>Supprimer</button>
  </div>;
}

function FirstBlockControl({ scene, editor }: { scene: Scene; editor: EditorControls }) {
  return <label className={styles.firstBlockControl}>
    <span>Ajouter le premier bloc</span>
    <select defaultValue="" onChange={(event) => { if (event.target.value) void editor.createBlock(scene.id, event.target.value, 0); event.target.value = ""; }}>
      <option value="" disabled>Choisir un type…</option>
      {INSERT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  </label>;
}
