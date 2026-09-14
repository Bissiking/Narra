"use client";

import { type CSSProperties, useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SceneBlockItem from "@/components/scene-block-item";
import SceneScriptImporter from "@/components/scene-script-importer";
import type { ParsedSceneScriptBlock } from "@/lib/scene-script-parser";
import { getEditorProfile, getProjectFormat } from "@/lib/editor-profiles";
import { buildCompositePlans, isPlanLayer, type CompositePlan } from "@/lib/scene-composition";
import editorStyles from "./editor-workspace.module.css";

interface Scene {
  id: string;
  title: string;
  status: string;
  order: number;
  wordCount: number;
  node: { id: string; title: string } | null;
  location: { id: string; name: string; imageUrl?: string | null } | null;
  characters: { character: { id: string; firstName: string | null; lastName: string | null; alias: string | null; portraitUrl: string | null } }[];
  _count: { blocks: number };
}

interface NarrativeNode {
  id: string; type: string; title: string; order: number; children: NarrativeNode[];
}

interface Character {
  id: string; firstName: string | null; lastName: string | null; alias: string | null;
  portraitUrl: string | null; nameColor: string;
  images: { id: string; label: string; emotion: string; url: string }[];
}

interface SceneBlock {
  id: string; type: string; content: string; order: number;
  characterId: string | null; emotion: string | null; position: string | null; speakerNote: string | null;
  mediaUrl?: string | null; displayMode?: "solo" | "caption" | "layer" | null; showPortrait?: boolean | null; portraitImageUrl?: string | null; audioAction?: string | null; volume?: number | null; fadeDuration?: number | null; loop?: boolean | null;
}

interface PreviewSettings {
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
  };
}

