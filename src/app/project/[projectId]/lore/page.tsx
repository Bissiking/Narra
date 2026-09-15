"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "@/components/entities/entity-workspace.module.css";

interface LoreEntry {
  id: string;
  title: string;
  category: string;
  content: string | null;
  notes: string | null;
  status: string;
  progress: number;
}

const CATEGORIES: [string, string][] = [
  ["history", "Histoire"], ["technology", "Technologie"], ["politics", "Politique"],
  ["organizations", "Organisations"], ["objects", "Objets"], ["concepts", "Concepts"],
  ["rules", "Règles"], ["events", "Événements"], ["custom", "Autre"],
];

const CATEGORY_COLORS: Record<string, string> = {
  history: "text-blue-400", technology: "text-cyan-400", politics: "text-purple-400",
  organizations: "text-amber-400", objects: "text-green-400", concepts: "text-pink-400",
  rules: "text-red-400", events: "text-orange-400", custom: "text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "À définir", in_progress: "En développement", review: "À vérifier", established: "Établi",
};

const categoryLabel = (value: string) => CATEGORIES.find(([v]) => v === value)?.[1] || value;

export default function LorePage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const query = useSearchParams();
  const [items, setItems] = useState<LoreEntry[]>([]);
  const [selectedId, setSelectedId] = useState(query.get("selected") || "");
  const [entry, setEntry] = useState<LoreEntry | null>(null);
  const [form, setForm] = useState({ title: "", category: "custom", content: "", notes: "", status: "planned", progress: 0 });
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const loadList = useCallback(async () => {
    const url = filterCategory
      ? `/api/projects/${projectId}/lore?category=${filterCategory}`
      : `/api/projects/${projectId}/lore`;
    const r = await fetch(url);
    if (r.ok) { const data = await r.json(); setItems(data); }
  }, [projectId, filterCategory]);

  const load = useCallback(async (id: string) => {
    setEntry(null);
    const r = await fetch(`/api/projects/${projectId}/lore`);
    if (r.ok) { const all = await r.json(); const found = all.find((e: LoreEntry) => e.id === id); if (found) { setEntry(found); setForm({ title: found.title, category: found.category, content: found.content || "", notes: found.notes || "", status: found.status, progress: found.progress }); } }
  }, [projectId]);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => {
    if (selectedId) { void load(selectedId); router.replace(`/project/${projectId}/lore?selected=${selectedId}`, { scroll: false }); }
  }, [load, projectId, router, selectedId]);

  function update(field: string, value: any) { setForm((f) => ({ ...f, [field]: value })); }

  async function save() {
    if (!entry) return;
    setSaving(true); setMessage("");
    const r = await fetch(`/api/projects/${projectId}/lore/${entry.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, category: form.category, content: form.content || undefined, notes: form.notes || undefined, status: form.status, progress: form.progress }),
    });
    setSaving(false);
    if (r.ok) { setMessage("Enregistré"); await load(entry.id); await loadList(); }
    else setMessage((await r.json()).error || "Enregistrement impossible");
  }

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const r = await fetch(`/api/projects/${projectId}/lore`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), category: "custom", status: "planned", progress: 0, content: "", notes: "" }),
    });
    setCreating(false);
    if (r.ok) { const data = await r.json(); setNewTitle(""); await loadList(); setSelectedId(data.id); }
  }

  async function deleteEntry() {
    if (!entry || !confirm("Supprimer cette entrée ?")) return;
    const r = await fetch(`/api/projects/${projectId}/lore/${entry.id}`, { method: "DELETE" });
    if (r.ok) { setEntry(null); setSelectedId(""); await loadList(); }
  }

  if (items.length === 0 && !selectedId) {
    return (
      <div className={styles.workspace}>
        <aside className={styles.rail}>
          <div className={styles.railHead}>
            <Link href={`/project/${projectId}`} className="text-xs text-narra-muted hover:text-narra-text">← Projet</Link>
            <div className={styles.railTitle}><h1>Lore</h1></div>
          </div>
        </aside>
        <main className={styles.content}>
          <div className={styles.empty}>
            <div>
              <p>Aucune entrée de lore</p>
              <p className="text-sm text-narra-muted mt-2">Créez des entrées pour documenter l'univers de votre histoire : règles, technologie, événements historiques, etc.</p>
              <form onSubmit={createEntry} className="mt-4 flex gap-2">
                <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre de l'entrée" required />
                <button className="btn-primary" disabled={creating}>{creating ? "…" : "Créer"}</button>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <aside className={styles.rail}>
        <div className={styles.railHead}>
          <Link href={`/project/${projectId}`} className="text-xs text-narra-muted hover:text-narra-text">← Projet</Link>
          <div className={styles.railTitle}>
            <h1>Lore</h1>
            <button className={styles.add} onClick={() => { setCreating(true); setNewTitle(""); }}>+ Ajouter</button>
          </div>
          <select className="select text-sm mt-2" value={filterCategory || ""} onChange={(e) => setFilterCategory(e.target.value || null)}>
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {creating && (
          <form onSubmit={createEntry} className="p-2 border-b border-narra-border flex gap-1">
            <input className="input text-sm" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre" required autoFocus />
            <button className="btn text-xs" disabled={creating}>+</button>
          </form>
        )}
        <div className={styles.list}>
          {items.map((item) => (
            <button key={item.id} className={`${styles.item} ${selectedId === item.id ? styles.active : ""}`} onClick={() => { setSelectedId(item.id); setCreating(false); }}>
              <span className={styles.avatar}>{item.title[0]}</span>
              <span className={styles.itemText}>
                <strong>{item.title}</strong>
                <span className={CATEGORY_COLORS[item.category] || ""}>{categoryLabel(item.category)}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className={styles.content}>
        {!entry ? (
          <div className={styles.empty}>
            <div>
              <p>Sélectionnez une entrée</p>
              <p className="text-sm text-narra-muted mt-2">ou créez-en une nouvelle dans la barre latérale</p>
            </div>
          </div>
        ) : (
          <>
            <header className={styles.toolbar}>
              <div className={styles.identity}>
                <h2>{form.title || entry.title}</h2>
                <p>{categoryLabel(form.category)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`${styles.status} ${message.includes("impossible") ? styles.error : ""}`}>{message}</span>
                <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
                <button className="btn text-xs" onClick={deleteEntry}>Supprimer</button>
              </div>
            </header>

            <div className={styles.panel}>
              <section className={styles.section}>
                <h3>Identité</h3>
                <div className={styles.fields}>
                  <label>
                    <span className="label">Titre</span>
                    <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} />
                  </label>
                  <label>
                    <span className="label">Catégorie</span>
                    <select className="select" value={form.category} onChange={(e) => update("category", e.target.value)}>
                      {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label">État du canon</span>
                    <select className="select" value={form.status} onChange={(e) => update("status", e.target.value)}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label">Avancement — {form.progress}%</span>
                    <input type="range" min={0} max={100} step={5} className="w-full accent-amber-500" value={form.progress} onChange={(e) => update("progress", Number(e.target.value))} />
                  </label>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Contenu</h3>
                <textarea className="textarea font-serif" rows={14} value={form.content} onChange={(e) => update("content", e.target.value)} placeholder="Décrivez cet élément de lore…" />
              </section>

              <section className={styles.section}>
                <h3>Notes internes</h3>
                <textarea className="textarea" rows={5} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notes privées, hypothèses, idées…" />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
