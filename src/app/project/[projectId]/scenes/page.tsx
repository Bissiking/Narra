"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getEditorProfile, getProjectFormat } from "@/lib/editor-profiles";

interface Scene {
  id: string;
  title: string;
  status: string;
  order: number;
  wordCount: number;
  node: { id: string; title: string } | null;
  location: { id: string; name: string } | null;
}

interface NarrativeNode {
  id: string;
  type: string;
  title: string;
  order: number;
  children: NarrativeNode[];
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
  displayMode?: "solo" | "caption" | "layer" | null;
  showPortrait?: boolean | null;
  portraitImageUrl?: string | null;
  audioAction?: string | null;
  volume?: number | null;
  fadeDuration?: number | null;
  loop?: boolean | null;
  animationPreset?: "none" | "zoom-in" | "zoom-out" | "pan-left-right" | "pan-right-left" | "drift-up" | "fade-in" | "float" | null;
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

  function visit(
    currentNodes: NarrativeNode[],
    parentPath: string[] = [],
    root?: { id: string; title: string }
  ) {
    [...currentNodes]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"))
      .forEach((node) => {
        const currentRoot = root || { id: node.id, title: node.title };
        const path = [...parentPath, node.title];
        options.push({
          id: node.id,
          title: node.title,
          depth: path.length - 1,
          path,
          rootId: currentRoot.id,
          rootTitle: currentRoot.title,
          rank: options.length,
        });
        visit(node.children, path, currentRoot);
      });
  }

  visit(nodes);
  return options;
}

