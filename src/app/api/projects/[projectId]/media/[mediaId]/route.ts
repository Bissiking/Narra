import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; mediaId: string } }
) {
  const deleted = await db.media.updateMany({
    where: { id: params.mediaId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!deleted.count) return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
