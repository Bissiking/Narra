"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { getEditorProfile, getProjectFormat } from "@/lib/editor-profiles";

interface SceneDetail {
  id: string;
  title: string;
  status: string;
  order: number;
  wordCount: number;
  notes: string | null;
  node: { id: string; title: string; type: string } | null;
  location: { id: string; name: string } | null;
  characters: {
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      portraitUrl: string | null;
      nameColor: string;
    };
  }[];
  _count: { blocks: number };
}

interface SceneBlock {
  id: string;
  type: string;
  content: string;
  order: number;
  characterId: string | null;
  emotion: string | null;
  position: string | null;
  speakerNote: string | null;
  mediaUrl?: string | null;
  audioAction?: string | null;
  volume?: number | null;
  fadeDuration?: number | null;
  loop?: boolean | null;
}

interface Character {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  portraitUrl: string | null;
  nameColor: string;
  images: { id: string; label: string; emotion: string; url: string }[];
}

interface NarrativeNode {
  id: string;
  type: string;
  title: string;
  order: number;
  children: NarrativeNode[];
}

interface NarrativeNodeOption {
  id: string;
  title: string;
  depth: number;
  path: string[];
  rootId: string;
  rootTitle: string;
  rank: number;
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

interface WsMessage {
  type: string;
  blockId?: string;
  block?: SceneBlock;
  userId?: string;
  userName?: string;
  cursor?: { blockId: string; offset: number };
}

export default function SceneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const sceneId = params.sceneId as string;

  const [scene, setScene] = useState<SceneDetail | null>(null);
  const [blocks, setBlocks] = useState<SceneBlock[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [structure, setStructure] = useState<NarrativeNode[]>([]);
  const [projectType, setProjectType] = useState("story");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editNotes, setEditNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load scene data
  useEffect(() => {
    async function load() {
      const [sceneRes, blocksRes, charsRes, structRes, locsRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/scenes/${sceneId}`),
        fetch(`/api/scenes/${sceneId}/blocks`),
        fetch(`/api/projects/${projectId}/characters`),
        fetch(`/api/projects/${projectId}/narrative-nodes`),
        fetch(`/api/projects/${projectId}/locations`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (sceneRes.ok) {
        const s = await sceneRes.json();
        setScene(s);
        setTitleValue(s.title);
        setNotesValue(s.notes || "");
        setSelectedNodeId(s.node?.id || "");
        setSelectedLocationId(s.location?.id || "");
        setSelectedStatus(s.status);
      } else {
        router.push(`/project/${projectId}/scenes`);
        return;
      }

      if (blocksRes.ok) setBlocks(await blocksRes.json());
      if (charsRes.ok) setCharacters(await charsRes.json());
      if (structRes.ok) setStructure(await structRes.json());
      if (projectRes.ok) setProjectType((await projectRes.json()).type || "story");
      setLoading(false);
    }
    load();
  }, [projectId, sceneId, router]);

  // WebSocket connection
  useEffect(() => {
    if (!sceneId) return;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/scenes/${sceneId}`);

      ws.onopen = () => {
        console.log("[WS] Connected to scene", sceneId);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch {}
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected, reconnecting in 3s...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [sceneId]);

  function handleWsMessage(msg: WsMessage) {
    switch (msg.type) {
      case "block:update":
        if (msg.block) {
          setBlocks((prev) => prev.map((b) => (b.id === msg.block!.id ? msg.block! : b)));
        }
        break;
      case "block:create":
        if (msg.block) {
          setBlocks((prev) => [...prev, msg.block!].sort((a, b) => a.order - b.order));
        }
        break;
      case "block:delete":
        if (msg.blockId) {
          setBlocks((prev) => prev.filter((b) => b.id !== msg.blockId));
        }
        break;
      case "user:join":
        if (msg.userId && msg.userName) {
          setOnlineUsers((prev) => new Map(prev).set(msg.userId!, msg.userName!));
        }
        break;
      case "user:leave":
        if (msg.userId) {
          setOnlineUsers((prev) => {
            const next = new Map(prev);
            next.delete(msg.userId!);
            return next;
          });
        }
        break;
    }
  }

  function sendWsMessage(msg: WsMessage) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  // Block operations
  function addBlock(type: string) {
    const newBlock: SceneBlock = {
      id: `temp-${Date.now()}`,
      type,
      content: "",
      order: blocks.length,
      characterId: type === "dialogue" ? characters[0]?.id || null : null,
      emotion: null,
      position: null,
      speakerNote: null,
      mediaUrl: null,
      audioAction: type === "music" ? "play" : null,
      volume: type === "music" || type === "sfx" ? 100 : null,
      fadeDuration: type === "music" ? 1 : null,
      loop: type === "music" ? true : null,
    };
    setBlocks([...blocks, newBlock]);
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
      const newBlocks = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      const block = newBlocks.find((b) => b.id === id);
      if (block && !block.id.startsWith("temp-")) {
        sendWsMessage({ type: "block:update", blockId: id, block });
      }
      return newBlocks;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (!id.startsWith("temp-")) {
      sendWsMessage({ type: "block:delete", blockId: id });
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id);
      const newIndex = items.findIndex((b) => b.id === over.id);
      return arrayMove(items, oldIndex, newIndex).map((b, i) => ({ ...b, order: i }));
    });
  }

  // Save blocks
  const saveBlocks = useCallback(async () => {
    if (blocks.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/scenes/${sceneId}/blocks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [sceneId, blocks]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(saveBlocks, 30000);
    return () => clearInterval(interval);
  }, [saveBlocks]);

  // Save title
  async function saveTitle() {
    if (!titleValue.trim() || titleValue === scene?.title) {
      setEditTitle(false);
      return;
    }
    const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleValue.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setScene((s) => (s ? { ...s, title: updated.title } : s));
    }
    setEditTitle(false);
  }

  // Save notes
  async function saveNotes() {
    if (notesValue === scene?.notes) {
      setEditNotes(false);
      return;
    }
    const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setScene((s) => (s ? { ...s, notes: updated.notes } : s));
    }
    setEditNotes(false);
  }

  // Save settings
  async function saveSettings() {
    const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: selectedStatus,
        nodeId: selectedNodeId || null,
        locationId: selectedLocationId || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setScene((s) => (s ? { ...s, ...updated } : s));
    }
    setShowSettings(false);
  }

