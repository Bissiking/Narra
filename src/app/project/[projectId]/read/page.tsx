"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Scene {
  id: string;
  title: string;
  node: { id: string; title: string } | null;
  location: { id: string; name: string } | null;
  blocks: {
    id: string;
    type: string;
    content: string;
    order: number;
    character: { id: string; firstName: string | null; lastName: string | null; alias: string | null; nameColor: string | null; portraitUrl: string | null } | null;
    emotion: string | null;
  }[];
}

interface Project {
  id: string;
  name: string;
  pageTitle: string | null;
  pageSubtitle: string | null;
  pageBackgroundUrl: string | null;
  pageBackgroundColor: string | null;
  pageTextColor: string | null;
  pageAccentColor: string | null;
}

interface Progress {
  percentage: number;
  sceneId: string | null;
  scene: { id: string; title: string } | null;
}

export default function ReadPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResume, setShowResume] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef({ percentage: 0, sceneId: null as string | null });

  // Load data
  useEffect(() => {
    async function load() {
      const [projRes, scenesRes, progressRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/presentation`),
        fetch(`/api/projects/${projectId}/scenes`),
        fetch(`/api/projects/${projectId}/progress`).catch(() => null),
      ]);

      if (projRes.ok) setProject(await projRes.json());
      if (scenesRes.ok) {
        const scenesList = await scenesRes.json();
        // Fetch blocks for each scene in parallel
        const scenesWithBlocks = await Promise.all(
          scenesList.map(async (s: any) => {
            const blocksRes = await fetch(`/api/scenes/${s.id}/blocks`);
            return { ...s, blocks: blocksRes.ok ? await blocksRes.json() : [] };
          })
        );
        setScenes(scenesWithBlocks);
      }
      if (progressRes?.ok) {
        const p = await progressRes.json();
        setProgress(p);
        if (p.percentage > 5 && p.scene) setShowResume(true);
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  // Calculate total words
  const totalWords = scenes.reduce((acc, s) => {
    const blocks = s.blocks || [];
    return acc + blocks.reduce((ba: number, b: any) => ba + (b.content || "").split(/\s+/).filter(Boolean).length, 0);
  }, 0);

  // Track scroll position and save progress
  const saveProgress = useCallback(async (percentage: number, sceneId: string | null) => {
    try {
      await fetch(`/api/projects/${projectId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId, percentage: Math.round(percentage) }),
      });
    } catch {}
  }, [projectId]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || scenes.length === 0) return;

    const sceneElements = new Map<string, HTMLElement>();

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;

      // Find which scene is currently visible
      let currentSceneId: string | null = null;
      for (const [sceneId, el] of sceneElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.3) {
          currentSceneId = sceneId;
        }
      }

      progressRef.current = { percentage, sceneId: currentSceneId || scenes[0]?.id };

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(progressRef.current.percentage, progressRef.current.sceneId);
      }, 2000);
    }

    // Register scene elements
    const observer = new MutationObserver(() => {
      document.querySelectorAll("[data-scene-id]").forEach((el) => {
        const id = el.getAttribute("data-scene-id");
        if (id) sceneElements.set(id, el as HTMLElement);
      });
    });
    observer.observe(main, { childList: true, subtree: true });

    // Initial registration
    document.querySelectorAll("[data-scene-id]").forEach((el) => {
      const id = el.getAttribute("data-scene-id");
      if (id) sceneElements.set(id, el as HTMLElement);
    });

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [scenes, saveProgress]);

  // Scroll to saved scene
  function scrollToScene(sceneId: string) {
    const el = document.querySelector(`[data-scene-id="${sceneId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setShowResume(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Chargement...</span></div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-narra-muted">Projet introuvable</span></div>;
  }

  const bgStyle = project.pageBackgroundUrl
    ? { backgroundImage: `url("${project.pageBackgroundUrl.replace(/["\\]/g, "")}")` }
    : {};
  const containerStyle = {
    color: project.pageTextColor || undefined,
    backgroundColor: project.pageBackgroundColor || undefined,
    ...bgStyle,
    backgroundSize: "cover" as const,
    backgroundPosition: "center" as const,
    backgroundAttachment: "fixed" as const,
  };
  const accent = project.pageAccentColor || "#f59e0b";

  return (
    <div className="min-h-screen" style={containerStyle}>
      {/* Resume banner */}
      {showResume && progress?.scene && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-narra-surface/95 backdrop-blur-sm border-b border-narra-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-narra-border rounded-full overflow-hidden">
              <div className="h-full bg-narra-accent rounded-full" style={{ width: `${progress.percentage}%` }} />
            </div>
            <span className="text-xs text-narra-muted">
              {progress.percentage}% lu · {progress.scene.title}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => scrollToScene(progress.scene!.id)} className="btn-primary text-xs px-3 py-1">
              Reprendre
            </button>
            <button onClick={() => setShowResume(false)} className="btn-ghost text-xs px-3 py-1">
              Depuis le début
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky ${showResume ? "top-12" : "top-0"} z-20 backdrop-blur-md bg-narra-bg/60 border-b border-narra-border/20`}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-narra-muted hover:text-narra-text transition-colors">
            ← {project.name}
          </Link>
          <div className="flex items-center gap-4 text-xs text-narra-muted">
            <span>{scenes.length} scènes</span>
            <span>{totalWords.toLocaleString("fr-FR")} mots</span>
          </div>
        </div>
      </header>

      {/* Title */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight" style={{ color: accent }}>
          {project.pageTitle || project.name}
        </h1>
        {project.pageSubtitle && (
          <p className="mt-4 text-lg text-narra-muted/80 max-w-xl mx-auto leading-relaxed italic">
            {project.pageSubtitle}
          </p>
        )}
        <div className="mt-8 w-16 h-px mx-auto" style={{ backgroundColor: accent + "66" }} />
      </div>

      {/* Content */}
      <main ref={mainRef} className="max-w-3xl mx-auto px-6 pb-32">
        {scenes.length === 0 ? (
          <div className="text-center py-24 text-narra-muted">
            <p className="text-lg">Aucune scène pour le moment.</p>
            <Link href={`/project/${projectId}/edit`} className="mt-4 inline-block text-sm underline underline-offset-4" style={{ color: accent }}>
              Commencer à écrire
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {scenes.map((scene, i) => (
              <article key={scene.id} data-scene-id={scene.id} className="space-y-5">
                {scene.node && (
                  <p className="text-[11px] uppercase tracking-[0.2em] font-medium" style={{ color: accent + "aa" }}>
                    {scene.node.title}
                  </p>
                )}
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: accent }}>
                  {scene.title}
                </h2>
                {scene.location && (
                  <p className="text-sm italic text-narra-muted/60">{scene.location.name}</p>
                )}
                <div className="space-y-0.5">
                  {(scene.blocks || []).map((block: any) => {
                    if (block.type === "heading") {
                      return <h3 key={block.id} className="text-xl font-bold mt-8 mb-3">{block.content}</h3>;
                    }
                    if (block.type === "transition") {
                      return <p key={block.id} className="text-center text-narra-muted italic py-6">{block.content}</p>;
                    }
                    if (block.type === "dialogue") {
                      const speaker = block.character
                        ? block.character.alias || `${block.character.firstName || ""} ${block.character.lastName || ""}`.trim()
                        : null;
                      return (
                        <div key={block.id} className="py-2.5">
                          {speaker && (
                            <p className="text-sm font-bold mb-1" style={{ color: block.character?.nameColor || accent }}>
                              {speaker}
                              {block.emotion && <span className="text-narra-muted/50 font-normal ml-2 text-xs">({block.emotion})</span>}
                            </p>
                          )}
                          <p className="pl-5 border-l-2 border-narra-border/40 leading-relaxed">{block.content}</p>
                        </div>
                      );
                    }
                    if (block.type === "action") {
                      return <p key={block.id} className="text-xs uppercase tracking-[0.15em] text-narra-muted/50 py-2">{block.content}</p>;
                    }
                    return <p key={block.id} className="leading-[1.8] py-1">{block.content}</p>;
                  })}
                </div>
                {i < scenes.length - 1 && (
                  <div className="pt-12 flex justify-center"><span className="text-narra-muted/30 text-lg">• • •</span></div>
                )}
              </article>
            ))}
          </div>
        )}
        {scenes.length > 0 && <div className="mt-20 text-center"><p className="text-narra-muted/40 text-sm italic">Fin</p></div>}
      </main>
    </div>
  );
}
