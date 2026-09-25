import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSceneSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  try {
    const scenes = await db.scene.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        node: { select: { id: true, title: true, type: true } },
        location: { select: { id: true, name: true, imageUrl: true } },
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
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const body = await request.json();
    const data = createSceneSchema.parse(body);

    if (data.nodeId) {
      const node = await db.narrativeNode.findFirst({
        where: {
          id: data.nodeId,
          projectId: params.projectId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!node) {
        return NextResponse.json(
          { error: "Le nœud narratif n’appartient pas à ce projet" },
          { status: 400 }
        );
      }
    }

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
        readerTitle: data.readerTitle || null,
        showReaderTitle: data.showReaderTitle ?? false,
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
        location: { select: { id: true, name: true, imageUrl: true } },
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
