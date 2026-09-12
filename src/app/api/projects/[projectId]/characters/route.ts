import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { createCharacterSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  try {
    const characters = await db.character.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        images: { orderBy: { order: "asc" } },
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
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const body = await request.json();
    const data = createCharacterSchema.parse(body);

    const character = await db.character.create({
      data: {
        projectId: params.projectId,
        firstName: data.firstName,
        lastName: data.lastName,
        alias: data.alias,
        portraitUrl: data.portraitUrl,
        nameColor: data.nameColor,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }
    console.error("Error creating character:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du personnage" },
      { status: 500 }
    );
  }
}
