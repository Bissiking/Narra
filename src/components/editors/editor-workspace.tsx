"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { ParsedSceneScriptBlock } from "@/lib/scene-script-parser";
import { getProjectFormat } from "@/lib/editor-profiles";
import { buildCompositePlans } from "@/lib/scene-composition";
import { buildStudioEpisodes, findStudioGroup, defaultStudioEpisode, activeStudioEpisode, studioLibraryGroups } from "@/lib/studio-navigation";
import StudioV2View from "./studio-v2-view";

export interface Scene {
  id: string;
  title: string;
  status: string;
  order: number;
  wordCount: number;
  readerTitle: string | null;
  showReaderTitle: boolean;
  node: { id: string; title: string } | null;
  location: { id: string; name: string; imageUrl?: string | null } | null;
  characters: { character: { id: string; firstName: string | null; lastName: string | null; alias: string | null; portraitUrl: string | null } }[];
  _count: { blocks: number };
  blocks?: { mediaUrl?: string | null }[];
}

export interface NarrativeNode {
  id: string; type: string; title: string; order: number; children: NarrativeNode[];
}

export interface Character {
  id: string; firstName: string | null; lastName: string | null; alias: string | null;
  portraitUrl: string | null; nameColor: string;
  images: { id: string; label: string; emotion: string; url: string }[];
}

export interface SceneBlock {
  id: string; type: string; content: string; order: number;
  characterId: string | null; emotion: string | null; position: string | null; speakerNote: string | null;
  animationConfig?: unknown;
  mediaUrl?: string | null; displayMode?: "solo" | "caption" | "layer" | null; showPortrait?: boolean | null; portraitImageUrl?: string | null; audioAction?: string | null; volume?: number | null; fadeDuration?: number | null; loop?: boolean | null; animationPreset?: "none" | "zoom-in" | "zoom-out" | "pan-left-right" | "pan-right-left" | "drift-up" | "fade-in" | "float" | null;
}

export interface PreviewSettings {
  name: string;
  pageBackgroundUrl: string | null;
  pageBackgroundColor: string;
  pageTextColor: string;
  pageAccentColor: string;
}

function createDraftBlock(type: string, characters: Character[]): SceneBlock {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    content: "",
    order: 0,
    characterId: type === "dialogue" ? characters[0]?.id || null : null,
    emotion: null,
    position: null,
    speakerNote: null,
    mediaUrl: null,
    displayMode: null,
    showPortrait: type === "dialogue" ? true : null,
    portraitImageUrl: null,
    audioAction: type === "music" ? "play" : null,
    volume: type === "music" || type === "sfx" ? 100 : null,
    fadeDuration: type === "music" ? 1 : null,
    loop: type === "music" ? true : null,
    animationPreset: type === "background" ? "none" : null,
  };
}

export interface NarrativeNodeOption {
  id: string; title: string; depth: number; path: string[]; rootId: string; rootTitle: string; rank: number;
}

function flattenNarrativeNodes(nodes: NarrativeNode[]): NarrativeNodeOption[] {
  const options: NarrativeNodeOption[] = [];
  function visit(currentNodes: NarrativeNode[], parentPath: string[] = [], root?: { id: string; title: string }) {
    [...currentNodes]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"))
      .forEach((node) => {
        const currentRoot = root || { id: node.id, title: node.title };
        const path = [...parentPath, node.title];
        options.push({ id: node.id, title: node.title, depth: path.length - 1, path, rootId: currentRoot.id, rootTitle: currentRoot.title, rank: options.length });
        visit(node.children, path, currentRoot);
      });
  }
  visit(nodes);
  return options;
}

