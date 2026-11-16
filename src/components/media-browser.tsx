"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Modal from "./ui/modal";
import StudioIcon from "./editors/studio-v2-icons";
import styles from "./media-browser.module.css";
export interface LibraryMedia {
  id: string;
  originalName: string;
  url: string;
  type: string;
  size: number;
  folderId?: string | null;
  description?: string | null;
}
interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}
type Editing = {
  kind: "new" | "folder" | "media";
  id?: string;
  name: string;
  parent: string;
};
function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3 6h7l2 2h9v12H3Z" />
      <path d="M3 6V4h7l2 2h9v2" />
    </svg>
  );
}
function size(value: number) {
  return value < 1024
    ? value + " o"
    : value < 1048576
      ? (value / 1024).toFixed(0) + " Ko"
      : (value / 1048576).toFixed(1) + " Mo";
}
function MediaThumbnail({ media }: { media: LibraryMedia }) {
  const [failed, setFailed] = useState("");
  return (
    <div className={styles.thumbnail}>
      {media.type === "image" && failed !== media.url ? (
        <img
          src={media.url}
          alt=""
          loading="lazy"
          onError={() => setFailed(media.url)}
        />
      ) : (
        <StudioIcon
          name={
            media.type === "image"
              ? "image"
              : media.type === "audio"
                ? "music"
                : media.type === "video"
                  ? "video"
                  : "note"
          }
        />
      )}
    </div>
  );
}
const typeLabels: Record<string, string> = {
  image: "Images",
  audio: "Audio",
  video: "Vidéos",
  document: "Documents",
};
export default function MediaBrowser({
  projectId,
  accept = "",
  value,
  onSelect,
}: {
  projectId: string;
  accept?: string;
  value?: string;
  onSelect?: (media: LibraryMedia) => void;
}) {
  const [media, setMedia] = useState<LibraryMedia[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [canEdit, setCanEdit] = useState(false);
  const [folder, setFolder] = useState<string | null>(null),
    [all, setAll] = useState(false),
    [query, setQuery] = useState(""),
    [type, setType] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [list, setList] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null),
    [dialogError, setDialogError] = useState("");
  const [deleting, setDeleting] = useState<{
    kind: "folder" | "media";
    id: string;
    name: string;
  } | null>(null);
  const [preview, setPreview] = useState<LibraryMedia | null>(null);
  const titleId = useId(),
    deleteTitle = useId(),
    previewTitle = useId(),
    uploadInput = useRef<HTMLInputElement>(null);
  const fixedType = accept.includes("image")
    ? "image"
    : accept.includes("audio")
      ? "audio"
      : accept.includes("video")
        ? "video"
        : "";
  const path = (id: string | null) => {
    const parts: Folder[] = [];
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const found = folders.find((f) => f.id === id);
      if (!found) break;
      parts.unshift(found);
      id = found.parentId;
    }
    return parts;
  };
  const current = folders.find((f) => f.id === folder);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const [m, f] = await Promise.all([
        fetch(`/api/projects/${projectId}/media`, { signal }),
        fetch(`/api/projects/${projectId}/media-folders`, { signal }),
      ]);
      if (!m.ok || !f.ok) throw Error("Impossible de charger la médiathèque.");
      const [items, tree] = await Promise.all([m.json(), f.json()]);
      setMedia(items);
      setFolders(tree.folders || []);
      setCanEdit(tree.canEdit === true);
    },
    [projectId],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void load(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);
  function navigate(id: string | null) {
    setFolder(id);
    setAll(false);
    setQuery("");
    setError("");
    setNotice("");
  }
  async function request(url: string, method: string, body?: unknown) {
    const response = await fetch(`/api/projects/${projectId}/${url}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Enregistrement impossible.");
    return data;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setDialogError("");
    try {
      if (editing.kind === "new")
        await request("media-folders", "POST", {
          name: editing.name,
          parentId: editing.parent || null,
        });
      else if (editing.kind === "folder")
        await request(`media-folders/${editing.id}`, "PATCH", {
          name: editing.name,
          parentId: editing.parent || null,
        });
      else
        await request(`media/${editing.id}`, "PATCH", {
          originalName: editing.name,
          folderId: editing.parent || null,
        });
      await load();
      setEditing(null);
      setNotice("Rangement enregistré.");
    } catch (e) {
      setDialogError(
        e instanceof Error ? e.message : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setDialogError("");
    try {
      await request(
        `${deleting.kind === "folder" ? "media-folders" : "media"}/${deleting.id}`,
        "DELETE",
      );
      if (deleting.kind === "folder" && deleting.id === folder)
        navigate(current?.parentId || null);
      await load();
      setDeleting(null);
      setNotice("Suppression enregistrée.");
    } catch (e) {
      setDialogError(
        e instanceof Error ? e.message : "Suppression impossible.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: File[]) {
    if (!files.length || busy || !canEdit) return;
    setBusy(true);
    setError("");
    let sent = 0;
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        if (folder) form.set("folderId", folder);
        const res = await fetch(`/api/projects/${projectId}/media/upload`, {
          method: "POST",
          body: form,
        });
        const item = await res.json();
        if (!res.ok)
          throw Error(`${file.name} : ${item.error || "Envoi impossible"}`);
        setMedia((items) => [item, ...items]);
        sent++;
      }
      setNotice(`${sent} fichier${sent > 1 ? "s importés" : " importé"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      if (uploadInput.current) uploadInput.current.value = "";
    }
  }
  const children = folders.filter((f) => (f.parentId || null) === folder);
  const shown = media.filter(
    (m) =>
      (all || (m.folderId || null) === folder) &&
      (!(fixedType || type) || m.type === (fixedType || type)) &&
      (!query ||
        m.originalName
          .toLocaleLowerCase("fr")
          .includes(query.toLocaleLowerCase("fr"))),
  );
  const filteredFolders = children.filter(
    (f) =>
      !query ||
      f.name.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")),
  );
  const blocked = new Set<string>();
  if (editing?.kind === "folder") {
    blocked.add(editing.id!);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders)
        if (f.parentId && blocked.has(f.parentId) && !blocked.has(f.id)) {
          blocked.add(f.id);
          changed = true;
        }
    }
  }
  const folderOptions = [...folders]
    .filter((f) => !blocked.has(f.id))
    .sort((a, b) =>
      path(a.id)
        .map((f) => f.name)
        .join("/")
        .localeCompare(
          path(b.id)
            .map((f) => f.name)
            .join("/"),
          "fr",
        ),
    );
  function editFolder(f: Folder) {
    setEditing({
      kind: "folder",
      id: f.id,
      name: f.name,
      parent: f.parentId || "",
    });
    setDialogError("");
  }
  const folderRow = (f: Folder, depth: number): React.ReactNode => (
    <div key={f.id}>
      <button
        type="button"
        className={styles.treeFolder}
        style={{ paddingLeft: 12 + depth * 16 }}
        aria-current={!all && folder === f.id ? "location" : undefined}
        onClick={() => navigate(f.id)}
      >
        <FolderIcon />
        <span>{f.name}</span>
        <small>{media.filter((m) => m.folderId === f.id).length}</small>
      </button>
      {folders
        .filter((child) => child.parentId === f.id)
        .map((child) => folderRow(child, depth + 1))}
    </div>
  );
  return (
    <div
      className={styles.browser}
      data-media-browser
      onDragOver={(e) => {
        if (canEdit && e.dataTransfer.types.includes("Files"))
          e.preventDefault();
      }}
      onDrop={(e) => {
        if (canEdit && e.dataTransfer.files.length) {
          e.preventDefault();
          void upload([...e.dataTransfer.files]);
        }
      }}
    >
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 6 6" />
          </svg>
          <input
            aria-label="Rechercher des médias"
            placeholder={
              all
                ? "Rechercher dans tous les médias…"
                : "Rechercher dans ce dossier…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {!fixedType && (
          <select
            aria-label="Type de média"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Tous les types</option>
            {Object.entries(typeLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className={styles.iconButton}
          aria-label={list ? "Afficher en grille" : "Afficher en liste"}
          onClick={() => setList((v) => !v)}
        >
          <StudioIcon name={list ? "grid" : "list"} />
        </button>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => {
                setEditing({ kind: "new", name: "", parent: folder || "" });
                setDialogError("");
              }}
              disabled={busy}
            >
              <FolderIcon />
              <span>Nouveau dossier</span>
            </button>
            <button
              type="button"
              className={styles.upload}
              onClick={() => uploadInput.current?.click()}
              disabled={busy}
            >
              <StudioIcon name="plus" />
              <span>{busy ? "En cours…" : "Importer"}</span>
            </button>
            <input
              ref={uploadInput}
              type="file"
              accept={accept || "image/*,audio/*,video/*,application/pdf"}
              multiple
              hidden
              onChange={(e) => void upload([...(e.target.files || [])])}
            />
          </>
        )}
      </div>
      <div className={styles.body}>
        <nav className={styles.tree} aria-label="Dossiers de médias">
          <button
            type="button"
            className={styles.treeFolder}
            aria-current={all ? "location" : undefined}
            onClick={() => {
              setAll(true);
              setQuery("");
            }}
          >
            <StudioIcon name="grid" />
            Tous les médias<small>{media.length}</small>
          </button>
          <button
            type="button"
            className={styles.treeFolder}
            aria-current={!all && !folder ? "location" : undefined}
            onClick={() => navigate(null)}
          >
            <FolderIcon />
            Médiathèque
          </button>
          {folders.filter((f) => !f.parentId).map((f) => folderRow(f, 1))}
        </nav>
        <div className={styles.content}>
          <div className={styles.location}>
            <select
              className={styles.mobileScope}
              aria-label="Portée des médias"
              value={all ? "all" : "folder"}
              onChange={(e) => {
                setAll(e.target.value === "all");
                setQuery("");
              }}
            >
              <option value="folder">Ce dossier</option>
              <option value="all">Tous les médias</option>
            </select>
            <nav
              aria-label="Emplacement des médias"
              className={styles.breadcrumb}
            >
              <button type="button" onClick={() => navigate(null)}>
                Médiathèque
              </button>
              {all ? (
                <span>/ Tous les médias</span>
              ) : (
                path(folder).map((f) => (
                  <span key={f.id}>
                    /
                    <button type="button" onClick={() => navigate(f.id)}>
                      {f.name}
                    </button>
                  </span>
                ))
              )}
            </nav>
            <span>
              {shown.length} fichier{shown.length !== 1 ? "s" : ""}
            </span>
            {canEdit && current && !all && (
              <button
                type="button"
                onClick={() => editFolder(current)}
                aria-label="Gérer ce dossier"
              >
                <StudioIcon name="edit" />
              </button>
            )}
          </div>
          {error && (
            <div className={styles.error} role="alert">
              {error}
              <button
                type="button"
                onClick={() => {
                  setError("");
                  void load().catch((e) => setError(e.message));
                }}
              >
                Réessayer
              </button>
            </div>
          )}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
          {loading ? (
            <p className={styles.empty} role="status">
              Chargement de la médiathèque…
            </p>
          ) : (
            <>
              {!all && filteredFolders.length > 0 && (
                <div className={styles.folders}>
                  {filteredFolders.map((f) => (
                    <div className={styles.folder} key={f.id}>
                      <button type="button" onClick={() => navigate(f.id)}>
                        <FolderIcon />
                        <span>
                          {f.name}
                          <small>
                            {
                              folders.filter((child) => child.parentId === f.id)
                                .length
                            }{" "}
                            dossiers ·{" "}
                            {media.filter((m) => m.folderId === f.id).length}{" "}
                            fichiers
                          </small>
                        </span>
                        <StudioIcon name="chevron" />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className={styles.iconButton}
                          aria-label={"Gérer le dossier " + f.name}
                          onClick={() => editFolder(f)}
                        >
                          <StudioIcon name="more" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {shown.length > 0 ? (
                <div className={list ? styles.fileList : styles.grid}>
                  {shown.map((m) => (
                    <article
                      className={styles.file}
                      key={m.id}
                      data-selected={m.url === value}
                    >
                      <button
                        type="button"
                        className={styles.fileOpen}
                        onClick={() => (onSelect ? onSelect(m) : setPreview(m))}
                        aria-label={
                          (onSelect ? "Choisir " : "Aperçu de ") +
                          m.originalName
                        }
                      >
                        <MediaThumbnail media={m} />
                        <span
                          className={styles.fileName}
                          title={m.originalName}
                        >
                          {m.originalName}
                          <small>
                            {m.type} · {size(m.size)}
                            {all && m.folderId
                              ? " · " +
                                path(m.folderId)
                                  .map((f) => f.name)
                                  .join(" / ")
                              : ""}
                          </small>
                        </span>
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className={styles.fileMenu}
                          aria-label={"Ranger ou renommer " + m.originalName}
                          onClick={() => {
                            setEditing({
                              kind: "media",
                              id: m.id,
                              name: m.originalName,
                              parent: m.folderId || "",
                            });
                            setDialogError("");
                          }}
                        >
                          <StudioIcon name="more" />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <FolderIcon />
                  <h3>
                    {query
                      ? "Aucun résultat"
                      : "Aucun fichier dans " +
                        (all ? "la médiathèque" : "ce dossier")}
                  </h3>
                  <p>
                    {query
                      ? "Essayez un autre nom ou ouvrez Tous les médias."
                      : canEdit
                        ? "Importez des fichiers ou créez des sous-dossiers pour organiser votre histoire."
                        : "Les fichiers de votre histoire apparaîtront ici."}
                  </p>
                  {canEdit && !query && (
                    <button
                      type="button"
                      onClick={() => uploadInput.current?.click()}
                      disabled={busy}
                    >
                      Importer des fichiers
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Modal
        open={!!editing}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        labelledBy={titleId}
        className={styles.dialog}
      >
        {editing && (
          <form onSubmit={submit}>
            <header>
              <h2 id={titleId}>
                {editing.kind === "new"
                  ? "Nouveau dossier"
                  : editing.kind === "folder"
                    ? "Gérer le dossier"
                    : "Ranger le média"}
              </h2>
            </header>
            <div className={styles.formFields}>
              <label>
                Nom
                <input
                  required
                  autoFocus
                  maxLength={editing.kind === "media" ? 255 : 120}
                  value={editing.name}
                  disabled={busy}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </label>
              <label>
                {editing.kind === "media" ? "Dossier" : "Dossier parent"}
                <select
                  aria-label="Dossier de destination"
                  value={editing.parent}
                  disabled={busy}
                  onChange={(e) =>
                    setEditing({ ...editing, parent: e.target.value })
                  }
                >
                  <option value="">Médiathèque (racine)</option>
                  {folderOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {path(f.id)
                        .map((f) => f.name)
                        .join(" / ")}
                    </option>
                  ))}
                </select>
              </label>
              {dialogError && (
                <p role="alert" className={styles.error}>
                  {dialogError}
                </p>
              )}
            </div>
            <footer>
              {editing.kind !== "new" && (
                <button
                  type="button"
                  className={styles.danger}
                  disabled={busy}
                  onClick={() => {
                    setDeleting({
                      kind: editing.kind as "folder" | "media",
                      id: editing.id!,
                      name: editing.name,
                    });
                    setEditing(null);
                    setDialogError("");
                  }}
                >
                  Supprimer
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className={styles.upload}
                disabled={busy || !editing.name.trim()}
              >
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </footer>
          </form>
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        labelledBy={deleteTitle}
        className={styles.dialog}
      >
        <header>
          <h2 id={deleteTitle}>
            Supprimer {deleting?.kind === "folder" ? "le dossier" : "le média"}{" "}
            ?
          </h2>
        </header>
        <div className={styles.formFields}>
          <p className={styles.wrap}>{deleting?.name}</p>
          <p>
            {deleting?.kind === "folder"
              ? "Le dossier doit être vide avant sa suppression."
              : "Le fichier sera retiré de la médiathèque. Les scènes qui l’utilisent garderont leur fichier."}
          </p>
          {dialogError && (
            <p role="alert" className={styles.error}>
              {dialogError}
            </p>
          )}
        </div>
        <footer>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Annuler
          </button>
          <button
            type="button"
            className={styles.danger}
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? "Suppression…" : "Supprimer"}
          </button>
        </footer>
      </Modal>
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        labelledBy={previewTitle}
        className={styles.dialog}
      >
        <header>
          <h2 id={previewTitle} className={styles.wrap}>
            {preview?.originalName}
          </h2>
          <button
            type="button"
            aria-label="Fermer l’aperçu"
            onClick={() => setPreview(null)}
          >
            <StudioIcon name="close" />
          </button>
        </header>
        <div className={styles.preview}>
          {preview?.type === "image" ? (
            <img
              src={preview.url}
              alt={preview.description || preview.originalName}
            />
          ) : preview?.type === "audio" ? (
            <audio src={preview.url} controls autoPlay />
          ) : preview?.type === "video" ? (
            <video src={preview.url} controls />
          ) : (
            preview && (
              <a href={preview.url} target="_blank" rel="noreferrer">
                Ouvrir le document
              </a>
            )
          )}
        </div>
      </Modal>
    </div>
  );
}
