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
    .refine((name) => !/[\\/]/.test(name))
    .optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; folderId: string } },
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const data = schema.parse(await request.json());
    const result = await db.$transaction(
      async (tx) => {
        const folders = await tx.mediaFolder.findMany({
            where: { projectId: params.projectId },
          }),
          byId = new Map(folders.map((folder) => [folder.id, folder]));
        if (!byId.has(params.folderId)) throw Error("Dossier introuvable");
        let parent = data.parentId;
        const visited = new Set([params.folderId]);
        while (parent) {
          if (visited.has(parent))
            throw Error("Impossible de déplacer un dossier dans lui-même.");
          visited.add(parent);
          const folder = byId.get(parent);
          if (!folder) throw Error("Dossier parent invalide");
          parent = folder.parentId;
        }
        return tx.mediaFolder.update({ where: { id: params.folderId }, data });
      },
      { isolationLevel: "Serializable" },
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Nom ou dossier invalide"
            : error instanceof Error &&
                !error.message.includes("prisma") &&
                !error.message.includes("Unique constraint")
              ? error.message
              : "Ce nom de dossier existe déjà à cet emplacement.",
      },
      { status: 400 },
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; folderId: string } },
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    await db.$transaction(
      async (tx) => {
        const folder = await tx.mediaFolder.findFirst({
          where: { id: params.folderId, projectId: params.projectId },
        });
        if (!folder) throw Error("Dossier introuvable");
        if (
          (await tx.mediaFolder.count({ where: { parentId: folder.id } })) ||
          (await tx.media.count({
            where: { folderId: folder.id, deletedAt: null },
          }))
        )
          throw Error(
            "Déplacez les médias et sous-dossiers avant de supprimer ce dossier.",
          );
        await tx.mediaFolder.delete({ where: { id: folder.id } });
      },
      { isolationLevel: "Serializable" },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Suppression impossible",
      },
      { status: 409 },
    );
  }
}
