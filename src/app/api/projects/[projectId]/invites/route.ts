import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  if (access.role !== "owner") {
    return NextResponse.json({ error: "Seul le propriétaire peut créer des invitations" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body as { role?: string };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await db.projectInvite.create({
    data: {
      projectId: params.projectId,
      token,
      role: role === "viewer" ? "viewer" : "editor",
      createdById: access.session.userId,
      expiresAt,
    },
  });

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    role: invite.role,
    expiresAt: invite.expiresAt,
    url: `/invite/${invite.token}`,
  }, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;

  const invites = await db.projectInvite.findMany({
    where: { projectId: params.projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites.map((i) => ({
    id: i.id,
    token: i.token,
    role: i.role,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
    url: `/invite/${i.token}`,
  })));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;

  const { searchParams } = new URL(request.url);
  const inviteId = searchParams.get("inviteId");

  if (!inviteId) {
    return NextResponse.json({ error: "inviteId requis" }, { status: 400 });
  }

  await db.projectInvite.deleteMany({
    where: { id: inviteId, projectId: params.projectId },
  });

  return NextResponse.json({ ok: true });
}
