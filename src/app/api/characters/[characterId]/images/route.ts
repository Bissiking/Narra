import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { createCharacterImageSchema } from "@/lib/validations";

const uuidSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  if (!uuidSchema.safeParse(params.characterId).success) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  try {
    const character = await db.character.findFirst({
      where: { id: params.characterId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!character) {
      return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });
    }
    const access = await requireProjectAccess(request, character.projectId, true);
    if (access instanceof NextResponse) return access;

    const data = createCharacterImageSchema.parse(await request.json());
    const order = await db.characterImage.count({
      where: { characterId: params.characterId },
    });
    const image = await db.characterImage.create({
      data: { ...data, characterId: params.characterId, order },
    });
    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Error creating character image:", error);
    return NextResponse.json({ error: "Impossible d’ajouter l’image" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  const imageId = new URL(request.url).searchParams.get("imageId");
  if (
    !uuidSchema.safeParse(params.characterId).success ||
    !uuidSchema.safeParse(imageId).success
  ) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  const character = await db.character.findFirst({
    where: { id: params.characterId, deletedAt: null },
    select: { id: true, projectId: true },
  });
  if (!character) {
    return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });
  }
  const access = await requireProjectAccess(request, character.projectId, true);
  if (access instanceof NextResponse) return access;

  const deleted = await db.characterImage.deleteMany({
    where: { id: imageId!, characterId: params.characterId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Image introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
