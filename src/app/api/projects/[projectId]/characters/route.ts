import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCharacterSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const characters = await db.character.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            sceneAppearances: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(characters);
  } catch (error) {
    console.error("Error fetching characters:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des personnages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const data = createCharacterSchema.parse(body);

    const character = await db.character.create({
      data: {
        projectId: params.projectId,
        firstName: data.firstName,
        lastName: data.lastName,
        alias: data.alias,
        role: data.role,
        description: data.description,
        biography: data.biography,
        age: data.age,
        birthDate: data.birthDate,
        status: data.status,
        personality: data.personality,
        motivations: data.motivations,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        notes: data.notes,
        quotes: data.quotes,
      },
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("Error creating character:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du personnage" },
      { status: 500 }
    );
  }
}
