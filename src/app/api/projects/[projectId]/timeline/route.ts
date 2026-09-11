import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createTimelineEventSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const events = await db.timelineEvent.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
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
        organizations: { select: { id: true, name: true } },
        scenes: { select: { id: true, title: true } },
      },
      orderBy: [{ sortKey: "asc" }, { order: "asc" }],
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching timeline events:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la timeline" },
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
    const data = createTimelineEventSchema.parse(body);

    const event = await db.timelineEvent.create({
      data: {
        projectId: params.projectId,
        title: data.title,
        description: data.description,
        narrativeDate: data.narrativeDate,
        sortKey: data.sortKey,
        order: data.order,
        locationId: data.locationId,
        characters: data.characterIds
          ? {
              create: data.characterIds.map((id) => ({
                characterId: id,
              })),
            }
          : undefined,
        organizations: data.organizationIds
          ? {
              connect: data.organizationIds.map((id) => ({ id })),
            }
          : undefined,
        scenes: data.sceneIds
          ? {
              connect: data.sceneIds.map((id) => ({ id })),
            }
          : undefined,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating timeline event:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'événement" },
      { status: 500 }
    );
  }
}