export default function EditorWorkspace({ initialSceneId }: { initialSceneId?: string } = {}) {
  const params = useParams();
  const projectId = params.projectId as string;

  const [navigationMode, setNavigationMode] = useState<"episode" | "subblock">("subblock");
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [movingScene, setMovingScene] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [structure, setStructure] = useState<NarrativeNode[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [projectType, setProjectType] = useState("story");
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>({ name: "Narra", pageBackgroundUrl: null, pageBackgroundColor: "#09090b", pageTextColor: "#fafafa", pageAccentColor: "#f59e0b" });
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<SceneBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blockLoadError, setBlockLoadError] = useState<string | null>(null);
  const [blockReloadKey, setBlockReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCreateScene, setShowCreateScene] = useState(false);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [newSceneNodeId, setNewSceneNodeId] = useState("");
  const [creatingScene, setCreatingScene] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [titleValue, setTitleValue] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [readerTitle, setReaderTitle] = useState("");
  const [showReaderTitle, setShowReaderTitle] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const [canEdit, setCanEdit] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const editVersionRef = useRef(0);
  const allowLeaveRef = useRef(false);

  const markDirty = useCallback(() => {
    editVersionRef.current += 1;
    setDirty(true);
  }, []);

  // Load data
  useEffect(() => {
    async function loadData() {
      const [scenesRes, structureRes, charsRes, projectRes, presRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/scenes`),
        fetch(`/api/projects/${projectId}/narrative-nodes`),
        fetch(`/api/projects/${projectId}/characters`),
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/presentation`),
      ]);
      const loadedScenes: Scene[] = scenesRes.ok ? await scenesRes.json() : [];
      const loadedStructure: NarrativeNode[] = structureRes.ok ? await structureRes.json() : [];
      setScenes(loadedScenes);
      setStructure(loadedStructure);
      const episodes = buildStudioEpisodes(loadedStructure, loadedScenes);
      const requestedScene = loadedScenes.find(scene => scene.id === initialSceneId);
      const initial = requestedScene ? activeStudioEpisode(episodes, null, requestedScene.id) : defaultStudioEpisode(episodes);
      setEpisodeId(initial?.id || null);
      setSelectedScene(current => current || requestedScene?.id || initial?.scenes[0]?.id || null);
      if (initial && !initial.scenes.length) setNavigationMode("episode");
      if (charsRes.ok) setCharacters(await charsRes.json());
      if (projectRes.ok) {
        const project = await projectRes.json();
        setProjectType(project.type || "story");
        setPreviewSettings({
          name: project.name || "Narra",
          pageBackgroundUrl: project.pageBackgroundUrl || null,
          pageBackgroundColor: project.pageBackgroundColor || "#09090b",
          pageTextColor: project.pageTextColor || "#fafafa",
          pageAccentColor: project.pageAccentColor || "#f59e0b",
        });
      }
      if (presRes.ok) {
        const pres = await presRes.json();
        setCanEdit(pres.canEdit !== false);
      }
      setLoading(false);
    }
    loadData();
  }, [projectId, initialSceneId]);

  // Load blocks when scene selected
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setSelectedBlockId(null);
    setBlockLoadError(null);
    if (!selectedScene) { setBlocks([]); setBlocksLoading(false); return; }
    setBlocks([]);
    setBlocksLoading(true);
    async function loadBlocks() {
      try {
        const res = await fetch(`/api/scenes/${selectedScene}/blocks`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const loadedBlocks = await res.json() as SceneBlock[];
        if (!active) return;
        setBlocks(loadedBlocks);
        setSelectedBlockId(loadedBlocks[0]?.id || null);
        setDirty(false);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        console.error("Block loading error:", error);
        setBlockLoadError("Impossible de charger cette timeline pour le moment.");
      } finally {
        if (active) setBlocksLoading(false);
      }
    }
    loadBlocks();
    return () => { active = false; controller.abort(); };
  }, [selectedScene, blockReloadKey]);

  useEffect(() => {
    const scene = scenes.find((s) => s.id === selectedScene);
    if (scene) {
      setTitleValue(scene.title);
      setSelectedStatus(scene.status);
      setSelectedNodeId(scene.node?.id || "");
      setReaderTitle(scene.readerTitle || "");
      setShowReaderTitle(scene.showReaderTitle);
    }
  }, [selectedScene, scenes]);

  // WebSocket
  useEffect(() => {
    if (!selectedScene) return;
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/scenes/${selectedScene}`);
      ws.onopen = () => { if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; } };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "block:update" && msg.block) setBlocks((p) => p.map((b) => (b.id === msg.block!.id ? msg.block! : b)));
          if (msg.type === "block:create" && msg.block) setBlocks((p) => [...p, msg.block!].sort((a, b) => a.order - b.order));
          if (msg.type === "block:delete" && msg.blockId) setBlocks((p) => p.filter((b) => b.id !== msg.blockId));
          if (msg.type === "user:join" && msg.userId && msg.userName) setOnlineUsers((p) => new Map(p).set(msg.userId, msg.userName));
          if (msg.type === "user:leave" && msg.userId) setOnlineUsers((p) => { const n = new Map(p); n.delete(msg.userId); return n; });
        } catch {}
      };
      ws.onclose = () => { reconnectRef.current = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }
    connect();
    return () => { if (wsRef.current) wsRef.current.close(); if (reconnectRef.current) clearTimeout(reconnectRef.current); };
  }, [selectedScene]);

  const sendWs = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  // Block ops
  const addBlock = useCallback((type: string, afterId: string | null = null) => {
    const block = createDraftBlock(type, characters);
    setBlocks((current) => {
      const afterIndex = afterId ? current.findIndex((block) => block.id === afterId) : -1;
      const insertAt = afterIndex >= 0 ? afterIndex + 1 : current.length;
      const next = [...current];
      next.splice(insertAt, 0, block);
      return next.map((item, index) => ({ ...item, order: index }));
    });
    setSelectedBlockId(block.id);
    markDirty();
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`scene-block-${block.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.querySelector("textarea")?.focus({ preventScroll: true });
    });
  }, [characters, markDirty]);

  function importBlocks(imported: ParsedSceneScriptBlock[], mode: "append" | "replace") {
    setBlocks((current) => {
      const base = mode === "replace" ? [] : current;
      const timestamp = Date.now();
      const additions = imported.map((block, index) => ({
        ...block,
        id: `temp-import-${timestamp}-${index}`,
        order: base.length + index,
      }));
      return [...base, ...additions].map((block, index) => ({ ...block, order: index }));
    });
    markDirty();
  }

  const updateBlock = useCallback((id: string, updates: Partial<SceneBlock>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      const block = next.find((b) => b.id === id);
      if (block && !block.id.startsWith("temp-")) sendWs({ type: "block:update", blockId: id, block });
      return next;
    });
    markDirty();
  }, [markDirty, sendWs]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((block, index) => ({ ...block, order: index })));
    setSelectedBlockId((selected) => selected === id ? null : selected);
    if (!id.startsWith("temp-")) sendWs({ type: "block:delete", blockId: id });
    markDirty();
  }, [markDirty, sendWs]);

  function handlePlanDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const plans = buildCompositePlans(items);
      const from = plans.findIndex((plan) => plan.id === active.id);
      const to = plans.findIndex((plan) => plan.id === over.id);
      if (from < 0 || to < 0) return items;
      const reorderedContent = arrayMove(plans, from, to).flatMap((plan) => plan.blocks);
      const music = items.filter((block) => block.type === "music");
      return [...reorderedContent, ...music].map((block, order) => ({ ...block, order }));
    });
    markDirty();
  }

  function handleMusicDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const content = items.filter((block) => block.type !== "music");
      const music = items.filter((block) => block.type === "music");
      const from = music.findIndex((block) => block.id === active.id);
      const to = music.findIndex((block) => block.id === over.id);
      if (from < 0 || to < 0) return items;
      return [...content, ...arrayMove(music, from, to)].map((block, order) => ({ ...block, order }));
    });
    markDirty();
  }

  // Save blocks
  const saveBlocks = useCallback(async () => {
    if (!selectedScene || blocksLoading || blockLoadError) return false;
    if (!dirty) return true;
    const savedVersion = editVersionRef.current;
    const selectedOrder = blocks.find((block) => block.id === selectedBlockId)?.order ?? 0;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/scenes/${selectedScene}/blocks`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as { blocks: SceneBlock[] };
      if (editVersionRef.current === savedVersion) {
        setBlocks(result.blocks);
        setSelectedBlockId(result.blocks.find((block) => block.order === selectedOrder)?.id || result.blocks[0]?.id || null);
        setDirty(false);
        setScenes(current => current.map(scene => scene.id === selectedScene ? {...scene, _count: {blocks: result.blocks.length}, wordCount: result.blocks.reduce((n, b) => n + (["music", "sfx", "background"].includes(b.type) ? 0 : b.content.split(/\s+/).filter(Boolean).length), 0)} : scene));
        setLastSaved(new Date());
        return true;
      }
      setSaveError("Une modification plus récente attend encore d’être sauvegardée.");
      return false;
    } catch (err) {
      console.error("Save error:", err);
      setSaveError("Échec de la sauvegarde. Vos modifications restent dans l’éditeur.");
      return false;
    } finally { setSaving(false); }
  }, [selectedScene, selectedBlockId, blocks, blocksLoading, blockLoadError, dirty]);

  useEffect(() => { const i = setInterval(saveBlocks, 30000); return () => clearInterval(i); }, [saveBlocks]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!dirty || allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const saveBeforeLink = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin || anchor.href === window.location.href) return;
      event.preventDefault();
      void saveBlocks().then((saved) => {
        if (!saved) return;
        allowLeaveRef.current = true;
        window.location.assign(anchor.href);
      });
    };
    document.addEventListener("click", saveBeforeLink, true);
    return () => document.removeEventListener("click", saveBeforeLink, true);
  }, [dirty, saveBlocks]);

  const selectScene = useCallback(async (sceneId: string) => {
    if (sceneId === selectedScene) return true;
    if (dirty && !(await saveBlocks())) {
      setSaveError("Une modification attend encore d’être sauvegardée. Relancez le changement de sous-bloc.");
      return false;
    }
    setSelectedScene(sceneId);
    return true;
  }, [dirty, saveBlocks, selectedScene]);

  // Save scene title
  async function saveTitle() {
    if (!selectedScene || !canEdit) return;
    if (!titleValue.trim()) throw new Error("Le titre ne peut pas être vide.");
    if (titleValue.trim() === scenes.find(scene => scene.id === selectedScene)?.title) return;
    const res = await fetch(`/api/projects/${projectId}/scenes/${selectedScene}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: titleValue.trim() }) });
    if (!res.ok) throw new Error("Impossible de renommer le sous-bloc. Réessayez.");
    const updated = await res.json();
    setScenes(current => current.map(scene => scene.id === selectedScene ? {...scene, title:updated.title} : scene));
    setTitleValue(updated.title);
  }

  // Save scene metadata
  async function saveMetadata() {
    if (!selectedScene) return;
    const res = await fetch(`/api/projects/${projectId}/scenes/${selectedScene}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: selectedStatus, nodeId: selectedNodeId || null, readerTitle: readerTitle.trim() || null, showReaderTitle }) });
    if (res.ok) {
      const updated = await res.json();
      setScenes((s) => s.map((sc) => (sc.id === selectedScene ? { ...sc, status: updated.status, node: updated.node, readerTitle: updated.readerTitle, showReaderTitle: updated.showReaderTitle } : sc)));
    }
    if (!res.ok) throw new Error("Metadata save failed");
  }

  // Create scene
  async function handleCreateScene(e: React.FormEvent) {
    e.preventDefault();
    if (!newSceneTitle.trim()) return;
    if (dirty && !(await saveBlocks())) { setCreateError("Sauvegardez la scène actuelle avant d’en créer une autre."); return; }
    setCreatingScene(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newSceneTitle.trim(), nodeId: newSceneNodeId || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScenes((c) => [...c, data]);
      setSelectedScene(data.id);
      setEpisodeId(null); setNavigationMode("subblock");
      setNewSceneTitle("");
      setShowCreateScene(false);
    } catch (err) { setCreateError(err instanceof Error ? err.message : "Erreur"); } finally { setCreatingScene(false); }
  }

  // Delete scene
  async function deleteScene() {
    if (!selectedScene || !confirm("Supprimer cette scène ?")) return;
    const res = await fetch(`/api/projects/${projectId}/scenes/${selectedScene}`, { method: "DELETE" });
    if (res.ok) { setScenes((s) => s.filter((sc) => sc.id !== selectedScene)); setSelectedScene(null); }
  }

  const nodeOptions = flattenNarrativeNodes(structure);
  const nodeMetadata = new Map(nodeOptions.map((n) => [n.id, n]));
  const episodes = buildStudioEpisodes(structure, scenes);
  const activeEpisode = activeStudioEpisode(episodes, episodeId, selectedScene);
  const episodeMode = navigationMode === "episode";
  async function openSubblock(id: string) {
    if (await selectScene(id)) { setEpisodeId(episodes.find(e => e.scenes.some(s => s.id === id))?.id || null); setNavigationMode("subblock"); }
  }
  async function selectEpisode(id: string) {
    const episode = episodes.find(e => e.id === id);
    if (!episode || id === activeEpisode?.id) return;
    if (dirty && !(await saveBlocks())) return;
    setEpisodeId(id); setSelectedScene(episode.scenes[0]?.id || null); setNavigationMode("episode");
  }
  async function moveScene(id: string, direction: -1 | 1) {
    const group = activeEpisode && findStudioGroup(activeEpisode.groups, id);
    const index = group?.scenes.findIndex(scene => scene.id === id) ?? -1;
    const target = group?.scenes[index + direction];
    if (target) await reorderScene(id, target.id);
  }
  async function reorderScene(id: string, targetId: string) {
    if (movingScene || !canEdit || id === targetId) return;
    const group = episodes.map(episode => findStudioGroup(episode.groups, id)).find(Boolean);
    if (!group) return;
    const index = group.scenes.findIndex(s => s.id === id);
    const target = group.scenes.findIndex(scene => scene.id === targetId);
    if (target < 0 || target >= group.scenes.length) return;
    setMovingScene(true); setNavigationError(null);
    const ordered = arrayMove(group.scenes, index, target);
    try {
      const response = await fetch('/api/projects/'+projectId+'/scenes/reorder', {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({nodeId: group.nodeId, sceneIds: ordered.map(s => s.id)})});
      if (!response.ok) throw new Error("Impossible d’enregistrer l’ordre. Rechargez le studio puis réessayez.");
      const orders = new Map(ordered.map((s, i) => [s.id, i]));
      setScenes(current => current.map(s => orders.has(s.id) ? {...s, order: orders.get(s.id)!} : s));
    } catch (error) { setNavigationError(error instanceof Error ? error.message : "Réordonnancement impossible."); }
    finally { setMovingScene(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;

  const selectedSceneData = scenes.find((s) => s.id === selectedScene);
  const projectFormat = getProjectFormat(projectType);

  return <StudioV2View
    projectId={projectId} projectType={projectType} settings={previewSettings}
    scenes={activeEpisode?.scenes || []} groups={studioLibraryGroups(activeEpisode)} nodeOptions={nodeOptions} characters={characters}
    episodes={episodes} activeEpisode={activeEpisode} episodeMode={episodeMode}
    selectedScene={selectedSceneData || null} blocks={blocks} selectedBlockId={selectedBlockId}
    onSelectBlock={setSelectedBlockId} onOpenScene={openSubblock} onSelectScene={selectScene}
    onModeChange={mode => mode === "episode" ? setNavigationMode("episode") : selectedScene && void openSubblock(selectedScene)}
    onSelectEpisode={selectEpisode} onMoveScene={moveScene} onReorderScene={reorderScene} movingScene={movingScene}
    onAddBlock={addBlock} onUpdateBlock={updateBlock} onRemoveBlock={removeBlock} onImport={importBlocks}
    onRestoreBlocks={next => { setBlocks(next); setSelectedBlockId(current => next.some(block => block.id === current) ? current : next[0]?.id || null); markDirty(); }}
    onReorderPlans={handlePlanDragEnd} onReorderMusic={handleMusicDragEnd}
    canEdit={canEdit} loading={blocksLoading} loadError={blockLoadError} onRetry={() => setBlockReloadKey(k => k+1)}
    dirty={dirty} saving={saving} saveError={saveError} lastSaved={lastSaved} onSave={saveBlocks}
    navigationError={navigationError} onlineCount={onlineUsers.size}
    onCreateScene={() => { setNewSceneNodeId(activeEpisode?.groups[0]?.nodeId || (activeEpisode && nodeMetadata.has(activeEpisode.id) ? activeEpisode.id : "")); setShowCreateScene(v => !v); }}
    createSceneForm={showCreateScene ? <form onSubmit={handleCreateScene}>
      <input value={newSceneTitle} onChange={e => setNewSceneTitle(e.target.value)} placeholder="Titre du sous-bloc" aria-label="Titre du sous-bloc" autoFocus required />
      <select value={newSceneNodeId} onChange={e => setNewSceneNodeId(e.target.value)} aria-label="Rattachement narratif"><option value="">Sans rattachement</option>{nodeOptions.map(n => <option key={n.id} value={n.id}>{n.path.join(" / ")}</option>)}</select>
      {createError && <p role="alert">{createError}</p>}<button type="submit" disabled={creatingScene}>{creatingScene ? "Création…" : "Créer la scène"}</button>
    </form> : null}
    metadata={{status:selectedStatus,nodeId:selectedNodeId,readerTitle,showReaderTitle,onStatus:setSelectedStatus,onNode:setSelectedNodeId,onReaderTitle:setReaderTitle,onShowTitle:setShowReaderTitle,onSave:saveMetadata}}
    title={{value:titleValue,onChange:setTitleValue,onSave:saveTitle}} onDeleteScene={deleteScene}
  />;

}
