"use client";

import { useState, useEffect, useRef } from "react";

interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  category: string | null;
  description: string | null;
  createdAt: string;
}

interface MediaPickerProps {
  projectId: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function MediaPicker({
  projectId,
  value,
  onChange,
  label = "Média",
  accept = "image/*",
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    const typeFilter = accept.includes("image")
      ? "?type=image"
      : accept.includes("video")
      ? "?type=video"
      : accept.includes("audio")
      ? "?type=audio"
      : "";
    fetch(`/api/projects/${projectId}/media${typeFilter}`)
      .then(async (res) => {
        if (res.ok) setMedia(await res.json());
      })
      .finally(() => setLoading(false));
  }, [open, projectId, accept]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/projects/${projectId}/media/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const newMedia = await res.json();
        setMedia((current) => [newMedia, ...current]);
        onChange(newMedia.url);
        setOpen(false);
      } else {
        const data = await res.json();
        setError(data.error || "Impossible d'envoyer le fichier");
      }
    } catch {
      setError("Connexion impossible pendant l'envoi");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSelect(url: string) {
    onChange(url);
    setOpen(false);
  }

  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
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
        <div className="mt-2 relative inline-block">
          <img
            src={value}
            alt="Aperçu"
            className="h-20 w-20 object-cover border border-narra-border"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-narra-danger text-white text-xs w-5 h-5 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-narra-surface border border-narra-border w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-narra-border">
              <h2 className="font-bold">Choisir un média</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-narra-muted hover:text-narra-text"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-narra-border flex items-center gap-3">
              <label className="btn-primary cursor-pointer text-sm">
                {uploading ? "Envoi..." : "Uploader un fichier"}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              {error && (
                <p className="text-xs text-narra-danger">{error}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="py-12 text-center text-narra-muted">
                  Chargement...
                </div>
              ) : media.length === 0 ? (
                <div className="py-12 text-center text-narra-muted">
                  <p className="mb-3">Aucun média dans ce projet.</p>
                  <label className="btn-primary cursor-pointer text-sm">
                    Uploader le premier fichier
                    <input
                      type="file"
                      className="hidden"
                      accept={accept}
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className={`card group text-left transition-colors ${
                        value === item.url
                          ? "border-narra-accent ring-1 ring-narra-accent"
                          : "hover:border-narra-muted"
                      }`}
                    >
                      {item.type === "image" ? (
                        <div className="aspect-square bg-narra-bg overflow-hidden">
                          <img
                            src={item.url}
                            alt={item.description || item.originalName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-narra-bg flex items-center justify-center text-narra-muted text-xs">
                          {item.type}
                        </div>
                      )}
                      <div className="p-2">
                        <div className="text-xs font-medium truncate">
                          {item.originalName}
                        </div>
                        <div className="text-xs text-narra-muted">
                          {formatFileSize(item.size)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
