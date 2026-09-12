import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrganizationSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const organizations = await db.organization.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        members: {
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
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des organisations" },
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
    const data = createOrganizationSchema.parse(body);

    const organization = await db.organization.create({
      data: {
        projectId: params.projectId,
        name: data.name,
        type: data.type,
        logoUrl: data.logoUrl,
        description: data.description,
        status: data.status || "active",
        notes: data.notes,
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'organisation" },
      { status: 500 }
    );
  }
}
