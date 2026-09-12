import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNarrativeNodeSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // Get all nodes for the project
    const nodes = await db.narrativeNode.findMany({
      where: {
        projectId: params.projectId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            scenes: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // Build tree structure
    function buildTree(parentId: string | null): any[] {
      return nodes
        .filter((n) => n.parentId === parentId)
        .map((node) => {
          const children = buildTree(node.id);
          const descendantSceneCount = children.reduce(
            (total, child) => total + child._count.scenes,
            0
          );

          return {
            ...node,
            children,
            _count: {
              scenes: node._count.scenes + descendantSceneCount,
            },
          };
        });
    }

    const tree = buildTree(null);

    return NextResponse.json(tree);
  } catch (error) {
    console.error("Error fetching narrative nodes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la structure" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const data = createNarrativeNodeSchema.parse(body);
    const hasExplicitOrder = Object.prototype.hasOwnProperty.call(body, "order");

    // Calculate depth
    let depth = 0;
    if (data.parentId) {
      const parent = await db.narrativeNode.findFirst({
        where: {
          id: data.parentId,
          projectId: params.projectId,
          deletedAt: null,
        },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Le nœud parent n’appartient pas à ce projet" },
          { status: 400 }
        );
      }
      depth = parent.depth + 1;
    }

    const siblingCount = await db.narrativeNode.count({
      where: {
        projectId: params.projectId,
        parentId: data.parentId || null,
        deletedAt: null,
      },
    });
    const order = hasExplicitOrder ? Math.min(data.order, siblingCount) : siblingCount;

    const node = await db.$transaction(async (transaction) => {
      if (hasExplicitOrder) {
        await transaction.narrativeNode.updateMany({
          where: {
            projectId: params.projectId,
            parentId: data.parentId || null,
            deletedAt: null,
            order: { gte: order },
          },
          data: { order: { increment: 1 } },
        });
      }

      return transaction.narrativeNode.create({
        data: {
          projectId: params.projectId,
          parentId: data.parentId,
          type: data.type,
          title: data.title,
          description: data.description,
          order,
          depth,
        },
      });
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error("Error creating narrative node:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du nœud" },
      { status: 500 }
    );
  }
}
