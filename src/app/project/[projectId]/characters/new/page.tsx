"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface CharacterFormData {
  firstName: string;
  lastName: string;
  alias: string;
  nameColor: string;
  role: string;
  status: string;
  age: string;
  birthDate: string;
  description: string;
  biography: string;
  personality: string;
  motivations: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  quotes: string;
}

const INITIAL_FORM: CharacterFormData = {
  firstName: "",
  lastName: "",
  alias: "",
  nameColor: "#f59e0b",
  role: "",
  status: "active",
  age: "",
  birthDate: "",
  description: "",
  biography: "",
  personality: "",
  motivations: "",
  strengths: "",
  weaknesses: "",
  notes: "",
  quotes: "",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "dead", label: "Décédé" },
  { value: "missing", label: "Disparu" },
  { value: "unknown", label: "Inconnu" },
  { value: "retired", label: "Retraité" },
];

export default function NewCharacterPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [form, setForm] = useState<CharacterFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof CharacterFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            Object.entries(form).map(([key, value]) => [key, value.trim() || undefined])
          )
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer le personnage");
      }
      router.push(`/project/${projectId}/characters/${data.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de créer le personnage"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <Link
            href={`/project/${projectId}/characters`}
            className="text-sm text-narra-muted hover:text-narra-text"
          >
            ← Personnages
          </Link>
          <h1 className="mt-2 text-xl font-bold">Nouveau personnage</h1>
          <p className="mt-1 text-sm text-narra-muted">
            Un prénom, un nom ou un alias suffit pour commencer la fiche.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div role="alert" className="border border-narra-danger p-4 text-sm text-narra-danger">
              {error}
            </div>
          )}

          <section aria-labelledby="identity-heading">
            <div className="mb-4 border-b border-narra-border pb-3">
              <h2 id="identity-heading" className="font-semibold">Identité</h2>
              <p className="mt-1 text-sm text-narra-muted">Les informations utilisées dans les scènes et les dialogues.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="first-name" className="label">Prénom</label>
                <input id="first-name" className="input" maxLength={100} value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} autoFocus />
              </div>
              <div>
                <label htmlFor="last-name" className="label">Nom</label>
                <input id="last-name" className="input" maxLength={100} value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
              </div>
              <div>
                <label htmlFor="alias" className="label">Alias</label>
                <input id="alias" className="input" maxLength={100} value={form.alias} onChange={(event) => updateField("alias", event.target.value)} />
              </div>
              <div>
                <label htmlFor="role" className="label">Rôle</label>
                <input id="role" className="input" maxLength={100} value={form.role} onChange={(event) => updateField("role", event.target.value)} placeholder="Ex. Protagoniste" />
              </div>
              <div>
                <label htmlFor="name-color" className="label">Couleur du nom</label>
                <input id="name-color" type="color" className="h-10 w-full cursor-pointer border border-narra-border bg-narra-bg p-1" value={form.nameColor} onChange={(event) => updateField("nameColor", event.target.value)} />
              </div>
              <div>
                <label htmlFor="age" className="label">Âge</label>
                <input id="age" className="input" maxLength={50} value={form.age} onChange={(event) => updateField("age", event.target.value)} placeholder="Ex. 32 ans" />
              </div>
              <div>
                <label htmlFor="birth-date" className="label">Date de naissance</label>
                <input id="birth-date" className="input" maxLength={100} value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} placeholder="Date réelle ou narrative" />
              </div>
              <div>
                <label htmlFor="status" className="label">Statut</label>
                <select id="status" className="select" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section aria-labelledby="writing-heading">
            <div className="mb-4 border-b border-narra-border pb-3">
              <h2 id="writing-heading" className="font-semibold">Écriture</h2>
              <p className="mt-1 text-sm text-narra-muted">Développez la voix, le parcours et les enjeux du personnage.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label htmlFor="description" className="label">Description</label>
                <textarea id="description" className="textarea" rows={4} maxLength={5000} value={form.description} onChange={(event) => updateField("description", event.target.value)} />
              </div>
              <div>
                <label htmlFor="personality" className="label">Personnalité</label>
                <textarea id="personality" className="textarea" rows={4} maxLength={5000} value={form.personality} onChange={(event) => updateField("personality", event.target.value)} />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="biography" className="label">Biographie</label>
                <textarea id="biography" className="textarea" rows={6} maxLength={50000} value={form.biography} onChange={(event) => updateField("biography", event.target.value)} />
              </div>
              <div>
                <label htmlFor="motivations" className="label">Motivations</label>
                <textarea id="motivations" className="textarea" rows={4} maxLength={5000} value={form.motivations} onChange={(event) => updateField("motivations", event.target.value)} />
              </div>
              <div>
                <label htmlFor="strengths" className="label">Forces</label>
                <textarea id="strengths" className="textarea" rows={4} maxLength={5000} value={form.strengths} onChange={(event) => updateField("strengths", event.target.value)} />
              </div>
              <div>
                <label htmlFor="weaknesses" className="label">Faiblesses</label>
                <textarea id="weaknesses" className="textarea" rows={4} maxLength={5000} value={form.weaknesses} onChange={(event) => updateField("weaknesses", event.target.value)} />
              </div>
              <div>
                <label htmlFor="quotes" className="label">Citations importantes</label>
                <textarea id="quotes" className="textarea" rows={4} maxLength={10000} value={form.quotes} onChange={(event) => updateField("quotes", event.target.value)} />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="notes" className="label">Notes</label>
                <textarea id="notes" className="textarea" rows={4} maxLength={10000} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-narra-border pt-5 sm:flex-row sm:justify-end">
            <Link href={`/project/${projectId}/characters`} className="btn">Annuler</Link>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Création…" : "Créer le personnage"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
