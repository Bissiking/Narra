import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { updateCharacterSchema } from "@/lib/validations";

const characterIdSchema = z.string().uuid();

function invalidCharacterIdResponse() {
  return NextResponse.json(
    { error: "Identifiant de personnage invalide" },
    { status: 400 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  if (!characterIdSchema.safeParse(params.characterId).success) {
    return invalidCharacterIdResponse();
  }

  try {
    const character = await db.character.findUnique({
      where: { id: params.characterId, deletedAt: null },
      include: {
        images: { orderBy: { order: "asc" } },
        relationsFrom: {
          include: {
            toCharacter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                alias: true,
                portraitUrl: true,
              },
            },
          },
        },
        relationsTo: {
          include: {
            fromCharacter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                alias: true,
                portraitUrl: true,
              },
            },
          },
        },
        sceneAppearances: {
          include: {
            scene: {
              select: {
                id: true,
                title: true,
                node: { select: { title: true } },
              },
            },
          },
        },
        organizationMemberships: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error("Error fetching character:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du personnage" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  if (!characterIdSchema.safeParse(params.characterId).success) {
    return invalidCharacterIdResponse();
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

    const body = await request.json();
    const data = updateCharacterSchema.parse(body);

    const updated = await db.character.update({
      where: { id: params.characterId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }
    console.error("Error updating character:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du personnage" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  if (!characterIdSchema.safeParse(params.characterId).success) {
    return invalidCharacterIdResponse();
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

    await db.character.update({
      where: { id: params.characterId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting character:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du personnage" },
      { status: 500 }
    );
  }
}
