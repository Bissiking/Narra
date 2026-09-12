"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MediaPicker from "@/components/media-picker";

interface Location {
  id: string; name: string; type: string | null; imageUrl: string | null;
  description: string | null; textualLocation: string | null; ambiance: string | null; notes: string | null;
  parent: { id: string; name: string } | null;
  _count: { scenes: number };
}

export default function LocationDetailPage() {
  const { projectId, locationId } = useParams() as { projectId: string; locationId: string };
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", imageUrl: "", description: "", textualLocation: "", ambiance: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/locations/${locationId}`).then(async (r) => {
      if (r.ok) { const l = await r.json(); setLocation(l); setForm({ name: l.name || "", type: l.type || "", imageUrl: l.imageUrl || "", description: l.description || "", textualLocation: l.textualLocation || "", ambiance: l.ambiance || "", notes: l.notes || "" }); }
      setLoading(false);
    });
  }, [projectId, locationId]);

  function update(field: string, value: string) { setForm((c) => ({ ...c, [field]: value })); }

  async function handleSave() {
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/locations/${locationId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]))),
    });
    if (r.ok) { setLocation(await r.json()); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce lieu ?")) return;
    const r = await fetch(`/api/projects/${projectId}/locations/${locationId}`, { method: "DELETE" });
    if (r.ok) router.push(`/project/${projectId}/locations`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;
  if (!location) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Lieu introuvable.</span></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}/locations`} className="text-narra-muted hover:text-narra-text text-sm">← Lieux</Link>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-xl font-bold">{editing ? "Édition" : location.name}</h1>
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
              <div><label className="label">Nom</label><input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
              <div><label className="label">Type</label><input className="input" value={form.type} onChange={(e) => update("type", e.target.value)} placeholder="Ville, planète, pièce…" /></div>
            </div>
            <div><label className="label">Image</label><MediaPicker projectId={projectId} value={form.imageUrl} onChange={(url) => update("imageUrl", url)} label="Choisir" /></div>
            <div><label className="label">Position dans l'univers</label><input className="input" value={form.textualLocation} onChange={(e) => update("textualLocation", e.target.value)} /></div>
            <div><label className="label">Ambiance</label><textarea className="textarea" rows={3} value={form.ambiance} onChange={(e) => update("ambiance", e.target.value)} /></div>
            <div><label className="label">Description</label><textarea className="textarea" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} /></div>
            <div><label className="label">Notes</label><textarea className="textarea" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
          </>
        ) : (
          <>
            {location.type && <span className="badge border-narra-border">{location.type}</span>}
            {location.parent && <span className="badge border-narra-border text-narra-muted ml-2">dans {location.parent.name}</span>}
            {location.imageUrl && <div className="mt-4"><img src={location.imageUrl} alt="" className="max-h-48 rounded border border-narra-border" /></div>}
            {location.description && <p className="text-narra-muted mt-4">{location.description}</p>}
            {location.textualLocation && <p className="text-sm text-narra-muted mt-2"><strong>Position :</strong> {location.textualLocation}</p>}
            {location.ambiance && <p className="text-sm text-narra-muted mt-2"><strong>Ambiance :</strong> {location.ambiance}</p>}
            {location.notes && <p className="text-sm text-narra-muted mt-2"><strong>Notes :</strong> {location.notes}</p>}
            <div className="card p-4 mt-6">
              <h3 className="font-bold mb-2">Présence</h3>
              <p className="text-sm text-narra-muted">{location._count.scenes} scène{location._count.scenes !== 1 ? "s" : ""}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
