"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import MediaBrowser from "@/components/media-browser";
export default function MediaPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <Link
        href={`/project/${projectId}`}
        className="text-sm text-narra-muted hover:text-narra-text"
      >
        ← Retour au projet
      </Link>
      <header className="my-6">
        <h1 className="text-2xl font-semibold">Médiathèque</h1>
        <p className="text-narra-muted text-sm mt-2">
          Images, musiques et documents, rangés au même endroit.
        </p>
      </header>
      <MediaBrowser projectId={projectId} />
    </div>
  );
}
