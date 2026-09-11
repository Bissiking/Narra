"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Character {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  portraitUrl: string | null;
  role: string | null;
  description: string | null;
  biography: string | null;
  age: string | null;
  birthDate: string | null;
  status: string;
  personality: string | null;
  motivations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  quotes: string | null;
}

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const characterId = params.characterId as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [alias, setAlias] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [biography, setBiography] = useState("");
  const [age, setAge] = useState("");
  const [personality, setPersonality] = useState("");
  const [motivations, setMotivations] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [notes, setNotes] = useState("");
  const [quotes, setQuotes] = useState("");

  useEffect(() => {
    async function loadCharacter() {
      const res = await fetch(`/api/characters/${characterId}`);
      if (res.ok) {
        const c = await res.json();
        setCharacter(c);
        setFirstName(c.firstName || "");
        setLastName(c.lastName || "");
        setAlias(c.alias || "");
        setRole(c.role || "");
        setStatus(c.status || "active");
        setDescription(c.description || "");
        setBiography(c.biography || "");
        setAge(c.age || "");
        setPersonality(c.personality || "");
        setMotivations(c.motivations || "");
        setStrengths(c.strengths || "");
        setWeaknesses(c.weaknesses || "");
        setNotes(c.notes || "");
        setQuotes(c.quotes || "");
      }
      setLoading(false);
    }
    loadCharacter();
  }, [characterId]);

  async function handleSave() {
    const res = await fetch(`/api/characters/${characterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        alias,
        role,
        status,
        description,
        biography,
        age,
        personality,
        motivations,
        strengths,
        weaknesses,
        notes,
        quotes,
      }),
    });

    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Personnage introuvable.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href={`/project/${projectId}/characters`} className="text-narra-muted hover:text-narra-text text-sm">
              ← Personnages
            </Link>
            <h1 className="text-xl font-bold mt-2">
              {character.firstName} {character.lastName}
              {character.alias && <span className="text-narra-muted ml-2">"{character.alias}"</span>}
            </h1>
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button onClick={handleSave} className="btn-primary">
                  Sauvegarder
                </button>
                <button onClick={() => setEditing(false)} className="btn">
                  Annuler
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn">
                Éditer
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="font-bold mb-4">Informations</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  {editing ? (
                    <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  ) : (
                    <p>{character.firstName || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="label">Nom</label>
                  {editing ? (
                    <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  ) : (
                    <p>{character.lastName || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="label">Alias</label>
                  {editing ? (
                    <input className="input" value={alias} onChange={(e) => setAlias(e.target.value)} />
                  ) : (
                    <p>{character.alias || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="label">Rôle</label>
                  {editing ? (
                    <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
                  ) : (
                    <p>{character.role || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="label">Âge</label>
                  {editing ? (
                    <input className="input" value={age} onChange={(e) => setAge(e.target.value)} />
                  ) : (
                    <p>{character.age || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="label">Statut</label>
                  {editing ? (
                    <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="active">Actif</option>
                      <option value="dead">Décédé</option>
                      <option value="missing">Disparu</option>
                      <option value="unknown">Inconnu</option>
                      <option value="retired">Retraité</option>
                    </select>
                  ) : (
                    <p>{character.status}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Description</h2>
              {editing ? (
                <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.description || "Aucune description."}</p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Biographie</h2>
              {editing ? (
                <textarea className="textarea" rows={6} value={biography} onChange={(e) => setBiography(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.biography || "Aucune biographie."}</p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Personnalité</h2>
              {editing ? (
                <textarea className="textarea" rows={4} value={personality} onChange={(e) => setPersonality(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.personality || "—"}</p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Citations</h2>
              {editing ? (
                <textarea className="textarea" rows={4} value={quotes} onChange={(e) => setQuotes(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap italic">{character.quotes || "—"}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-bold mb-4">Portrait</h2>
              {character.portraitUrl ? (
                <img src={character.portraitUrl} alt="" className="w-full rounded" />
              ) : (
                <div className="aspect-square bg-narra-border flex items-center justify-center text-4xl font-bold">
                  {(character.firstName?.[0] || character.alias?.[0] || "?").toUpperCase()}
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Forces</h2>
              {editing ? (
                <textarea className="textarea" rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.strengths || "—"}</p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Faiblesses</h2>
              {editing ? (
                <textarea className="textarea" rows={3} value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.weaknesses || "—"}</p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Motivations</h2>
              {editing ? (
                <textarea className="textarea" rows={3} value={motivations} onChange={(e) => setMotivations(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.motivations || "—"}</p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4">Notes</h2>
              {editing ? (
                <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              ) : (
                <p className="text-narra-muted whitespace-pre-wrap">{character.notes || "—"}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
