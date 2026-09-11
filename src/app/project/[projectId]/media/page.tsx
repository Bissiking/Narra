"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

const MEDIA_TYPES = [
  { value: "image", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Vidéo" },
  { value: "document", label: "Documents" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function MediaPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadMedia() {
      const url = filterType
        ? `/api/projects/${projectId}/media?type=${filterType}`
        : `/api/projects/${projectId}/media`;
      const res = await fetch(url);
      if (res.ok) setMedia(await res.json());
      setLoading(false);
    }
    loadMedia();
  }, [projectId, filterType]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newMedia = await res.json();
        setMedia([newMedia, ...media]);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-narra-muted">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href={`/project/${projectId}`} className="text-narra-muted hover:text-narra-text text-sm">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold mt-2">Médiathèque</h1>
          </div>

          <div className="flex gap-3">
            <label className="btn-primary cursor-pointer">
              {uploading ? "Envoi..." : "Uploader un fichier"}
              <input
                type="file"
                className="hidden"
                accept="image/*,audio/*,video/*"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilterType(null)}
            className={`btn-ghost text-sm ${!filterType ? "bg-narra-border/50" : ""}`}
          >
            Tous
          </button>
          {MEDIA_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`btn-ghost text-sm ${filterType === t.value ? "bg-narra-border/50" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Media grid */}
        {media.length === 0 ? (
          <div className="card p-12 text-center text-narra-muted">
            <p className="mb-4">Aucun média pour le moment.</p>
            <label className="btn-primary cursor-pointer">
              Uploader le premier fichier
              <input type="file" className="hidden" accept="image/*,audio/*,video/*" onChange={handleUpload} />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {media.map((item) => (
              <div key={item.id} className="card group cursor-pointer">
                {item.type === "image" ? (
                  <div className="aspect-square bg-narra-bg overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.description || item.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-narra-bg flex items-center justify-center">
                    <span className="text-3xl">
                      {item.type === "audio" ? "🎵" : item.type === "video" ? "🎬" : "📄"}
                    </span>
                  </div>
                )}

                <div className="p-2">
                  <div className="text-sm font-medium truncate">{item.originalName}</div>
                  <div className="text-xs text-narra-muted">{formatFileSize(item.size)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
