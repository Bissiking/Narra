"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MediaPicker from "@/components/media-picker";

export default function NewOrganizationPage() {
  const { projectId } = useParams() as { projectId: string }; const router = useRouter();
  const [form, setForm] = useState({ name: "", type: "", status: "active", logoUrl: "", description: "", notes: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/organizations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || undefined]))) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Impossible de créer l’organisation");
      router.push(`/project/${projectId}/organizations`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de créer l’organisation"); } finally { setSaving(false); }
  }
  return <div className="min-h-screen"><header className="border-b border-narra-border"><div className="mx-auto max-w-3xl px-4 py-4 sm:px-6"><Link href={`/project/${projectId}/organizations`} className="text-sm text-narra-muted hover:text-narra-text">← Organisations</Link><h1 className="mt-2 text-xl font-bold">Nouvelle organisation</h1></div></header><main className="mx-auto max-w-3xl px-4 py-6 sm:px-6"><form onSubmit={submit} className="space-y-5">{error && <p role="alert" className="border border-narra-danger p-3 text-sm text-narra-danger">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><Field id="org-name" label="Nom"><input id="org-name" className="input" required maxLength={200} value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus /></Field><Field id="org-type" label="Type"><input id="org-type" className="input" maxLength={100} value={form.type} onChange={(e) => update("type", e.target.value)} placeholder="Faction, entreprise, armée…" /></Field><Field id="org-status" label="Statut"><input id="org-status" className="input" maxLength={50} value={form.status} onChange={(e) => update("status", e.target.value)} /></Field><Field id="org-logo" label="Logo"><MediaPicker projectId={projectId} value={form.logoUrl} onChange={(url) => update("logoUrl", url)} label="Choisir" /></Field></div><Field id="org-description" label="Description"><textarea id="org-description" className="textarea" rows={5} maxLength={5000} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field><Field id="org-notes" label="Notes"><textarea id="org-notes" className="textarea" rows={4} maxLength={10000} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field><div className="flex gap-3 border-t border-narra-border pt-5"><button className="btn-primary" disabled={saving}>{saving ? "Création…" : "Créer l’organisation"}</button><Link href={`/project/${projectId}/organizations`} className="btn">Annuler</Link></div></form></main></div>;
}
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div><label htmlFor={id} className="label">{label}</label>{children}</div>; }