interface NarrativeNodeOption {
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

export default function EditPage() {
  const params = useParams();
  const projectId = params.projectId as string;

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
  const [showMetadata, setShowMetadata] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
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
      const [scenesRes, structureRes, charsRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/scenes`),
        fetch(`/api/projects/${projectId}/narrative-nodes`),
        fetch(`/api/projects/${projectId}/characters`),
        fetch(`/api/projects/${projectId}`),
      ]);
      if (scenesRes.ok) {
        const loadedScenes = await scenesRes.json() as Scene[];
        setScenes(loadedScenes);
        setSelectedScene((current) => current || loadedScenes[0]?.id || null);
      }
      if (structureRes.ok) setStructure(await structureRes.json());
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
      setLoading(false);
    }
    loadData();
  }, [projectId]);

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

  const addLayerToPlan = useCallback((type: "background" | "sfx", planId: string) => {
    const layer = createDraftBlock(type, characters);
    if (type === "background") layer.displayMode = "layer";
    setBlocks((current) => {
      const plan = buildCompositePlans(current).find((item) => item.id === planId);
      const leadIndex = plan ? current.findIndex((block) => block.id === plan.lead.id) : current.length;
      const next = [...current];
      next.splice(Math.max(0, leadIndex), 0, layer);
      return next.map((item, index) => ({ ...item, order: index }));
    });
    setSelectedBlockId(layer.id);
    markDirty();
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

  const jumpToBlock = useCallback((id: string) => {
    const element = document.getElementById(`scene-block-${id}`);
    if (!element) return;
    setSelectedBlockId(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    element.querySelector("textarea")?.focus({ preventScroll: true });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    if (sceneId === selectedScene) return;
    if (dirty && !(await saveBlocks())) {
      setSaveError("Une modification attend encore d’être sauvegardée. Relancez le changement de scène.");
      return;
    }
    setSelectedScene(sceneId);
  }, [dirty, saveBlocks, selectedScene]);

  // Save scene title
  async function saveTitle() {
    if (!selectedScene || !titleValue.trim() || titleValue === scenes.find((s) => s.id === selectedScene)?.title) { setEditTitle(false); return; }
    const res = await fetch(`/api/projects/${projectId}/scenes/${selectedScene}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: titleValue.trim() }) });
    if (res.ok) { const updated = await res.json(); setScenes((s) => s.map((sc) => (sc.id === selectedScene ? { ...sc, title: updated.title } : sc))); }
    setEditTitle(false);
  }

  // Save scene metadata
  async function saveMetadata() {
    if (!selectedScene) return;
    const res = await fetch(`/api/projects/${projectId}/scenes/${selectedScene}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: selectedStatus, nodeId: selectedNodeId || null }) });
    if (res.ok) {
      const updated = await res.json();
      setScenes((s) => s.map((sc) => (sc.id === selectedScene ? { ...sc, status: updated.status, node: updated.node } : sc)));
    }
    setShowMetadata(false);
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
  const sortedScenes = [...scenes].sort((a, b) => {
    const aRank = a.node ? nodeMetadata.get(a.node.id)?.rank ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const bRank = b.node ? nodeMetadata.get(b.node.id)?.rank ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.order - b.order || a.title.localeCompare(b.title, "fr");
  });

  const sceneGroups = sortedScenes.reduce<{ id: string; title: string; scenes: Scene[] }[]>((groups, scene) => {
    const metadata = scene.node ? nodeMetadata.get(scene.node.id) : undefined;
    const id = metadata?.rootId || "unassigned";
    let group = groups.find((c) => c.id === id);
    if (!group) { group = { id, title: metadata?.rootTitle || "Sans rattachement", scenes: [] }; groups.push(group); }
    group.scenes.push(scene);
    return groups;
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;

  const selectedSceneData = scenes.find((s) => s.id === selectedScene);
  const selectedBlockIndex = selectedBlockId ? blocks.findIndex((block) => block.id === selectedBlockId) : -1;
  const compositePlans = buildCompositePlans(blocks);
  const musicBlocks = blocks.filter((block) => block.type === "music");
  const selectedPlanIndex = compositePlans.findIndex((plan) => plan.blocks.some((block) => block.id === selectedBlockId));
  const selectedPlan = selectedPlanIndex >= 0 ? compositePlans[selectedPlanIndex] : null;
  const playlistLoops = musicBlocks.length > 0 && musicBlocks.every((block) => block.loop !== false);
  const wordCount = blocks.reduce((acc, b) => acc + (["music", "sfx", "background"].includes(b.type) ? 0 : b.content.split(/\s+/).filter(Boolean).length), 0);
  const totalWords = scenes.reduce((acc, s) => acc + s.wordCount, 0);
  const editorProfile = getEditorProfile(projectType);
  const projectFormat = getProjectFormat(projectType);
  const selectedBlock = selectedBlockIndex >= 0 ? blocks[selectedBlockIndex] : null;

  return (
    <div className={editorStyles.workspace}>
      <header className={editorStyles.topbar}>
        <Link href={`/project/${projectId}`} className={editorStyles.backButton} aria-label="Retour au projet"><BackIcon /></Link>
        <div className={editorStyles.productTitle}>
          <h1>Montage</h1>
          <span>{previewSettings.name}</span>
        </div>
        <div className={editorStyles.sceneTitle}>
          {selectedScene && editTitle ? (
            <input value={titleValue} onChange={(event) => setTitleValue(event.target.value)} onBlur={saveTitle} onKeyDown={(event) => event.key === "Enter" && saveTitle()} autoFocus aria-label="Titre de la scène" />
          ) : (
            <button type="button" onClick={() => selectedScene && setEditTitle(true)} disabled={!selectedScene}>{selectedSceneData?.title || "Aucune scène sélectionnée"}</button>
          )}
          {selectedScene && <span>{blocks.length} {editorProfile.unit[blocks.length === 1 ? 0 : 1]} · {wordCount} mots</span>}
        </div>
        <div className={editorStyles.topActions}>
          {onlineUsers.size > 0 && <span className={editorStyles.presence}><i />{onlineUsers.size} en ligne</span>}
          {dirty && !saving && !saveError && <span className={editorStyles.dirtyState}>Modifié</span>}
          {lastSaved && !saving && !dirty && <span className={editorStyles.savedState}>Sauvé à {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
          {saveError && <span className={editorStyles.saveError} role="alert">Non sauvegardé</span>}
          <button type="button" className={editorStyles.secondaryButton} onClick={() => setShowMetadata((value) => !value)} disabled={!selectedScene}>Réglages</button>
          <button type="button" className={editorStyles.saveButton} onClick={saveBlocks} disabled={!selectedScene || saving || blocksLoading || !!blockLoadError}><SaveIcon />{saving ? "Sauvegarde" : "Sauver"}</button>
        </div>
      </header>

      <aside className={editorStyles.library} aria-label="Scènes du projet">
        <div className={editorStyles.panelHeader}>
          <div><strong>Scènes</strong><span>{scenes.length} · {totalWords.toLocaleString("fr-FR")} mots</span></div>
          <button type="button" onClick={() => setShowCreateScene((value) => !value)} aria-expanded={showCreateScene} aria-label="Créer une scène"><PlusIcon /></button>
        </div>
        {showCreateScene && <form onSubmit={handleCreateScene} className={editorStyles.createSceneForm}>
          <input value={newSceneTitle} onChange={(event) => setNewSceneTitle(event.target.value)} placeholder={projectFormat.content.titlePlaceholder} aria-label={`Titre ${projectFormat.content.ofDefinite}`} autoFocus required />
          <select value={newSceneNodeId} onChange={(event) => setNewSceneNodeId(event.target.value)} aria-label="Rattachement narratif">
            <option value="">Sans rattachement</option>
            {nodeOptions.map((node) => <option key={node.id} value={node.id}>{`${"— ".repeat(node.depth)}${node.title}`}</option>)}
          </select>
          {createError && <p role="alert">{createError}</p>}
          <button type="submit" disabled={creatingScene}>{creatingScene ? "Création…" : "Créer la scène"}</button>
        </form>}
        <div className={editorStyles.sceneList}>
          {sceneGroups.map((group) => <section key={group.id}>
            <h2>{group.title}</h2>
            {group.scenes.map((scene, sceneIndex) => <button key={scene.id} type="button" onClick={() => void selectScene(scene.id)} aria-current={selectedScene === scene.id ? "true" : undefined}>
              <span className={editorStyles.sceneIndex}>{String(sceneIndex + 1).padStart(2, "0")}</span>
              <span className={editorStyles.sceneName}><strong>{scene.title}</strong><small>{scene.node?.title || "Sans séquence"}</small></span>
              <span className={editorStyles.sceneCount}>{scene._count.blocks}</span>
            </button>)}
          </section>)}
        </div>
      </aside>

      <main className={editorStyles.monitorArea}>
        {blocksLoading ? <div className={editorStyles.noSelection}><strong>Chargement de la preview…</strong></div> : blockLoadError ? <div className={editorStyles.noSelection}><strong>Preview indisponible</strong><span>Rechargez la timeline pour reprendre le montage.</span></div> : selectedSceneData ? <PreviewMonitor scene={selectedSceneData} blocks={blocks} selectedBlockId={selectedBlockId} onSelect={setSelectedBlockId} characters={characters} settings={previewSettings} /> : <div className={editorStyles.noSelection}><strong>Choisissez une scène</strong><span>Le moniteur affichera ici votre montage.</span></div>}
      </main>

      <aside className={editorStyles.inspector} aria-label="Inspecteur">
        <div className={editorStyles.panelHeader}>
          <div><strong>Inspecteur</strong><span>{selectedBlock ? selectedBlock.type === "music" ? "Piste musique" : `Plan ${String(selectedPlanIndex + 1).padStart(2, "0")} · ${BLOCK_LABELS[selectedBlock.type] || selectedBlock.type}` : "Aucun plan actif"}</span></div>
        </div>
        {showMetadata && selectedScene ? <div className={editorStyles.metadataPanel}>
          <label>Statut<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}><option value="draft">Brouillon</option><option value="writing">En cours</option><option value="review">Révision</option><option value="final">Final</option></select></label>
          <label>Séquence<select value={selectedNodeId} onChange={(event) => setSelectedNodeId(event.target.value)}><option value="">Aucune</option>{nodeOptions.map((node) => <option key={node.id} value={node.id}>{`${"— ".repeat(node.depth)}${node.title}`}</option>)}</select></label>
          <button type="button" onClick={saveMetadata}>Appliquer</button>
        </div> : selectedBlock ? <div className={editorStyles.inspectorBody}>
          <SceneBlockItem block={selectedBlock} characters={characters} onUpdate={updateBlock} onRemove={removeBlock} onSelect={setSelectedBlockId} selected projectId={projectId} projectType={projectType} inspector playlistMode={selectedBlock.type === "music"} />
          <div className={editorStyles.inspectorActions}>
            {selectedBlock.type !== "music" && <button type="button" onClick={() => addBlock("heading", selectedPlan?.blocks.at(-1)?.id || selectedBlock.id)}><CutIcon />Nouveau plan après</button>}
            <button type="button" className={editorStyles.dangerButton} onClick={() => removeBlock(selectedBlock.id)}><DeleteIcon />Supprimer le bloc</button>
          </div>
        </div> : <div className={editorStyles.inspectorEmpty}><span>Sélectionnez un segment dans la timeline pour modifier son contenu.</span></div>}
        {selectedSceneData?.characters.length ? <div className={editorStyles.castStrip}>
          <span>Distribution</span>
          <div>{selectedSceneData.characters.map(({ character }) => <Link key={character.id} href={`/project/${projectId}/characters/${character.id}`} title={character.alias || character.firstName || "Personnage"}>{character.portraitUrl ? <img src={character.portraitUrl} alt="" /> : <i>{(character.alias?.[0] || character.firstName?.[0] || "?").toUpperCase()}</i>}</Link>)}</div>
        </div> : null}
      </aside>

      <section className={editorStyles.timeline} aria-label="Timeline de la scène">
        <div className={editorStyles.timelineToolbar}>
          <div><strong>Timeline composite</strong><span>{selectedPlanIndex >= 0 ? `TC ${formatTimecode(selectedPlanIndex)}` : "Prêt au montage"}</span></div>
          <div className={editorStyles.quickAdd}>
            <button type="button" onClick={() => addBlock("heading", selectedPlan?.blocks.at(-1)?.id || selectedBlockId)} disabled={!selectedScene || blocksLoading || !!blockLoadError}><PlusIcon />Plan</button>
            <button type="button" onClick={() => addBlock("action", selectedPlan?.blocks.at(-1)?.id || selectedBlockId)} disabled={!selectedScene || blocksLoading || !!blockLoadError}>Action</button>
            <button type="button" onClick={() => addBlock("dialogue", selectedPlan?.blocks.at(-1)?.id || selectedBlockId)} disabled={!selectedScene || blocksLoading || !!blockLoadError}>Dialogue</button>
            <select defaultValue="" onChange={(event) => { if (event.target.value) addBlock(event.target.value, selectedBlockId); event.target.value = ""; }} disabled={!selectedScene || blocksLoading || !!blockLoadError} aria-label="Ajouter un autre type de bloc">
              <option value="" disabled>Autre…</option>{editorProfile.blocks.filter((type) => !["heading", "action", "dialogue"].includes(type.value)).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <SceneScriptImporter characters={characters} existingBlockCount={blocks.length} onImport={importBlocks} compact disabled={blocksLoading || !!blockLoadError} />
          </div>
        </div>
        <div className={editorStyles.timelineViewport}>
          {!selectedScene ? <div className={editorStyles.timelineEmpty}>Sélectionnez une scène pour commencer.</div> : blocksLoading ? <div className={editorStyles.timelineEmpty}>Chargement de la timeline…</div> : blockLoadError ? <div className={editorStyles.timelineError} role="alert"><span>{blockLoadError}</span><button type="button" onClick={() => setBlockReloadKey((key) => key + 1)}>Réessayer</button></div> : blocks.length === 0 ? <div className={editorStyles.timelineEmpty}><button type="button" onClick={() => addBlock(editorProfile.blocks[0].value)}>Créer le premier plan</button></div> :
          <div className={editorStyles.trackStack}>
            <div className={editorStyles.trackRow}>
              <div className={editorStyles.trackLabel}><strong>Plans</strong><span>{compositePlans.length}</span></div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePlanDragEnd}>
                <SortableContext items={compositePlans.map((plan) => plan.id)} strategy={horizontalListSortingStrategy}>
                  <div className={editorStyles.track}>
                    {compositePlans.map((plan, index) => <PlanClip key={plan.id} plan={plan} index={index} selectedBlockId={selectedBlockId} onSelect={setSelectedBlockId} onAddLayer={addLayerToPlan} />)}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <div className={`${editorStyles.trackRow} ${editorStyles.musicTrackRow}`}>
              <div className={editorStyles.trackLabel}><strong>Musique</strong><span>Playlist</span></div>
              <div className={editorStyles.musicTrackContent}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMusicDragEnd}>
                  <SortableContext items={musicBlocks.map((block) => block.id)} strategy={horizontalListSortingStrategy}>
                    <div className={editorStyles.musicTrack}>
                      {musicBlocks.map((block, index) => <MusicClip key={block.id} block={block} index={index} selected={selectedBlockId === block.id} onSelect={setSelectedBlockId} />)}
                      <button type="button" className={editorStyles.addMusic} onClick={() => addBlock("music")}><PlusIcon />Ajouter une musique</button>
                    </div>
                  </SortableContext>
                </DndContext>
                <PlaylistControls blocks={musicBlocks} loop={playlistLoops} onToggleLoop={(loop) => { setBlocks((current) => current.map((block) => block.type === "music" ? { ...block, loop } : block)); markDirty(); }} />
              </div>
            </div>
          </div>}
        </div>
        {selectedScene && <div className={editorStyles.timelineFooter}>
          <span>{projectFormat.nav.edit} · {editorProfile.label}</span>
          <button type="button" onClick={deleteScene}><DeleteIcon />Supprimer la scène</button>
        </div>}
      </section>
    </div>
  );
}

const BLOCK_LABELS: Record<string, string> = { heading: "Plan", action: "Action", narration: "Narration", dialogue: "Dialogue", transition: "Transition", note: "Note", background: "Décor", music: "Musique", sfx: "Effet" };

function formatTimecode(index: number) {
  const totalSeconds = Math.max(0, index) * 3;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:00`;
}

function characterName(character: Character | undefined) {
  return character?.alias || [character?.firstName, character?.lastName].filter(Boolean).join(" ") || "Personnage";
}

function PreviewMonitor({ scene, blocks, selectedBlockId, onSelect, characters, settings }: { scene: Scene; blocks: SceneBlock[]; selectedBlockId: string | null; onSelect: (id: string) => void; characters: Character[]; settings: PreviewSettings }) {
  const [playing, setPlaying] = useState(false);
  const plans = buildCompositePlans(blocks);
  const selectedIndex = Math.max(0, plans.findIndex((plan) => plan.blocks.some((block) => block.id === selectedBlockId)));
  const plan = plans[selectedIndex];
  const selectedBlock = plan?.blocks.find((block) => block.id === selectedBlockId);
  const block = selectedBlock && !isPlanLayer(selectedBlock) ? selectedBlock : plan?.lead;
  const character = characters.find((item) => item.id === block?.characterId);
  const expression = character?.images.find((image) => block?.emotion && image.emotion.toLocaleLowerCase("fr") === block.emotion.toLocaleLowerCase("fr"));
  const portrait = block?.showPortrait === false ? null : block?.portraitImageUrl || expression?.url || character?.portraitUrl;
  const backdrop = plans.slice(0, selectedIndex + 1).flatMap((item) => item.layers).reverse().find((item) => item.type === "background" && item.mediaUrl)?.mediaUrl || scene.location?.imageUrl || settings.pageBackgroundUrl;
  const monitorVariables = { "--preview-bg": settings.pageBackgroundColor, "--preview-ink": settings.pageTextColor, "--preview-accent": settings.pageAccentColor } as CSSProperties;

  useEffect(() => {
    if (!playing || plans.length < 2) return;
    const timer = window.setInterval(() => {
      const current = plans.findIndex((item) => item.blocks.some((candidate) => candidate.id === selectedBlockId));
      if (current >= plans.length - 1) { setPlaying(false); return; }
      onSelect(plans[current + 1].lead.id);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [onSelect, plans, playing, selectedBlockId]);

  useEffect(() => {
    if (!playing || !plan) return;
    const audio = plan.layers.filter((layer) => layer.type === "sfx" && layer.mediaUrl).map((layer) => {
      const effect = new Audio(layer.mediaUrl!);
      effect.volume = Math.max(0, Math.min(1, (layer.volume ?? 100) / 100));
      void effect.play().catch(() => undefined);
      return effect;
    });
    return () => audio.forEach((effect) => effect.pause());
  }, [playing, plan?.id]);

  useEffect(() => { if (!block) setPlaying(false); }, [block]);

  return <div className={editorStyles.monitor} style={monitorVariables}>
    <div className={editorStyles.monitorHeader}><span>Preview · {scene.title}</span><span>{formatTimecode(selectedIndex)}</span></div>
    <div className={editorStyles.previewStage} style={{ backgroundImage: backdrop ? `url("${backdrop.replace(/["\\]/g, "")}")` : undefined }}>
      <div className={editorStyles.previewShade} />
      {!block ? <div className={editorStyles.previewEmpty}>Ajoutez un premier bloc à la timeline.</div> : block.type === "background" && !block.content ? <div className={editorStyles.previewType}>Nouveau décor</div> : <div className={`${editorStyles.previewContent} ${editorStyles[`preview_${block.type}`] || ""}`}>
        {portrait && block.type === "dialogue" && <img src={portrait} alt={`Portrait de ${characterName(character)}`} />}
        {block.type === "dialogue" && <strong style={{ color: character?.nameColor || settings.pageAccentColor }}>{characterName(character)}{block.emotion && <small>{block.emotion}</small>}</strong>}
        <p>{block.content || `${BLOCK_LABELS[block.type] || "Bloc"} sans contenu`}</p>
      </div>}
    </div>
    <div className={editorStyles.transport}>
      <button type="button" onClick={() => block && selectedIndex > 0 && onSelect(plans[selectedIndex - 1].lead.id)} disabled={!block || selectedIndex === 0} aria-label="Plan précédent"><PreviousIcon /></button>
      <button type="button" className={editorStyles.playButton} onClick={() => setPlaying((value) => !value)} disabled={!block} aria-label={playing ? "Mettre en pause" : "Lire la scène"}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
      <button type="button" onClick={() => block && selectedIndex < plans.length - 1 && onSelect(plans[selectedIndex + 1].lead.id)} disabled={!block || selectedIndex === plans.length - 1} aria-label="Plan suivant"><NextIcon /></button>
      <span>{block ? `${selectedIndex + 1} / ${plans.length}` : "0 / 0"}</span>
    </div>
  </div>;
}

function PlanClip({ plan, index, selectedBlockId, onSelect, onAddLayer }: { plan: CompositePlan<SceneBlock>; index: number; selectedBlockId: string | null; onSelect: (id: string) => void; onAddLayer: (type: "background" | "sfx", planId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plan.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const selected = plan.blocks.some((block) => block.id === selectedBlockId);
  return <article ref={setNodeRef} style={style} className={`${editorStyles.planClip} ${selected ? editorStyles.clipSelected : ""} ${isDragging ? editorStyles.clipDragging : ""}`}>
    <button type="button" className={editorStyles.planLead} onClick={() => onSelect(plan.lead.id)} {...attributes} {...listeners}>
      <span>{String(index + 1).padStart(2, "0")} · {BLOCK_LABELS[plan.lead.type] || plan.lead.type}</span>
      <strong>{plan.lead.content.trim().split("\n")[0] || "Plan sans contenu"}</strong>
    </button>
    <div className={editorStyles.layerStrip} aria-label={`Couches du plan ${index + 1}`}>
      {plan.layers.map((layer) => <button key={layer.id} type="button" data-layer={layer.type} aria-pressed={selectedBlockId === layer.id} onClick={() => onSelect(layer.id)}>{layer.type === "background" ? <BackdropIcon /> : <WaveIcon />}{BLOCK_LABELS[layer.type]}</button>)}
      <select defaultValue="" onChange={(event) => { if (event.target.value) onAddLayer(event.target.value as "background" | "sfx", plan.id); event.target.value = ""; }} aria-label={`Ajouter une couche au plan ${index + 1}`}>
        <option value="" disabled>+ Effet</option>
        <option value="background">Arrière-plan</option>
        <option value="sfx">SFX</option>
      </select>
    </div>
  </article>;
}

function MusicClip({ block, index, selected, onSelect }: { block: SceneBlock; index: number; selected: boolean; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = block.content.trim().split("\n")[0] || block.mediaUrl?.split("/").at(-1) || `Musique ${index + 1}`;
  return <button ref={setNodeRef} style={style} type="button" className={`${editorStyles.musicClip} ${selected ? editorStyles.musicClipSelected : ""} ${isDragging ? editorStyles.clipDragging : ""}`} onClick={() => onSelect(block.id)} {...attributes} {...listeners}>
    <WaveIcon /><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><small>{block.volume ?? 100}%</small>
  </button>;
}

function PlaylistControls({ blocks, loop, onToggleLoop }: { blocks: SceneBlock[]; loop: boolean; onToggleLoop: (loop: boolean) => void }) {
  const playable = blocks.filter((block) => block.audioAction !== "stop" && block.mediaUrl);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const track = playable[currentIndex];

  useEffect(() => {
    if (!playing || !track?.mediaUrl) return;
    const audio = new Audio(track.mediaUrl);
    audio.volume = Math.max(0, Math.min(1, (track.volume ?? 100) / 100));
    audio.loop = loop && playable.length === 1;
    audioRef.current = audio;
    const onEnded = () => {
      if (currentIndex < playable.length - 1) setCurrentIndex((index) => index + 1);
      else if (loop && playable.length > 1) setCurrentIndex(0);
      else setPlaying(false);
    };
    audio.addEventListener("ended", onEnded);
    setError(null);
    void audio.play().catch(() => { setError("Lecture impossible"); setPlaying(false); });
    return () => { audio.removeEventListener("ended", onEnded); audio.pause(); if (audioRef.current === audio) audioRef.current = null; };
  }, [playing, track?.id, track?.mediaUrl, track?.volume, currentIndex, playable.length, loop]);

  useEffect(() => {
    if (currentIndex >= playable.length) setCurrentIndex(0);
    if (playable.length === 0) setPlaying(false);
  }, [currentIndex, playable.length]);

  return <div className={editorStyles.playlistControls}>
    <button type="button" onClick={() => setPlaying((value) => !value)} disabled={playable.length === 0} aria-label={playing ? "Mettre la playlist en pause" : "Lire la playlist"}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
    <span role="status" aria-live="polite">{error || (playing && track ? `Lecture ${currentIndex + 1}/${playable.length}` : `${playable.length} prête${playable.length > 1 ? "s" : ""}`)}</span>
    <label><input type="checkbox" checked={loop} onChange={(event) => onToggleLoop(event.target.checked)} disabled={blocks.length === 0} />Boucler la playlist</label>
  </div>;
}

function Icon({ children }: { children: React.ReactNode }) { return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>; }
function BackIcon() { return <Icon><path d="M15 18l-6-6 6-6M9 12h11" /></Icon>; }
function PlusIcon() { return <Icon><path d="M12 5v14M5 12h14" /></Icon>; }
function SaveIcon() { return <Icon><path d="M5 4h12l2 2v14H5zM8 4v6h8V4M8 20v-6h8v6" /></Icon>; }
function DeleteIcon() { return <Icon><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></Icon>; }
function CutIcon() { return <Icon><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5L19 19M8.5 15.5L19 5" /></Icon>; }
function PlayIcon() { return <Icon><path d="M8 5l11 7-11 7z" /></Icon>; }
function PauseIcon() { return <Icon><path d="M8 5v14M16 5v14" /></Icon>; }
function PreviousIcon() { return <Icon><path d="M18 6l-8 6 8 6zM6 6v12" /></Icon>; }
function NextIcon() { return <Icon><path d="M6 6l8 6-8 6zM18 6v12" /></Icon>; }
function BackdropIcon() { return <Icon><path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15.5 8.5h.01" /></Icon>; }
function WaveIcon() { return <Icon><path d="M4 12h2l1.5-5 3 10 3-10 1.5 5h5" /></Icon>; }