  // Delete scene
  async function deleteScene() {
    if (!confirm("Supprimer cette scène ?")) return;
    const res = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, { method: "DELETE" });
    if (res.ok) router.push(`/project/${projectId}/scenes`);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;
  }

  if (!scene) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Scène introuvable</span></div>;
  }

  const nodeOptions = flattenNarrativeNodes(structure);
  const wordCount = blocks.reduce((acc, b) => acc + (["music", "sfx", "background"].includes(b.type) ? 0 : b.content.split(/\s+/).filter(Boolean).length), 0);
  const editorProfile = getEditorProfile(projectType);
  const projectFormat = getProjectFormat(projectType);
  const editorWidth = editorProfile.key === "comic" ? "max-w-6xl" : editorProfile.key === "screenplay" || editorProfile.key === "universe" ? "max-w-5xl" : editorProfile.key === "manuscript" ? "max-w-4xl" : "max-w-3xl";
  const onlineCount = onlineUsers.size;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-narra-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/project/${projectId}/scenes`} className="text-narra-muted hover:text-narra-text text-sm">
              ← {projectFormat.content.plural}
            </Link>
            {editTitle ? (
              <input
                className="input text-lg font-bold"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                autoFocus
              />
            ) : (
              <h1
                className="text-lg font-bold cursor-pointer hover:text-narra-accent"
                onClick={() => setEditTitle(true)}
              >
                {scene.title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-narra-muted">
            {onlineCount > 0 && (
              <span className="flex items-center gap-1 text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                {onlineCount} en ligne
              </span>
            )}
            <span>{wordCount} mots</span>
            <span>{blocks.length} {editorProfile.unit[blocks.length === 1 ? 0 : 1]}</span>
            {lastSaved && <span>Sauvegardé {lastSaved.toLocaleTimeString("fr-FR")}</span>}
            {saving && <span className="text-narra-accent">Sauvegarde...</span>}
            <button onClick={() => setShowSettings(!showSettings)} className="btn-ghost text-xs">
              Paramètres
            </button>
            <button onClick={deleteScene} className="text-xs text-narra-danger hover:text-narra-danger">
              Supprimer
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 p-4 card space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Statut</label>
                <select className="select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="draft">Brouillon</option>
                  <option value="writing">En cours</option>
                  <option value="review">Révision</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div>
                <label className="label">Nœud narratif</label>
                <select className="select" value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)}>
                  <option value="">Aucun</option>
                  {nodeOptions.map((n) => (
                    <option key={n.id} value={n.id}>{`${"— ".repeat(n.depth)}${n.title}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Lieu</label>
                <select className="select" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                  <option value="">Aucun</option>
                  {/* Locations will be loaded separately if needed */}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveSettings} className="btn-primary text-sm">Enregistrer</button>
              <button onClick={() => setShowSettings(false)} className="btn-ghost text-sm">Annuler</button>
            </div>
          </div>
        )}
      </header>

      {/* Characters bar */}
      {scene.characters.length > 0 && (
        <div className="border-b border-narra-border px-6 py-2 flex gap-2 overflow-x-auto">
          {scene.characters.map(({ character }) => (
            <Link
              key={character.id}
              href={`/project/${projectId}/characters/${character.id}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-narra-border hover:border-narra-accent transition-colors text-sm shrink-0"
            >
              {character.portraitUrl ? (
                <img src={character.portraitUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-narra-border flex items-center justify-center text-xs">
                  {(character.firstName?.[0] || character.alias?.[0] || "?").toUpperCase()}
                </span>
              )}
              <span style={{ color: character.nameColor }}>{character.alias || `${character.firstName || ""} ${character.lastName || ""}`.trim()}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Notes */}
      {scene.notes && !editNotes && (
        <div className="px-6 py-2 border-b border-narra-border">
          <p
            className="text-sm text-narra-muted italic cursor-pointer hover:text-narra-text"
            onClick={() => setEditNotes(true)}
          >
            {scene.notes}
          </p>
        </div>
      )}

      {/* Block editor */}
      <div className={`mx-auto w-full ${editorWidth} flex-1 overflow-y-auto p-6`}>
        {/* Block type buttons */}
        <div className="sticky top-0 z-10 mb-6 flex flex-wrap gap-2 bg-narra-bg/80 py-2 backdrop-blur-sm">
          <span className="self-center border-r border-narra-border pr-3 text-xs text-narra-muted">{editorProfile.label}</span>
          {editorProfile.blocks.map((blockType) => (
            <button key={blockType.value} onClick={() => addBlock(blockType.value)} className="btn-ghost text-sm">
              + {blockType.shortLabel}
            </button>
          ))}
          <div className="flex-1" />
          <SceneScriptImporter characters={characters} existingBlockCount={blocks.length} onImport={importBlocks} />
          <button onClick={saveBlocks} className="btn-primary text-sm">Sauvegarder</button>
        </div>

        {blocks.length === 0 ? (
          <div className="text-center py-12 text-narra-muted">
            <p className="mb-4">Aucun bloc dans {projectFormat.content.definite}.</p>
            <button onClick={() => addBlock(editorProfile.blocks[0].value)} className="btn-primary">Commencer à écrire</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {blocks.map((block) => (
                  <SceneBlockItem
                    key={block.id}
                    block={block}
                    characters={characters}
                    onUpdate={updateBlock}
                    onRemove={removeBlock}
                    projectId={projectId}
                    projectType={projectType}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
