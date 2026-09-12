import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLocationSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  try {
    const locations = await db.location.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, type: true } },
        _count: { select: { scenes: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des lieux" },
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
    const data = createLocationSchema.parse(body);

    const location = await db.location.create({
      data: {
        projectId: params.projectId,
        parentId: data.parentId,
        name: data.name,
        type: data.type,
        imageUrl: data.imageUrl,
        description: data.description,
        textualLocation: data.textualLocation,
        ambiance: data.ambiance,
        notes: data.notes,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du lieu" },
      { status: 500 }
    );
  }
}
