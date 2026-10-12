import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

const schema = z.object({ nodeId: z.string().uuid().nullable(), sceneIds: z.array(z.string().uuid()).min(1).max(1000) });
export async function PUT(request: NextRequest, { params }: { params: { projectId: string } }) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  try {
    const { nodeId, sceneIds } = schema.parse(await request.json());
    const result = await db.$transaction(async tx => {
      const siblings = await tx.scene.findMany({where: {projectId: params.projectId, nodeId, deletedAt: null}, select: {id: true}});
      if (new Set(sceneIds).size !== sceneIds.length || siblings.length !== sceneIds.length || siblings.some(s => !sceneIds.includes(s.id))) return false;
      for (const [order, id] of sceneIds.entries()) await tx.scene.update({where: {id}, data: {order}});
      return true;
    }, { isolationLevel: 'Serializable' });
    return result ? NextResponse.json({ok: true}) : NextResponse.json({error: "La liste des sous-blocs a changé. Rechargez le studio avant de réessayer."}, {status: 409});
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({error: "Ordre des sous-blocs invalide"}, {status: 400});
    return NextResponse.json({error: "Impossible d’enregistrer l’ordre. Réessayez."}, {status: 409});
  }
}
