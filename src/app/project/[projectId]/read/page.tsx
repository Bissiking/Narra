"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectReader from "@/components/readers/project-reader";

type ReaderProject = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  pageTitle: string | null;
  pageSubtitle: string | null;
  pageBackgroundUrl: string | null;
  pageBackgroundColor: string;
  pageTextColor: string;
  pageAccentColor: string;
  pageTheme: string;
  canEdit: boolean;
};

type ReaderCharacter = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  nameColor: string;
  portraitUrl: string | null;
  images: { id: string; label: string; emotion: string; url: string }[];
};

type ReaderScene = {
  id: string;
  title: string;
  readerTitle: string | null;
  showReaderTitle: boolean;
  node: { title: string } | null;
  location: { name: string; imageUrl: string | null } | null;
  blocks: {
    id: string;
    type: string;
    content: string;
    order: number;
    characterId: string | null;
    emotion: string | null;
    position: string | null;
    speakerNote: string | null;
    mediaUrl: string | null;
    displayMode: string | null;
    showPortrait: boolean;
    portraitImageUrl: string | null;
    audioAction: string | null;
    volume: number | null;
    fadeDuration: number | null;
    loop: boolean | null;
    animationPreset: string | null;
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      nameColor: string;
      portraitUrl: string | null;
      images: { id: string; label: string; emotion: string; url: string }[];
    } | null;
  }[];
};

export default function ReadPage() {
  const { projectId } = useParams() as { projectId: string };
  const [project, setProject] = useState<ReaderProject | null>(null);
  const [scenes, setScenes] = useState<ReaderScene[]>([]);
  const [characters, setCharacters] = useState<ReaderCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReader() {
      setLoading(true);
      setError(null);

      try {
        const [projectResponse, scenesResponse, charactersResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/presentation`, { signal: controller.signal }),
          fetch(`/api/projects/${projectId}/scenes`, { signal: controller.signal }),
          fetch(`/api/projects/${projectId}/characters`, { signal: controller.signal }),
        ]);

        if (!projectResponse.ok || !scenesResponse.ok || !charactersResponse.ok) {
          throw new Error("Impossible de charger ce projet.");
        }

        const [projectData, sceneList, characterList] = await Promise.all([
          projectResponse.json() as Promise<ReaderProject>,
          scenesResponse.json() as Promise<Omit<ReaderScene, "blocks">[]>,
          charactersResponse.json() as Promise<ReaderCharacter[]>,
        ]);

        const scenesWithBlocks = await Promise.all(
          sceneList.map(async (scene) => {
            const response = await fetch(`/api/scenes/${scene.id}/blocks`, {
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`Impossible de charger la scène « ${scene.title} ».`);
            return { ...scene, blocks: (await response.json()) as ReaderScene["blocks"] };
          })
        );

        setProject(projectData);
        setScenes(scenesWithBlocks);
        setCharacters(characterList);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Impossible de charger la lecture.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReader();
    return () => controller.abort();
  }, [projectId]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-narra-bg text-narra-muted">
        <p>Préparation de la lecture…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="grid min-h-screen place-items-center bg-narra-bg px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Lecture indisponible</h1>
          <p role="alert" className="mt-2 text-sm text-narra-muted">
            {error || "Projet introuvable."}
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return <ProjectReader project={project} scenes={scenes} characters={characters} canEdit={project.canEdit} />;
}
