import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  narrativeDate: z.string().max(200).optional(),
  sortKey: z.string().max(100).optional(),
  locationId: z.string().uuid().optional().nullable(),
});

interface Context { params: { projectId: string; eventId: string } }

export async function GET(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId);
  if (access instanceof NextResponse) return access;
  const event = await db.timelineEvent.findFirst({
    where: { id: params.eventId, projectId: params.projectId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      characters: {
        include: {
          character: { select: { id: true, firstName: true, lastName: true, alias: true, portraitUrl: true } },
        },
      },
      organizations: { select: { id: true, name: true } },
      scenes: { select: { id: true, title: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const data = updateEventSchema.parse(await request.json());
    const updated = await db.timelineEvent.updateMany({
      where: { id: params.eventId, projectId: params.projectId, deletedAt: null },
      data,
    });
    if (!updated.count) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
    return NextResponse.json(
      await db.timelineEvent.findUnique({
        where: { id: params.eventId },
        include: {
          location: { select: { id: true, name: true } },
          characters: { include: { character: { select: { id: true, firstName: true, lastName: true, alias: true } } } },
          organizations: { select: { id: true, name: true } },
          scenes: { select: { id: true, title: true } },
        },
      })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Impossible de modifier l'événement" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  const deleted = await db.timelineEvent.updateMany({
    where: { id: params.eventId, projectId: params.projectId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!deleted.count) return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
