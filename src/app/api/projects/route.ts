// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await request.json();
    const data = createProjectSchema.parse(body);

    let slug = slugify(data.name);
    const existing = await db.project.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const owner = await db.user.findUnique({ where: { id: session.userId } });
    if (!owner) {
      return NextResponse.json({ error: "Session utilisateur invalide" }, { status: 401 });
    }

    const project = await db.project.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        type: data.type,
        status: data.status,
        ownerId: owner.id,
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

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const projects = await db.project.findMany({
      where: { deletedAt: null, ownerId: session.userId },
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
