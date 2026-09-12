import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { z } from "zod";

const saveProgressSchema = z.object({
  sceneId: z.string().uuid().nullable(),
  blockId: z.string().uuid().nullable().optional(),
  wordIndex: z.number().int().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
});

interface Context {
  params: { projectId: string };
}

export async function GET(request: NextRequest, { params }: Context) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const progress = await db.readingProgress.findUnique({
    where: { userId_projectId: { userId: session.userId, projectId: params.projectId } },
    include: {
      scene: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(progress || { percentage: 0, sceneId: null, scene: null });
}

export async function PUT(request: NextRequest, { params }: Context) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const data = saveProgressSchema.parse(await request.json());

    const progress = await db.readingProgress.upsert({
      where: { userId_projectId: { userId: session.userId, projectId: params.projectId } },
      update: {
        sceneId: data.sceneId,
        blockId: data.blockId || null,
        wordIndex: data.wordIndex ?? 0,
        percentage: data.percentage ?? 0,
      },
      create: {
        userId: session.userId,
        projectId: params.projectId,
        sceneId: data.sceneId,
        blockId: data.blockId || null,
        wordIndex: data.wordIndex ?? 0,
        percentage: data.percentage ?? 0,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
