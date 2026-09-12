import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { updateStoryPageSchema } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/project-access";

const fields = {
  id: true,
  name: true,
  type: true,
  description: true,
  coverUrl: true,
  pageTitle: true,
  pageSubtitle: true,
  pageBackgroundUrl: true,
  pageBackgroundColor: true,
  pageTextColor: true,
  pageAccentColor: true,
  pageTheme: true,
  pagePublished: true,
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  const project = await db.project.findFirst({
    where: { id: params.projectId, deletedAt: null },
    select: fields,
  });
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const data = updateStoryPageSchema.partial().parse(await request.json());
    const project = await db.project.update({
      where: { id: params.projectId },
      data,
      select: fields,
    });
    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Error updating story page:", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la page" }, { status: 500 });
  }
}
