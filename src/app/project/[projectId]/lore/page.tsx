"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface LoreEntry {
  id: string;
  title: string;
  category: string;
  content: string | null;
  notes: string | null;
  status: string;
  progress: number;
  tags: { tag: { id: string; name: string; color: string | null } }[];
  _count: { linksFrom: number; linksTo: number };
}

const CATEGORIES = [
  { value: "history", label: "Histoire" },
  { value: "technology", label: "Technologie" },
  { value: "politics", label: "Politique" },
  { value: "organizations", label: "Organisations" },
  { value: "objects", label: "Objets" },
  { value: "concepts", label: "Concepts" },
  { value: "rules", label: "Règles" },
  { value: "events", label: "Événements" },
  { value: "custom", label: "Autre" },
];

const CATEGORY_COLORS: Record<string, string> = {
  history: "text-blue-400",
  technology: "text-cyan-400",
  politics: "text-purple-400",
  organizations: "text-amber-400",
  objects: "text-green-400",
  concepts: "text-pink-400",
  rules: "text-red-400",
  events: "text-orange-400",
  custom: "text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "À définir",
  in_progress: "En développement",
  review: "À vérifier",
  established: "Établi",
};

export default function LorePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadLore() {
      const url = filterCategory
        ? `/api/projects/${projectId}/lore?category=${filterCategory}`
        : `/api/projects/${projectId}/lore`;
      const res = await fetch(url);
      if (res.ok) setEntries(await res.json());
      setLoading(false);
    }
    loadLore();
  }, [projectId, filterCategory]);

  const selected = entries.find((e) => e.id === selectedEntry);

  async function updateTracking(id: string, updates: { status?: string; progress?: number }) {
    const response = await fetch(`/api/projects/${projectId}/lore/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (response.ok) {
      const updated = await response.json();
      setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...updated } : entry));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-narra-border flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <div className="flex items-center justify-between mt-2">
            <h2 className="font-bold">Lore</h2>
            <Link href={`/project/${projectId}/lore/new`} className="text-narra-accent text-sm">
              + Ajouter
            </Link>
          </div>
        </div>

        {/* Category filter */}
        <div className="p-3 border-b border-narra-border">
          <select
            value={filterCategory || ""}
            onChange={(e) => setFilterCategory(e.target.value || null)}
            className="select text-sm"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {entries.length === 0 ? (
            <p className="text-narra-muted text-sm p-2">Aucune entrée.</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry.id)}
                className={`w-full text-left p-3 mb-1 transition-colors ${
                  selectedEntry === entry.id
                    ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                    : "hover:bg-narra-border/30"
                }`}
              >
                <div className="font-medium text-sm truncate">{entry.title}</div>
                <div className={`text-xs ${CATEGORY_COLORS[entry.category] || "text-narra-muted"}`}>
                  {CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category}
                </div>
                <div className="mt-2 h-px bg-narra-border" aria-hidden="true">
                  <div className="h-px bg-narra-accent" style={{ width: `${entry.progress}%` }} />
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="max-w-3xl mx-auto p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{selected.title}</h1>
                <span className={`badge ${CATEGORY_COLORS[selected.category] || ""}`}>
                  {CATEGORIES.find((c) => c.value === selected.category)?.label || selected.category}
                </span>
              </div>
            </div>

            <div className="mb-8 grid gap-4 border-y border-narra-border py-4 sm:grid-cols-[1fr_2fr]">
              <div>
                <label htmlFor="lore-status" className="label">État du canon</label>
                <select
                  id="lore-status"
                  className="select"
                  value={selected.status}
                  onChange={(event) => updateTracking(selected.id, { status: event.target.value })}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lore-progress" className="label">Avancement — {selected.progress} %</label>
                <input
                  id="lore-progress"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={selected.progress}
                  onChange={(event) => {
                    const progress = Number(event.target.value);
                    setEntries((current) => current.map((entry) => entry.id === selected.id ? { ...entry, progress } : entry));
                  }}
                  onPointerUp={(event) => updateTracking(selected.id, { progress: Number(event.currentTarget.value) })}
                  onKeyUp={(event) => updateTracking(selected.id, { progress: Number(event.currentTarget.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            {selected.content && (
              <div className="prose prose-invert max-w-none mb-6">
                <div className="whitespace-pre-wrap text-narra-muted">{selected.content}</div>
              </div>
            )}

            {selected.notes && (
              <div className="card p-4 mt-6">
                <h3 className="font-bold mb-2 text-sm">Notes</h3>
                <p className="text-sm text-narra-muted whitespace-pre-wrap">{selected.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-2">Sélectionnez une entrée</p>
              <p className="text-sm">ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
