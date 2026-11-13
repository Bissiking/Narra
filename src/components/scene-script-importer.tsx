"use client";

import { useMemo, useState, useRef, useId } from "react";
import Modal from "./ui/modal";
import HelpPopup from "./ui/help-popup";
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
  disabled?: boolean;
}

const BLOCK_LABELS: Record<string, string> = {
  heading: "plans",
  action: "actions",
  dialogue: "dialogues",
  narration: "narrations",
  transition: "transitions",
  note: "notes",
  music: "musiques",
  sfx: "SFX",
};

export default function SceneScriptImporter({
  characters,
  existingBlockCount,
  onImport,
  compact = false,
  disabled = false,
}: SceneScriptImporterProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [copied, setCopied] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  const id = useId();
  function changeSource(value: string) { readVersion.current++; setReading(false); setSource(value); setAssignments({}); setError(null); }
  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { setError("Choisissez un fichier .md, .markdown ou .txt."); return; }
    if (file.size > 2_000_000) { setError("Le fichier dépasse 2 Mo. Importez le script en plusieurs parties."); return; }
    const version = ++readVersion.current;
    setReading(true); setError(null);
    try { const text = await file.text(); if (version === readVersion.current) { setSource(text); setAssignments({}); } }
    catch { if (version === readVersion.current) setError("Impossible de lire ce fichier. Réessayez."); }
    finally { if (version === readVersion.current) setReading(false); }
  }
  const result = useMemo(() => parseSceneScript(source, characters, assignments), [source, characters, assignments]);
  const counts = useMemo(
    () =>
      result.blocks.reduce<Record<string, number>>((total, block) => {
        total[block.type] = (total[block.type] || 0) + 1;
        return total;
      }, {}),
    [result.blocks]
  );

  async function copyPrompt() {
    try { await navigator.clipboard.writeText(buildSceneScriptPrompt(characters)); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("Copie indisponible. Autorisez le presse-papiers dans votre navigateur."); }
  }

  function applyImport() {
    if (!result.blocks.length || reading) return;
    onImport(result.blocks, mode);
    setSource("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`btn-ghost ${compact ? "px-2 py-1 text-xs" : "text-sm"}`}
      >
        Importer
      </button>

      {open && (
        <Modal open={open} onClose={() => setOpen(false)} labelledBy={id}>
          <section
            className="flex max-h-[calc(100dvh-34px)] w-full flex-col"
          >
            <header className="flex items-start justify-between gap-6 border-b border-narra-border px-5 py-4">
              <div>
                <h2 id={id} className="text-lg font-bold">Importer un script</h2>
                <HelpPopup title="Formats d’import"><p>Collez un script ou ouvrez un fichier Markdown (.md) ou texte (.txt). Les titres, dialogues, coupes --- / *** / ___ et balises Narra sont reconnus, y compris dans un même document.</p><p>Vérifiez les personnages et le découpage avant d’importer. Un nom ambigu reste sans personnage jusqu’à votre choix ; le nom source est conservé dans la réplique.</p></HelpPopup>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost min-h-11 min-w-11 px-3" aria-label="Fermer">×</button>
            </header>

            <div className="overflow-y-auto p-5 scrollbar-thin">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <label htmlFor={id+"-source"} className="label mb-0">Script à analyser</label>
                <button type="button" onClick={copyPrompt} className="btn-ghost px-3 py-1.5 text-xs">
                  {copied ? "Prompt copié ✓" : "Copier le prompt pour GPT"}
                </button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <button type="button" className="btn-ghost text-sm" onClick={() => fileInput.current?.click()}>{reading ? "Lecture…" : "Ouvrir un fichier .md / .txt"}</button>
                <input ref={fileInput} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" aria-label="Fichier de script" onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ""; }} />
              </div>
              {error && <p role="alert" className="mb-3 text-sm text-narra-danger">{error}</p>}
              <textarea
                id={id+"-source"}
                value={source}
                onChange={(event) => changeSource(event.target.value)}
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

              {result.speakers.length > 0 && <fieldset className="mt-4 border-t border-narra-border pt-4">
                <legend className="label">Personnages du script</legend>
                <div className="space-y-2">{result.speakers.map(speaker => <label key={speaker.name} className="grid gap-1 text-sm sm:grid-cols-2 sm:items-center"><span className="break-words">{speaker.name}</span><select className="select" aria-label={"Personnage pour "+speaker.name} value={speaker.characterId || ""} onChange={event => setAssignments(current => ({...current, [speaker.name]: event.target.value || null}))}><option value="">Conserver le nom sans association</option>{characters.map(character => <option key={character.id} value={character.id}>{character.alias || [character.firstName, character.lastName].filter(Boolean).join(" ")}</option>)}</select></label>)}</div>
              </fieldset>}
              {result.blocks.length > 0 && <details className="mt-4 border-t border-narra-border pt-3"><summary className="cursor-pointer text-sm">Aperçu du découpage · {result.blocks.length} blocs</summary><ol className="mt-3 max-h-56 space-y-2 overflow-auto text-sm">{result.blocks.map((block, index) => <li key={index} className="border-b border-narra-border pb-2"><strong>{index+1} · {BLOCK_LABELS[block.type]}</strong><p className="whitespace-pre-wrap break-words text-narra-muted">{block.content || block.mediaUrl || "Audio"}</p></li>)}</ol></details>}
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
              <button type="button" onClick={applyImport} disabled={!result.blocks.length || reading} className="btn-primary">
                Importer {result.blocks.length || ""} bloc{result.blocks.length > 1 ? "s" : ""}
              </button>
            </footer>
          </section>
        </Modal>
      )}
    </>
  );
}
