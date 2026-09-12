import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { updateLocationSchema } from "@/lib/validations";

interface Context { params: { projectId: string; locationId: string } }

export async function GET(request: NextRequest, { params }: Context) {
  const location = await db.location.findFirst({
    where: { id: params.locationId, projectId: params.projectId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true, type: true } },
      _count: { select: { scenes: true } },
    },
  });
  if (!location) return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
  return NextResponse.json(location);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const data = updateLocationSchema.parse(await request.json());
    const updated = await db.location.updateMany({
      where: { id: params.locationId, projectId: params.projectId, deletedAt: null },
      data,
    });
    if (!updated.count) return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
    return NextResponse.json(
      await db.location.findUnique({ where: { id: params.locationId } })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de modifier le lieu" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const deleted = await db.location.updateMany({
    where: { id: params.locationId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!deleted.count) return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