export default function ScenesPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [structure, setStructure] = useState<NarrativeNode[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [projectType, setProjectType] = useState("story");
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

  // Load data
  useEffect(() => {
    async function loadData() {
      const [scenesRes, structureRes, charsRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/scenes`),
        fetch(`/api/projects/${projectId}/narrative-nodes`),
        fetch(`/api/projects/${projectId}/characters`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (scenesRes.ok) setScenes(await scenesRes.json());
      if (structureRes.ok) setStructure(await structureRes.json());
      if (charsRes.ok) setCharacters(await charsRes.json());
      if (projectRes.ok) setProjectType((await projectRes.json()).type || "story");

      setLoading(false);
    }
    loadData();
  }, [projectId]);

  // Load blocks when scene is selected
  useEffect(() => {
    if (!selectedScene) {
      setBlocks([]);
      return;
    }

    async function loadBlocks() {
      const res = await fetch(`/api/scenes/${selectedScene}/blocks`);
      if (res.ok) setBlocks(await res.json());
    }
    loadBlocks();
  }, [selectedScene]);

  // Auto-save
  const saveBlocks = useCallback(async () => {
    if (!selectedScene || blocks.length === 0) return;

    setSaving(true);
    try {
      await fetch(`/api/scenes/${selectedScene}/blocks`, {
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
  }, [selectedScene, blocks]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveBlocks, 30000);
    return () => clearInterval(interval);
  }, [saveBlocks]);

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
      displayMode: null,
      showPortrait: type === "dialogue" ? true : null,
      portraitImageUrl: null,
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
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function removeBlock(id: string) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id);
      const newIndex = items.findIndex((b) => b.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      return newItems.map((b, i) => ({ ...b, order: i }));
    });
  }

  async function handleCreateScene(event: React.FormEvent) {
    event.preventDefault();
    if (!newSceneTitle.trim()) return;

    setCreatingScene(true);
    setCreateError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSceneTitle.trim(),
          nodeId: newSceneNodeId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer la scène");
      }

      setScenes((current) => [...current, data]);
      setSelectedScene(data.id);
      setNewSceneTitle("");
      setShowCreateScene(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Impossible de créer la scène");
    } finally {
      setCreatingScene(false);
    }
  }

  const nodeOptions = flattenNarrativeNodes(structure);
  const nodeMetadata = new Map(nodeOptions.map((node) => [node.id, node]));
  const sortedScenes = [...scenes].sort((a, b) => {
    const aRank = a.node ? nodeMetadata.get(a.node.id)?.rank ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const bRank = b.node ? nodeMetadata.get(b.node.id)?.rank ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.order - b.order || a.title.localeCompare(b.title, "fr");
  });
  const sceneGroups = sortedScenes.reduce<
    { id: string; title: string; scenes: Scene[] }[]
  >((groups, scene) => {
    const metadata = scene.node ? nodeMetadata.get(scene.node.id) : undefined;
    const id = metadata?.rootId || "unassigned";
    let group = groups.find((candidate) => candidate.id === id);
    if (!group) {
      group = {
        id,
        title: metadata?.rootTitle || "Sans rattachement",
        scenes: [],
      };
      groups.push(group);
    }
    group.scenes.push(scene);
    return groups;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  const selectedSceneData = scenes.find((s) => s.id === selectedScene);
  const selectedScenePath = selectedSceneData?.node
    ? nodeMetadata.get(selectedSceneData.node.id)?.path
    : undefined;
  const wordCount = blocks.reduce((acc, b) => acc + (["music", "sfx", "background"].includes(b.type) ? 0 : b.content.split(/\s+/).filter(Boolean).length), 0);
  const editorProfile = getEditorProfile(projectType);
  const projectFormat = getProjectFormat(projectType);
  const editorWidth = editorProfile.key === "comic" ? "max-w-6xl" : editorProfile.key === "screenplay" || editorProfile.key === "universe" ? "max-w-5xl" : editorProfile.key === "manuscript" ? "max-w-4xl" : "max-w-3xl";

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar - Scene list */}
      <aside className="w-full border-b border-narra-border md:w-72 md:min-h-screen md:border-b-0 md:border-r flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="font-bold">{projectFormat.content.plural}</h2>
            <button
              type="button"
              onClick={() => {
                setShowCreateScene((visible) => !visible);
                setCreateError(null);
              }}
              className="btn-primary px-2 py-1 text-xs"
              aria-expanded={showCreateScene}
            >
              {showCreateScene ? "Fermer" : `+ ${projectFormat.content.newLabel}`}
            </button>
          </div>
        </div>

        {showCreateScene && (
          <form onSubmit={handleCreateScene} className="space-y-3 border-b border-narra-border p-4">
            <div>
              <label htmlFor="scene-title" className="label">Titre</label>
              <input
                id="scene-title"
                className="input"
                value={newSceneTitle}
                onChange={(event) => setNewSceneTitle(event.target.value)}
                placeholder={projectFormat.content.titlePlaceholder}
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="scene-node" className="label">Emplacement</label>
              <select
                id="scene-node"
                className="select"
                value={newSceneNodeId}
                onChange={(event) => setNewSceneNodeId(event.target.value)}
              >
                <option value="">Sans rattachement</option>
                {nodeOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {`${"— ".repeat(node.depth)}${node.title}`}
                  </option>
                ))}
              </select>
              {nodeOptions.length === 0 && (
                <p className="mt-2 text-xs text-narra-muted">
                  Vous pourrez rattacher les {projectFormat.content.plural} après avoir créé une structure.
                </p>
              )}
            </div>
            {createError && <p role="alert" className="text-xs text-narra-danger">{createError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={creatingScene}>
              {creatingScene ? "Création…" : `Créer ${projectFormat.content.definite}`}
            </button>
          </form>
        )}

        <div className="max-h-72 flex-1 overflow-y-auto scrollbar-thin p-2 md:max-h-none">
          {scenes.length === 0 ? (
            <div className="p-3 text-sm text-narra-muted">
              <p>{projectFormat.content.emptyLabel}.</p>
              <p className="mt-1 text-xs">Créez votre premier contenu et rattachez-le à la structure du projet.</p>
            </div>
          ) : (
            sceneGroups.map((group) => (
              <section key={group.id} className="mb-4 last:mb-0">
                <h3 className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-narra-muted">
                  {group.title}
                </h3>
                {group.scenes.map((scene) => {
                  const path = scene.node ? nodeMetadata.get(scene.node.id)?.path : undefined;
                  return (
                    <button
                      key={scene.id}
                      onClick={() => setSelectedScene(scene.id)}
                      className={`mb-1 w-full border-l text-left p-3 transition-colors ${
                        selectedScene === scene.id
                          ? "border-narra-accent bg-narra-accent/10"
                          : "border-transparent hover:bg-narra-border/30"
                      }`}
                    >
                      <div className="truncate text-sm font-medium">{scene.title}</div>
                      <div className="mt-1 truncate text-xs text-narra-muted">
                        {path?.slice(1).join(" / ") || scene.node?.title || "Sans rattachement"}
                      </div>
                    </button>
                  );
                })}
              </section>
            ))
          )}
        </div>
      </aside>

      {/* Main editor */}
      <main className="min-w-0 flex-1 flex flex-col">
        {selectedScene ? (
          <>
            {/* Editor header */}
            <header className="p-4 border-b border-narra-border flex items-center justify-between">
              <div>
                {selectedScenePath && (
                  <p className="mb-1 text-xs text-narra-muted">
                    {selectedScenePath.join(" / ")}
                  </p>
                )}
                <h2 className="font-bold">{selectedSceneData?.title}</h2>
                <div className="flex gap-4 text-sm text-narra-muted mt-1">
                  <span>{wordCount} mots</span>
                  <span>{blocks.length} {editorProfile.unit[blocks.length === 1 ? 0 : 1]}</span>
                  {lastSaved && (
                    <span>
                      Sauvegardé {lastSaved.toLocaleTimeString("fr-FR")}
                    </span>
                  )}
                  {saving && <span className="text-narra-accent">Sauvegarde...</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="self-center border-r border-narra-border pr-3 text-xs text-narra-muted">{editorProfile.label}</span>
                {editorProfile.blocks.map((blockType) => (
                  <button key={blockType.value} onClick={() => addBlock(blockType.value)} className="btn-ghost text-sm">
                    + {blockType.shortLabel}
                  </button>
                ))}
                <SceneScriptImporter characters={characters} existingBlockCount={blocks.length} onImport={importBlocks} />
                <button onClick={saveBlocks} className="btn-primary text-sm">
                  Sauvegarder
                </button>
              </div>
            </header>

            {/* Blocks */}
            <div className={`mx-auto w-full ${editorWidth} flex-1 overflow-y-auto p-6`}>
              {blocks.length === 0 ? (
                <div className="text-center py-12 text-narra-muted">
                  <p className="mb-4">Aucun bloc dans {projectFormat.content.definite}.</p>
                  <button onClick={() => addBlock(editorProfile.blocks[0].value)} className="btn-primary">
                    Commencer à écrire
                  </button>
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-2">Sélectionnez {projectFormat.content.indefinite}</p>
              <p className="text-sm">ou créez votre premier contenu</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
