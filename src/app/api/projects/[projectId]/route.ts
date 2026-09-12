import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateProjectSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  try {
    const project = await db.project.findUnique({
      where: { id: params.projectId },
      include: {
        genres: true,
        _count: {
          select: {
            scenes: true,
            characters: true,
            locations: true,
            organizations: true,
            loreEntries: true,
            timelineEvents: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du projet" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const project = await db.project.update({
      where: { id: params.projectId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du projet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    // Soft delete
    await db.project.update({
      where: { id: params.projectId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du projet" },
      { status: 500 }
    );
  }
}
