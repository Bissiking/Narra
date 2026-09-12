"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface ParentLocation { id: string; name: string; parent: { name: string } | null }

export default function NewLocationPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const [parents, setParents] = useState<ParentLocation[]>([]);
  const [form, setForm] = useState({ name: "", type: "", parentId: "", imageUrl: "", textualLocation: "", ambiance: "", description: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/locations`).then(async (response) => {
      if (response.ok) setParents(await response.json());
    });
  }, [projectId]);

  function update(field: string, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/locations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || undefined]))),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de créer le lieu");
      router.push(`/project/${projectId}/locations`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de créer le lieu"); }
    finally { setSaving(false); }
  }

  return (
    <CreationLayout projectId={projectId} title="Nouveau lieu" back="locations">
      <form onSubmit={submit} className="space-y-6">
        {error && <p role="alert" className="border border-narra-danger p-3 text-sm text-narra-danger">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" id="name"><input id="name" className="input" required maxLength={200} value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus /></Field>
          <Field label="Type" id="type"><input id="type" className="input" maxLength={100} value={form.type} onChange={(e) => update("type", e.target.value)} placeholder="Ville, planète, pièce…" /></Field>
          <Field label="Lieu parent" id="parent"><select id="parent" className="select" value={form.parentId} onChange={(e) => update("parentId", e.target.value)}><option value="">Aucun</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.parent ? `${item.parent.name} / ` : ""}{item.name}</option>)}</select></Field>
          <Field label="URL de l’image" id="image"><input id="image" className="input" type="url" value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} /></Field>
          <Field label="Position dans l’univers" id="position"><input id="position" className="input" maxLength={500} value={form.textualLocation} onChange={(e) => update("textualLocation", e.target.value)} placeholder="Secteur, région, coordonnées…" /></Field>
          <Field label="Ambiance" id="ambiance"><textarea id="ambiance" className="textarea" rows={3} maxLength={2000} value={form.ambiance} onChange={(e) => update("ambiance", e.target.value)} /></Field>
        </div>
        <Field label="Description" id="description"><textarea id="description" className="textarea" rows={5} maxLength={5000} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field>
        <Field label="Notes" id="notes"><textarea id="notes" className="textarea" rows={4} maxLength={10000} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
        <Actions projectId={projectId} back="locations" saving={saving} label="Créer le lieu" />
      </form>
    </CreationLayout>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div><label htmlFor={id} className="label">{label}</label>{children}</div>; }
function Actions({ projectId, back, saving, label }: { projectId: string; back: string; saving: boolean; label: string }) { return <div className="flex gap-3 border-t border-narra-border pt-5"><button className="btn-primary" disabled={saving}>{saving ? "Création…" : label}</button><Link className="btn" href={`/project/${projectId}/${back}`}>Annuler</Link></div>; }
function CreationLayout({ projectId, title, back, children }: { projectId: string; title: string; back: string; children: React.ReactNode }) { return <div className="min-h-screen"><header className="border-b border-narra-border"><div className="mx-auto max-w-4xl px-4 py-4 sm:px-6"><Link href={`/project/${projectId}/${back}`} className="text-sm text-narra-muted hover:text-narra-text">← Retour</Link><h1 className="mt-2 text-xl font-bold">{title}</h1></div></header><main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">{children}</main></div>; }
