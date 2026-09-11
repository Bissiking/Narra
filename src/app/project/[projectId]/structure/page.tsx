"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface NarrativeNode {
  id: string;
  type: string;
  title: string;
  order: number;
  children: NarrativeNode[];
  _count: {
    scenes: number;
  };
}

const NODE_TYPES = [
  { value: "saga", label: "Saga" },
  { value: "arc", label: "Arc" },
  { value: "volume", label: "Volume" },
  { value: "part", label: "Partie" },
  { value: "act", label: "Acte" },
  { value: "chapter", label: "Chapitre" },
  { value: "episode", label: "Épisode" },
  { value: "block", label: "Bloc" },
  { value: "custom", label: "Personnalisé" },
];

export default function StructurePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [structure, setStructure] = useState<NarrativeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Add node modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [newType, setNewType] = useState("chapter");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    loadStructure();
  }, [projectId]);

  async function loadStructure() {
    const res = await fetch(`/api/projects/${projectId}/narrative-nodes`);
    if (res.ok) setStructure(await res.json());
    setLoading(false);
  }

  function toggleExpand(id: string) {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  }

  function openAddModal(parent: string | null) {
    setParentId(parent);
    setNewTitle("");
    setShowAddModal(true);
  }

  async function handleAddNode() {
    if (!newTitle.trim()) return;

    const res = await fetch(`/api/projects/${projectId}/narrative-nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId,
        type: newType,
        title: newTitle,
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      loadStructure();
    }
  }

  function renderNode(node: NarrativeNode, depth: number = 0) {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-narra-border/30 group">
          <button
            onClick={() => toggleExpand(node.id)}
            className={`w-5 text-center text-narra-muted ${
              hasChildren ? "cursor-pointer" : "opacity-0"
            }`}
          >
            {hasChildren ? (isExpanded ? "▼" : "▶") : "•"}
          </button>

          <span className="badge border-narra-border text-xs text-narra-muted">
            {node.type}
          </span>

          <span className="flex-1 font-medium">{node.title}</span>

          <span className="text-xs text-narra-muted">
            {node._count.scenes} scène{node._count.scenes !== 1 ? "s" : ""}
          </span>

          <button
            onClick={() => openAddModal(node.id)}
            className="opacity-0 group-hover:opacity-100 text-narra-accent text-xs transition-opacity"
          >
            + Ajouter
          </button>
        </div>

        {isExpanded &&
          node.children
            .sort((a, b) => a.order - b.order)
            .map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold mt-2">Structure narrative</h1>
          </div>
          <button onClick={() => openAddModal(null)} className="btn-primary">
            + Ajouter un nœud racine
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="card">
          {structure.length === 0 ? (
            <div className="p-12 text-center text-narra-muted">
              <p className="mb-4">Aucune structure définie.</p>
              <button onClick={() => openAddModal(null)} className="btn-primary">
                Créer la première structure
              </button>
            </div>
          ) : (
            <div>
              {structure
                .sort((a, b) => a.order - b.order)
                .map((node) => renderNode(node))}
            </div>
          )}
        </div>
      </main>

      {/* Add node modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md p-6">
            <h2 className="font-bold mb-4">Ajouter un nœud</h2>

            <div className="space-y-4">
              <div>
                <label className="label">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="select"
                >
                  {NODE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Titre</label>
                <input
                  type="text"
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Saison 1, Chapitre 1..."
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleAddNode} className="btn-primary">
                Ajouter
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
