"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Collaborator {
  id: string; name: string | null; email: string; avatarUrl: string | null; role: string;
}
interface Invite {
  id: string; token: string; role: string; expiresAt: string; createdAt: string; url: string;
}

export default function SharePage() {
  const { projectId } = useParams() as { projectId: string };
  const [owner, setOwner] = useState<Collaborator | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/collaborators`);
    if (res.ok) {
      const data = await res.json();
      setOwner(data.owner);
      setCollaborators(data.collaborators);
    }
    const resInvites = await fetch(`/api/projects/${projectId}/invites`);
    if (resInvites.ok) setInvites(await resInvites.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function addCollaborator(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/collaborators`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setCollaborators((c) => [...c, data]);
    setEmail("");
  }

  async function removeCollaborator(userId: string) {
    if (!confirm("Retirer ce collaborateur ?")) return;
    const res = await fetch(`/api/projects/${projectId}/collaborators?userId=${userId}`, { method: "DELETE" });
    if (res.ok) setCollaborators((c) => c.filter((x) => x.id !== userId));
  }

  async function createInvite(inviteRole: string) {
    const res = await fetch(`/api/projects/${projectId}/invites`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInvites((i) => [invite, ...i]);
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/projects/${projectId}/invites?inviteId=${inviteId}`, { method: "DELETE" });
    if (res.ok) setInvites((i) => i.filter((x) => x.id !== inviteId));
  }

  function copyLink(url: string, inviteId: string) {
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    setCopied(inviteId);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">← Retour</Link>
          <h1 className="text-xl font-bold mt-2">Partage & Collaboration</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Owner */}
        {owner && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-narra-muted mb-3">Propriétaire</h2>
            <div className="flex items-center gap-3 p-3 card">
              <div className="w-10 h-10 rounded-full bg-narra-accent/20 flex items-center justify-center text-sm font-bold text-narra-accent">
                {(owner.name?.[0] || owner.email[0]).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{owner.name || owner.email}</p>
                <p className="text-xs text-narra-muted">{owner.email}</p>
              </div>
            </div>
          </section>
        )}

        {/* Add collaborator */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-narra-muted mb-3">Ajouter un collaborateur</h2>
          <form onSubmit={addCollaborator} className="flex gap-2">
            <input type="email" className="input flex-1" placeholder="Email de l'utilisateur" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <select className="select w-32" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="editor">Éditeur</option>
              <option value="viewer">Lecteur</option>
            </select>
            <button type="submit" className="btn-primary text-sm">Ajouter</button>
          </form>
          {error && <p className="text-xs text-narra-danger mt-2">{error}</p>}
        </section>

        {/* Current collaborators */}
        {collaborators.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-narra-muted mb-3">Collaborateurs ({collaborators.length})</h2>
            <div className="space-y-2">
              {collaborators.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 card">
                  <div className="w-10 h-10 rounded-full bg-narra-border flex items-center justify-center text-sm font-bold">
                    {(c.name?.[0] || c.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name || c.email}</p>
                    <p className="text-xs text-narra-muted">{c.email}</p>
                  </div>
                  <span className={`badge ${c.role === "editor" ? "border-narra-accent text-narra-accent" : "border-narra-border text-narra-muted"}`}>
                    {c.role === "editor" ? "Éditeur" : "Lecteur"}
                  </span>
                  <button onClick={() => removeCollaborator(c.id)} className="text-xs text-narra-danger hover:text-narra-danger">Retirer</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Invite links */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-narra-muted mb-3">Liens d'invitation</h2>
          <div className="flex gap-2 mb-4">
            <button onClick={() => createInvite("editor")} className="btn-ghost text-sm">Générer lien éditeur</button>
            <button onClick={() => createInvite("viewer")} className="btn-ghost text-sm">Générer lien lecteur</button>
          </div>
          {invites.length > 0 ? (
            <div className="space-y-2">
              {invites.map((inv) => {
                const expired = new Date(inv.expiresAt) < new Date();
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-3 card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${inv.role === "editor" ? "border-narra-accent text-narra-accent" : "border-narra-border text-narra-muted"}`}>
                          {inv.role === "editor" ? "Éditeur" : "Lecteur"}
                        </span>
                        {expired && <span className="text-xs text-narra-danger">Expiré</span>}
                      </div>
                      <p className="text-xs text-narra-muted mt-1">
                        Expire le {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <button onClick={() => copyLink(inv.url, inv.id)} className="btn-ghost text-xs">
                      {copied === inv.id ? "Copié !" : "Copier le lien"}
                    </button>
                    <button onClick={() => revokeInvite(inv.id)} className="text-xs text-narra-danger hover:text-narra-danger">
                      Révoquer
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-narra-muted">Aucun lien d'invitation actif.</p>
          )}
        </section>
      </main>
    </div>
  );
}
