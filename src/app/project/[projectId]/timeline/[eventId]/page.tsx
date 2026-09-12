"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TimelineEvent {
  id: string; title: string; description: string | null; narrativeDate: string | null; sortKey: string | null;
  location: { id: string; name: string } | null;
  characters: { character: { id: string; firstName: string | null; lastName: string | null; alias: string | null } }[];
  organizations: { id: string; name: string }[];
  scenes: { id: string; title: string }[];
}

export default function TimelineEventDetailPage() {
  const { projectId, eventId } = useParams() as { projectId: string; eventId: string };
  const router = useRouter();
  const [event, setEvent] = useState<TimelineEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", narrativeDate: "", sortKey: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/timeline/${eventId}`).then(async (r) => {
      if (r.ok) { const e = await r.json(); setEvent(e); setForm({ title: e.title || "", description: e.description || "", narrativeDate: e.narrativeDate || "", sortKey: e.sortKey || "" }); }
      setLoading(false);
    });
  }, [projectId, eventId]);

  function update(field: string, value: string) { setForm((c) => ({ ...c, [field]: value })); }

  async function handleSave() {
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/timeline/${eventId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]))),
    });
    if (r.ok) { setEvent(await r.json()); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer cet événement ?")) return;
    const r = await fetch(`/api/projects/${projectId}/timeline/${eventId}`, { method: "DELETE" });
    if (r.ok) router.push(`/project/${projectId}/timeline`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Événement introuvable.</span></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}/timeline`} className="text-narra-muted hover:text-narra-text text-sm">← Timeline</Link>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-xl font-bold">{editing ? "Édition" : event.title}</h1>
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
            <div><label className="label">Titre</label><input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Date narrative</label><input className="input" value={form.narrativeDate} onChange={(e) => update("narrativeDate", e.target.value)} placeholder="Ex. Avant la bataille" /></div>
              <div><label className="label">Clé de tri</label><input className="input" value={form.sortKey} onChange={(e) => update("sortKey", e.target.value)} placeholder="Année, ère…" /></div>
            </div>
            <div><label className="label">Description</label><textarea className="textarea" rows={6} value={form.description} onChange={(e) => update("description", e.target.value)} /></div>
          </>
        ) : (
          <>
            {event.narrativeDate && <p className="text-narra-accent text-sm">{event.narrativeDate}</p>}
            {event.description && <p className="text-narra-muted whitespace-pre-wrap">{event.description}</p>}
            {event.location && <p className="text-sm text-narra-muted mt-4"><strong>Lieu :</strong> {event.location.name}</p>}
            {event.characters.length > 0 && (
              <div className="mt-4"><h3 className="text-sm font-semibold mb-2">Personnages</h3>
                <div className="flex flex-wrap gap-2">{event.characters.map((c) => <span key={c.character.id} className="badge border-narra-border">{c.character.alias || `${c.character.firstName} ${c.character.lastName}`}</span>)}</div>
              </div>
            )}
            {event.organizations.length > 0 && (
              <div className="mt-4"><h3 className="text-sm font-semibold mb-2">Organisations</h3>
                <div className="flex flex-wrap gap-2">{event.organizations.map((o) => <span key={o.id} className="badge border-narra-border">{o.name}</span>)}</div>
              </div>
            )}
            {event.scenes.length > 0 && (
              <div className="mt-4"><h3 className="text-sm font-semibold mb-2">Scènes</h3>
                <div className="space-y-1">{event.scenes.map((s) => <p key={s.id} className="text-sm text-narra-muted">{s.title}</p>)}</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
