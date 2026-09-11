"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PROJECT_TYPES = [
  { value: "story", label: "Histoire" },
  { value: "novel", label: "Roman" },
  { value: "screenplay", label: "Scénario" },
  { value: "vn", label: "Visual Novel" },
  { value: "comic", label: "Bande dessinée" },
  { value: "universe", label: "Univers narratif" },
];

const PROJECT_STATUSES = [
  { value: "idea", label: "Idée" },
  { value: "writing", label: "En écriture" },
  { value: "paused", label: "En pause" },
  { value: "completed", label: "Terminé" },
  { value: "archived", label: "Archivé" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("story");
  const [status, setStatus] = useState("idea");
  const [genres, setGenres] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          type,
          status,
          genres: genres
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const project = await response.json();
      router.push(`/project/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/library" className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour à la bibliothèque
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">Nouveau projet</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 border border-narra-danger bg-narra-danger/10 text-narra-danger text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Nom du projet *</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mon Roman, ARC, etc."
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte du projet..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Statut</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Genres (séparés par des virgules)</label>
            <input
              type="text"
              className="input"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="Ex: science-fiction, action, drame"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Création..." : "Créer le projet"}
            </button>
            <Link href="/library" className="btn">
              Annuler
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
