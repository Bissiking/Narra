"use client";

import { type CSSProperties, useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SceneBlockItem from "@/components/scene-block-item";
import SceneScriptImporter from "@/components/scene-script-importer";
import type { ParsedSceneScriptBlock } from "@/lib/scene-script-parser";
import { getEditorProfile, getProjectFormat } from "@/lib/editor-profiles";
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
  mediaUrl?: string | null; displayMode?: "solo" | "caption" | null; showPortrait?: boolean | null; portraitImageUrl?: string | null; audioAction?: string | null; volume?: number | null; fadeDuration?: number | null; loop?: boolean | null;
}

interface PreviewSettings {
  name: string;
  pageBackgroundUrl: string | null;
  pageBackgroundColor: string;
  pageTextColor: string;
  pageAccentColor: string;
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
  const [saving, setSaving] = useState(false);
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
    setSelectedBlockId(null);
    setBlockLoadError(null);
    if (!selectedScene) { setBlocks([]); setBlocksLoading(false); return; }
    setBlocks([]);
    setBlocksLoading(true);
    async function loadBlocks() {
      try {
        const res = await fetch(`/api/scenes/${selectedScene}/blocks`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const loadedBlocks = await res.json() as SceneBlock[];
        setBlocks(loadedBlocks);
        setSelectedBlockId(loadedBlocks[0]?.id || null);
      } catch (error) {
        console.error("Block loading error:", error);
        setBlockLoadError("Impossible de charger cette timeline. Vérifiez la base de données puis réessayez.");
      } finally {
        setBlocksLoading(false);
      }
    }
    loadBlocks();
  }, [selectedScene]);

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
    const id = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBlocks((current) => {
      const afterIndex = afterId ? current.findIndex((block) => block.id === afterId) : -1;
      const insertAt = afterIndex >= 0 ? afterIndex + 1 : current.length;
      const block: SceneBlock = {
        id,
        type,
        content: "",
        order: insertAt,
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
      const next = [...current];
      next.splice(insertAt, 0, block);
      return next.map((item, index) => ({ ...item, order: index }));
    });
    setSelectedBlockId(id);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`scene-block-${id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.querySelector("textarea")?.focus({ preventScroll: true });
    });
  }, [characters]);

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
  }

  const updateBlock = useCallback((id: string, updates: Partial<SceneBlock>) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      const block = next.find((b) => b.id === id);
      if (block && !block.id.startsWith("temp-")) sendWs({ type: "block:update", blockId: id, block });
      return next;
    });
  }, [sendWs]);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((block, index) => ({ ...block, order: index })));
    setSelectedBlockId((selected) => selected === id ? null : selected);
    if (!id.startsWith("temp-")) sendWs({ type: "block:delete", blockId: id });
  }, [sendWs]);

  const jumpToBlock = useCallback((id: string) => {
    const element = document.getElementById(`scene-block-${id}`);
    if (!element) return;
    setSelectedBlockId(id);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    element.querySelector("textarea")?.focus({ preventScroll: true });
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => arrayMove(items, items.findIndex((b) => b.id === active.id), items.findIndex((b) => b.id === over.id)).map((b, i) => ({ ...b, order: i })));
  }

  // Save blocks
  const saveBlocks = useCallback(async () => {
    if (!selectedScene || blocks.length === 0 || blocksLoading || blockLoadError) return;
    setSaving(true);
    try {
      await fetch(`/api/scenes/${selectedScene}/blocks`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks }) });
      setLastSaved(new Date());
    } catch (err) { console.error("Save error:", err); } finally { setSaving(false); }
  }, [selectedScene, blocks, blocksLoading, blockLoadError]);

  useEffect(() => { const i = setInterval(saveBlocks, 30000); return () => clearInterval(i); }, [saveBlocks]);

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
  const planBlocks = blocks.filter((block) => block.type === "heading");
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
          {lastSaved && !saving && <span className={editorStyles.savedState}>Sauvé à {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
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
            {group.scenes.map((scene, sceneIndex) => <button key={scene.id} type="button" onClick={() => setSelectedScene(scene.id)} aria-current={selectedScene === scene.id ? "true" : undefined}>
              <span className={editorStyles.sceneIndex}>{String(sceneIndex + 1).padStart(2, "0")}</span>
              <span className={editorStyles.sceneName}><strong>{scene.title}</strong><small>{scene.node?.title || "Sans séquence"}</small></span>
              <span className={editorStyles.sceneCount}>{scene._count.blocks}</span>
            </button>)}
          </section>)}
        </div>
      </aside>

      <main className={editorStyles.monitorArea}>
        {blockLoadError ? <div className={editorStyles.loadError} role="alert"><strong>Timeline indisponible</strong><span>{blockLoadError}</span></div> : selectedSceneData ? <PreviewMonitor scene={selectedSceneData} blocks={blocks} selectedBlockId={selectedBlockId} onSelect={setSelectedBlockId} characters={characters} settings={previewSettings} /> : <div className={editorStyles.noSelection}><strong>Choisissez une scène</strong><span>Le moniteur affichera ici votre montage.</span></div>}
      </main>

      <aside className={editorStyles.inspector} aria-label="Inspecteur">
        <div className={editorStyles.panelHeader}>
          <div><strong>Inspecteur</strong><span>{selectedBlock ? `Plan ${String(selectedBlockIndex + 1).padStart(2, "0")}` : "Aucun plan actif"}</span></div>
        </div>
        {showMetadata && selectedScene ? <div className={editorStyles.metadataPanel}>
          <label>Statut<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}><option value="draft">Brouillon</option><option value="writing">En cours</option><option value="review">Révision</option><option value="final">Final</option></select></label>
          <label>Séquence<select value={selectedNodeId} onChange={(event) => setSelectedNodeId(event.target.value)}><option value="">Aucune</option>{nodeOptions.map((node) => <option key={node.id} value={node.id}>{`${"— ".repeat(node.depth)}${node.title}`}</option>)}</select></label>
          <button type="button" onClick={saveMetadata}>Appliquer</button>
        </div> : selectedBlock ? <div className={editorStyles.inspectorBody}>
          <SceneBlockItem block={selectedBlock} characters={characters} onUpdate={updateBlock} onRemove={removeBlock} onSelect={setSelectedBlockId} selected projectId={projectId} projectType={projectType} inspector />
          <div className={editorStyles.inspectorActions}>
            <button type="button" onClick={() => addBlock("heading", selectedBlock.id)}><CutIcon />Nouveau plan après</button>
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
          <div><strong>Timeline</strong><span>{selectedBlockIndex >= 0 ? `TC ${formatTimecode(selectedBlockIndex)}` : "Prêt au montage"}</span></div>
          <div className={editorStyles.quickAdd}>
            <button type="button" onClick={() => addBlock("heading", selectedBlockId)} disabled={!selectedScene || blocksLoading || !!blockLoadError}><PlusIcon />Plan</button>
            <button type="button" onClick={() => addBlock("action", selectedBlockId)} disabled={!selectedScene || blocksLoading || !!blockLoadError}>Action</button>
            <button type="button" onClick={() => addBlock("dialogue", selectedBlockId)} disabled={!selectedScene || blocksLoading || !!blockLoadError}>Dialogue</button>
            <select defaultValue="" onChange={(event) => { if (event.target.value) addBlock(event.target.value, selectedBlockId); event.target.value = ""; }} disabled={!selectedScene || blocksLoading || !!blockLoadError} aria-label="Ajouter un autre type de bloc">
              <option value="" disabled>Autre…</option>{editorProfile.blocks.filter((type) => !["heading", "action", "dialogue"].includes(type.value)).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <SceneScriptImporter characters={characters} existingBlockCount={blocks.length} onImport={importBlocks} compact />
          </div>
        </div>
        <div className={editorStyles.timelineViewport}>
          {!selectedScene ? <div className={editorStyles.timelineEmpty}>Sélectionnez une scène pour commencer.</div> : blocksLoading ? <div className={editorStyles.timelineEmpty}>Chargement de la timeline…</div> : blockLoadError ? <div className={editorStyles.timelineError} role="alert">{blockLoadError}</div> : blocks.length === 0 ? <div className={editorStyles.timelineEmpty}><button type="button" onClick={() => addBlock(editorProfile.blocks[0].value)}>Créer le premier plan</button></div> :
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((block) => block.id)} strategy={horizontalListSortingStrategy}>
              <div className={editorStyles.track}>
                {blocks.map((block) => <TimelineClip key={block.id} block={block} selected={selectedBlockId === block.id} onSelect={setSelectedBlockId} />)}
              </div>
            </SortableContext>
          </DndContext>}
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
  const selectedIndex = Math.max(0, blocks.findIndex((block) => block.id === selectedBlockId));
  const block = blocks[selectedIndex];
  const character = characters.find((item) => item.id === block?.characterId);
  const expression = character?.images.find((image) => block?.emotion && image.emotion.toLocaleLowerCase("fr") === block.emotion.toLocaleLowerCase("fr"));
  const portrait = block?.showPortrait === false ? null : block?.portraitImageUrl || expression?.url || character?.portraitUrl;
  const backdrop = [...blocks.slice(0, selectedIndex + 1)].reverse().find((item) => item.type === "background" && item.mediaUrl)?.mediaUrl || scene.location?.imageUrl || settings.pageBackgroundUrl;
  const monitorVariables = { "--preview-bg": settings.pageBackgroundColor, "--preview-ink": settings.pageTextColor, "--preview-accent": settings.pageAccentColor } as CSSProperties;

  useEffect(() => {
    if (!playing || blocks.length < 2) return;
    const timer = window.setInterval(() => {
      const current = blocks.findIndex((item) => item.id === selectedBlockId);
      if (current >= blocks.length - 1) { setPlaying(false); return; }
      onSelect(blocks[current + 1].id);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [blocks, onSelect, playing, selectedBlockId]);

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
      <button type="button" onClick={() => block && selectedIndex > 0 && onSelect(blocks[selectedIndex - 1].id)} disabled={!block || selectedIndex === 0} aria-label="Bloc précédent"><PreviousIcon /></button>
      <button type="button" className={editorStyles.playButton} onClick={() => setPlaying((value) => !value)} disabled={!block} aria-label={playing ? "Mettre en pause" : "Lire la scène"}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
      <button type="button" onClick={() => block && selectedIndex < blocks.length - 1 && onSelect(blocks[selectedIndex + 1].id)} disabled={!block || selectedIndex === blocks.length - 1} aria-label="Bloc suivant"><NextIcon /></button>
      <span>{block ? `${selectedIndex + 1} / ${blocks.length}` : "0 / 0"}</span>
    </div>
  </div>;
}

function TimelineClip({ block, selected, onSelect }: { block: SceneBlock; selected: boolean; onSelect: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return <button ref={setNodeRef} style={style} type="button" data-type={block.type} className={`${editorStyles.clip} ${selected ? editorStyles.clipSelected : ""} ${isDragging ? editorStyles.clipDragging : ""}`} onClick={() => onSelect(block.id)} {...attributes} {...listeners}>
    <span>{String(block.order + 1).padStart(2, "0")} · {BLOCK_LABELS[block.type] || block.type}</span>
    <strong>{block.content.trim().split("\n")[0] || "Sans contenu"}</strong>
    <i aria-hidden="true" />
  </button>;
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
