import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;

  const collaborators = await db.projectCollaborator.findMany({
    where: { projectId: params.projectId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const project = await db.project.findUnique({
    where: { id: params.projectId },
    select: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    owner: project?.owner,
    collaborators: collaborators.map((c) => ({
      ...c.user,
      role: c.role,
      addedAt: c.createdAt,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  if (access.role !== "owner") {
    return NextResponse.json({ error: "Seul le propriétaire peut ajouter des collaborateurs" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body as { email: string; role?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Aucun utilisateur trouvé avec cet email" }, { status: 404 });
  }
  if (user.id === access.session.userId) {
    return NextResponse.json({ error: "Vous êtes déjà le propriétaire" }, { status: 400 });
  }

  const existing = await db.projectCollaborator.findUnique({
    where: { projectId_userId: { projectId: params.projectId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Cet utilisateur est déjà collaborateur" }, { status: 400 });
  }

  const collaborator = await db.projectCollaborator.create({
    data: {
      projectId: params.projectId,
      userId: user.id,
      role: role === "viewer" ? "viewer" : "editor",
    },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  return NextResponse.json({ ...collaborator.user, role: collaborator.role }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  // Owner can remove anyone; collaborators can remove themselves
  if (access.role !== "owner" && access.session.userId !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await db.projectCollaborator.deleteMany({
    where: { projectId: params.projectId, userId },
  });

  return NextResponse.json({ ok: true });
}
