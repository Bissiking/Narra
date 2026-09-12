"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MediaPicker from "@/components/media-picker";

interface Organization {
  id: string; name: string; logoUrl: string | null; type: string | null; status: string | null;
  description: string | null; notes: string | null;
  members: { id: string; role: string | null; character: { id: string; firstName: string | null; lastName: string | null; alias: string | null; portraitUrl: string | null } }[];
  _count: { members: number };
}

export default function OrganizationDetailPage() {
  const { projectId, organizationId } = useParams() as { projectId: string; organizationId: string };
  const router = useRouter();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", status: "", logoUrl: "", description: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/organizations/${organizationId}`).then(async (r) => {
      if (r.ok) { const o = await r.json(); setOrg(o); setForm({ name: o.name || "", type: o.type || "", status: o.status || "", logoUrl: o.logoUrl || "", description: o.description || "", notes: o.notes || "" }); }
      setLoading(false);
    });
  }, [projectId, organizationId]);

  function update(field: string, value: string) { setForm((c) => ({ ...c, [field]: value })); }

  async function handleSave() {
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/organizations/${organizationId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]))),
    });
    if (r.ok) { setOrg(await r.json()); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette organisation ?")) return;
    const r = await fetch(`/api/projects/${projectId}/organizations/${organizationId}`, { method: "DELETE" });
    if (r.ok) router.push(`/project/${projectId}/organizations`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;
  if (!org) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Organisation introuvable.</span></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}/organizations`} className="text-narra-muted hover:text-narra-text text-sm">← Organisations</Link>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-xl font-bold">{editing ? "Édition" : org.name}</h1>
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
              <div><label className="label">Type</label><input className="input" value={form.type} onChange={(e) => update("type", e.target.value)} placeholder="Faction, entreprise…" /></div>
              <div><label className="label">Statut</label><input className="input" value={form.status} onChange={(e) => update("status", e.target.value)} /></div>
            </div>
            <div><label className="label">Logo</label><MediaPicker projectId={projectId} value={form.logoUrl} onChange={(url) => update("logoUrl", url)} label="Choisir" /></div>
            <div><label className="label">Description</label><textarea className="textarea" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} /></div>
            <div><label className="label">Notes</label><textarea className="textarea" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
          </>
        ) : (
          <>
            {org.logoUrl && <img src={org.logoUrl} alt="" className="h-16 rounded border border-narra-border" />}
            <div className="flex gap-2">
              {org.type && <span className="badge border-narra-border">{org.type}</span>}
              {org.status && <span className="badge border-narra-border text-narra-muted">{org.status}</span>}
            </div>
            {org.description && <p className="text-narra-muted">{org.description}</p>}
            {org.notes && <p className="text-sm text-narra-muted"><strong>Notes :</strong> {org.notes}</p>}
            <div className="card p-4 mt-4">
              <h3 className="font-bold mb-3">Membres ({org._count.members})</h3>
              {org.members.length === 0 ? (
                <p className="text-sm text-narra-muted">Aucun membre.</p>
              ) : (
                <div className="space-y-2">
                  {org.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-2">
                      {m.character.portraitUrl ? <img src={m.character.portraitUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-narra-border flex items-center justify-center text-xs font-bold">{(m.character.firstName?.[0] || m.character.alias?.[0] || "?").toUpperCase()}</div>}
                      <div><p className="text-sm font-medium">{m.character.alias || `${m.character.firstName || ""} ${m.character.lastName || ""}`}</p>{m.role && <p className="text-xs text-narra-muted">{m.role}</p>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
