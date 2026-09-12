"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  status: string | null;
  logoUrl: string | null;
  members: {
    id: string;
    role: string | null;
    rank: string | null;
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      portraitUrl: string | null;
    };
  }[];
  _count: { members: number };
}

export default function OrganizationsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizations() {
      const res = await fetch(`/api/projects/${projectId}/organizations`);
      if (res.ok) setOrganizations(await res.json());
      setLoading(false);
    }
    loadOrganizations();
  }, [projectId]);

  const selected = organizations.find((o) => o.id === selectedOrg);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-narra-border flex flex-col">
        <div className="p-4 border-b border-narra-border">
          <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
            ← Retour
          </Link>
          <div className="flex items-center justify-between mt-2">
            <h2 className="font-bold">Organisations</h2>
            <Link href={`/project/${projectId}/organizations/new`} className="text-narra-accent text-sm">
              + Ajouter
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {organizations.length === 0 ? (
            <p className="text-narra-muted text-sm p-2">Aucune organisation.</p>
          ) : (
            organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org.id)}
                className={`w-full text-left p-3 mb-1 transition-colors ${
                  selectedOrg === org.id
                    ? "bg-narra-accent/10 border-l-2 border-narra-accent"
                    : "hover:bg-narra-border/30"
                }`}
              >
                <div className="font-medium text-sm truncate">{org.name}</div>
                <div className="text-xs text-narra-muted">
                  {org._count.members} membre{org._count.members !== 1 ? "s" : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="max-w-3xl mx-auto p-8">
            <div className="flex items-start gap-6 mb-6">
              {selected.logoUrl ? (
                <img src={selected.logoUrl} alt="" className="w-16 h-16 rounded object-cover" />
              ) : (
                <div className="w-16 h-16 bg-narra-border flex items-center justify-center text-2xl font-bold">
                  {selected.name[0]}
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold mb-2">{selected.name}</h1>
                <Link href={`/project/${projectId}/organizations/${selected.id}`} className="btn-ghost text-xs">Éditer</Link>
                <div className="flex gap-2">
                  {selected.type && <span className="badge border-narra-border">{selected.type}</span>}
                  {selected.status && (
                    <span className="badge border-narra-border text-narra-muted">{selected.status}</span>
                  )}
                </div>
              </div>
            </div>

            {selected.description && (
              <p className="text-narra-muted mb-6">{selected.description}</p>
            )}

            <div className="card p-4">
              <h3 className="font-bold mb-4">Membres ({selected.members.length})</h3>
              {selected.members.length === 0 ? (
                <p className="text-sm text-narra-muted">Aucun membre.</p>
              ) : (
                <div className="space-y-2">
                  {selected.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2">
                      {member.character.portraitUrl ? (
                        <img src={member.character.portraitUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-narra-border flex items-center justify-center text-sm">
                          {member.character.firstName?.[0] || "?"}
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="font-medium">
                          {member.character.alias || `${member.character.firstName} ${member.character.lastName}`}
                        </span>
                        {member.role && (
                          <span className="text-narra-muted text-sm ml-2">— {member.role}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-narra-muted">
            <div className="text-center">
              <p className="text-lg mb-2">Sélectionnez une organisation</p>
              <p className="text-sm">ou créez-en une nouvelle</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
