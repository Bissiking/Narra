"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const TYPE_LABELS: Record<string, string> = {
  scene: "Scène",
  character: "Personnage",
  location: "Lieu",
  organization: "Organisation",
  lore: "Lore",
  timeline: "Timeline",
};

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`
      );
      if (res.ok) setResults(await res.json());
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <h1 className="text-xl font-bold mt-2">Recherche</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <input
          type="text"
          className="input text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un personnage, lieu, scène..."
          autoFocus
        />

        <div className="mt-6">
          {loading && (
            <p className="text-narra-muted text-sm">Recherche en cours...</p>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-narra-muted">Aucun résultat pour "{query}"</p>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  className="card p-4 flex items-center gap-4 hover:border-narra-accent transition-colors"
                >
                  <span className="badge border-narra-border text-xs">
                    {TYPE_LABELS[result.type] || result.type}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-narra-muted">{result.subtitle}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {query.length < 2 && (
            <p className="text-narra-muted text-sm">
              Tapez au moins 2 caractères pour lancer la recherche.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
