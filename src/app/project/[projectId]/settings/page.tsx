"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  status: string;
}

const PROJECT_TYPES = [
  { value: "story", label: "Histoire" },
  { value: "novel", label: "Roman" },
  { value: "screenplay", label: "Scénario" },
  { value: "vn", label: "Visual Novel" },
  { value: "comic", label: "Bande dessinée (DEV)" },
  { value: "universe", label: "Univers narratif" },
];

const PROJECT_STATUSES = [
  { value: "idea", label: "Idée" },
  { value: "writing", label: "En écriture" },
  { value: "paused", label: "En pause" },
  { value: "completed", label: "Terminé" },
  { value: "archived", label: "Archivé" },
];

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("story");
  const [status, setStatus] = useState("idea");

  useEffect(() => {
    async function loadProject() {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const p = await res.json();
        setProject(p);
        setName(p.name);
        setDescription(p.description || "");
        setType(p.type);
        setStatus(p.status);
      }
      setLoading(false);
    }
    loadProject();
  }, [projectId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type, status }),
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.")) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/library");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Projet introuvable.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour au projet
          </Link>
          <h1 className="text-xl font-bold mt-2">Paramètres</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="card p-6">
          <h2 className="font-bold mb-4">Informations générales</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Nom</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {type === "comic" && (
                  <p className="mt-2 text-xs leading-relaxed text-narra-muted">
                    Format en développement. Un éditeur complet de planches et une lecture avec SFX et musique optionnelle sont prévus.
                  </p>
                )}
              </div>

              <div>
                <label className="label">Statut</label>
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6 border-narra-danger">
          <h2 className="font-bold mb-4 text-narra-danger">Zone dangereuse</h2>
          <p className="text-sm text-narra-muted mb-4">
            La suppression du projet est irréversible. Toutes les données seront perdues.
          </p>
          <button onClick={handleDelete} className="btn-danger" disabled={deleting}>
            {deleting ? "Suppression..." : "Supprimer le projet"}
          </button>
        </div>
      </main>
    </div>
  );
}
