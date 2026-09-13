"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MediaPicker from "@/components/media-picker";
import PromptWorkbench from "@/components/entities/prompt-workbench";
import styles from "@/components/entities/entity-workspace.module.css";

type Ref = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  portraitUrl: string | null;
};
type CharacterImage = {
  id: string;
  label: string;
  emotion: string | null;
  url: string;
};
type Character = Ref & {
  nameColor: string;
  role: string | null;
  status: string | null;
  description: string | null;
  biography: string | null;
  age: string | null;
  personality: string | null;
  motivations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  quotes: string | null;
  promptNotes: string | null;
  wikiSections: { id: string; title: string; content: string }[];
  images: CharacterImage[];
  relationsFrom: {
    id: string;
    type: string;
    label: string | null;
    reverseLabel: string | null;
    toCharacter: Ref;
  }[];
  relationsTo: {
    id: string;
    type: string;
    label: string | null;
    reverseLabel: string | null;
    fromCharacter: Ref;
  }[];
  organizationMemberships: {
    id: string;
    role: string | null;
    organization: { id: string; name: string };
  }[];
  sceneAppearances: {
    id: string;
    scene: { id: string; title: string; node: { title: string } | null };
  }[];
};
const name = (c: Ref) =>
  c.alias || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Sans nom";
const TABS = [
  ["profile", "Fiche"],
  ["wiki", "Wiki"],
  ["links", "Relations"],
  ["prompts", "Prompts GPT"],
] as const;
const RELATION_TYPES = [
  ["friend", "Amitié"],
  ["family", "Famille"],
  ["couple", "Couple"],
  ["colleague", "Collègues"],
  ["enemy", "Ennemis"],
  ["hierarchy", "Hiérarchie"],
  ["custom", "Autre"],
] as const;
const relationTypeLabel = (type: string) =>
  RELATION_TYPES.find(([value]) => value === type)?.[1] || type;

