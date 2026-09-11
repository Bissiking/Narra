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
