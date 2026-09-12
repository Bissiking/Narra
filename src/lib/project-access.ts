import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { getSessionFromRequest, type NarraSession } from "./auth";

export type ProjectRole = "owner" | "editor" | "viewer";

export interface ProjectAccess {
  session: NarraSession;
  role: ProjectRole;
}

export async function requireProjectAccess(
  request: NextRequest,
  projectId: string,
  requireWrite: boolean = false
): Promise<ProjectAccess | NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const project = await db.project.findUnique({
    where: { id: projectId, deletedAt: null },
    select: { ownerId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  if (project.ownerId === session.userId) {
    return { session, role: "owner" };
  }

  const collaborator = await db.projectCollaborator.findUnique({
    where: { projectId_userId: { projectId, userId: session.userId } },
    select: { role: true },
  });

  if (!collaborator) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const role = collaborator.role as ProjectRole;

  if (requireWrite && role === "viewer") {
    return NextResponse.json({ error: "Droits d'écriture requis" }, { status: 403 });
  }

  return { session, role };
}
