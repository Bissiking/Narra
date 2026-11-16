/* Actual local routes, PostgreSQL and synthetic session. Start the isolated QA server first. */
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const puppeteer = require(
  process.env.NARRA_PUPPETEER_MODULE || "puppeteer-core",
);
const fixture = JSON.parse(
  fs.readFileSync(".impeccable/editor-update-fixture.json", "utf8"),
);
const base = process.env.NARRA_UPDATE_QA_BASE || "http://127.0.0.1:3041",
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(".impeccable/review", {recursive:true});
  fs.mkdirSync("public/uploads/editor-update-qa", { recursive: true });
  fs.copyFileSync(
    "src/app/icon.png",
    "public/uploads/editor-update-qa/port.png",
  );
  // One second of real PCM audio, independently of any provider.
  const wav = Buffer.alloc(16044);
  wav.write("RIFF");
  wav.writeUInt32LE(16036, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  fs.writeFileSync("public/uploads/editor-update-qa/ambient.wav", wav);
  const browser = await puppeteer.launch({
    executablePath: process.env.NARRA_CHROME,
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  let page;
  const errors = [];
  try {
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(base, [
      "clipboard-read",
      "clipboard-write",
    ]);
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setCookie({
      name: "narra_session",
      value: fixture.cookie,
      url: base,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluateOnNewDocument(() => {
      window.__audioEvents = [];
      const NativeAudio = window.Audio;
      window.Audio = function (url) {
        const audio = new NativeAudio(url),
          play = audio.play.bind(audio),
          pause = audio.pause.bind(audio);
        audio.play = () => {
          window.__audioEvents.push(["play", url]);
          return play().then(() => window.__audioEvents.push(["playing", url]));
        };
        audio.pause = () => {
          window.__audioEvents.push(["pause", url]);
          return pause();
        };
        return audio;
      };
    });
    const visible = (selector) =>
      page.waitForSelector(selector, { visible: true, timeout: 15000 });
    const click = async (selector, options) => {
      const el = await visible(selector);
      await el.evaluate((e) =>
        e.scrollIntoView({ block: "nearest", inline: "nearest" }),
      );
      await el.click(options);
    };
    const text = async (label) => {
      const found = await page.$$("button");
      for (const el of found) {
        if (
          (await el.isVisible()) &&
          (await el.evaluate((e) => e.textContent.trim())) === label
        ) {
          await el.evaluate((e) => e.scrollIntoView({ block: "nearest" }));
          await el.click();
          return;
        }
      }
      throw Error("No visible button " + label);
    };
    const fill = async (selector, value) => {
      const el = await visible(selector);
      await el.evaluate((e) => {
        e.focus();
        e.setSelectionRange(0, e.value.length);
      });
      await page.keyboard.type(value);
    };
    const api = (url) =>
      page.evaluate(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw Error("API " + res.status);
        return res.json();
      }, url);
    const blocks = () => api(`/api/scenes/${fixture.sceneId}/blocks`);
    const editUrl = `${base}/project/${fixture.projectId}/edit?scene=${fixture.sceneId}`;
    const timelineCount = () =>
      page.$$eval("[data-track=video] [data-block-id]", (e) => e.length);
    const save = async () => {
      await click("[class*=topActions] button[class*=primary]");
      await page.waitForFunction(
        () =>
          !document.querySelector("[class*=topActions] button[class*=primary]")
            ?.disabled,
      );
      await wait(150);
    };
    const choose = async (index, shift = false) => {
      const items = await page.$$("[data-track=video] [data-block-id]");
      const el = items[index];
      await el.evaluate((e) =>
        e.scrollIntoView({ block: "nearest", inline: "nearest" }),
      );
      if (shift) await page.keyboard.down("Shift");
      await el.click();
      if (shift) await page.keyboard.up("Shift");
      await wait(100);
    };
    await page.goto(editUrl, { waitUntil: "networkidle0" });
    await visible("[data-track=video] [data-block-id]");
    assert.equal(await timelineCount(), 12);
    await choose(0);
    await choose(2, true);
    assert.equal(
      await page.$$eval(
        "[data-track=video] [aria-pressed=true]",
        (els) => els.length,
      ),
      3,
    );
    await text("Copier");
    await page.waitForFunction(() =>
      document
        .querySelector('[aria-label="Actions de sélection"] [role=status]')
        ?.textContent.includes("copiés"),
    );
    // Range clipboard, duplicate, undo, redo, cut and paste use actual shortcuts.
    await page.keyboard.down("Control");
    await page.keyboard.press("D");
    await page.keyboard.up("Control");
    assert.equal(await timelineCount(), 15);
    await page.keyboard.down("Control");
    await page.keyboard.press("Z");
    await page.keyboard.up("Control");
    assert.equal(await timelineCount(), 12);
    await text("Coller");
    await wait(150);
    assert.equal(await timelineCount(), 15);
    await text("Couper");
    await wait(150);
    assert.equal(await timelineCount(), 12);
    await text("Coller");
    await wait(150);
    assert.equal(await timelineCount(), 15);
    await save();
    assert.equal((await blocks()).length, 15);
    // Native text editing keeps Ctrl+A and the right-click menu.
    await choose(0);
    const input = "[data-block-type=dialogue] textarea";
    await fill(input, "Texte conservé dans le champ.");
    assert.equal(
      await page.$eval(input, (e) => e.value),
      "Texte conservé dans le champ.",
    );
    await click(input, { button: "right" });
    assert.equal(
      await page.$('[role=menu][aria-label="Actions sur la sélection"]'),
      null,
    );
    await page.keyboard.press("Escape");
    await save();
    await choose(0);
    await choose(2, true);
    await click("[data-track=video] [aria-pressed=true]", { button: "right" });
    await visible("[role=menu]");
    assert.equal(
      await page.$$eval(
        "[data-track=video] [aria-pressed=true]",
        (els) => els.length,
      ),
      3,
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await page.waitForSelector("[role=menu]", { hidden: true });
    // An HTTP failure retains source data and selected elements, then retry hits the real transaction.
    let fail = true;
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (fail && r.url().endsWith("/extract")) {
        fail = false;
        void r.respond({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Conflit simulé : aucun élément déplacé.",
          }),
        });
      } else void r.continue();
    });
    await text("Nouveau sous-bloc depuis la sélection");
    await visible("dialog[open]");
    await fill("dialog[open] input", "La traversée · suite");
    await text("Créer et déplacer");
    await visible("dialog[open] [role=alert]");
    assert.equal((await blocks()).length, 15);
    assert.equal(await timelineCount(), 15);
    await text("Créer et déplacer");
    await page.waitForSelector("dialog[open]", { hidden: true });
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-track=video] [data-block-id]")
          .length === 3,
    );
    const scenes = await api(`/api/projects/${fixture.projectId}/scenes`);
    const newScene = scenes.find((s) => s.title === "La traversée · suite");
    assert.ok(newScene);
    assert.equal((await blocks()).length, 12);
    assert.equal(
      newScene.node.id,
      scenes.find((s) => s.id === fixture.sceneId).node.id,
    );
    const newBlocks = () => api(`/api/scenes/${newScene.id}/blocks`);
    const pickAudio = async () => {
      await text("Choisir");
      await visible("[data-media-browser]");
      const candidates = await page.$$("dialog[open] nav button");
      for (const e of candidates) {
        if (
          (await e.evaluate((e) => e.textContent)).includes("Tous les médias")
        ) {
          await e.click();
          break;
        }
      }
      await click('[aria-label="Choisir Ambiance du port.wav"]');
      await page.waitForSelector("[data-media-browser]", { hidden: true });
    };
    await choose(0);
    await click('[aria-label="Ajouter un élément"]');
    await text("Musique");
    await pickAudio();
    await text("Ajouter un titre à cette playlist");
    await pickAudio();
    await choose(1);
    await click('[aria-label="Ajouter un élément"]');
    await text("Musique");
    await pickAudio();
    await choose(2);
    await click('[aria-label="Ajouter un élément"]');
    await text("Arrêter la musique ici");
    await save();
    const audioBlocks = (await newBlocks()).filter((b) => b.type === "music");
    assert.equal(audioBlocks.length, 4);
    const groupCounts = {};
    for (const b of audioBlocks)
      groupCounts[b.audioGroupId] = (groupCounts[b.audioGroupId] || 0) + 1;
    assert.deepEqual(Object.values(groupCounts).sort(), [1, 1, 2]);
    assert.equal(audioBlocks[3].audioAction, "stop");
    assert.equal(new Set(audioBlocks.map((b) => b.audioStartBlockId)).size, 3);
    await choose(0);
    await click('[aria-label="Lire la timeline"]');
    await page.waitForFunction(
      () => window.__audioEvents.some((e) => e[0] === "playing"),
      { timeout: 15000 },
    );
    await choose(1);
    await wait(250);
    await choose(2);
    await wait(250);
    await click('[aria-label="Pause de la timeline"]');
    console.log(
      "Actual editor: Shift selection, clipboard, shortcuts, native text editing, context menu keyboard, extraction rollback/retry, multiple playlists and stop persisted.",
    );
    // The reader uses the same cues at real plan boundaries.
    const persistedPlans = (await newBlocks()).filter(
      (b) => b.type !== "music",
    );
    await page.goto(
      `${base}/project/${fixture.projectId}/read?block=${persistedPlans[0].id}`,
      { waitUntil: "networkidle0" },
    );
    await text("Commencer avec le son");
    await page.waitForFunction(() =>
      window.__audioEvents.some((e) => e[0] === "playing"),
    );
    await click('[aria-label="Afficher la suite"]');
    await wait(150);
    await page.waitForFunction(
      () => window.__audioEvents.filter((e) => e[0] === "playing").length >= 2,
    );
    await click('[aria-label="Afficher la suite"]');
    await page.waitForFunction(
      () => window.__audioEvents.filter((e) => e[0] === "pause").length >= 2,
    );
    assert.equal(
      await page.$$eval(
        '[role="alert"]',
        (els) =>
          els.filter((e) => e.textContent.includes("Impossible de lire"))
            .length,
      ),
      0,
    );
    console.log(
      "Reader: real local WAV playback, playlist replacement and stop passed.",
    );
    // Copy between actual sub-blocks, with newly cloned cue anchors on save.
    await page.goto(`${base}/project/${fixture.projectId}/edit?scene=${newScene.id}`,{waitUntil:"networkidle0"});
    await visible('[data-track=video] [data-block-id]');await choose(0);await text("Copier");
    await page.waitForFunction(()=>document.querySelector('[aria-label="Actions de sélection"] [role=status]')?.textContent.includes("copiés"));
    await click(`[data-library-scene="${fixture.sceneId}"] [class*=sceneButton]`);
    await page.waitForFunction(()=>document.querySelectorAll('[data-track=video] [data-block-id]').length===12);
    await text("Coller");await page.waitForFunction(()=>document.querySelectorAll('[data-track=video] [data-block-id]').length===13);
    await save();const copiedDestination=await blocks();assert.equal(copiedDestination.filter(b=>b.type!=="music").length,13);
    const pastedMusic=copiedDestination.filter(b=>b.type==="music");assert.equal(pastedMusic.length,2);assert.ok(copiedDestination.some(b=>b.id===pastedMusic[0].audioStartBlockId&&b.type!=="music"));
    // UI organization and upload inside nested folders.
    await page.goto(`${base}/project/${fixture.projectId}/media`, {
      waitUntil: "networkidle0",
    });
    await visible("[data-media-browser]");
    await text("Nouveau dossier");
    await fill("dialog[open] input", "Musiques");
    await text("Enregistrer");
    await page.waitForSelector("dialog[open]", { hidden: true });
    const musicFolder = (
      await api(`/api/projects/${fixture.projectId}/media-folders`)
    ).folders.find((f) => f.name === "Musiques");
    assert.ok(musicFolder);
    const folderButtons = await page.$$("[class*=folders] button");
    for (const b of folderButtons)
      if ((await b.evaluate((e) => e.textContent)).startsWith("Musiques")) {
        await b.click();
        break;
      }
    await text("Nouveau dossier");
    await fill("dialog[open] input", "Ambiances");
    await text("Enregistrer");
    await page.waitForSelector("dialog[open]", { hidden: true });
    const allFolders = (
      await api(`/api/projects/${fixture.projectId}/media-folders`)
    ).folders;
    assert.equal(
      allFolders.find((f) => f.name === "Ambiances").parentId,
      musicFolder.id,
    );
    // Move an existing audio file into this folder using the real dialog.
    const allButtons = await page.$$("nav button");
    for (const b of allButtons)
      if (
        (await b.evaluate((e) => e.textContent)).includes("Tous les médias")
      ) {
        await b.click();
        break;
      }
    await click('[aria-label="Ranger ou renommer Ambiance du port.wav"]');
    await page.select(
      'dialog[open] [aria-label="Dossier de destination"]',
      musicFolder.id,
    );
    await fill("dialog[open] input", "Port au matin.wav");
    await text("Enregistrer");
    await page.waitForSelector("dialog[open]", { hidden: true });
    assert.ok(await page.$('[aria-label="Aperçu de Port au matin.wav"]'));
    assert.equal(
      (await api(`/api/projects/${fixture.projectId}/media`)).find(
        (m) => m.originalName === "Port au matin.wav",
      ).folderId,
      musicFolder.id,
    );
    assert.ok(
      await page.$$eval("img", (els) =>
        els.every((e) => e.complete && e.naturalWidth > 0),
      ),
      "Fixture images decode",
    );
    // Batched desktop/mobile visual review and structural bounds at each width.
    for (const width of [1440, 390, 320]) {
      await page.setViewport({ width, height: 1000 });
      await wait(120);
      if (width < 700) await visible('[aria-label="Portée des médias"]');
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Media overflow " + width,
      );
      await page.screenshot({
        path: `.impeccable/review/editor-update-media-${width}.png`,
        fullPage: true,
      });
    }
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(
      `${base}/project/${fixture.projectId}/edit?scene=${newScene.id}`,
      { waitUntil: "networkidle0" },
    );
    await visible("[data-track=video] [data-block-id]");
    for (const width of [1440, 390, 320]) {
      await page.setViewport({ width, height: 1000 });
      await wait(120);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Editor overflow " + width,
      );
      await page.screenshot({
        path: `.impeccable/review/editor-update-studio-${width}.png`,
        fullPage: true,
      });
      await text("Nouveau sous-bloc depuis la sélection");
      await visible("dialog[open]");
      assert.ok(
        await page.$eval("dialog[open]", (e) => {
          const r = e.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.right <= innerWidth &&
            r.top >= 0 &&
            r.bottom <= innerHeight
          );
        }),
      );
      await page.keyboard.press("Escape");
    }
    // Viewer hides management and rejects editor clipboard modifications.
    await page.setCookie({
      name: "narra_session",
      value: fixture.viewerCookie,
      url: base,
    });
    await page.goto(`${base}/project/${fixture.projectId}/media`, {
      waitUntil: "networkidle0",
    });
    await visible("[data-media-browser]");
    assert.equal(await page.$('[aria-label^="Ranger ou renommer "]'), null);
    assert.equal(
      await page.$$eval("button", (e) =>
        e.some((b) => b.textContent === "Nouveau dossier"),
      ),
      false,
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      ".impeccable/review/editor-update-browser-report.json",
      JSON.stringify(
        {
          passed: true,
          widths: [1440, 390, 320],
          scope:
            "Local real Next routes and PostgreSQL with synthetic session; no Kyros or production deployment.",
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "Media folders/move/rename, viewer, desktop/390/320 bounds passed; no page errors.",
    );
  } catch (e) {
    if (page)
      await page.screenshot({
        path: ".impeccable/review/editor-update-failure.png",
        fullPage: true,
      });
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
