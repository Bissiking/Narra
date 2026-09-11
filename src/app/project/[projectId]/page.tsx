import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

interface ProjectPageProps {
  params: { projectId: string };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: {
      genres: true,
      _count: {
        select: {
          scenes: true,
          characters: true,
          locations: true,
          organizations: true,
          loreEntries: true,
          timelineEvents: true,
          narrativeNodes: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const totalWordCount = await db.scene.aggregate({
    where: { projectId: project.id, deletedAt: null },
    _sum: { wordCount: true },
  });

  const recentScenes = await db.scene.findMany({
    where: { projectId: project.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      node: { select: { title: true } },
      _count: { select: { blocks: true } },
    },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-narra-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/library" className="text-narra-muted hover:text-narra-text text-sm">
              Bibliothèque
            </Link>
            <span className="text-narra-muted mx-2">/</span>
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/project/${project.id}/scenes`}
              className="btn-primary"
            >
              Continuer l'écriture
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Project overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
                  <div className="flex gap-2">
                    <span className="badge border-narra-accent text-narra-accent">
                      {project.type}
                    </span>
                    <span className="badge border-narra-border text-narra-muted">
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-narra-muted mb-4">{project.description}</p>
              )}

              {project.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.genres.map((g) => (
                    <span key={g.id} className="badge border-narra-border text-narra-muted">
                      {g.genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Recent scenes */}
            <div className="card p-6">
              <h3 className="font-bold mb-4">Scènes récentes</h3>
              {recentScenes.length === 0 ? (
                <p className="text-narra-muted text-sm">Aucune scène pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {recentScenes.map((scene) => (
                    <Link
                      key={scene.id}
                      href={`/project/${project.id}/scenes/${scene.id}`}
                      className="flex items-center justify-between p-3 hover:bg-narra-border/30 transition-colors"
                    >
                      <div>
                        <span className="font-medium">{scene.title}</span>
                        {scene.node && (
                          <span className="text-narra-muted text-sm ml-2">
                            dans {scene.node.title}
                          </span>
                        )}
                      </div>
                      <span className="text-narra-muted text-sm">
                        {scene._count.blocks} blocs
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="card p-6">
              <h3 className="font-bold mb-4">Statistiques</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-narra-muted">Mots total</span>
                  <span className="font-mono">{totalWordCount._sum.wordCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-narra-muted">Scènes</span>
                  <span className="font-mono">{project._count.scenes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-narra-muted">Personnages</span>
                  <span className="font-mono">{project._count.characters}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-narra-muted">Lieux</span>
                  <span className="font-mono">{project._count.locations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-narra-muted">Organisations</span>
                  <span className="font-mono">{project._count.organizations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-narra-muted">Lore</span>
                  <span className="font-mono">{project._count.loreEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-narra-muted">Timeline</span>
                  <span className="font-mono">{project._count.timelineEvents}</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="card p-6">
              <h3 className="font-bold mb-4">Navigation</h3>
              <div className="space-y-2">
                <Link
                  href={`/project/${project.id}/structure`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Structure narrative
                </Link>
                <Link
                  href={`/project/${project.id}/scenes`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Scènes
                </Link>
                <Link
                  href={`/project/${project.id}/characters`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Personnages
                </Link>
                <Link
                  href={`/project/${project.id}/locations`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Lieux
                </Link>
                <Link
                  href={`/project/${project.id}/organizations`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Organisations
                </Link>
                <Link
                  href={`/project/${project.id}/lore`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Lore
                </Link>
                <Link
                  href={`/project/${project.id}/timeline`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Timeline
                </Link>
                <Link
                  href={`/project/${project.id}/media`}
                  className="block p-2 hover:bg-narra-border/30 transition-colors"
                >
                  Médiathèque
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
