import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProjectSchema.parse(body);

    // Generate unique slug
    let slug = slugify(data.name);
    const existing = await db.project.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const project = await db.project.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        type: data.type,
        status: data.status,
        // TODO: Get actual user ID from auth
        ownerId: "00000000-0000-0000-0000-000000000000",
        genres: data.genres
          ? {
              create: data.genres.map((genre) => ({ genre })),
            }
          : undefined,
      },
      include: {
        genres: true,
        _count: {
          select: {
            scenes: true,
            characters: true,
            locations: true,
            organizations: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du projet" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projects = await db.project.findMany({
      where: { deletedAt: null },
      include: {
        genres: true,
        _count: {
          select: {
            scenes: true,
            characters: true,
            locations: true,
            organizations: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des projets" },
      { status: 500 }
    );
  }
}
