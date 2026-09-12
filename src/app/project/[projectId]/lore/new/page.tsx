"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES = [
  ["history", "Histoire"], ["technology", "Technologie"], ["politics", "Politique"],
  ["organizations", "Organisations"], ["objects", "Objets"], ["concepts", "Concepts"],
  ["rules", "Règles"], ["events", "Événements"], ["custom", "Autre"],
];

export default function NewLorePage() {
  const { projectId } = useParams() as { projectId: string }; const router = useRouter();
  const [form, setForm] = useState({ title: "", category: "history", status: "planned", progress: 0, content: "", notes: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  function update(field: string, value: string | number) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/lore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Impossible de créer l’entrée");
      router.push(`/project/${projectId}/lore`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de créer l’entrée"); } finally { setSaving(false); }
  }
  return <div className="min-h-screen"><header className="border-b border-narra-border"><div className="mx-auto max-w-4xl px-4 py-4 sm:px-6"><Link href={`/project/${projectId}/lore`} className="text-sm text-narra-muted hover:text-narra-text">← Lore</Link><h1 className="mt-2 text-xl font-bold">Nouvelle entrée de lore</h1><p className="mt-1 text-sm text-narra-muted">Consignez une règle, un fait ou un jalon et suivez son degré de définition.</p></div></header><main className="mx-auto max-w-4xl px-4 py-6 sm:px-6"><form onSubmit={submit} className="space-y-5">{error && <p role="alert" className="border border-narra-danger p-3 text-sm text-narra-danger">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><Field id="lore-title" label="Titre"><input id="lore-title" className="input" required maxLength={200} value={form.title} onChange={(e) => update("title", e.target.value)} autoFocus /></Field><Field id="lore-category" label="Catégorie"><select id="lore-category" className="select" value={form.category} onChange={(e) => update("category", e.target.value)}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field id="lore-status" label="État"><select id="lore-status" className="select" value={form.status} onChange={(e) => update("status", e.target.value)}><option value="planned">À définir</option><option value="in_progress">En développement</option><option value="review">À vérifier</option><option value="established">Établi</option></select></Field><Field id="lore-progress" label={`Avancement — ${form.progress} %`}><input id="lore-progress" type="range" min={0} max={100} step={5} className="w-full accent-amber-500" value={form.progress} onChange={(e) => update("progress", Number(e.target.value))} /></Field></div><Field id="lore-content" label="Contenu"><textarea id="lore-content" className="textarea font-serif" rows={12} maxLength={100000} value={form.content} onChange={(e) => update("content", e.target.value)} /></Field><Field id="lore-notes" label="Notes internes"><textarea id="lore-notes" className="textarea" rows={4} maxLength={10000} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field><div className="flex gap-3 border-t border-narra-border pt-5"><button className="btn-primary" disabled={saving}>{saving ? "Création…" : "Créer l’entrée"}</button><Link href={`/project/${projectId}/lore`} className="btn">Annuler</Link></div></form></main></div>;
}
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div><label htmlFor={id} className="label">{label}</label>{children}</div>; }
