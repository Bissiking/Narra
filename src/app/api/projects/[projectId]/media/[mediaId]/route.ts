import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; mediaId: string } },
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  const deleted = await db.media.updateMany({
    where: { id: params.mediaId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!deleted.count)
    return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; mediaId: string } },
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const data = z
      .object({
        folderId: z.string().uuid().nullable().optional(),
        originalName: z.string().trim().min(1).max(255).optional(),
      })
      .parse(await request.json());
    if (
      data.folderId &&
      !(await db.mediaFolder.findFirst({
        where: { id: data.folderId, projectId: params.projectId },
      }))
    )
      return NextResponse.json({ error: "Dossier invalide" }, { status: 400 });
    const result = await db.media.updateMany({
      where: {
        id: params.mediaId,
        projectId: params.projectId,
        deletedAt: null,
      },
      data,
    });
    return result.count
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Média introuvable" }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Modification invalide" },
      { status: 400 },
    );
  }
}
