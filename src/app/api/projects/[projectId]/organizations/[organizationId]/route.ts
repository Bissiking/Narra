import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { updateOrganizationSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

interface Context { params: { projectId: string; organizationId: string } }

export async function GET(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  const org = await db.organization.findFirst({
    where: { id: params.organizationId, projectId: params.projectId, deletedAt: null },
    include: {
      members: {
        include: {
          character: {
            select: { id: true, firstName: true, lastName: true, alias: true, portraitUrl: true },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });
  if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const data = updateOrganizationSchema.parse(await request.json());
    const updated = await db.organization.updateMany({
      where: { id: params.organizationId, projectId: params.projectId, deletedAt: null },
      data,
    });
    if (!updated.count) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
    return NextResponse.json(
      await db.organization.findUnique({ where: { id: params.organizationId } })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de modifier l'organisation" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  const deleted = await db.organization.updateMany({
    where: { id: params.organizationId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!deleted.count) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
