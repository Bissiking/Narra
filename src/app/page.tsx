import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);

  const publishedProjects = await db.project.findMany({
    where: { deletedAt: null, pagePublished: true },
    include: {
      genres: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: {
        select: { scenes: true, characters: true },
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
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
          <div className="flex items-center gap-3">
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

      <main className="max-w-7xl mx-auto px-6 py-10">
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
              const pct = progressMap.get(project.id) ?? 0;
              const hasStarted = pct > 0;
              return (
                <Link
                  key={project.id}
                  href={`/project/${project.id}/read`}
                  className="card group hover:border-narra-accent transition-all hover:shadow-lg hover:shadow-narra-accent/5 relative overflow-hidden"
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

                  {/* Progress bar */}
                  {hasStarted && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-narra-border/30">
                      <div className="h-full bg-narra-accent" style={{ width: `${pct}%` }} />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg group-hover:text-narra-accent transition-colors">{project.name}</h3>
                      <div className="flex items-center gap-2">
                        {hasStarted && (
                          <span className="text-[10px] font-bold text-narra-accent bg-narra-accent/10 px-1.5 py-0.5 rounded">
                            {pct}%
                          </span>
                        )}
                        {project.genres.length > 0 && (
                          <span className="badge border-narra-border text-narra-muted text-[10px]">{project.genres[0].genre}</span>
                        )}
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-narra-muted line-clamp-2 mb-3">{project.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-narra-muted">
                      <span>par {project.owner.name || project.owner.email}</span>
                      <div className="flex gap-3">
                        <span>{project._count.scenes} scènes</span>
                        <span>{project._count.characters} persos</span>
                      </div>
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
