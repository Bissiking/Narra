"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import MediaPicker from "@/components/media-picker";
import PromptWorkbench from "@/components/entities/prompt-workbench";
import styles from "@/components/entities/entity-workspace.module.css";

type Member = {
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
};
type Organization = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  status: string | null;
  logoUrl: string | null;
  notes: string | null;
  promptNotes: string | null;
  members: Member[];
  _count: { members: number };
};
const TABS = [
  ["profile", "Fiche"],
  ["members", "Membres"],
  ["prompts", "Prompts GPT"],
] as const;
const characterName = (member: Member) =>
  member.character.alias ||
  `${member.character.firstName || ""} ${member.character.lastName || ""}`.trim() ||
  "Sans nom";

export default function OrganizationsPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const query = useSearchParams();
  const [items, setItems] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState(query.get("selected") || "");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("profile");
  const [form, setForm] = useState({
    name: "",
    type: "",
    status: "active",
    logoUrl: "",
    description: "",
    notes: "",
    promptNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadList = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/organizations`);
    if (!response.ok) return;
    const data: Organization[] = await response.json();
    setItems(data);
    setSelectedId((current) => current || data[0]?.id || "");
  }, [projectId]);
  const load = useCallback(
    async (id: string) => {
      setOrganization(null);
      const response = await fetch(
        `/api/projects/${projectId}/organizations/${id}`,
      );
      if (!response.ok) return;
      const value: Organization = await response.json();
      setOrganization(value);
      setForm({
        name: value.name,
        type: value.type || "",
        status: value.status || "active",
        logoUrl: value.logoUrl || "",
        description: value.description || "",
        notes: value.notes || "",
        promptNotes: value.promptNotes || "",
      });
    },
    [projectId],
  );
  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    if (selectedId) {
      void load(selectedId);
      router.replace(
        `/project/${projectId}/organizations?selected=${selectedId}`,
        { scroll: false },
      );
    }
  }, [load, projectId, router, selectedId]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function save() {
    if (!organization) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(
      `/api/projects/${projectId}/organizations/${organization.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, logoUrl: form.logoUrl || null }),
      },
    );
    setSaving(false);
    if (!response.ok) {
      setMessage((await response.json()).error || "Enregistrement impossible");
      return;
    }
    setMessage("Fiche enregistrée");
    await load(organization.id);
    await loadList();
  }
  const context = useMemo(
    () => ({
      nom: form.name,
      type: form.type,
      statut: form.status,
      description: form.description,
      notes: form.notes,
      membres:
        organization?.members.map(
          (member) =>
            `${characterName(member)} — ${member.role || "membre"}${member.rank ? ` (${member.rank})` : ""}`,
        ) || [],
    }),
    [form, organization],
  );

  return (
    <div className={styles.workspace}>
      <aside className={styles.rail}>
        <div className={styles.railHead}>
          <Link
            href={`/project/${projectId}`}
            className="text-xs text-narra-muted hover:text-narra-text"
          >
            ← Projet
          </Link>
          <div className={styles.railTitle}>
            <h1>Organisations</h1>
            <Link
              className={styles.add}
              href={`/project/${projectId}/organizations/new`}
            >
              + Ajouter
            </Link>
          </div>
          <select
            className={`${styles.mobileSelect} select`}
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Choisir une organisation</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.list}>
          {items.map((item) => (
            <button
              key={item.id}
              className={`${styles.item} ${selectedId === item.id ? styles.active : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              {item.logoUrl ? (
                <span className={styles.avatar}>
                  <img src={item.logoUrl} alt="" />
                </span>
              ) : (
                <span className={styles.avatar}>{item.name[0]}</span>
              )}
              <span className={styles.itemText}>
                <strong>{item.name}</strong>
                <span>
                  {item._count.members} membre
                  {item._count.members !== 1 ? "s" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <main className={styles.content}>
        {!organization ? (
          <div className={styles.empty}>
            <div>
              <p>
                {items.length
                  ? "Sélectionnez une organisation"
                  : "Aucune organisation"}
              </p>
              <Link
                className="btn-primary mt-4"
                href={`/project/${projectId}/organizations/new`}
              >
                Créer une organisation
              </Link>
            </div>
          </div>
        ) : (
          <>
            <header className={styles.toolbar}>
              <div className={styles.identity}>
                <h2>{organization.name}</h2>
                <p>{form.type || "Type non renseigné"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`${styles.status} ${message.includes("impossible") ? styles.error : ""}`}
                >
                  {message}
                </span>
                <button
                  className="btn-primary"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </header>
            <nav
              className={styles.tabs}
              aria-label="Sections de l’organisation"
            >
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className={styles.panel}>
              {tab === "profile" && (
                <>
                  <section className={styles.section}>
                    <div className={styles.mediaRow}>
                      <div>
                        {form.logoUrl ? (
                          <img
                            className={styles.preview}
                            src={form.logoUrl}
                            alt=""
                          />
                        ) : (
                          <div className={styles.preview} />
                        )}
                      </div>
                      <div>
                        <label className="label">Logo ou emblème</label>
                        <MediaPicker
                          projectId={projectId}
                          value={form.logoUrl}
                          onChange={(value) => update("logoUrl", value)}
                          label="Choisir une image"
                        />
                      </div>
                    </div>
                  </section>
                  <section className={styles.section}>
                    <h3>Identité de l’organisation</h3>
                    <div className={styles.fields}>
                      <Field label="Nom">
                        <input
                          className="input"
                          value={form.name}
                          onChange={(event) =>
                            update("name", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Type">
                        <input
                          className="input"
                          value={form.type}
                          onChange={(event) =>
                            update("type", event.target.value)
                          }
                          placeholder="Entreprise, faction, institution…"
                        />
                      </Field>
                      <Field label="Statut">
                        <input
                          className="input"
                          value={form.status}
                          onChange={(event) =>
                            update("status", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Description" wide>
                        <textarea
                          className="textarea"
                          rows={7}
                          value={form.description}
                          onChange={(event) =>
                            update("description", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Notes internes" wide>
                        <textarea
                          className="textarea"
                          rows={5}
                          value={form.notes}
                          onChange={(event) =>
                            update("notes", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </section>
                </>
              )}
              {tab === "members" && (
                <section className={styles.section}>
                  <h3>Membres ({organization.members.length})</h3>
                  {organization.members.length === 0 ? (
                    <p className="text-sm text-narra-muted">
                      Aucun personnage n’est encore rattaché à cette
                      organisation.
                    </p>
                  ) : (
                    <div className="divide-y divide-narra-border">
                      {organization.members.map((member) => (
                        <Link
                          key={member.id}
                          href={`/project/${projectId}/characters?selected=${member.character.id}`}
                          className="flex items-center gap-3 py-3"
                        >
                          {member.character.portraitUrl ? (
                            <img
                              src={member.character.portraitUrl}
                              alt=""
                              className="h-10 w-8 object-cover"
                            />
                          ) : (
                            <span className={styles.avatar}>
                              {characterName(member)[0]}
                            </span>
                          )}
                          <span className="flex-1">
                            <strong className="block text-sm">
                              {characterName(member)}
                            </strong>
                            <span className="text-xs text-narra-muted">
                              {member.role || "Membre"}
                              {member.rank ? ` · ${member.rank}` : ""}
                            </span>
                          </span>
                          <span aria-hidden>→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}
              {tab === "prompts" && (
                <PromptWorkbench
                  kind="organisation"
                  name={organization.name}
                  context={context}
                  notes={form.promptNotes}
                  onNotesChange={(value) => update("promptNotes", value)}
                  onSave={save}
                  saving={saving}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? styles.wide : ""}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
