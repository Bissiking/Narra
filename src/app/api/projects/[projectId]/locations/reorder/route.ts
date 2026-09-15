import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const { locations } = (await request.json()) as { locations: { id: string; order: number }[] };
    if (!Array.isArray(locations)) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 });
    }
    await db.$transaction(
      locations.map((item) =>
        db.location.updateMany({
          where: { id: item.id, projectId: params.projectId, deletedAt: null },
          data: { order: item.order },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error reordering locations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réorganisation des lieux" },
      { status: 500 }
    );
  }
}
