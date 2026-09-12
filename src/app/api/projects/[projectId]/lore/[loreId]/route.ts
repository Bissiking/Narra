import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { updateLoreEntrySchema } from "@/lib/validations";

interface Context { params: { projectId: string; loreId: string } }

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const data = updateLoreEntrySchema.parse(await request.json());
    const updated = await db.loreEntry.updateMany({
      where: { id: params.loreId, projectId: params.projectId, deletedAt: null },
      data,
    });
    if (!updated.count) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
    return NextResponse.json(
      await db.loreEntry.findUnique({ where: { id: params.loreId } })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de modifier l’entrée" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const deleted = await db.loreEntry.updateMany({
    where: { id: params.loreId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!deleted.count) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