export default function CharactersPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const query = useSearchParams();
  const [items, setItems] = useState<Ref[]>([]),
    [selectedId, setSelectedId] = useState(query.get("selected") || ""),
    [character, setCharacter] = useState<Character | null>(null),
    [tab, setTab] = useState<(typeof TABS)[number][0]>("profile"),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const [form, setForm] = useState<Record<string, any>>({});
  const [relationTarget, setRelationTarget] = useState(""),
    [relationType, setRelationType] = useState("friend"),
    [relationLabel, setRelationLabel] = useState(""),
    [relationReverseLabel, setRelationReverseLabel] = useState(""),
    [relationSavingId, setRelationSavingId] = useState("");
  const [imageLabel, setImageLabel] = useState(""),
    [imageEmotion, setImageEmotion] = useState(""),
    [imageUrl, setImageUrl] = useState("");
  const loadList = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/characters`);
    if (r.ok) {
      const data = await r.json();
      setItems(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    }
  }, [projectId, selectedId]);
  const load = useCallback(async (id: string) => {
    setCharacter(null);
    const r = await fetch(`/api/characters/${id}`);
    if (r.ok) {
      const c = await r.json();
      setCharacter(c);
      setForm({
        ...c,
        wikiSections: Array.isArray(c.wikiSections) ? c.wikiSections : [],
        promptNotes: c.promptNotes || "",
      });
    }
  }, []);
  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    if (selectedId) {
      void load(selectedId);
      router.replace(
        `/project/${projectId}/characters?selected=${selectedId}`,
        { scroll: false },
      );
    }
  }, [load, projectId, router, selectedId]);
  function update(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function save() {
    if (!character) return;
    setSaving(true);
    setMessage("");
    const fields = [
      "firstName",
      "lastName",
      "alias",
      "portraitUrl",
      "nameColor",
      "role",
      "description",
      "biography",
      "age",
      "status",
      "personality",
      "motivations",
      "strengths",
      "weaknesses",
      "notes",
      "quotes",
      "wikiSections",
      "promptNotes",
    ];
    const body = Object.fromEntries(
      fields.map((key) => [key, form[key] ?? ""]),
    );
    body.portraitUrl = form.portraitUrl || null;
    const r = await fetch(`/api/characters/${character.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      setMessage("Fiche enregistrée");
      await load(character.id);
      await loadList();
    } else setMessage((await r.json()).error || "Enregistrement impossible");
  }
  async function addRelation(e: React.FormEvent) {
    e.preventDefault();
    if (!character || !relationTarget) return;
    const r = await fetch(`/api/characters/${character.id}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toCharacterId: relationTarget,
        type: relationType,
        label: relationLabel || undefined,
        reverseLabel: relationReverseLabel || undefined,
        bidirectional: true,
      }),
    });
    if (r.ok) {
      setRelationTarget("");
      setRelationLabel("");
      setRelationReverseLabel("");
      await load(character.id);
    } else {
      setMessage((await r.json()).error || "Création de la relation impossible");
    }
  }
  async function updateRelationLabel(e: React.FormEvent<HTMLFormElement>, relationId: string) {
    e.preventDefault();
    if (!character) return;
    const data = new FormData(e.currentTarget);
    const label = String(data.get("label") || "").trim();
    setRelationSavingId(relationId);
    setMessage("");
    const r = await fetch(`/api/characters/${character.id}/relations?relationId=${relationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || null }),
    });
    setRelationSavingId("");
    if (r.ok) {
      setMessage("Libellé de relation enregistré");
      await load(character.id);
    } else {
      setMessage((await r.json()).error || "Enregistrement du libellé impossible");
    }
  }
  async function addImage(e: React.FormEvent) {
    e.preventDefault();
    if (!character || !imageLabel || !imageUrl) return;
    const r = await fetch(`/api/characters/${character.id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: imageLabel,
        emotion: imageEmotion,
        url: imageUrl,
      }),
    });
    if (r.ok) {
      setImageLabel("");
      setImageEmotion("");
      setImageUrl("");
      await load(character.id);
    }
  }
  async function removeImage(id: string) {
    if (!character) return;
    const r = await fetch(
      `/api/characters/${character.id}/images?imageId=${id}`,
      { method: "DELETE" },
    );
    if (r.ok) await load(character.id);
  }
  const context = useMemo(
    () => ({
      nom: character ? name(character) : "",
      role: form.role,
      statut: form.status,
      description: form.description,
      biographie: form.biography,
      personnalite: form.personality,
      motivations: form.motivations,
      forces: form.strengths,
      faiblesses: form.weaknesses,
      sectionsWiki: form.wikiSections,
      relations: character
        ? [
            ...character.relationsFrom.map(
              (r) => `${name(r.toCharacter)} — ${r.label || r.type}`,
            ),
            ...character.relationsTo.map(
              (r) => `${name(r.fromCharacter)} — ${r.reverseLabel || r.type}`,
            ),
          ]
        : [],
    }),
    [character, form],
  );
  const selectedRelationTarget = items.find((item) => item.id === relationTarget);
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
            <h1>Personnages</h1>
            <Link
              className={styles.add}
              href={`/project/${projectId}/characters/new`}
            >
              + Ajouter
            </Link>
          </div>
          <select
            className={`${styles.mobileSelect} select`}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Choisir un personnage</option>
            {items.map((c) => (
              <option key={c.id} value={c.id}>
                {name(c)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.list}>
          {items.map((c) => (
            <button
              key={c.id}
              className={`${styles.item} ${selectedId === c.id ? styles.active : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              {c.portraitUrl ? (
                <span className={styles.avatar}>
                  <img src={c.portraitUrl} alt="" />
                </span>
              ) : (
                <span className={styles.avatar}>{name(c)[0]}</span>
              )}
              <span className={styles.itemText}>
                <strong>{name(c)}</strong>
                <span>
                  {c.firstName} {c.lastName}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <main className={styles.content}>
        {!character ? (
          <div className={styles.empty}>
            <div>
              <p>
                {items.length
                  ? "Sélectionnez un personnage"
                  : "Aucun personnage"}
              </p>
              <Link
                className="btn-primary mt-4"
                href={`/project/${projectId}/characters/new`}
              >
                Créer un personnage
              </Link>
            </div>
          </div>
        ) : (
          <>
            <header className={styles.toolbar}>
              <div className={styles.identity}>
                <h2>{name(character)}</h2>
                <p>{form.role || "Rôle non renseigné"}</p>
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
            <nav className={styles.tabs} aria-label="Sections de la fiche">
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
                        {form.portraitUrl ? (
                          <img
                            className={styles.preview}
                            src={form.portraitUrl}
                            alt=""
                          />
                        ) : (
                          <div className={styles.preview} />
                        )}
                      </div>
                      <div>
                        <label className="label">Portrait principal</label>
                        <MediaPicker
                          projectId={projectId}
                          value={form.portraitUrl || ""}
                          onChange={(v) => update("portraitUrl", v)}
                          label="Choisir un portrait"
                        />
                      </div>
                    </div>
                  </section>
                  <section className={styles.section}>
                    <h3>Identité</h3>
                    <div className={styles.fields}>
                      <Field label="Prénom">
                        <input
                          className="input"
                          value={form.firstName || ""}
                          onChange={(e) => update("firstName", e.target.value)}
                        />
                      </Field>
                      <Field label="Nom">
                        <input
                          className="input"
                          value={form.lastName || ""}
                          onChange={(e) => update("lastName", e.target.value)}
                        />
                      </Field>
                      <Field label="Alias">
                        <input
                          className="input"
                          value={form.alias || ""}
                          onChange={(e) => update("alias", e.target.value)}
                        />
                      </Field>
                      <Field label="Couleur du nom">
                        <input
                          className="input h-11"
                          type="color"
                          value={form.nameColor || "#ffffff"}
                          onChange={(e) => update("nameColor", e.target.value)}
                        />
                      </Field>
                      <Field label="Rôle">
                        <input
                          className="input"
                          value={form.role || ""}
                          onChange={(e) => update("role", e.target.value)}
                        />
                      </Field>
                      <Field label="Âge">
                        <input
                          className="input"
                          value={form.age || ""}
                          onChange={(e) => update("age", e.target.value)}
                        />
                      </Field>
                      <Field label="Statut">
                        <select
                          className="select"
                          value={form.status || "active"}
                          onChange={(e) => update("status", e.target.value)}
                        >
                          <option value="active">Actif</option>
                          <option value="dead">Décédé</option>
                          <option value="missing">Disparu</option>
                          <option value="unknown">Inconnu</option>
                          <option value="retired">Retraité</option>
                        </select>
                      </Field>
                      <Field label="Description" wide>
                        <textarea
                          className="textarea"
                          rows={4}
                          value={form.description || ""}
                          onChange={(e) =>
                            update("description", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Biographie" wide>
                        <textarea
                          className="textarea font-serif"
                          rows={10}
                          value={form.biography || ""}
                          onChange={(e) => update("biography", e.target.value)}
                        />
                      </Field>
                    </div>
                  </section>
                  <section className={styles.section}>
                    <h3>Expressions et variantes</h3>
                    <div className={styles.gallery}>
                      {character.images.map((image) => (
                        <article key={image.id} className={styles.galleryItem}>
                          <img src={image.url} alt={image.label} />
                          <div>
                            <strong>{image.label}</strong>
                            <span>{image.emotion || "Variante"}</span>
                          </div>
                          <button
                            className="btn-danger"
                            onClick={() => removeImage(image.id)}
                          >
                            Retirer
                          </button>
                        </article>
                      ))}
                    </div>
                    <form
                      onSubmit={addImage}
                      className="mt-4 grid gap-3 sm:grid-cols-2"
                    >
                      <input
                        className="input"
                        value={imageLabel}
                        onChange={(e) => setImageLabel(e.target.value)}
                        placeholder="Nom de l’expression"
                        required
                      />
                      <input
                        className="input"
                        value={imageEmotion}
                        onChange={(e) => setImageEmotion(e.target.value)}
                        placeholder="Émotion"
                        required
                      />
                      <div className="sm:col-span-2">
                        <MediaPicker
                          projectId={projectId}
                          value={imageUrl}
                          onChange={setImageUrl}
                          label="Choisir l’image"
                        />
                      </div>
                      <button
                        className="btn sm:col-span-2"
                        disabled={!imageUrl || !imageEmotion}
                      >
                        Ajouter la variante
                      </button>
                    </form>
                  </section>
                </>
              )}
              {tab === "wiki" && (
                <>
                  <section className={styles.section}>
                    <h3>Profondeur du personnage</h3>
                    <div className={styles.fields}>
                      {[
                        ["personality", "Personnalité"],
                        ["motivations", "Motivations"],
                        ["strengths", "Forces"],
                        ["weaknesses", "Faiblesses"],
                        ["quotes", "Citations"],
                        ["notes", "Notes internes"],
                      ].map(([key, label]) => (
                        <Field key={key} label={label}>
                          <textarea
                            className="textarea"
                            rows={5}
                            value={form[key] || ""}
                            onChange={(e) => update(key, e.target.value)}
                          />
                        </Field>
                      ))}
                    </div>
                  </section>
                  <section className={styles.section}>
                    <div className="flex items-center justify-between gap-3">
                      <h3>Sections publiques</h3>
                      <button
                        className="btn"
                        onClick={() =>
                          update("wikiSections", [
                            ...(form.wikiSections || []),
                            {
                              id: crypto.randomUUID(),
                              title: "Nouvelle section",
                              content: "",
                            },
                          ])
                        }
                      >
                        + Section
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(form.wikiSections || []).map((s: any, i: number) => (
                        <div
                          key={s.id}
                          className="border-t border-narra-border pt-4"
                        >
                          <div className="flex gap-2">
                            <input
                              className="input"
                              value={s.title}
                              onChange={(e) =>
                                update(
                                  "wikiSections",
                                  form.wikiSections.map((x: any, j: number) =>
                                    j === i
                                      ? { ...x, title: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                            <button
                              className="btn-danger"
                              onClick={() =>
                                update(
                                  "wikiSections",
                                  form.wikiSections.filter(
                                    (_: any, j: number) => j !== i,
                                  ),
                                )
                              }
                            >
                              Retirer
                            </button>
                          </div>
                          <textarea
                            className="textarea mt-2"
                            rows={6}
                            value={s.content}
                            onChange={(e) =>
                              update(
                                "wikiSections",
                                form.wikiSections.map((x: any, j: number) =>
                                  j === i
                                    ? { ...x, content: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {tab === "links" && (
                <>
                  <section className={styles.section}>
                    <h3>Relations entre personnages</h3>
                    <div className={styles.relationList}>
                      {[
                        ...character.relationsFrom.map((r) => ({
                          id: r.id,
                          person: r.toCharacter,
                          label: r.label,
                          type: r.type,
                        })),
                        ...character.relationsTo.map((r) => ({
                          id: r.id,
                          person: r.fromCharacter,
                          label: r.reverseLabel,
                          type: r.type,
                        })),
                      ].map((r) => (
                        <div
                          key={r.id}
                          className={styles.relationRow}
                        >
                          <button
                            type="button"
                            className={styles.relationPerson}
                            onClick={() => setSelectedId(r.person.id)}
                          >
                            <strong>{name(r.person)}</strong>
                            <span>Voir la fiche</span>
                          </button>
                          <form
                            className={styles.relationLabelForm}
                            onSubmit={(event) => updateRelationLabel(event, r.id)}
                          >
                            <label>
                              <span className="label">
                                Libellé affiché sur la fiche de {name(character)}
                              </span>
                              <input
                                key={`${r.id}-${r.label || ""}`}
                                className="input"
                                name="label"
                                defaultValue={r.label || ""}
                                maxLength={100}
                                placeholder={relationTypeLabel(r.type)}
                              />
                            </label>
                            <button
                              className="btn"
                              disabled={relationSavingId === r.id}
                            >
                              {relationSavingId === r.id ? "Enregistrement…" : "Enregistrer"}
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                    <form
                      onSubmit={addRelation}
                      className="mt-5 grid gap-2 sm:grid-cols-2"
                    >
                      <select
                        className="select"
                        aria-label="Personnage à relier"
                        required
                        value={relationTarget}
                        onChange={(e) => setRelationTarget(e.target.value)}
                      >
                        <option value="">Relier à…</option>
                        {items
                          .filter((i) => i.id !== character.id)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {name(i)}
                            </option>
                          ))}
                      </select>
                      <select
                        className="select"
                        aria-label="Type de relation"
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value)}
                      >
                        {RELATION_TYPES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <label>
                        <span className="label">
                          Sur la fiche de {name(character)}
                        </span>
                        <input
                          className="input"
                          value={relationLabel}
                          onChange={(e) => setRelationLabel(e.target.value)}
                          maxLength={100}
                          placeholder="Ex. mère, mentor"
                        />
                      </label>
                      <label>
                        <span className="label">
                          Sur la fiche de {selectedRelationTarget ? name(selectedRelationTarget) : "l’autre personnage"}
                        </span>
                        <input
                          className="input"
                          value={relationReverseLabel}
                          onChange={(e) => setRelationReverseLabel(e.target.value)}
                          maxLength={100}
                          placeholder="Ex. fils, élève"
                        />
                      </label>
                      <button className="btn sm:col-span-2">
                        Créer la relation
                      </button>
                    </form>
                  </section>
                  <section className={styles.section}>
                    <h3>Organisations et apparitions</h3>
                    {character.organizationMemberships.map((m) => (
                      <Link
                        key={m.id}
                        href={`/project/${projectId}/organizations?selected=${m.organization.id}`}
                        className="flex justify-between py-2"
                      >
                        <span>{m.organization.name}</span>
                        <span className="text-xs text-narra-muted">
                          {m.role || "Membre"}
                        </span>
                      </Link>
                    ))}
                    <p className="mt-4 text-sm text-narra-muted">
                      {character.sceneAppearances.length} apparition
                      {character.sceneAppearances.length !== 1 ? "s" : ""} dans
                      les scènes.
                    </p>
                  </section>
                </>
              )}
              {tab === "prompts" && (
                <PromptWorkbench
                  kind="personnage"
                  name={name(character)}
                  context={context}
                  notes={form.promptNotes || ""}
                  onNotesChange={(v) => update("promptNotes", v)}
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
