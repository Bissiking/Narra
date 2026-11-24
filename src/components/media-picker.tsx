"use client";
import { useId, useState } from "react";
import Modal from "./ui/modal";
import styles from "./media-browser.module.css";
import MediaBrowser, { type LibraryMedia } from "./media-browser";
export default function MediaPicker({
  projectId,
  value,
  onChange,
  onSelectMedia,
  label = "Média",
  accept = "image/*",
}: {
  projectId: string;
  value: string;
  onChange: (url: string) => void;
  onSelectMedia?: (media: LibraryMedia) => void;
  label?: string;
  accept?: string;
}) {
  const [open, setOpen] = useState(false);
  const title = useId();
  return (
    <>
      <div className="flex gap-2 min-w-0">
        <input
          type="text"
          className="input flex-1 min-w-0"
          aria-label="URL ou chemin du média"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL ou chemin du média"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-ghost text-sm whitespace-nowrap"
        >
          {label}
        </button>
      </div>
      {value && (value.startsWith("/uploads/") || value.startsWith("http")) && (
        <div className="relative mt-2 inline-block max-w-full">
          {accept.includes("audio") ? (
            <audio
              src={value}
              controls
              preload="metadata"
              className="h-10 max-w-full"
              aria-label="Aperçu audio"
            />
          ) : (
            <img
              src={value}
              alt="Aperçu"
              className="h-20 w-20 object-cover border border-narra-border"
            />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center bg-narra-danger text-xs text-white"
            aria-label="Retirer le média"
          >
            ✕
          </button>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={title} className={styles.pickerModal}>
        <div className={styles.pickerPanel}>
          <header className="flex items-center justify-between p-4 border-b border-narra-border">
            <h2 id={title} className="font-semibold">
              Choisir un média
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost min-h-11 min-w-11"
              aria-label="Fermer le sélecteur de médias"
            >
              ✕
            </button>
          </header>
          {open && (
            <MediaBrowser
              projectId={projectId}
              value={value}
              accept={accept}
              onSelect={(media) => {
                onChange(media.url);
                onSelectMedia?.(media);
                setOpen(false);
              }}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
