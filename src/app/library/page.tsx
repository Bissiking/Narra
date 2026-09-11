// src/app/library/page.tsx
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LibraryPage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/api/auth/login?returnTo=/library");
  }

  const projects = await db.project.findMany({
    where: { deletedAt: null, ownerId: session.userId },
    include: {
      genres: true,
      _count: {
        select: {
          scenes: true,
          characters: true,
          locations: true,
          organizations: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-narra-accent">Narra</span>
            </h1>
            <p className="text-xs text-narra-muted mt-1">
              {session.name || session.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/api/auth/logout" className="text-sm text-narra-muted hover:text-white transition-colors">
              Déconnexion
            </Link>
            <Link href="/library/new" className="btn-primary">
              + Nouveau projet
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Bibliothèque</h2>
          <p className="text-narra-muted">
            {projects.length} projet{projects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-narra-muted mb-4">Aucun projet pour le moment.</p>
            <Link href="/library/new" className="btn-primary">
              Créer votre premier projet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="card group hover:border-narra-accent transition-colors"
              >
                {project.coverUrl ? (
                  <div className="aspect-[16/9] bg-narra-bg overflow-hidden">
                    <img
                      src={project.coverUrl}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-narra-bg flex items-center justify-center">
                    <span className="text-4xl text-narra-border font-bold">
                      {project.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold group-hover:text-narra-accent transition-colors">
                      {project.name}
                    </h3>
                    <span className="badge border-narra-accent text-narra-accent">
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-sm text-narra-muted line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}

                  <div className="flex gap-4 text-xs text-narra-muted">
                    <span>{project._count.scenes} scènes</span>
                    <span>{project._count.characters} persos</span>
                    <span>{project._count.locations} lieux</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
