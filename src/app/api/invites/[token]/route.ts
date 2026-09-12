import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const invite = await db.projectInvite.findUnique({
    where: { token: params.token },
    include: { project: { select: { id: true, name: true, deletedAt: true } } },
  });

  if (!invite || invite.project.deletedAt) {
    return NextResponse.json({ error: "Invitation invalide ou expirée" }, { status: 404 });
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Cette invitation a expiré" }, { status: 410 });
  }

  // Check if already a collaborator or owner
  if (invite.project) {
    const existing = await db.projectCollaborator.findUnique({
      where: { projectId_userId: { projectId: invite.projectId, userId: session.userId } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, project: invite.project, alreadyMember: true });
    }

    const project = await db.project.findUnique({
      where: { id: invite.projectId },
      select: { ownerId: true },
    });
    if (project?.ownerId === session.userId) {
      return NextResponse.json({ ok: true, project: invite.project, alreadyMember: true });
    }
  }

  await db.projectCollaborator.create({
    data: {
      projectId: invite.projectId,
      userId: session.userId,
      role: invite.role,
    },
  });

  // Delete the invite after acceptance
  await db.projectInvite.delete({ where: { id: invite.id } });

  return NextResponse.json({ ok: true, project: invite.project });
}
