"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Scene {
  id: string;
  title: string;
  status: string;
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
}

interface SceneBlock {
  id: string;
  type: string;
  content: string;
  order: number;
  characterId: string | null;
  emotion: string | null;
  position: string | null;
}

export default function ScenesPage() {
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
    };
    setBlocks([...blocks, newBlock]);
  }

  function updateBlock(id: string, updates: Partial<SceneBlock>) {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function removeBlock(id: string) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, direction: "up" | "down") {
    const index = blocks.findIndex((b) => b.id === id);
    if (index === -1) return;

    const newBlocks = [...blocks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newBlocks.length) return;

    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    newBlocks.forEach((b, i) => (b.order = i));
    setBlocks(newBlocks);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  const selectedSceneData = scenes.find((s) => s.id === selectedScene);
  const wordCount = blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Scene list */}
      <aside className="w-64 border-r border-narra-border flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <h2 className="font-bold mt-2">Scènes</h2>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {scenes.length === 0 ? (
            <p className="text-narra-muted text-sm p-2">Aucune scène.</p>
          ) : (
            scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setSelectedScene(scene.id)}
                className={`w-full text-left p-3 mb-1 transition-colors ${
                  selectedScene === scene.id
                    ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                    : "hover:bg-narra-border/30"
                }`}
              >
                <div className="font-medium text-sm truncate">{scene.title}</div>
                <div className="text-xs text-narra-muted">
                  {scene.node?.title || "Sans nœud"}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main editor */}
      <main className="flex-1 flex flex-col">
        {selectedScene ? (
          <>
            {/* Editor header */}
            <header className="p-4 border-b border-narra-border flex items-center justify-between">
              <div>
                <h2 className="font-bold">{selectedSceneData?.title}</h2>
                <div className="flex gap-4 text-sm text-narra-muted mt-1">
                  <span>{wordCount} mots</span>
                  <span>{blocks.length} blocs</span>
                  {lastSaved && (
                    <span>
                      Sauvegardé {lastSaved.toLocaleTimeString("fr-FR")}
                    </span>
                  )}
                  {saving && <span className="text-narra-accent">Sauvegarde...</span>}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => addBlock("narration")} className="btn-ghost text-sm">
                  + Narration
                </button>
                <button onClick={() => addBlock("dialogue")} className="btn-ghost text-sm">
                  + Dialogue
                </button>
                <button onClick={() => addBlock("action")} className="btn-ghost text-sm">
                  + Action
                </button>
                <button onClick={() => addBlock("heading")} className="btn-ghost text-sm">
                  + Titre
                </button>
                <button onClick={saveBlocks} className="btn-primary text-sm">
                  Sauvegarder
                </button>
              </div>
            </header>

            {/* Blocks */}
            <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
              {blocks.length === 0 ? (
                <div className="text-center py-12 text-narra-muted">
                  <p className="mb-4">Aucun bloc dans cette scène.</p>
                  <button onClick={() => addBlock("narration")} className="btn-primary">
                    Commencer à écrire
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block) => (
                    <div key={block.id} className="card p-4 group">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveBlock(block.id, "up")}
                            className="text-narra-muted hover:text-narra-text text-xs"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveBlock(block.id, "down")}
                            className="text-narra-muted hover:text-narra-text text-xs"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeBlock(block.id)}
                            className="text-narra-danger hover:text-narra-danger text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="badge border-narra-border text-narra-muted text-xs">
                              {block.type}
                            </span>

                            {block.type === "dialogue" && (
                              <>
                                <select
                                  value={block.characterId || ""}
                                  onChange={(e) =>
                                    updateBlock(block.id, { characterId: e.target.value || null })
                                  }
                                  className="select text-xs py-1 px-2"
                                >
                                  <option value="">Personnage...</option>
                                  {characters.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.alias || `${c.firstName} ${c.lastName}`}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={block.emotion || ""}
                                  onChange={(e) =>
                                    updateBlock(block.id, { emotion: e.target.value || null })
                                  }
                                  className="select text-xs py-1 px-2"
                                >
                                  <option value="">Émotion...</option>
                                  <option value="neutral">Neutre</option>
                                  <option value="happy">Joyeux</option>
                                  <option value="sad">Triste</option>
                                  <option value="angry">En colère</option>
                                  <option value="surprised">Surpris</option>
                                  <option value="worried">Inquiet</option>
                                </select>
                              </>
                            )}
                          </div>

                          <textarea
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            className={`w-full bg-transparent border-none focus:outline-none resize-none ${
                              block.type === "heading"
                                ? "text-xl font-bold"
                                : block.type === "dialogue"
                                ? "font-serif"
                                : ""
                            }`}
                            rows={block.content.split("\n").length + 1}
                            placeholder={
                              block.type === "dialogue"
                                ? "Le dialogue..."
                                : block.type === "heading"
                                ? "Titre..."
                                : "Écrivez ici..."
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-2">Sélectionnez une scène</p>
              <p className="text-sm">ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
