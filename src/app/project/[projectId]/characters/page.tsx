"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Character {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  portraitUrl: string | null;
  role: string | null;
  status: string;
  description: string | null;
  _count: {
    sceneAppearances: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  dead: "Décédé",
  missing: "Disparu",
  unknown: "Inconnu",
  retired: "Retraité",
};

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  useEffect(() => {
    async function loadCharacters() {
      const res = await fetch(`/api/projects/${projectId}/characters`);
      if (res.ok) setCharacters(await res.json());
      setLoading(false);
    }
    loadCharacters();
  }, [projectId]);

  const selected = characters.find((c) => c.id === selectedCharacter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Character list */}
      <aside className="w-64 border-r border-narra-border flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <div className="flex items-center justify-between mt-2">
            <h2 className="font-bold">Personnages</h2>
            <Link href={`/project/${projectId}/characters/new`} className="text-narra-accent text-sm">
              + Ajouter
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {characters.length === 0 ? (
            <p className="text-narra-muted text-sm p-2">Aucun personnage.</p>
          ) : (
            characters.map((character) => (
              <button
                key={character.id}
                onClick={() => setSelectedCharacter(character.id)}
                className={`w-full text-left p-3 mb-1 flex items-center gap-3 transition-colors ${
                  selectedCharacter === character.id
                    ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                    : "hover:bg-narra-border/30"
                }`}
              >
                {character.portraitUrl ? (
                  <img
                    src={character.portraitUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-narra-border flex items-center justify-center text-sm font-bold">
                    {(character.firstName?.[0] || character.alias?.[0] || "?").toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {character.alias || `${character.firstName || ""} ${character.lastName || ""}`.trim()}
                  </div>
                  <div className="text-xs text-narra-muted">{STATUS_LABELS[character.status] || character.status}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main - Character detail */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="max-w-3xl mx-auto p-8">
            <div className="flex items-start gap-6 mb-8">
              {selected.portraitUrl ? (
                <img
                  src={selected.portraitUrl}
                  alt=""
                  className="w-24 h-24 rounded object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-narra-border flex items-center justify-center text-3xl font-bold">
                  {(selected.firstName?.[0] || selected.alias?.[0] || "?").toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">
                  {selected.firstName} {selected.lastName}
                  {selected.alias && (
                    <span className="text-narra-muted text-lg ml-2">"{selected.alias}"</span>
                  )}
                </h1>

                <div className="flex gap-2 mb-4">
                  <span className="badge border-narra-border">{STATUS_LABELS[selected.status] || selected.status}</span>
                  {selected.role && (
                    <span className="badge border-narra-border">{selected.role}</span>
                  )}
                </div>

                {selected.description && (
                  <p className="text-narra-muted">{selected.description}</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-4">
                <h3 className="font-bold mb-2">Présence</h3>
                <p className="text-sm text-narra-muted">
                  Apparaît dans {selected._count.sceneAppearances} scène{selected._count.sceneAppearances !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-2">Sélectionnez un personnage</p>
              <p className="text-sm">ou créez-en un nouveau</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
