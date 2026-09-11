import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLoreEntrySchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const loreEntries = await db.loreEntry.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      include: {
        tags: {
          include: { tag: true },
        },
        _count: {
          select: {
            linksFrom: true,
            linksTo: true,
          },
        },
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json(loreEntries);
  } catch (error) {
    console.error("Error fetching lore entries:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du lore" },
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
    const data = createLoreEntrySchema.parse(body);

    const loreEntry = await db.loreEntry.create({
      data: {
        projectId: params.projectId,
        title: data.title,
        category: data.category,
        content: data.content,
        notes: data.notes,
      },
    });

    return NextResponse.json(loreEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating lore entry:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'entrée de lore" },
      { status: 500 }
    );
  }
}
