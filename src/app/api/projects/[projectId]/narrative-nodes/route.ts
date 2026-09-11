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
        .map((node) => ({
          ...node,
          children: buildTree(node.id),
        }));
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

    // Calculate depth
    let depth = 0;
    if (data.parentId) {
      const parent = await db.narrativeNode.findUnique({
        where: { id: data.parentId },
      });
      if (parent) depth = parent.depth + 1;
    }

    // Get max order for siblings
    const maxOrder = await db.narrativeNode.aggregate({
      where: {
        projectId: params.projectId,
        parentId: data.parentId || null,
      },
      _max: { order: true },
    });

    const node = await db.narrativeNode.create({
      data: {
        projectId: params.projectId,
        parentId: data.parentId,
        type: data.type,
        title: data.title,
        description: data.description,
        order: data.order || (maxOrder._max.order ?? -1) + 1,
        depth,
      },
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
