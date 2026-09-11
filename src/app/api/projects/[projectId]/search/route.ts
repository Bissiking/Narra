import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const types = searchParams.get("types")?.split(",") || [
      "scene",
      "character",
      "location",
      "organization",
      "lore",
    ];

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const results: any[] = [];
    const searchPattern = `%${query}%`;

    // Search scenes
    if (types.includes("scene")) {
      const scenes = await db.scene.findMany({
        where: {
          projectId: params.projectId,
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: {
          id: true,
          title: true,
          node: { select: { title: true } },
        },
      });

      results.push(
        ...scenes.map((s) => ({
          type: "scene",
          id: s.id,
          title: s.title,
          subtitle: s.node?.title || "Sans nœud",
          url: `/project/${params.projectId}/scenes/${s.id}`,
        }))
      );
    }

    // Search characters
    if (types.includes("character")) {
      const characters = await db.character.findMany({
        where: {
          projectId: params.projectId,
          deletedAt: null,
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { alias: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          alias: true,
        },
      });

      results.push(
        ...characters.map((c) => ({
          type: "character",
          id: c.id,
          title: c.alias || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          subtitle: "Personnage",
          url: `/project/${params.projectId}/characters/${c.id}`,
        }))
      );
    }

    // Search locations
    if (types.includes("location")) {
      const locations = await db.location.findMany({
        where: {
          projectId: params.projectId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      results.push(
        ...locations.map((l) => ({
          type: "location",
          id: l.id,
          title: l.name,
          subtitle: l.type || "Lieu",
          url: `/project/${params.projectId}/locations/${l.id}`,
        }))
      );
    }

    // Search organizations
    if (types.includes("organization")) {
      const organizations = await db.organization.findMany({
        where: {
          projectId: params.projectId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      results.push(
        ...organizations.map((o) => ({
          type: "organization",
          id: o.id,
          title: o.name,
          subtitle: o.type || "Organisation",
          url: `/project/${params.projectId}/organizations/${o.id}`,
        }))
      );
    }

    // Search lore
    if (types.includes("lore")) {
      const loreEntries = await db.loreEntry.findMany({
        where: {
          projectId: params.projectId,
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: {
          id: true,
          title: true,
          category: true,
        },
      });

      results.push(
        ...loreEntries.map((l) => ({
          type: "lore",
          id: l.id,
          title: l.title,
          subtitle: l.category,
          url: `/project/${params.projectId}/lore/${l.id}`,
        }))
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
