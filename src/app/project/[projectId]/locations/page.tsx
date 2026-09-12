"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  imageUrl: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; type: string | null }[];
  _count: { scenes: number };
}

export default function LocationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    async function loadLocations() {
      const res = await fetch(`/api/projects/${projectId}/locations`);
      if (res.ok) setLocations(await res.json());
      setLoading(false);
    }
    loadLocations();
  }, [projectId]);

  const selected = locations.find((l) => l.id === selectedLocation);

  // Build tree for display
  const rootLocations = locations.filter((l) => !l.parent);

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
      <aside className="w-64 border-r border-narra-border flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <div className="flex items-center justify-between mt-2">
            <h2 className="font-bold">Lieux</h2>
            <Link href={`/project/${projectId}/locations/new`} className="text-narra-accent text-sm">
              + Ajouter
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {locations.length === 0 ? (
            <p className="text-narra-muted text-sm p-2">Aucun lieu.</p>
          ) : (
            rootLocations.map((loc) => (
              <div key={loc.id}>
                <button
                  onClick={() => setSelectedLocation(loc.id)}
                  className={`w-full text-left p-3 mb-1 transition-colors ${
                    selectedLocation === loc.id
                      ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                      : "hover:bg-narra-border/30"
                  }`}
                >
                  <div className="font-medium text-sm truncate">{loc.name}</div>
                  <div className="text-xs text-narra-muted">
                    {loc._count.scenes} scène{loc._count.scenes !== 1 ? "s" : ""}
                  </div>
                </button>
                {loc.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedLocation(child.id)}
                    className={`w-full text-left p-3 mb-1 ml-4 text-sm transition-colors ${
                      selectedLocation === child.id
                        ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                        : "hover:bg-narra-border/30"
                    }`}
                  >
                    <div className="truncate">{child.name}</div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-2">{selected.name}</h1>
            <Link href={`/project/${projectId}/locations/${selected.id}`} className="btn-ghost text-xs">Éditer</Link>

            <div className="flex gap-2 mb-6">
              {selected.type && (
                <span className="badge border-narra-border">{selected.type}</span>
              )}
              {selected.parent && (
                <span className="badge border-narra-border text-narra-muted">
                  dans {selected.parent.name}
                </span>
              )}
            </div>

            {selected.description && (
              <p className="text-narra-muted mb-6">{selected.description}</p>
            )}

            <div className="card p-4">
              <h3 className="font-bold mb-2">Présence</h3>
              <p className="text-sm text-narra-muted">
                {selected._count.scenes} scène{selected._count.scenes !== 1 ? "s" : ""} se déroule{selected._count.scenes !== 1 ? "nt" : ""} ici
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-2">Sélectionnez un lieu</p>
              <p className="text-sm">ou créez-en un nouveau</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
