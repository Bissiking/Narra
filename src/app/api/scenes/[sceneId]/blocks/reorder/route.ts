import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reorderBlocksSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

export async function POST(
  request: NextRequest,
  { params }: { params: { sceneId: string } }
) {
  try {
    const scene = await db.scene.findUnique({ where: { id: params.sceneId }, select: { projectId: true } });
    if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
    const access = await requireProjectAccess(request, scene.projectId, true);
    if (access instanceof NextResponse) return access;

    const body = await request.json();
    const { blocks } = reorderBlocksSchema.parse(body);

    await db.$transaction(
      blocks.map((block) =>
        db.sceneBlock.update({
          where: { id: block.id },
          data: { order: block.order },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error reordering blocks:", error);
    return NextResponse.json(
      { error: "Erreur lors du réordonnancement" },
      { status: 500 }
    );
  }
}
