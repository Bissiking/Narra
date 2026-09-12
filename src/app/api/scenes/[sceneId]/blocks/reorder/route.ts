import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reorderBlocksSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: { sceneId: string } }
) {
  try {
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
