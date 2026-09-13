"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getDefaultNarrativeTypeForProject,
  getNarrativeTypesForProject,
  NARRATIVE_NODE_TYPES,
  NARRATIVE_NODE_TYPE_LABELS,
} from "@/lib/narrative-structure";
import { getProjectFormat } from "@/lib/editor-profiles";

interface NarrativeNode {
  id: string;
  parentId: string | null;
  type: string;
  title: string;
  description: string | null;
  order: number;
  children: NarrativeNode[];
  _count: { scenes: number };
}

interface FlatNarrativeNode extends NarrativeNode {
  depth: number;
  path: string[];
  ancestorIds: string[];
}

type EditorMode = "create" | "edit";

function sortNodes(nodes: NarrativeNode[]) {
  return [...nodes].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr")
  );
}

function flattenNodes(
  nodes: NarrativeNode[],
  expandedNodes?: Set<string>,
  depth = 0,
  path: string[] = [],
  ancestorIds: string[] = []
): FlatNarrativeNode[] {
  return sortNodes(nodes).flatMap((node) => {
    const flatNode = {
      ...node,
      depth,
      path: [...path, node.title],
      ancestorIds,
    };
    const showChildren = !expandedNodes || expandedNodes.has(node.id);
    return [
      flatNode,
      ...(showChildren
        ? flattenNodes(
            node.children,
            expandedNodes,
            depth + 1,
            flatNode.path,
            [...ancestorIds, node.id]
          )
        : []),
    ];
  });
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={expanded ? "M3 6l5 5 5-5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export default function StructurePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [structure, setStructure] = useState<NarrativeNode[]>([]);
  const [projectType, setProjectType] = useState("story");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [nodeType, setNodeType] = useState("season");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function loadStructure() {
    setLoadError(null);
    try {
      const [response, projectResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/narrative-nodes`),
        fetch(`/api/projects/${projectId}`),
      ]);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger la structure");
      if (projectResponse.ok) {
        const project = await projectResponse.json();
        setProjectType(project.type || "story");
      }
      setStructure(data);
      setExpandedNodes((current) =>
        current.size === 0 ? new Set(data.map((node: NarrativeNode) => node.id)) : current
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Impossible de charger la structure"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStructure();
  }, [projectId]);

  const allNodes = useMemo(() => flattenNodes(structure), [structure]);
  const visibleNodes = useMemo(
    () => flattenNodes(structure, expandedNodes),
    [structure, expandedNodes]
  );
  const editingNode = allNodes.find((node) => node.id === editingNodeId);
  const selectedParent = allNodes.find((node) => node.id === parentId);
  const projectFormat = getProjectFormat(projectType);
  const suggestedTypes = getNarrativeTypesForProject(projectType, selectedParent?.type);
  const unavailableParentIds = new Set(
    editingNode
      ? [
          editingNode.id,
          ...allNodes
            .filter((node) => node.ancestorIds.includes(editingNode.id))
            .map((node) => node.id),
        ]
      : []
  );
  const availableParents = allNodes.filter((node) => !unavailableParentIds.has(node.id));
  const deletedNodeCount = editingNode
    ? 1 + allNodes.filter((node) => node.ancestorIds.includes(editingNode.id)).length
    : 0;

  function toggleExpand(id: string) {
    setExpandedNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startCreate(parent: NarrativeNode | null) {
    setEditorMode("create");
    setEditingNodeId(null);
    setParentId(parent?.id || null);
    setNodeType(getDefaultNarrativeTypeForProject(projectType, parent?.type));
    setTitle("");
    setDescription("");
    setOrder("");
    setFormError(null);
    setConfirmingDelete(false);
  }

  function startEdit(node: FlatNarrativeNode) {
    setEditorMode("edit");
    setEditingNodeId(node.id);
    setParentId(node.parentId);
    setNodeType(node.type);
    setTitle(node.title);
    setDescription(node.description || "");
    setOrder(String(node.order + 1));
    setFormError(null);
    setConfirmingDelete(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !editorMode) return;
    setSaving(true);
    setFormError(null);

    const editing = editorMode === "edit" && editingNodeId;
    const endpoint = editing
      ? `/api/projects/${projectId}/narrative-nodes/${editingNodeId}`
      : `/api/projects/${projectId}/narrative-nodes`;

    try {
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          type: nodeType,
          title: title.trim(),
          description: description.trim() || null,
          ...(order === "" ? {} : { order: Number(order) - 1 }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d’enregistrer le nœud");

      if (parentId) {
        setExpandedNodes((current) => new Set(current).add(parentId));
      }
      setEditorMode(null);
      setEditingNodeId(null);
      await loadStructure();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible d’enregistrer le nœud");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingNodeId) return;
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/narrative-nodes/${editingNodeId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de supprimer le nœud");
      setEditorMode(null);
      setEditingNodeId(null);
      setConfirmingDelete(false);
      await loadStructure();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible de supprimer le nœud");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-narra-muted">Chargement de la structure…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link href={`/project/${projectId}`} className="text-sm text-narra-muted hover:text-narra-text">
              ← Retour
            </Link>
            <h1 className="mt-2 text-xl font-bold">{projectFormat.structure.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-narra-muted">
              {projectFormat.structure.description}
            </p>
          </div>
          <button onClick={() => startCreate(null)} className="btn-primary self-start">
            Ajouter une racine
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="card min-w-0" aria-label="Arborescence narrative">
          {loadError ? (
            <div className="p-8 text-center">
              <p role="alert" className="text-sm text-narra-danger">{loadError}</p>
              <button onClick={loadStructure} className="btn mt-4">Réessayer</button>
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="p-8 text-center text-narra-muted sm:p-12">
              <p>Votre structure est vide.</p>
              <p className="mt-2 text-sm">{projectFormat.structure.emptyHint}</p>
              <button onClick={() => startCreate(null)} className="btn-primary mt-5">
                Créer le premier niveau
              </button>
            </div>
          ) : (
            <div className="divide-y divide-narra-border">
              {visibleNodes.map((node) => {
                const hasChildren = node.children.length > 0;
                const isExpanded = expandedNodes.has(node.id);
                const isSelected = editingNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    className={`group flex min-w-0 items-center gap-2 px-3 py-2 ${
                      isSelected ? "bg-narra-accent/10" : "hover:bg-narra-border/30"
                    }`}
                    style={{ paddingInlineStart: `${12 + Math.min(node.depth, 8) * 24}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => hasChildren && toggleExpand(node.id)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center text-narra-muted hover:text-narra-text ${
                        hasChildren ? "" : "invisible"
                      }`}
                      aria-label={isExpanded ? `Replier ${node.title}` : `Déplier ${node.title}`}
                    >
                      <ChevronIcon expanded={isExpanded} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(node)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="badge shrink-0 border-narra-border text-narra-muted">
                          {NARRATIVE_NODE_TYPE_LABELS[node.type] || node.type}
                        </span>
                        <span className="truncate text-sm font-medium">{node.title}</span>
                      </span>
                    </button>
                    <span className="hidden shrink-0 text-xs tabular-nums text-narra-muted sm:block">
                      {node._count.scenes} {projectFormat.content[node._count.scenes === 1 ? "singular" : "plural"]}
                    </span>
                    <button
                      type="button"
                      onClick={() => startCreate(node)}
                      className="btn-ghost shrink-0 px-2 py-1 text-xs"
                      aria-label={`Ajouter un niveau dans ${node.title}`}
                    >
                      Ajouter
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="card p-5 lg:sticky lg:top-6" aria-label="Gestion du niveau sélectionné">
          {!editorMode ? (
            <div className="text-sm text-narra-muted">
              <h2 className="font-semibold text-narra-text">Gérer la hiérarchie</h2>
              <p className="mt-2">Sélectionnez un niveau pour le renommer, le déplacer ou le supprimer.</p>
              <p className="mt-3">Le bouton Ajouter crée un enfant avec des types conseillés selon son parent.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {editorMode === "create" ? "Ajouter un niveau" : "Modifier le niveau"}
                  </h2>
                  {editingNode && (
                    <p className="mt-1 truncate text-xs text-narra-muted" title={editingNode.path.join(" / ")}>
                      {editingNode.path.join(" / ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditorMode(null)}
                  className="btn-ghost px-2 py-1 text-xs"
                >
                  Fermer
                </button>
              </div>

              <div>
                <label htmlFor="node-parent" className="label">Parent</label>
                <select
                  id="node-parent"
                  className="select"
                  value={parentId || ""}
                  onChange={(event) => {
                    const nextParentId = event.target.value || null;
                    const nextParent = allNodes.find((node) => node.id === nextParentId);
                    setParentId(nextParentId);
                    if (editorMode === "create") {
                      setNodeType(getDefaultNarrativeTypeForProject(projectType, nextParent?.type));
                    }
                  }}
                >
                  <option value="">Racine du projet</option>
                  {availableParents.map((node) => (
                    <option key={node.id} value={node.id}>
                      {`${"— ".repeat(node.depth)}${node.title}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="node-type" className="label">Type</label>
                <select
                  id="node-type"
                  className="select"
                  value={nodeType}
                  onChange={(event) => setNodeType(event.target.value)}
                >
                  {!suggestedTypes.some((type) => type === nodeType) && (
                    <option value={nodeType}>{NARRATIVE_NODE_TYPE_LABELS[nodeType] || nodeType}</option>
                  )}
                  <optgroup label={`Adaptés au format ${projectFormat.label}`}>
                    {NARRATIVE_NODE_TYPES.filter(({ value }) => suggestedTypes.includes(value)).map(
                      (type) => <option key={type.value} value={type.value}>{type.label}</option>
                    )}
                  </optgroup>
                </select>
                <p className="mt-1.5 text-xs text-narra-muted">
                  Les choix proposés suivent le type du projet. « Personnalisé » reste disponible pour les cas particuliers.
                </p>
              </div>

              <div>
                <label htmlFor="node-title" className="label">Titre</label>
                <input
                  id="node-title"
                  className="input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  placeholder={projectFormat.structure.titlePlaceholder}
                  required
                />
              </div>

              <div>
                <label htmlFor="node-description" className="label">Description</label>
                <textarea
                  id="node-description"
                  className="textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder="Optionnelle"
                />
              </div>

              <div>
                <label htmlFor="node-order" className="label">Position parmi les niveaux voisins</label>
                <input
                  id="node-order"
                  type="number"
                  min={1}
                  step={1}
                  className="input"
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                  placeholder="Ajouté à la fin"
                />
              </div>

              {formError && <p role="alert" className="text-sm text-narra-danger">{formError}</p>}

              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? "Enregistrement…" : editorMode === "create" ? "Ajouter" : "Enregistrer"}
              </button>

              {editorMode === "edit" && (
                <div className="border-t border-narra-border pt-4">
                  {!confirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="btn-danger w-full"
                    >
                      Supprimer ce niveau
                    </button>
                  ) : (
                    <div className="space-y-3" role="alert">
                      <p className="text-sm text-narra-danger">
                        {deletedNodeCount > 1
                          ? `${deletedNodeCount} niveaux seront supprimés. `
                          : "Ce niveau sera supprimé. "}
                        Leur contenu sera conservé sans rattachement.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleDelete} className="btn-danger flex-1" disabled={saving}>
                          Confirmer
                        </button>
                        <button type="button" onClick={() => setConfirmingDelete(false)} className="btn flex-1" disabled={saving}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </aside>
      </main>
    </div>
  );
}
