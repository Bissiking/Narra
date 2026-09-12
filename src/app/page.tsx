import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatReadingTime(wordCount: number) {
  if (wordCount <= 0) return null;
  const minutes = Math.max(1, Math.ceil(wordCount / 220));
  if (minutes < 60) return `≈ ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `≈ ${hours} h ${remainingMinutes.toString().padStart(2, "0")}`
    : `≈ ${hours} h`;
}

export default async function HomePage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);

  const publishedProjects = await db.project.findMany({
    where: { deletedAt: null, pagePublished: true },
    include: {
      genres: true,
      owner: { select: { id: true, name: true, email: true } },
      narrativeNodes: {
        where: { type: "season", deletedAt: null },
        select: { id: true },
      },
      scenes: {
        where: { deletedAt: null },
        select: { wordCount: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  // Get reading progress for logged-in user
  let progressMap = new Map<string, number>();
  if (session) {
    const progresses = await db.readingProgress.findMany({
      where: { userId: session.userId },
      select: { projectId: true, percentage: true },
    });
    for (const p of progresses) {
      progressMap.set(p.projectId, p.percentage);
    }
  }

  const recentProjects = session
    ? await db.project.findMany({
        where: { deletedAt: null, ownerId: session.userId },
        include: {
          _count: { select: { scenes: true, characters: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      })
    : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-narra-border/50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-narra-accent">Narra</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/" className="px-3 py-1.5 text-sm font-medium text-narra-accent border-b-2 border-narra-accent">
                Histoires
              </Link>
              <Link href="/library" className="px-3 py-1.5 text-sm font-medium text-narra-muted hover:text-narra-text transition-colors">
                Studio
              </Link>
            </nav>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {session ? (
              <>
                <span className="text-xs text-narra-muted">{session.name || session.email}</span>
                <Link href="/api/auth/logout" className="text-sm text-narra-muted hover:text-narra-text transition-colors">
                  Déconnexion
                </Link>
              </>
            ) : (
              <Link href="/login" className="btn-primary text-sm">
                Connexion
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Published stories */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Histoires</h1>
          <p className="text-narra-muted">
            {publishedProjects.length > 0
              ? `${publishedProjects.length} histoire${publishedProjects.length > 1 ? "s" : ""} publiée${publishedProjects.length > 1 ? "s" : ""}`
              : "Aucune histoire publiée pour le moment"}
          </p>
        </div>

        {publishedProjects.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-narra-muted text-lg mb-2">Aucune histoire publiée</p>
            <p className="text-narra-muted/60 text-sm mb-6">
              {session
                ? "Publiez vos projets depuis le Studio pour les voir apparaître ici."
                : "Connectez-vous pour créer et publier vos propres histoires."}
            </p>
            {session ? (
              <Link href="/library" className="btn-primary">Aller au Studio</Link>
            ) : (
              <Link href="/login" className="btn-primary">Se connecter</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedProjects.map((project) => {
              const pct = Math.max(0, Math.min(100, Math.round(progressMap.get(project.id) ?? 0)));
              const wordCount = project.scenes.reduce((total, scene) => total + scene.wordCount, 0);
              const readingTime = formatReadingTime(wordCount);
              const visibleGenres = project.genres.slice(0, 2);
              const hiddenGenreCount = Math.max(0, project.genres.length - visibleGenres.length);
              const progressLabel = pct >= 100 ? "Terminé" : pct > 0 ? `${pct} % lu` : "Non commencé";
              return (
                <Link
                  key={project.id}
                  href={`/project/${project.id}/read`}
                  className="card group relative flex h-full flex-col overflow-hidden transition-colors hover:border-narra-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-narra-accent"
                >
                  {project.coverUrl ? (
                    <div className="aspect-[16/9] bg-narra-bg overflow-hidden">
                      <img src={project.coverUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-narra-surface to-narra-border flex items-center justify-center">
                      <span className="text-5xl text-narra-border/50 font-bold">{project.name.charAt(0)}</span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-lg font-bold transition-colors group-hover:text-narra-accent">
                      {project.name}
                    </h3>

                    {visibleGenres.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Genres">
                        {visibleGenres.map((genre) => (
                          <span key={genre.id} className="badge max-w-44 truncate border-narra-border text-[10px] text-narra-muted">
                            {genre.genre}
                          </span>
                        ))}
                        {hiddenGenreCount > 0 && (
                          <span className="text-[10px] leading-6 text-narra-muted" aria-label={`${hiddenGenreCount} autres genres`}>
                            +{hiddenGenreCount}
                          </span>
                        )}
                      </div>
                    )}

                    {project.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-narra-muted">{project.description}</p>
                    )}

                    <div className="mt-auto pt-4">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-narra-muted" aria-label="Informations de lecture">
                        {project.narrativeNodes.length > 0 && (
                          <span className="whitespace-nowrap">
                            {project.narrativeNodes.length} saison{project.narrativeNodes.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="whitespace-nowrap">
                          {project.scenes.length} scène{project.scenes.length > 1 ? "s" : ""}
                        </span>
                        {readingTime && (
                          <span className="whitespace-nowrap" title="Estimation basée sur 220 mots par minute">
                            {readingTime}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 truncate text-xs text-narra-muted" title={project.owner.name || project.owner.email}>
                        par {project.owner.name || project.owner.email}
                      </p>

                      {session && (
                        <div className="mt-4 border-t border-narra-border pt-3">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                            <span className="text-narra-muted">Progression</span>
                            <span className="font-mono font-medium tabular-nums text-narra-accent">{progressLabel}</span>
                          </div>
                          <div
                            className="h-1 bg-narra-border/70"
                            role="progressbar"
                            aria-label={`Progression de lecture de ${project.name}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={pct}
                          >
                            <div
                              className="h-full origin-left bg-narra-accent"
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Mes projets récents</h2>
                <p className="text-narra-muted text-sm mt-1">{recentProjects.length} projet{recentProjects.length > 1 ? "s" : ""}</p>
              </div>
              <Link href="/library" className="btn-ghost text-sm">Tout voir →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`} className="card p-4 group hover:border-narra-accent transition-colors">
                  <div className="flex items-start gap-3">
                    {project.coverUrl ? (
                      <img src={project.coverUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-narra-border flex items-center justify-center text-lg font-bold text-narra-border shrink-0">
                        {project.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium truncate group-hover:text-narra-accent transition-colors">{project.name}</h3>
                      <div className="flex gap-3 text-xs text-narra-muted mt-1">
                        <span>{project._count.scenes} scènes</span>
                        <span>{project._count.characters} persos</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
