import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((name) => !/[\\/]/.test(name), "Nom de dossier invalide"),
  parentId: z.string().uuid().nullable().default(null),
});
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  const folders = await db.mediaFolder.findMany({
    where: { projectId: params.projectId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ folders, canEdit: access.role !== "viewer" });
}
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const data = schema.parse(await request.json());
    if (
      data.parentId &&
      !(await db.mediaFolder.findFirst({
        where: { id: data.parentId, projectId: params.projectId },
      }))
    )
      return NextResponse.json(
        { error: "Dossier parent invalide" },
        { status: 400 },
      );
    const folder = await db.mediaFolder.create({
      data: { ...data, projectId: params.projectId },
    });
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message
            : "Ce dossier existe déjà ou ne peut pas être créé.",
      },
      { status: 400 },
    );
  }
}
