import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import { z } from "zod";

const updateSceneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  nodeId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
});

interface Context {
  params: { projectId: string; sceneId: string };
}

export async function GET(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;

  const scene = await db.scene.findFirst({
    where: { id: params.sceneId, projectId: params.projectId, deletedAt: null },
    include: {
      node: { select: { id: true, title: true, type: true } },
      location: { select: { id: true, name: true } },
      characters: {
        include: {
          character: {
            select: { id: true, firstName: true, lastName: true, alias: true, portraitUrl: true, nameColor: true },
          },
        },
      },
      _count: { select: { blocks: true } },
    },
  });

  if (!scene) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
  return NextResponse.json(scene);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;

  try {
    const data = updateSceneSchema.parse(await request.json());

    if (data.nodeId) {
      const node = await db.narrativeNode.findFirst({
        where: { id: data.nodeId, projectId: params.projectId, deletedAt: null },
      });
      if (!node) {
        return NextResponse.json({ error: "Nœud narratif introuvable" }, { status: 400 });
      }
    }

    if (data.locationId) {
      const location = await db.location.findFirst({
        where: { id: data.locationId, projectId: params.projectId, deletedAt: null },
      });
      if (!location) {
        return NextResponse.json({ error: "Lieu introuvable" }, { status: 400 });
      }
    }

    const updated = await db.scene.updateMany({
      where: { id: params.sceneId, projectId: params.projectId, deletedAt: null },
      data,
    });

    if (!updated.count) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });

    const scene = await db.scene.findUnique({
      where: { id: params.sceneId },
      include: {
        node: { select: { id: true, title: true, type: true } },
        location: { select: { id: true, name: true } },
        characters: {
          include: {
            character: {
              select: { id: true, firstName: true, lastName: true, alias: true, portraitUrl: true, nameColor: true },
            },
          },
        },
        _count: { select: { blocks: true } },
      },
    });

    return NextResponse.json(scene);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de modifier la scène" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;

  const deleted = await db.scene.updateMany({
    where: { id: params.sceneId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (!deleted.count) return NextResponse.json({ error: "Scène introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
