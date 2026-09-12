"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildSceneScriptPrompt,
  parseSceneScript,
  ParsedSceneScriptBlock,
  SceneScriptCharacter,
} from "@/lib/scene-script-parser";

interface SceneScriptImporterProps {
  characters: SceneScriptCharacter[];
  existingBlockCount: number;
  onImport: (blocks: ParsedSceneScriptBlock[], mode: "append" | "replace") => void;
  compact?: boolean;
}

const BLOCK_LABELS: Record<string, string> = {
  heading: "plans",
  action: "actions",
  dialogue: "dialogues",
  narration: "narrations",
  transition: "transitions",
  note: "notes",
};

export default function SceneScriptImporter({
  characters,
  existingBlockCount,
  onImport,
  compact = false,
}: SceneScriptImporterProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => parseSceneScript(source, characters), [source, characters]);
  const counts = useMemo(
    () =>
      result.blocks.reduce<Record<string, number>>((total, block) => {
        total[block.type] = (total[block.type] || 0) + 1;
        return total;
      }, {}),
    [result.blocks]
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(buildSceneScriptPrompt(characters));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function applyImport() {
    if (!result.blocks.length) return;
    onImport(result.blocks, mode);
    setSource("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-ghost ${compact ? "px-2 py-1 text-xs" : "text-sm"}`}
      >
        Importer
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="script-import-title"
            className="card flex max-h-[92vh] w-full max-w-3xl flex-col border-t-2 border-t-narra-accent shadow-2xl sm:max-h-[86vh]"
          >
            <header className="flex items-start justify-between gap-6 border-b border-narra-border px-5 py-4">
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-narra-accent">Découpage automatique</p>
                <h2 id="script-import-title" className="text-lg font-bold">Importer un script GPT</h2>
                <p className="mt-1 max-w-xl text-sm text-narra-muted">
                  Collez le texte balisé. Chaque changement de plan devient une section du visual novel.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost min-h-11 min-w-11 px-3" aria-label="Fermer">×</button>
            </header>

            <div className="overflow-y-auto p-5 scrollbar-thin">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="script-import-source" className="label mb-0">Script à analyser</label>
                <button type="button" onClick={copyPrompt} className="btn-ghost px-3 py-1.5 text-xs">
                  {copied ? "Prompt copié ✓" : "Copier le prompt pour GPT"}
                </button>
              </div>
              <textarea
                id="script-import-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="textarea min-h-64 font-mono text-xs leading-6 focus:border-narra-accent"
                placeholder={`[PLAN] INT. BUREAU — JOUR\n[ACTION] Soren ouvre la porte.\n[DIALOGUE:SOREN|worried|left] Ça commence bien.`}
                autoFocus
              />

              <div className="mt-4 border-l-2 border-narra-accent bg-narra-accent/5 px-4 py-3">
                {source.trim() ? (
                  <>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <strong>{result.blocks.length} blocs détectés</strong>
                      {Object.entries(counts).map(([type, count]) => (
                        <span key={type} className="text-narra-muted">{count} {BLOCK_LABELS[type]}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-narra-muted">
                      Format {result.explicitFormat ? "Narra balisé" : "Markdown détecté automatiquement"}.
                    </p>
                    {result.warnings.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-amber-500" aria-live="polite">
                        {result.warnings.map((warning) => <li key={warning}>⚠ {warning}</li>)}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-narra-muted">
                    Balises : <span className="font-mono text-narra-text">[PLAN]</span>, <span className="font-mono text-narra-text">[ACTION]</span>, <span className="font-mono text-narra-text">[DIALOGUE:NOM|emotion|position]</span>, <span className="font-mono text-narra-text">[NARRATION]</span>.
                  </p>
                )}
              </div>

              {existingBlockCount > 0 && (
                <fieldset className="mt-4">
                  <legend className="label">Destination</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className={`cursor-pointer border p-3 text-sm ${mode === "append" ? "border-narra-accent bg-narra-accent/5" : "border-narra-border"}`}>
                      <input type="radio" name="import-mode" value="append" checked={mode === "append"} onChange={() => setMode("append")} className="mr-2 accent-amber-500" />
                      Ajouter à la suite
                    </label>
                    <label className={`cursor-pointer border p-3 text-sm ${mode === "replace" ? "border-narra-accent bg-narra-accent/5" : "border-narra-border"}`}>
                      <input type="radio" name="import-mode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} className="mr-2 accent-amber-500" />
                      Remplacer les blocs actuels
                    </label>
                  </div>
                </fieldset>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-narra-border px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Annuler</button>
              <button type="button" onClick={applyImport} disabled={!result.blocks.length} className="btn-primary">
                Importer {result.blocks.length || ""} bloc{result.blocks.length > 1 ? "s" : ""}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
