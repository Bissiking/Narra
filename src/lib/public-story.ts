import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function getPublishedStory(slug: string) {
  return db.project.findFirst({
    where: { slug, pagePublished: true, deletedAt: null },
    include: {
      genres: true,
      owner: { select: { name: true, email: true } },
      narrativeNodes: { where: { deletedAt: null }, orderBy: [{ depth: "asc" }, { order: "asc" }] },
      scenes: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          node: { select: { title: true } },
          location: { select: { name: true, imageUrl: true } },
          blocks: {
            orderBy: { order: "asc" },
            include: {
              character: {
                select: {
                  id: true, firstName: true, lastName: true, alias: true, nameColor: true, portraitUrl: true,
                  images: { select: { id: true, label: true, emotion: true, url: true }, orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      },
      characters: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          relationsFrom: { include: { toCharacter: true } },
          relationsTo: { include: { fromCharacter: true } },
          organizationMemberships: { include: { organization: true } },
          sceneAppearances: { include: { scene: { select: { id: true, title: true, node: { select: { title: true } } } } } },
        },
      },
      organizations: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      locations: { where: { deletedAt: null }, orderBy: { name: "asc" } },
    },
  });
}

export function storyCharacterName(character: { firstName: string | null; lastName: string | null; alias: string | null }) {
  return character.alias || `${character.firstName || ""} ${character.lastName || ""}`.trim() || "Sans nom";
}

export async function getStoryForPreview(slug: string) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return db.project.findFirst({
    where: { slug, deletedAt: null },
    include: {
      genres: true,
      owner: { select: { name: true, email: true } },
      narrativeNodes: { where: { deletedAt: null }, orderBy: [{ depth: "asc" }, { order: "asc" }] },
      scenes: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          node: { select: { title: true } },
          location: { select: { name: true, imageUrl: true } },
          blocks: {
            orderBy: { order: "asc" },
            include: {
              character: {
                select: {
                  id: true, firstName: true, lastName: true, alias: true, nameColor: true, portraitUrl: true,
                  images: { select: { id: true, label: true, emotion: true, url: true }, orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      },
      characters: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          relationsFrom: { include: { toCharacter: true } },
          relationsTo: { include: { fromCharacter: true } },
          organizationMemberships: { include: { organization: true } },
          sceneAppearances: { include: { scene: { select: { id: true, title: true, node: { select: { title: true } } } } } },
        },
      },
      organizations: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      locations: { where: { deletedAt: null }, orderBy: { name: "asc" } },
    },
  });
}
