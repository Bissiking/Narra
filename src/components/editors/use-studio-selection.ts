"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { createSceneBlockSchema } from "@/lib/validations";
import {
  selectedBlockIds,
  cloneSelection,
  repairAudioAnchors,
} from "@/lib/studio-selection";
import type { SceneBlock } from "./editor-workspace";
let clipboard = "";
const payloadSchema = z.object({
  format: z.literal("narra-blocks/v1"),
  projectId: z.string(),
  blocks: z
    .array(
      createSceneBlockSchema.extend({
        id: z.string().max(100),
        showPortrait: z.boolean().nullish(),
      }),
    )
    .min(1)
    .max(10000),
});
export const isTextTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest(
    'input,textarea,select,[contenteditable="true"],[role="textbox"],dialog',
  );
export type SelectionModifiers = {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
};
export default function useStudioSelection(p: {
  projectId: string;
  sceneId?: string;
  blocks: SceneBlock[];
  activeId: string | null;
  editable: boolean;
  locked: string[];
  select: (id: string) => void;
  restore: (blocks: SceneBlock[]) => void;
  remember: (key: string) => void;
  undo: () => void;
  redo: () => void;
}) {
  const live = useRef(p);
  live.current = p;
  const [ids, setIds] = useState<string[] | null>(null),
    anchor = useRef<string | null>(null);
  const [notice, setNotice] = useState("");
  const lastSelected = useRef<string | null>(null);
  useEffect(() => {
    if (p.activeId !== lastSelected.current) {
      setIds(null);
      anchor.current = p.activeId;
      lastSelected.current = p.activeId;
    }
  }, [p.activeId]);
  useEffect(() => {
    setIds(null);
    anchor.current = null;
    setNotice("");
  }, [p.sceneId]);
  const selection = ids?.filter((id) => p.blocks.some((b) => b.id === id));
  const effective =
    selection !== undefined
      ? selection
      : p.activeId
        ? selectedBlockIds(p.blocks, [], null, p.activeId)
        : [];
  const chosen = p.blocks.filter((b) => effective.includes(b.id));
  const writable =
    p.editable &&
    chosen.length > 0 &&
    !chosen.some(
      (b) =>
        p.locked.includes(b.type) ||
        (b.type !== "music" && p.locked.includes("video")),
    );
  function select(id: string, event: SelectionModifiers = {}) {
    lastSelected.current = id;
    setIds(
      selectedBlockIds(
        p.blocks,
        effective,
        anchor.current || p.activeId,
        id,
        !!event.shiftKey,
        !!(event.ctrlKey || event.metaKey),
      ),
    );
    if (!event.shiftKey) anchor.current = id;
    p.select(id);
  }
  function all() {
    setIds(p.blocks.map((b) => b.id));
    anchor.current = p.blocks[0]?.id || null;
  }
  function remove() {
    if (!writable) return;
    p.remember("delete-selection");
    p.restore(
      repairAudioAnchors(p.blocks.filter((b) => !effective.includes(b.id))).map(
        (b, order) => ({ ...b, order }),
      ),
    );
    setIds(null);
  }
  async function copy(cut = false) {
    if (!chosen.length || (cut && !writable)) return;
    const text = JSON.stringify({
      format: "narra-blocks/v1",
      projectId: p.projectId,
      blocks: chosen,
    });
    clipboard = text;
    let system = false;
    try {
      await navigator.clipboard.writeText(text);
      system = true;
    } catch {}
    if (
      cut &&
      (live.current.sceneId !== p.sceneId ||
        live.current.blocks !== p.blocks ||
        !live.current.editable)
    ) {
      setNotice(
        "Copie effectuée. Le sous-bloc a changé ; aucun élément coupé.",
      );
      return;
    }
    if (
      cut &&
      (live.current.sceneId !== p.sceneId ||
        live.current.blocks !== p.blocks ||
        !live.current.editable)
    ) {
      setNotice(
        "Copie effectuée. Le sous-bloc a changé : aucun élément n’a été coupé.",
      );
      return;
    }
    if (cut) remove();
    setNotice(
      `${chosen.length} élément${chosen.length > 1 ? "s" : ""} ${cut ? "coupé" : "copié"}${chosen.length > 1 ? "s" : ""}${system ? "" : " dans Narra"}.`,
    );
  }
  function insert(source: SceneBlock[]) {
    if (!p.editable) return;
    if (p.blocks.length + source.length > 10000) {
      setNotice("Ce sous-bloc atteint la limite de 10 000 éléments.");
      return;
    }
    p.remember("paste-" + Date.now());
    const additions = cloneSelection(
      source,
      () => `temp-${crypto.randomUUID()}`,
      p.blocks.find((b) => b.id === p.activeId && b.type !== "music")?.id ||
        null,
    );
    const last = Math.max(
      ...effective.map((id) => p.blocks.findIndex((b) => b.id === id)),
    );
    const next = [...p.blocks];
    next.splice(last >= 0 ? last + 1 : next.length, 0, ...additions);
    p.restore(next.map((b, order) => ({ ...b, order })));
    setIds(additions.map((b) => b.id));
    if (additions[0]) {
      lastSelected.current = additions[0].id;
      p.select(additions[0].id);
    }
    setNotice(
      `${additions.length} élément${additions.length > 1 ? "s collés" : " collé"}.`,
    );
  }
  function pasteText(text: string) {
    try {
      const data = payloadSchema.parse(JSON.parse(text));
      if (data.projectId !== p.projectId) {
        setNotice(
          "Copiez des éléments du même projet pour conserver les personnages et médias.",
        );
        return;
      }
      if (
        data.blocks.some(
          (b) =>
            p.locked.includes(b.type) ||
            (b.type !== "music" && p.locked.includes("video")),
        )
      ) {
        setNotice("Déverrouillez les pistes concernées avant de coller.");
        return;
      }
      insert(data.blocks as SceneBlock[]);
    } catch {
      setNotice("Le presse-papiers ne contient pas de sélection Narra.");
    }
  }
  async function paste() {
    if (!p.editable) return;
    let value = "";
    try {
      value = await navigator.clipboard.readText();
    } catch {
      value = clipboard;
    }
    if (
      live.current.sceneId !== p.sceneId ||
      live.current.blocks !== p.blocks ||
      !live.current.editable
    ) {
      setNotice(
        "Le sous-bloc a changé. Relancez Coller à l’emplacement voulu.",
      );
      return;
    }
    if (
      live.current.sceneId !== p.sceneId ||
      live.current.blocks !== p.blocks ||
      !live.current.editable
    ) {
      setNotice(
        "Le sous-bloc a changé. Relancez Coller à l’emplacement souhaité.",
      );
      return;
    }
    if (!value) value = clipboard;
    pasteText(value);
  }
  function duplicate() {
    if (writable) insert(chosen);
  }
  const actions = useRef({ copy, pasteText, remove, all, duplicate, p });
  actions.current = { copy, pasteText, remove, all, duplicate, p };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const a = actions.current;
      if (isTextTarget(event.target)) return;
      const key = event.key.toLowerCase(),
        mod = event.ctrlKey || event.metaKey;
      if (!a.p.editable && !((mod && key === "c") || (mod && key === "a")))
        return;
      if (mod && ["c", "x", "a", "d", "z"].includes(key)) {
        event.preventDefault();
        if (key === "c" || key === "x") void a.copy(key === "x");
        if (key === "a") a.all();
        if (key === "d") a.duplicate();
        if (key === "z") event.shiftKey ? a.p.redo() : a.p.undo();
      }
      if (["Delete", "Backspace"].includes(event.key)) {
        event.preventDefault();
        a.remove();
      }
    };
    const onPaste = (event: ClipboardEvent) => {
      if (isTextTarget(event.target) || !actions.current.p.editable) return;
      const text = event.clipboardData?.getData("text/plain");
      if (text) {
        event.preventDefault();
        actions.current.pasteText(text);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);
  return {
    ids: effective,
    count: chosen.length,
    writable,
    select,
    all,
    remove,
    copy,
    paste,
    duplicate,
    notice,
    setNotice,
  };
}
