"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SceneBlockItem from "@/components/scene-block-item";
import SceneScriptImporter from "@/components/scene-script-importer";
import type { ParsedSceneScriptBlock } from "@/lib/scene-script-parser";

interface Scene {
  id: string;
  title: string;
  status: string;
  order: number;
  wordCount: number;
  node: { id: string; title: string } | null;
  location: { id: string; name: string } | null;
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
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<SceneBlock[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      const [scenesRes, structureRes, charsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/scenes`),
        fetch(`/api/projects/${projectId}/narrative-nodes`),
        fetch(`/api/projects/${projectId}/characters`),
      ]);
      if (scenesRes.ok) setScenes(await scenesRes.json());
      if (structureRes.ok) setStructure(await structureRes.json());
      if (charsRes.ok) setCharacters(await charsRes.json());
      setLoading(false);
    }
    loadData();
  }, [projectId]);

  // Load blocks when scene selected
  useEffect(() => {
    if (!selectedScene) { setBlocks([]); return; }
    async function loadBlocks() {
      const res = await fetch(`/api/scenes/${selectedScene}/blocks`);
      if (res.ok) setBlocks(await res.json());
    }
    loadBlocks();
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

  function sendWs(msg: object) {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }

  // Block ops
  function addBlock(type: string) {
    const block: SceneBlock = { id: `temp-${Date.now()}`, type, content: "", order: blocks.length, characterId: type === "dialogue" ? characters[0]?.id || null : null, emotion: null, position: null, speakerNote: null };
    setBlocks([...blocks, block]);
  }

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

  function updateBlock(id: string, updates: Partial<SceneBlock>) {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      const block = next.find((b) => b.id === id);
      if (block && !block.id.startsWith("temp-")) sendWs({ type: "block:update", blockId: id, block });
      return next;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (!id.startsWith("temp-")) sendWs({ type: "block:delete", blockId: id });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => arrayMove(items, items.findIndex((b) => b.id === active.id), items.findIndex((b) => b.id === over.id)).map((b, i) => ({ ...b, order: i })));
  }

  // Save blocks
  const saveBlocks = useCallback(async () => {
    if (!selectedScene || blocks.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/scenes/${selectedScene}/blocks`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks }) });
      setLastSaved(new Date());
    } catch (err) { console.error("Save error:", err); } finally { setSaving(false); }
  }, [selectedScene, blocks]);

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
  const wordCount = blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0);
  const totalWords = scenes.reduce((acc, s) => acc + s.wordCount, 0);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Scene list */}
      <aside className="w-72 min-h-screen border-r border-narra-border flex flex-col shrink-0">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">← Projet</Link>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm">Éditeur</h2>
              <p className="text-xs text-narra-muted mt-0.5">{scenes.length} scènes · {totalWords.toLocaleString("fr-FR")} mots</p>
            </div>
            <div className="flex items-center gap-2">
              {onlineUsers.size > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  {onlineUsers.size}
                </span>
              )}
              <button onClick={() => setShowCreateScene(!showCreateScene)} className="btn-primary px-2 py-1 text-xs">
                {showCreateScene ? "×" : "+"}
              </button>
            </div>
          </div>
        </div>

        {showCreateScene && (
          <form onSubmit={handleCreateScene} className="space-y-2 border-b border-narra-border p-3">
            <input className="input text-sm" value={newSceneTitle} onChange={(e) => setNewSceneTitle(e.target.value)} placeholder="Titre de la scène" autoFocus required />
            <select className="select text-sm" value={newSceneNodeId} onChange={(e) => setNewSceneNodeId(e.target.value)}>
              <option value="">Sans rattachement</option>
              {nodeOptions.map((n) => <option key={n.id} value={n.id}>{`${"— ".repeat(n.depth)}${n.title}`}</option>)}
            </select>
            {createError && <p className="text-xs text-narra-danger">{createError}</p>}
            <button type="submit" className="btn-primary w-full text-sm" disabled={creatingScene}>{creatingScene ? "…" : "Créer"}</button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {sceneGroups.map((group) => (
            <section key={group.id} className="mb-3">
              <h3 className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-narra-muted">{group.title}</h3>
              {group.scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => setSelectedScene(scene.id)}
                  className={`mb-0.5 w-full border-l-2 text-left px-3 py-2 transition-colors text-sm ${
                    selectedScene === scene.id ? "border-narra-accent bg-narra-accent/10" : "border-transparent hover:bg-narra-border/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{scene.title}</span>
                    <span className="text-[10px] text-narra-muted shrink-0">{scene._count.blocks}</span>
                  </div>
                  <div className="text-[10px] text-narra-muted mt-0.5 truncate">
                    {scene.status !== "draft" && <span className="uppercase tracking-wider mr-1">{scene.status}</span>}
                    {scene.node?.title || ""}
                  </div>
                </button>
              ))}
            </section>
          ))}
        </div>
      </aside>

      {/* Main editor area */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedScene ? (
          <>
            {/* Editor toolbar */}
            <header className="border-b border-narra-border px-4 py-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {editTitle ? (
                  <input className="input text-sm font-bold" value={titleValue} onChange={(e) => setTitleValue(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === "Enter" && saveTitle()} autoFocus />
                ) : (
                  <h2 className="font-bold text-sm truncate cursor-pointer hover:text-narra-accent" onClick={() => setEditTitle(true)}>
                    {selectedSceneData?.title}
                  </h2>
                )}
                <div className="flex gap-3 text-[10px] text-narra-muted mt-0.5">
                  <span>{wordCount} mots</span>
                  <span>{blocks.length} blocs</span>
                  {lastSaved && <span>Sauvé {lastSaved.toLocaleTimeString("fr-FR")}</span>}
                  {saving && <span className="text-narra-accent">…</span>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setShowMetadata(!showMetadata)} className="btn-ghost text-xs px-2 py-1">Meta</button>
                <button onClick={() => addBlock("narration")} className="btn-ghost text-xs px-2 py-1">+Narr</button>
                <button onClick={() => addBlock("dialogue")} className="btn-ghost text-xs px-2 py-1">+Dial</button>
                <button onClick={() => addBlock("action")} className="btn-ghost text-xs px-2 py-1">+Act</button>
                <button onClick={() => addBlock("heading")} className="btn-ghost text-xs px-2 py-1">+H</button>
                <SceneScriptImporter characters={characters} existingBlockCount={blocks.length} onImport={importBlocks} compact />
                <button onClick={saveBlocks} className="btn-primary text-xs px-2 py-1">Sauver</button>
                <button onClick={deleteScene} className="text-xs text-narra-danger px-2 py-1 hover:text-narra-danger">🗑</button>
              </div>
            </header>

            {/* Metadata panel */}
            {showMetadata && (
              <div className="border-b border-narra-border px-4 py-3 bg-narra-surface/50">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="label text-[10px]">Statut</label>
                    <select className="select text-xs" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      <option value="draft">Brouillon</option>
                      <option value="writing">En cours</option>
                      <option value="review">Révision</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="label text-[10px]">Nœud narratif</label>
                    <select className="select text-xs" value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)}>
                      <option value="">Aucun</option>
                      {nodeOptions.map((n) => <option key={n.id} value={n.id}>{`${"— ".repeat(n.depth)}${n.title}`}</option>)}
                    </select>
                  </div>
                  <button onClick={saveMetadata} className="btn-primary text-xs px-3 py-1.5">OK</button>
                </div>
              </div>
            )}

            {/* Character bar */}
            {selectedSceneData && selectedSceneData.characters.length > 0 && (
              <div className="border-b border-narra-border px-4 py-1.5 flex gap-1.5 overflow-x-auto">
                {selectedSceneData.characters.map(({ character }) => (
                  <Link
                    key={character.id}
                    href={`/project/${projectId}/characters/${character.id}`}
                    className="flex items-center gap-1.5 px-2 py-1 rounded border border-narra-border hover:border-narra-accent text-xs shrink-0 transition-colors"
                  >
                    {character.portraitUrl ? <img src={character.portraitUrl} alt="" className="w-4 h-4 rounded-full object-cover" /> : <span className="w-4 h-4 rounded-full bg-narra-border flex items-center justify-center text-[8px]">{(character.firstName?.[0] || "?").toUpperCase()}</span>}
                    <span>{character.alias || `${character.firstName || ""} ${character.lastName || ""}`.trim()}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Blocks */}
            <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
              {blocks.length === 0 ? (
                <div className="text-center py-16 text-narra-muted">
                  <p className="mb-3 text-sm">Aucun bloc.</p>
                  <button onClick={() => addBlock("narration")} className="btn-primary text-sm">Commencer à écrire</button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {blocks.map((block) => (
                        <SceneBlockItem key={block.id} block={block} characters={characters} onUpdate={updateBlock} onRemove={removeBlock} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-1">Sélectionnez une scène</p>
              <p className="text-sm">ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
