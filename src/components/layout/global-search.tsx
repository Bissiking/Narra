"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface GlobalSearchProps {
  projectId?: string;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export default function GlobalSearch({ projectId }: GlobalSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search
  useEffect(() => {
    if (!projectId || query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, projectId]);

  function handleSelect(result: SearchResult) {
    setIsOpen(false);
    setQuery("");
    router.push(result.url);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-ghost text-sm text-narra-muted"
      >
        Rechercher <kbd className="ml-2 text-xs opacity-50">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

      <div className="relative w-full max-w-lg card">
        <div className="flex items-center border-b border-narra-border">
          <span className="pl-4 text-narra-muted">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
          />
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 text-narra-muted text-sm"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-narra-muted text-sm">
              Recherche...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-narra-muted text-sm">
              Aucun résultat
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-4 py-2 hover:bg-narra-border/30 flex items-center gap-3"
                >
                  <span className="text-xs text-narra-muted w-20">
                    {result.type}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{result.title}</div>
                    <div className="text-xs text-narra-muted">{result.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
