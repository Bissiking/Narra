"use client";

import { useMemo, useState } from "react";
import styles from "./entity-workspace.module.css";

const TASKS = [
  [
    "deepen",
    "Approfondir la fiche",
    "Enrichis cette fiche sans contredire les faits établis. Propose des détails concrets, utiles à l’écriture et non génériques.",
  ],
  [
    "questions",
    "Questions d’auteur",
    "Pose 12 questions précises qui révéleraient les zones faibles, les contradictions ou les possibilités encore inexploitées.",
  ],
  [
    "scenes",
    "Idées de scènes",
    "Propose 8 scènes qui exploitent les tensions internes de cette fiche. Pour chacune : enjeu, conflit, bascule et conséquence.",
  ],
  [
    "continuity",
    "Vérifier la continuité",
    "Analyse la cohérence de cette fiche. Sépare faits établis, ambiguïtés, contradictions possibles et informations manquantes.",
  ],
] as const;

export default function PromptWorkbench({
  kind,
  name,
  context,
  notes,
  onNotesChange,
  onSave,
  saving,
}: {
  kind: string;
  name: string;
  context: Record<string, unknown>;
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [task, setTask] = useState<(typeof TASKS)[number][0]>("deepen");
  const [copied, setCopied] = useState(false);
  const instruction =
    TASKS.find((item) => item[0] === task)?.[2] || TASKS[0][2];
  const prompt = useMemo(
    () =>
      `Tu es un consultant éditorial spécialisé en narration longue.\n\nMISSION\n${instruction}\n\nCONTRAINTES\n- Réponds en français.\n- Ne transforme jamais une hypothèse en fait.\n- Signale clairement toute invention proposée.\n- Respecte le ton, l’époque et les règles déjà présentes.\n\nFICHE — ${kind.toUpperCase()} : ${name}\n${JSON.stringify(context, null, 2)}${notes.trim() ? `\n\nINSTRUCTIONS DE L’AUTEUR\n${notes.trim()}` : ""}`,
    [context, instruction, kind, name, notes],
  );
  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className={styles.promptLayout}>
      <section className={styles.promptControls}>
        <label className="label" htmlFor="prompt-task">
          Travail demandé à GPT
        </label>
        <select
          id="prompt-task"
          className="select"
          value={task}
          onChange={(e) => setTask(e.target.value as typeof task)}
        >
          {TASKS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="label mt-5" htmlFor="prompt-notes">
          Votre prompt ou vos consignes
        </label>
        <textarea
          id="prompt-notes"
          className="textarea"
          rows={12}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Ex. Concentre-toi sur la saison 1. Garde le secret sur Khepri. Le personnage doit rester ambigu…"
        />
        <p className={styles.promptHint}>
          Ces consignes sont sauvegardées dans Narra. Aucun texte n’est envoyé
          automatiquement à un service externe.
        </p>
        <button
          type="button"
          className="btn mt-4"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer les consignes"}
        </button>
      </section>
      <section className={styles.promptOutput}>
        <div className={styles.promptActions}>
          <div>
            <h3>Prompt prêt à utiliser</h3>
            <p className={styles.promptHint}>
              La fiche courante est intégrée automatiquement.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={copy}>
            {copied ? "Copié" : "Copier le prompt"}
          </button>
        </div>
        <pre>{prompt}</pre>
      </section>
    </div>
  );
}
