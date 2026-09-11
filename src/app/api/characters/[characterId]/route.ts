import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateCharacterSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  try {
    const character = await db.character.findUnique({
      where: { id: params.characterId },
      include: {
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
  try {
    const body = await request.json();
    const data = updateCharacterSchema.parse(body);

    const character = await db.character.update({
      where: { id: params.characterId },
      data,
    });

    return NextResponse.json(character);
  } catch (error) {
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
  try {
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
