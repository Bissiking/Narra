/* Real local PostgreSQL + real private/public routes; synthetic session, no production access. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawn } = require("node:child_process"),
  { randomUUID, createHmac } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const puppeteer = require(
  process.env.NARRA_PUPPETEER_MODULE || "puppeteer-core",
);
const database = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL)
  : null;
if (
  !database ||
  !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
  database.pathname != "/narra_reader_order_qa"
)
  throw Error("Use the disposable LOCAL narra_reader_order_qa database.");
const port = Number(process.env.NARRA_READER_QA_PORT || 3043),
  base = "http://127.0.0.1:" + port;
const secret = "synthetic-reader-order-regression-secret-only";
const db = new PrismaClient(),
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  let server, browser, log;
  const errors = [];
  fs.mkdirSync(".impeccable/review", { recursive: true });
  try {
    const owner = await db.user.create({
      data: {
        email: `reader-order-${randomUUID()}@example.test`,
        name: "Reader order QA",
      },
    });
    const project = await db.project.create({
      data: {
        ownerId: owner.id,
        name: "Ordre du récit QA",
        slug: "reader-order-" + randomUUID(),
        type: "vn",
        pagePublished: true,
      },
    });
    const season = await db.narrativeNode.create({
      data: {
        projectId: project.id,
        type: "season",
        title: "Saison 1",
        order: 0,
      },
    });
    const episodes = [];
    for (let e = 1; e <= 4; e++)
      episodes.push(
        await db.narrativeNode.create({
          data: {
            projectId: project.id,
            parentId: season.id,
            type: "episode",
            title: "Épisode " + e,
            order: e - 1,
            depth: 1,
          },
        }),
      );
    const scenesByKey = new Map(),
      counts = [
        [400, 1, 1],
        [400, 1, 1],
        [333, 1, 1],
        [2, 1, 2879],
      ];
    // Deliberately insert in the wrong chronological order, with local orders 0/1/2 repeated.
    for (const episode of [4, 2, 3, 1])
      for (let b = 1; b <= 3; b++) {
        const scene = await db.scene.create({
          data: {
            projectId: project.id,
            nodeId: episodes[episode - 1].id,
            title: "B" + b,
            order: b - 1,
          },
        });
        const blocks = Array.from(
          { length: counts[episode - 1][b - 1] },
          (_, order) => ({
            id: randomUUID(),
            sceneId: scene.id,
            type: "dialogue",
            order,
            content: `Épisode ${episode} B${b} · réplique ${order + 1}.`,
          }),
        );
        await db.sceneBlock.createMany({ data: blocks });
        scenesByKey.set(`${episode}-${b}`, { ...scene, episode, blocks });
      }
    const expected = Array.from({ length: 4 }, (_, e) =>
      Array.from({ length: 3 }, (_, b) => scenesByKey.get(`${e + 1}-${b + 1}`)),
    ).flat();
    const allBlocks = expected.flatMap((scene) => scene.blocks);
    assert.equal(allBlocks.length, 4021);
    const oldOrder = await db.scene.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    assert.notDeepEqual(
      oldOrder.map((s) => s.id),
      expected.map((s) => s.id),
      "Old global order must reproduce interleaving",
    );
    const body = Buffer.from(
      JSON.stringify({
        userId: owner.id,
        kyrosSub: "synthetic-qa",
        email: owner.email,
        name: owner.name,
        role: null,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    const cookie =
      body +
      "." +
      createHmac("sha256", secret).update(body).digest("base64url");
    log = fs.openSync(".impeccable/review/reader-order-server.log", "w");
    server = spawn(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "server.ts"],
      {
        env: {
          ...process.env,
          HOSTNAME: "127.0.0.1",
          PORT: String(port),
          NARRA_SESSION_SECRET: secret,
          NARRA_NEXT_DIST_DIR: ".next-qa/reader-order",
        },
        stdio: ["ignore", log, log],
      },
    );
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        const response = await fetch(base + "/icon.png");
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await wait(500);
    }
    if (!ready) throw Error("Local QA server did not start");
    const response = await fetch(`${base}/api/projects/${project.id}/scenes`, {
      headers: { cookie: "narra_session=" + cookie },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(
      (await response.json()).map((s) => s.id),
      expected.map((s) => s.id),
      "Real API follows narrative hierarchy",
    );
    browser = await puppeteer.launch({
      executablePath: process.env.NARRA_CHROME,
      headless: true,
    });
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewport({ width: 1440, height: 900 });
    await page.setCookie({ name: "narra_session", value: cookie, url: base });
    async function at(block) {
      const element = await page.waitForSelector(
        `[data-block-id="${block.id}"]`,
        { visible: true },
      );
      assert.equal(new URL(page.url()).searchParams.get("block"), block.id);
      await element.evaluate(async (el) => {
        await Promise.all(
          el
            .getAnimations({ subtree: true })
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => undefined)),
        );
      });
      await page.waitForFunction(
        (id) => {
          const frame = document.querySelector(`[data-block-id="${id}"]`);
          return (
            frame &&
            getComputedStyle(frame.querySelector("section") || frame)
              .opacity === "1"
          );
        },
        {},
        block.id,
      );
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    }
    async function next() {
      await page.click('[aria-label="Afficher la suite"]');
    }
    async function previous() {
      const buttons = await page.$$("button");
      for (const button of buttons)
        if (
          (await button.evaluate((e) => e.textContent.trim())) === "Précédent"
        ) {
          await button.click();
          return;
        }
      throw Error("Previous button missing");
    }
    async function position(number, episode) {
      await page.waitForFunction(
        (number) => document.body.textContent.includes(`${number} / 4021`),
        {},
        number,
      );
      assert.equal(
        await page.$eval("[class*=vnChapter]>span", (e) => e.textContent),
        "Épisode " + episode,
      );
    }
    // User's exact numeric boundary: 1140 -> 1141 must remain in Episode 4.
    await page.goto(
      `${base}/project/${project.id}/read?block=${allBlocks[1139].id}`,
      { waitUntil: "networkidle0" },
    );
    await at(allBlocks[1139]);
    await position(1140, 4);
    await next();
    await at(allBlocks[1140]);
    await position(1141, 4);
    await previous();
    await at(allBlocks[1139]);
    // Whole cross-episode boundaries, both directions, with deep-link reload.
    for (let e = 1; e <= 3; e++) {
      const scene = expected[e * 3 - 1],
        last = scene.blocks.at(-1),
        following = expected[e * 3].blocks[0];
      await page.goto(`${base}/project/${project.id}/read?block=${last.id}`, {
        waitUntil: "networkidle0",
      });
      await at(last);
      await next();
      await at(following);
      assert.equal(
        await page.$eval("[class*=vnChapter]>span", (el) => el.textContent),
        "Épisode " + (e + 1),
      );
      await page.reload({ waitUntil: "networkidle0" });
      await at(following);
      await previous();
      await at(last);
    }
    // Episode 4 B1 -> B2 -> B3 never returns to Episode 2 or 3.
    await page.goto(
      `${base}/project/${project.id}/read?block=${expected[9].blocks.at(-1).id}`,
      { waitUntil: "networkidle0" },
    );
    await at(expected[9].blocks.at(-1));
    await next();
    await at(expected[10].blocks[0]);
    await next();
    await at(expected[11].blocks[0]);
    await position(1143, 4);
    await page.reload({ waitUntil: "networkidle0" });
    await at(expected[11].blocks[0]);
    // Existing layout guard disables automatic progress; verify checkpoint IDs directly.
    const checkpointBlock = expected[10].blocks[0];
    // The actual Studio checkpoint points to the same block in the corrected reading sequence.
    await page.goto(
      `${base}/project/${project.id}/edit?scene=${expected[10].id}`,
      { waitUntil: "networkidle0" },
    );
    await page.waitForSelector("[data-track=video] [data-block-id]", {
      visible: true,
    });
    await page.click("[data-track=video] [data-block-id]");
    await page.waitForSelector("a[class*=controlRead]", { visible: true });
    const checkpoint = await page.$eval(
      "a[class*=controlRead]",
      (el) => el.href,
    );
    assert.equal(
      new URL(checkpoint).searchParams.get("block"),
      checkpointBlock.id,
    );
    await page.goto(checkpoint, { waitUntil: "networkidle0" });
    await at(checkpointBlock);
    await next();
    await at(expected[11].blocks[0]);
    // Public reader uses the same ordered payload; no login needed.
    await page.deleteCookie({ name: "narra_session", url: base });
    await page.goto(
      `${base}/stories/${project.slug}/read?block=${allBlocks[1139].id}`,
      { waitUntil: "networkidle0" },
    );
    await at(allBlocks[1139]);
    await position(1140, 4);
    await next();
    await at(allBlocks[1140]);
    await position(1141, 4);
    for (const width of [1440, 390]) {
      await page.setViewport({ width, height: 900 });
      await page.reload({ waitUntil: "networkidle0" });
      await at(allBlocks[1140]);
      await position(1141, 4);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `.impeccable/review/reader-order-${width}.png`,
      });
    }
    // Document formats share the ordering too, including preview data shown on the public landing.
    await db.project.update({
      where: { id: project.id },
      data: { type: "novel" },
    });
    await page.goto(`${base}/stories/${project.slug}/read`, {
      waitUntil: "networkidle0",
    });
    await page.waitForSelector("article[data-reader-scene]");
    assert.deepEqual(
      await page.$$eval("article[data-reader-scene]", (els) =>
        els.map((el) => el.dataset.readerScene),
      ),
      expected.map((s) => s.id),
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      ".impeccable/review/reader-order-report.json",
      JSON.stringify(
        {
          passed: true,
          blocks: 4021,
          checks: [
            "real API hierarchy",
            "1140 to 1141 stay in Episode 4",
            "Episode 4 B1/B2/B3 continuity",
            "episode boundaries next/previous",
            "block checkpoint and reload",
            "actual Studio checkpoint link",
            "anonymous public VN reader",
            "public document order",
          ],
          widths: [1440, 390],
          errors,
          scope:
            "Disposable local PostgreSQL, local Next routes and synthetic session; production data, Kyros and deployment not tested.",
        },
        null,
        2,
      ),
    );
    console.log(
      "Reader order: 4021 blocks, 1140/1141, episodes 1–4, checkpoints, private/public VN and public document passed.",
    );
  } catch (error) {
    if (browser)
      for (const page of await browser.pages())
        await page
          .screenshot({ path: ".impeccable/review/reader-order-failure.png" })
          .catch(() => {});
    throw error;
  } finally {
    await browser?.close();
    if (server) {
      const stopped = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await Promise.race([stopped, wait(5000)]);
    }
    if (log !== undefined) fs.closeSync(log);
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
