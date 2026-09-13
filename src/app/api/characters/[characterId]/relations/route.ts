import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";
import {
  createCharacterRelationSchema,
  updateCharacterRelationLabelSchema,
} from "@/lib/validations";

async function source(request: NextRequest, characterId: string) {
  const character = await db.character.findFirst({ where: { id: characterId, deletedAt: null }, select: { id: true, projectId: true } });
  if (!character) return NextResponse.json({ error: "Personnage introuvable" }, { status: 404 });
  const access = await requireProjectAccess(request, character.projectId, true);
  return access instanceof NextResponse ? access : character;
}

export async function POST(request: NextRequest, { params }: { params: { characterId: string } }) {
  const character = await source(request, params.characterId); if (character instanceof NextResponse) return character;
  const parsed = createCharacterRelationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Relation invalide" }, { status: 400 });
  if (parsed.data.toCharacterId === character.id) return NextResponse.json({ error: "Un personnage ne peut pas être relié à lui-même" }, { status: 400 });
  const target = await db.character.findFirst({ where: { id: parsed.data.toCharacterId, projectId: character.projectId, deletedAt: null }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Personnage cible introuvable" }, { status: 404 });
  const relation = await db.characterRelation.create({ data: { fromCharacterId: character.id, ...parsed.data } });
  return NextResponse.json(relation, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: { params: { characterId: string } }) {
  const character = await source(request, params.characterId); if (character instanceof NextResponse) return character;
  const relationId = new URL(request.url).searchParams.get("relationId");
  if (!relationId) return NextResponse.json({ error: "Relation manquante" }, { status: 400 });
  const parsed = updateCharacterRelationLabelSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Libellé invalide" }, { status: 400 });
  const relation = await db.characterRelation.findFirst({ where: { id: relationId, OR: [{ fromCharacterId: character.id }, { toCharacterId: character.id }] } });
  if (!relation) return NextResponse.json({ error: "Relation introuvable" }, { status: 404 });
  const updated = await db.characterRelation.update({
    where: { id: relation.id },
    data: relation.fromCharacterId === character.id
      ? { label: parsed.data.label }
      : { reverseLabel: parsed.data.label },
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { characterId: string } }) {
  const character = await source(request, params.characterId); if (character instanceof NextResponse) return character;
  const relationId = new URL(request.url).searchParams.get("relationId");
  if (!relationId) return NextResponse.json({ error: "Relation manquante" }, { status: 400 });
  const relation = await db.characterRelation.findFirst({ where: { id: relationId, OR: [{ fromCharacterId: character.id }, { toCharacterId: character.id }] } });
  if (!relation) return NextResponse.json({ error: "Relation introuvable" }, { status: 404 });
  await db.characterRelation.delete({ where: { id: relation.id } });
  return NextResponse.json({ ok: true });
}
