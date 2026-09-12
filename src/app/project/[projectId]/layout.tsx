// src/app/project/[projectId]/layout.tsx
import ProjectNav from "@/components/layout/project-nav";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect(`/login?returnTo=/project/${params.projectId}`);
  }

  const project = await db.project.findFirst({
    where: {
      id: params.projectId,
      ownerId: session.userId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!project) notFound();

  return (
    <div className="min-h-screen flex">
      <ProjectNav projectId={params.projectId} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
