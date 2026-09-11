import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSceneSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const scenes = await db.scene.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        node: { select: { id: true, title: true, type: true } },
        location: { select: { id: true, name: true } },
        characters: {
          include: {
            character: {
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
        _count: { select: { blocks: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(scenes);
  } catch (error) {
    console.error("Error fetching scenes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des scènes" },
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
    const data = createSceneSchema.parse(body);

    // Get max order for the node
    const maxOrder = await db.scene.aggregate({
      where: {
        projectId: params.projectId,
        nodeId: data.nodeId || null,
      },
      _max: { order: true },
    });

    const scene = await db.scene.create({
      data: {
        projectId: params.projectId,
        nodeId: data.nodeId,
        title: data.title,
        status: data.status,
        order: (maxOrder._max.order ?? -1) + 1,
        notes: data.notes,
        locationId: data.locationId,
        characters: data.characterIds
          ? {
              create: data.characterIds.map((id) => ({
                characterId: id,
              })),
            }
          : undefined,
      },
      include: {
        node: { select: { id: true, title: true, type: true } },
        location: { select: { id: true, name: true } },
        characters: {
          include: {
            character: {
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
        _count: { select: { blocks: true } },
      },
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    console.error("Error creating scene:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la scène" },
      { status: 500 }
    );
  }
}
