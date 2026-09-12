import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { updateNarrativeNodeSchema } from "@/lib/validations";

interface RouteContext {
  params: { projectId: string; nodeId: string };
}

function collectDescendantIds(
  nodes: { id: string; parentId: string | null }[],
  rootId: string
) {
  const descendants: string[] = [];
  const pending = [rootId];

  while (pending.length > 0) {
    const parentId = pending.pop();
    const children = nodes.filter((node) => node.parentId === parentId);
    for (const child of children) {
      descendants.push(child.id);
      pending.push(child.id);
    }
  }

  return descendants;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const data = updateNarrativeNodeSchema.parse(await request.json());
    const node = await db.narrativeNode.findFirst({
      where: {
        id: params.nodeId,
        projectId: params.projectId,
        deletedAt: null,
      },
    });

    if (!node) {
      return NextResponse.json({ error: "Nœud narratif introuvable" }, { status: 404 });
    }

    const allNodes = await db.narrativeNode.findMany({
      where: { projectId: params.projectId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    const descendantIds = collectDescendantIds(allNodes, node.id);
    const nextParentId = data.parentId === undefined ? node.parentId : data.parentId;

    if (nextParentId === node.id || (nextParentId && descendantIds.includes(nextParentId))) {
      return NextResponse.json(
        { error: "Un nœud ne peut pas être placé dans sa propre descendance" },
        { status: 400 }
      );
    }

    let nextDepth = 0;
    if (nextParentId) {
      const parent = await db.narrativeNode.findFirst({
        where: {
          id: nextParentId,
          projectId: params.projectId,
          deletedAt: null,
        },
        select: { depth: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Le parent sélectionné n’appartient pas à ce projet" },
          { status: 400 }
        );
      }
      nextDepth = parent.depth + 1;
    }

    const parentChanged = nextParentId !== node.parentId;
    const targetSiblingCount = await db.narrativeNode.count({
      where: {
        projectId: params.projectId,
        parentId: nextParentId,
        deletedAt: null,
        id: { not: node.id },
      },
    });
    const requestedOrder = data.order ?? (parentChanged ? targetSiblingCount : node.order);
    const nextOrder = Math.min(requestedOrder, targetSiblingCount);

    const depthDifference = nextDepth - node.depth;
    const updatedNode = await db.$transaction(async (transaction) => {
      if (parentChanged) {
        await transaction.narrativeNode.updateMany({
          where: {
            projectId: params.projectId,
            parentId: node.parentId,
            deletedAt: null,
            order: { gt: node.order },
          },
          data: { order: { decrement: 1 } },
        });
        await transaction.narrativeNode.updateMany({
          where: {
            projectId: params.projectId,
            parentId: nextParentId,
            deletedAt: null,
            id: { not: node.id },
            order: { gte: nextOrder },
          },
          data: { order: { increment: 1 } },
        });
      } else if (nextOrder < node.order) {
        await transaction.narrativeNode.updateMany({
          where: {
            projectId: params.projectId,
            parentId: node.parentId,
            deletedAt: null,
            id: { not: node.id },
            order: { gte: nextOrder, lt: node.order },
          },
          data: { order: { increment: 1 } },
        });
      } else if (nextOrder > node.order) {
        await transaction.narrativeNode.updateMany({
          where: {
            projectId: params.projectId,
            parentId: node.parentId,
            deletedAt: null,
            id: { not: node.id },
            order: { gt: node.order, lte: nextOrder },
          },
          data: { order: { decrement: 1 } },
        });
      }

      const updated = await transaction.narrativeNode.update({
        where: { id: node.id },
        data: {
          parentId: nextParentId,
          type: data.type,
          title: data.title,
          description: data.description,
          order: nextOrder,
          depth: nextDepth,
        },
      });

      if (depthDifference !== 0 && descendantIds.length > 0) {
        await transaction.narrativeNode.updateMany({
          where: { id: { in: descendantIds } },
          data: { depth: { increment: depthDifference } },
        });
      }

      return updated;
    });

    return NextResponse.json(updatedNode);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }
    console.error("Error updating narrative node:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du nœud" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const node = await db.narrativeNode.findFirst({
      where: {
        id: params.nodeId,
        projectId: params.projectId,
        deletedAt: null,
      },
      select: { id: true, parentId: true, order: true },
    });

    if (!node) {
      return NextResponse.json({ error: "Nœud narratif introuvable" }, { status: 404 });
    }

    const allNodes = await db.narrativeNode.findMany({
      where: { projectId: params.projectId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    const nodeIds = [node.id, ...collectDescendantIds(allNodes, node.id)];
    const deletedAt = new Date();

    const result = await db.$transaction(async (transaction) => {
      const detachedScenes = await transaction.scene.updateMany({
        where: { projectId: params.projectId, nodeId: { in: nodeIds } },
        data: { nodeId: null },
      });
      const deletedNodes = await transaction.narrativeNode.updateMany({
        where: { id: { in: nodeIds } },
        data: { deletedAt },
      });
      await transaction.narrativeNode.updateMany({
        where: {
          projectId: params.projectId,
          parentId: node.parentId,
          deletedAt: null,
          order: { gt: node.order },
        },
        data: { order: { decrement: 1 } },
      });
      return { detachedScenes: detachedScenes.count, deletedNodes: deletedNodes.count };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Error deleting narrative node:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du nœud" },
      { status: 500 }
    );
  }
}
