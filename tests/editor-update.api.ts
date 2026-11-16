/** Uses only an explicitly named disposable PostgreSQL database. Never uses production SSO. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { db } from "../src/lib/db";
import { createSessionToken } from "../src/lib/auth";
import * as save from "../src/app/api/scenes/[sceneId]/blocks/route";
import * as extract from "../src/app/api/scenes/[sceneId]/extract/route";
import * as folders from "../src/app/api/projects/[projectId]/media-folders/route";
import * as folderItem from "../src/app/api/projects/[projectId]/media-folders/[folderId]/route";
import * as mediaItem from "../src/app/api/projects/[projectId]/media/[mediaId]/route";
import * as upload from "../src/app/api/projects/[projectId]/media/upload/route";
const testDatabase = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL)
  : null;
if (
  !testDatabase ||
  !["localhost", "127.0.0.1", "[::1]"].includes(testDatabase.hostname) ||
  testDatabase.pathname !== "/narra_editor_update_qa"
)
  throw Error("Use the disposable LOCAL narra_editor_update_qa database.");
process.env.NARRA_SESSION_SECRET =
  "synthetic-narra-editor-update-test-secret-only";
async function main() {
  const suffix = randomUUID();
  const owner = await db.user.create({
      data: { email: `owner-${suffix}@example.test`, name: "QA Owner" },
    }),
    viewer = await db.user.create({
      data: { email: `viewer-${suffix}@example.test`, name: "QA Viewer" },
    }),
    editor = await db.user.create({
      data: { email: `editor-${suffix}@example.test`, name: "QA Editor" },
    }),
    outsider = await db.user.create({
      data: { email: `outside-${suffix}@example.test` },
    });
  const token = (user: typeof owner) =>
    createSessionToken({
      userId: user.id,
      kyrosSub: "qa",
      email: user.email,
      name: user.name,
      role: null,
    });
  const request = (method: string, body?: unknown, user = owner) =>
    new NextRequest("http://localhost/api/qa", {
      method,
      headers: {
        cookie: `narra_session=${token(user)}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const project = await db.project.create({
    data: {
      name: "Les lumières du port",
      slug: "editor-update-" + suffix,
      ownerId: owner.id,
      type: "vn",
    },
  });
  const other = await db.project.create({
    data: {
      name: "Other project",
      slug: "other-" + suffix,
      ownerId: outsider.id,
    },
  });
  const projectId = project.id,
    ctx = { params: { projectId } };
  await db.projectCollaborator.createMany({
    data: [
      { projectId, userId: viewer.id, role: "viewer" },
      { projectId, userId: editor.id, role: "editor" },
    ],
  });
  const episode = await db.narrativeNode.create({
    data: { projectId, type: "episode", title: "Épisode 1 · Le départ" },
  });
  const episode2 = await db.narrativeNode.create({
    data: {
      projectId,
      type: "episode",
      title: "Épisode 2 · Le retour",
      order: 1,
    },
  });
  const scene = await db.scene.create({
    data: { projectId, nodeId: episode.id, title: "Le départ" },
  });
  await db.scene.create({
    data: { projectId, nodeId: episode2.id, title: "Autre épisode" },
  });
  const sceneCtx = { params: { sceneId: scene.id } };
  const a = {
      id: "temp-a",
      type: "dialogue",
      content: "Nous partons demain.",
      order: 0,
    },
    bg = {
      id: "temp-bg",
      type: "background",
      displayMode: "layer",
      mediaUrl: "/uploads/editor-update-qa/port.png",
      content: "Le port",
      order: 1,
    },
    b = {
      id: "temp-b",
      type: "dialogue",
      content: "Je vois le phare.",
      order: 2,
    },
    c = {
      id: "temp-c",
      type: "note",
      content: "Vérifier la continuité.",
      order: 3,
    },
    m = {
      id: "temp-m",
      type: "music",
      mediaUrl: "/uploads/editor-update-qa/ambient.wav",
      content: "Thème du départ",
      order: 4,
      audioGroupId: "first",
      audioStartBlockId: "temp-a",
      loop: true,
    };
  const put = await save.PUT(
    request("PUT", { blocks: [a, bg, b, c, m] }),
    sceneCtx,
  );
  assert.equal(put.status, 200);
  let blocks = (await put.json()).blocks;
  assert.equal(blocks.length, 5);
  assert.equal(blocks[4].audioStartBlockId, blocks[0].id);
  const snapshot = () =>
    blocks.map((b: { id: string; updatedAt: string }) => ({
      id: b.id,
      updatedAt: b.updatedAt,
    }));
  assert.equal(
    (await save.PUT(request("PUT", { blocks }, viewer), sceneCtx)).status,
    403,
  );
  assert.equal(
    (await save.GET(request("GET", undefined, outsider), sceneCtx)).status,
    403,
  );
  const stale = snapshot();
  await db.sceneBlock.update({
    where: { id: blocks[0].id },
    data: { content: "Une modification concurrente." },
  });
  const failed = await extract.POST(
    request("POST", {
      blocks,
      selectedIds: [blocks[0].id],
      baseVersions: stale,
      title: "Impossible",
    }),
    sceneCtx,
  );
  assert.equal(failed.status, 409);
  assert.equal(await db.scene.count({ where: { projectId } }), 2);
  assert.equal(
    (await db.sceneBlock.findUniqueOrThrow({ where: { id: blocks[0].id } }))
      .content,
    "Une modification concurrente.",
  );
  blocks = await (await save.GET(request("GET"), sceneCtx)).json();
  const versions = snapshot();
  const foreign = await db.character.create({
    data: { projectId: other.id, firstName: "Foreign" },
  });
  const forbiddenBlocks = blocks.map((b: typeof a) => ({
    ...b,
    characterId: foreign.id,
  }));
  assert.equal(
    (
      await extract.POST(
        request("POST", {
          blocks: forbiddenBlocks,
          selectedIds: [blocks[0].id],
          baseVersions: versions,
          title: "Invalid",
        }),
        sceneCtx,
      )
    ).status,
    409,
  );
  assert.equal(await db.scene.count({ where: { projectId } }), 2);
  const movedIds = [blocks[1].id, blocks[2].id];
  const moved = await extract.POST(
    request(
      "POST",
      {
        blocks,
        selectedIds: movedIds,
        baseVersions: versions,
        title: "Le phare",
      },
      editor,
    ),
    sceneCtx,
  );
  assert.equal(moved.status, 201);
  const result = await moved.json();
  assert.equal(result.scene.node.id, episode.id);
  assert.equal(result.scene.order, 1);
  assert.equal(result.scene._count.blocks, 2);
  assert.deepEqual(
    (
      await db.sceneBlock.findMany({
        where: { sceneId: result.scene.id },
        orderBy: { order: "asc" },
      })
    ).map((b) => b.id),
    movedIds,
  );
  assert.equal(result.blocks.length, 3);
  assert.equal(result.wordCount, 6);
  assert.deepEqual(
    result.blocks.map((b: { order: number }) => b.order),
    [0, 1, 2],
  );
  assert.deepEqual(
    result.blocks.map((b: { updatedAt: string }) => b.updatedAt),
    (
      await db.sceneBlock.findMany({
        where: { sceneId: scene.id },
        orderBy: { order: "asc" },
      })
    ).map((b) => b.updatedAt.toISOString()),
  );
  console.log(
    "Atomic extraction: IDs, order, episode, counts; stale/foreign-character rollback; editor/viewer/outsider access passed.",
  );
  // Unsaved copied elements and their temporary cue references move atomically too.
  const draftLead={id:'temp-unsaved-lead',type:'dialogue',content:'Le vent se lève.',order:result.blocks.length};
  const draftMusic={id:'temp-unsaved-music',type:'music',content:'Thème',audioGroupId:'unsaved-group',audioStartBlockId:draftLead.id,order:result.blocks.length+1};
  const draftMove=await extract.POST(request('POST',{blocks:[...result.blocks,draftLead,draftMusic],selectedIds:[draftLead.id,draftMusic.id],baseVersions:result.blocks.map((b:{id:string;updatedAt:string})=>({id:b.id,updatedAt:b.updatedAt})),title:'Départ musical'}),sceneCtx);
  assert.equal(draftMove.status,201);
  const draftResult=await draftMove.json();const draftSaved=await db.sceneBlock.findMany({where:{sceneId:draftResult.scene.id},orderBy:{order:'asc'}});
  assert.equal(draftSaved.length,2);assert.equal(draftSaved[1].audioStartBlockId,draftSaved[0].id);assert.ok(!draftSaved[0].id.startsWith('temp-'));assert.equal(draftResult.blocks.length,3);
  assert.equal((await extract.POST(request('POST',{blocks:[],selectedIds:['missing'],baseVersions:[],title:'Denied'},viewer),sceneCtx)).status,403);
  // Root uniqueness, hierarchy cycles and cross-project validation.
  const rootRes = await folders.POST(request("POST", { name: "Décors" }), ctx);
  assert.equal(rootRes.status, 201);
  const root = await rootRes.json();
  const nested = await (
    await folders.POST(
      request("POST", { name: "Port", parentId: root.id }),
      ctx,
    )
  ).json();
  assert.equal(
    (await folders.POST(request("POST", { name: "décors" }), ctx)).status,
    400,
  );
  assert.equal(
    (
      await folderItem.PATCH(request("PATCH", { parentId: nested.id }), {
        params: { projectId, folderId: root.id },
      })
    ).status,
    400,
  );
  assert.equal(
    (await folders.POST(request("POST", { name: "Denied" }, viewer), ctx))
      .status,
    403,
  );
  const otherFolder = await db.mediaFolder.create({
    data: { projectId: other.id, name: "Other" },
  });
  assert.equal(
    (
      await folders.POST(
        request("POST", { name: "Cross", parentId: otherFolder.id }),
        ctx,
      )
    ).status,
    400,
  );
  const item = await db.media.create({
    data: {
      projectId,
      filename: "qa-image.png",
      originalName: "Décor du port.png",
      mimeType: "image/png",
      url: "/uploads/editor-update-qa/port.png",
      size: 2048,
      type: "image",
    },
  });
  assert.equal(
    (
      await mediaItem.PATCH(request("PATCH", { folderId: nested.id }), {
        params: { projectId, mediaId: item.id },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await mediaItem.PATCH(request("PATCH", { folderId: otherFolder.id }), {
        params: { projectId, mediaId: item.id },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await folderItem.DELETE(request("DELETE"), {
        params: { projectId, folderId: nested.id },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await folderItem.DELETE(request("DELETE"), {
        params: { projectId, folderId: root.id },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await mediaItem.PATCH(
        request("PATCH", { folderId: null, originalName: "Port renommé.png" }),
        { params: { projectId, mediaId: item.id } },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await folderItem.PATCH(
        request("PATCH", { name: "Décors du port", parentId: null }),
        { params: { projectId, folderId: nested.id } },
      )
    ).status,
    200,
  );
  const form = new FormData();
  form.set("folderId", nested.id);
  form.set(
    "file",
    new File(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      "test.png",
      { type: "image/png" },
    ),
  );
  const up = await upload.POST(
    new NextRequest("http://localhost/api/qa", {
      method: "POST",
      headers: { cookie: `narra_session=${token(owner)}` },
      body: form,
    }),
    ctx,
  );
  assert.equal(up.status, 201);
  const uploaded = await up.json();
  assert.equal(uploaded.folderId, nested.id);
  assert.equal(
    (await folders.GET(request("GET", undefined, viewer), ctx)).status,
    200,
  );
  assert.equal(
    (await (await folders.GET(request("GET", undefined, viewer), ctx)).json())
      .canEdit,
    false,
  );
  console.log(
    "Media folders: nested creation, move, rename, duplicate/cycle rejection, upload and scoped permissions passed.",
  );
  // Rich disposable fixture for actual-route browser QA.
  const browserScene = await db.scene.create({
    data: { projectId, nodeId: episode.id, title: "La traversée", order: 2 },
  });
  const fixtureBlocks = Array.from({ length: 12 }, (_, i) => ({
    id: "temp-ui-" + i,
    type: i === 4 ? "note" : "dialogue",
    content: [
      "Le port se réveille.",
      "Le navire quitte le quai.",
      "Le phare apparaît.",
    ][i % 3],
    order: i,
  }));
  await save.PUT(request("PUT", { blocks: fixtureBlocks }), {
    params: { sceneId: browserScene.id },
  });
  const uiBlocks = await db.sceneBlock.findMany({
    where: { sceneId: browserScene.id },
    orderBy: { order: "asc" },
  });
  await db.media.create({
    data: {
      projectId,
      filename: "qa-ambient.wav",
      originalName: "Ambiance du port.wav",
      mimeType: "audio/wav",
      url: "/uploads/editor-update-qa/ambient.wav",
      size: 16044,
      type: "audio",
      folderId: root.id,
    },
  });
  await mkdir(".impeccable", { recursive: true });
  await writeFile(
    ".impeccable/editor-update-fixture.json",
    JSON.stringify({
      projectId,
      sceneId: browserScene.id,
      blocks: uiBlocks,
      folderId: root.id,
      nestedId: nested.id,
      mediaId: item.id,
      cookie: token(owner),
      viewerCookie: token(viewer),
    }),
  );
  console.log("Browser fixture prepared in the isolated local QA database.");
}
main()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
