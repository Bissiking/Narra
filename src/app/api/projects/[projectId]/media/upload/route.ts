import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

const projectIdSchema = z.string().uuid();
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "audio/", "video/", "application/pdf"];

function mediaType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const access = await requireProjectAccess(request, params.projectId, true);
  if (access instanceof NextResponse) return access;
  if (!projectIdSchema.safeParse(params.projectId).success) {
    return NextResponse.json({ error: "Projet invalide" }, { status: 400 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Le fichier doit faire moins de 25 Mo" }, { status: 400 });
    }
    if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      return NextResponse.json({ error: "Type de fichier non pris en charge" }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const filename = `${randomUUID()}${extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", params.projectId);
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));

    const item = await db.media.create({
      data: {
        projectId: params.projectId,
        filename,
        originalName: file.name.slice(0, 255),
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${params.projectId}/${filename}`,
        type: mediaType(file.type),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json({ error: "Impossible d’envoyer le fichier" }, { status: 500 });
  }
}
