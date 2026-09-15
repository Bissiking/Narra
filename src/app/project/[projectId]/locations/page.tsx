"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MediaPicker from "@/components/media-picker";
import PromptWorkbench from "@/components/entities/prompt-workbench";
import styles from "@/components/entities/entity-workspace.module.css";

type Location = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  imageUrl: string | null;
  textualLocation: string | null;
  ambiance: string | null;
  notes: string | null;
  promptNotes: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string; type: string | null }[];
  _count: { scenes: number };
};
const TABS = [
  ["profile", "Fiche"],
  ["structure", "Structure"],
  ["prompts", "Prompts GPT"],
] as const;

export default function LocationsPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const query = useSearchParams();
  const [items, setItems] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState(query.get("selected") || "");
  const [location, setLocation] = useState<Location | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("profile");
  const [form, setForm] = useState({
    name: "",
    type: "",
    imageUrl: "",
    parentId: "",
    textualLocation: "",
    ambiance: "",
    description: "",
    notes: "",
    promptNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadList = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/locations`);
    if (!response.ok) return;
    const data: Location[] = await response.json();
    setItems(data);
    setSelectedId((current) => current || data[0]?.id || "");
  }, [projectId]);
  const load = useCallback(
    async (id: string) => {
      setLocation(null);
      const response = await fetch(
        `/api/projects/${projectId}/locations/${id}`,
      );
      if (!response.ok) return;
      const value: Location = await response.json();
      setLocation(value);
      setForm({
        name: value.name,
        type: value.type || "",
        imageUrl: value.imageUrl || "",
        parentId: value.parentId || "",
        textualLocation: value.textualLocation || "",
        ambiance: value.ambiance || "",
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
      router.replace(`/project/${projectId}/locations?selected=${selectedId}`, {
        scroll: false,
      });
    }
  }, [load, projectId, router, selectedId]);
  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  async function save() {
    if (!location) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(
      `/api/projects/${projectId}/locations/${location.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl: form.imageUrl || null, parentId: form.parentId || null }),
      },
    );
    setSaving(false);
    if (!response.ok) {
      setMessage((await response.json()).error || "Enregistrement impossible");
      return;
    }
    setMessage("Fiche enregistrée");
    await load(location.id);
    await loadList();
  }
  const context = useMemo(
    () => ({
      nom: form.name,
      type: form.type,
      position: form.textualLocation,
      ambiance: form.ambiance,
      description: form.description,
      parent: location?.parent?.name || null,
      sousLieux: location?.children.map((child) => child.name) || [],
      scenes: location?._count.scenes || 0,
    }),
    [form, location],
  );
  const roots = items.filter((item) => !item.parentId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeItem = items.find((i) => i.id === active.id);
    const overItem = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;
    if (activeItem.parentId || overItem.parentId) return;
    const oldIndex = roots.findIndex((r) => r.id === active.id);
    const newIndex = roots.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(roots, oldIndex, newIndex);
    const newOrder = reordered.map((r, i) => ({ id: r.id, order: i }));
    fetch(`/api/projects/${projectId}/locations/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: newOrder }),
    }).then(() => loadList());
  }

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
            <h1>Lieux</h1>
            <Link
              className={styles.add}
              href={`/project/${projectId}/locations/new`}
            >
              + Ajouter
            </Link>
          </div>
          <select
            className={`${styles.mobileSelect} select`}
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Choisir un lieu</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.list}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={roots.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              {roots.map((root) => (
                <div key={root.id}>
                  <SortableLocationButton
                    item={root}
                    active={selectedId === root.id}
                    select={setSelectedId}
                  />
                  {items
                    .filter((item) => item.parentId === root.id)
                    .map((child) => (
                      <div key={child.id} className="ml-4">
                        <LocationButton
                          item={child}
                          active={selectedId === child.id}
                          select={setSelectedId}
                        />
                      </div>
                    ))}
                </div>
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId ? (() => {
                const dragged = roots.find((r) => r.id === activeId);
                return dragged ? (
                  <div className={`${styles.item} ${styles.active}`} style={{ opacity: 0.9 }}>
                    <span className={styles.avatar}>{dragged.name[0]}</span>
                    <span className={styles.itemText}>
                      <strong>{dragged.name}</strong>
                    </span>
                  </div>
                ) : null;
              })() : null}
            </DragOverlay>
          </DndContext>
        </div>
      </aside>
      <main className={styles.content}>
        {!location ? (
          <div className={styles.empty}>
            <div>
              <p>{items.length ? "Sélectionnez un lieu" : "Aucun lieu"}</p>
              <Link
                className="btn-primary mt-4"
                href={`/project/${projectId}/locations/new`}
              >
                Créer un lieu
              </Link>
            </div>
          </div>
        ) : (
          <>
            <header className={styles.toolbar}>
              <div className={styles.identity}>
                <h2>{location.name}</h2>
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
            <nav className={styles.tabs} aria-label="Sections du lieu">
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
                        {form.imageUrl ? (
                          <img
                            className={styles.preview}
                            src={form.imageUrl}
                            alt=""
                          />
                        ) : (
                          <div className={styles.preview} />
                        )}
                      </div>
                      <div>
                        <label className="label">Image du lieu</label>
                        <MediaPicker
                          projectId={projectId}
                          value={form.imageUrl}
                          onChange={(value) => update("imageUrl", value)}
                          label="Choisir une image"
                        />
                      </div>
                    </div>
                  </section>
                  <section className={styles.section}>
                    <h3>Identité et atmosphère</h3>
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
                          placeholder="Ville, planète, bâtiment…"
                        />
                      </Field>
                      <Field label="Position dans l’univers" wide>
                        <input
                          className="input"
                          value={form.textualLocation}
                          onChange={(event) =>
                            update("textualLocation", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Ambiance" wide>
                        <textarea
                          className="textarea"
                          rows={4}
                          value={form.ambiance}
                          onChange={(event) =>
                            update("ambiance", event.target.value)
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
              {tab === "structure" && (
                <>
                  <section className={styles.section}>
                    <h3>Place dans le monde</h3>
                    <label>
                      <span className="label">Lieu parent</span>
                      <select
                        className="select"
                        value={form.parentId}
                        onChange={(event) =>
                          update("parentId", event.target.value)
                        }
                      >
                        <option value="">Aucun — lieu racine</option>
                        {items
                          .filter((item) => item.id !== location.id)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </section>
                  <section className={styles.section}>
                    <h3>Sous-lieux</h3>
                    {location.children.length ? (
                      <div className="divide-y divide-narra-border">
                        {location.children.map((child) => (
                          <button
                            key={child.id}
                            className="flex w-full justify-between py-3 text-left"
                            onClick={() => setSelectedId(child.id)}
                          >
                            <span>{child.name}</span>
                            <span className="text-xs text-narra-muted">
                              {child.type || "Lieu"} →
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-narra-muted">
                        Aucun sous-lieu.
                      </p>
                    )}
                    <p className="mt-5 text-sm text-narra-muted">
                      {location._count.scenes} scène
                      {location._count.scenes !== 1 ? "s" : ""} se déroule
                      {location._count.scenes !== 1 ? "nt" : ""} ici.
                    </p>
                  </section>
                </>
              )}
              {tab === "prompts" && (
                <PromptWorkbench
                  kind="lieu"
                  name={location.name}
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

function LocationButton({
  item,
  active,
  select,
}: {
  item: Location;
  active: boolean;
  select: (id: string) => void;
}) {
  return (
    <button
      className={`${styles.item} ${active ? styles.active : ""}`}
      onClick={() => select(item.id)}
    >
      <span className={styles.avatar}>{item.name[0]}</span>
      <span className={styles.itemText}>
        <strong>{item.name}</strong>
        <span>
          {item._count.scenes} scène{item._count.scenes !== 1 ? "s" : ""}
        </span>
      </span>
    </button>
  );
}

function SortableLocationButton({
  item,
  active,
  select,
}: {
  item: Location;
  active: boolean;
  select: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <button
        className={`${styles.item} ${active ? styles.active : ""}`}
        onClick={() => select(item.id)}
        type="button"
      >
        <span className={styles.avatar}>{item.name[0]}</span>
        <span className={styles.itemText}>
          <strong>{item.name}</strong>
          <span>
            {item._count.scenes} scène{item._count.scenes !== 1 ? "s" : ""}
          </span>
        </span>
      </button>
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
