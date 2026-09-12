"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface LoreEntry {
  id: string; title: string; category: string; content: string | null;
  notes: string | null; status: string; progress: number;
}

const CATEGORIES: Record<string, string> = { history: "Histoire", technology: "Technologie", politics: "Politique", organizations: "Organisations", objects: "Objets", concepts: "Concepts", rules: "Règles", events: "Événements", custom: "Autre" };
const STATUS_LABELS: Record<string, string> = { planned: "Prévu", in_progress: "En cours", established: "Établi", review: "Révision" };

export default function LoreDetailPage() {
  const { projectId, loreId } = useParams() as { projectId: string; loreId: string };
  const router = useRouter();
  const [entry, setEntry] = useState<LoreEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", category: "custom", content: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/lore`).then(async (r) => {
      if (r.ok) { const all = await r.json(); const found = all.find((e: LoreEntry) => e.id === loreId); if (found) { setEntry(found); setForm({ title: found.title || "", category: found.category || "custom", content: found.content || "", notes: found.notes || "" }); } }
      setLoading(false);
    });
  }, [projectId, loreId]);

  function update(field: string, value: string) { setForm((c) => ({ ...c, [field]: value })); }

  async function handleSave() {
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/lore/${loreId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]))),
    });
    if (r.ok) { setEntry(await r.json()); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette entrée ?")) return;
    const r = await fetch(`/api/projects/${projectId}/lore/${loreId}`, { method: "DELETE" });
    if (r.ok) router.push(`/project/${projectId}/lore`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;
  if (!entry) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Entrée introuvable.</span></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}/lore`} className="text-narra-muted hover:text-narra-text text-sm">← Lore</Link>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-xl font-bold">{editing ? "Édition" : entry.title}</h1>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>{saving ? "Enregistrement…" : "Sauvegarder"}</button>
                  <button onClick={() => setEditing(false)} className="btn text-sm">Annuler</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="btn text-sm">Éditer</button>
                  <button onClick={handleDelete} className="btn-danger text-sm">Supprimer</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {editing ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Titre</label><input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} /></div>
              <div><label className="label">Catégorie</label><select className="select" value={form.category} onChange={(e) => update("category", e.target.value)}>{Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div><label className="label">Contenu</label><textarea className="textarea" rows={10} value={form.content} onChange={(e) => update("content", e.target.value)} /></div>
            <div><label className="label">Notes</label><textarea className="textarea" rows={4} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
          </>
        ) : (
          <>
            <span className="badge border-narra-border">{CATEGORIES[entry.category] || entry.category}</span>
            <span className="badge border-narra-border text-narra-muted ml-2">{STATUS_LABELS[entry.status] || entry.status} — {entry.progress}%</span>
            {entry.content && <div className="text-narra-muted whitespace-pre-wrap mt-4">{entry.content}</div>}
            {entry.notes && <p className="text-sm text-narra-muted mt-4"><strong>Notes :</strong> {entry.notes}</p>}
          </>
        )}
      </main>
    </div>
  );
}
