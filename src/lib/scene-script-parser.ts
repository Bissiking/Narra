export type SceneScriptBlockType =
  | "narration"
  | "dialogue"
  | "action"
  | "transition"
  | "note"
  | "heading"
  | "music"
  | "sfx";

export interface SceneScriptCharacter {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
}

export interface ParsedSceneScriptBlock {
  type: SceneScriptBlockType;
  content: string;
  characterId: string | null;
  emotion: string | null;
  position: "left" | "center" | "right" | null;
  speakerNote: string | null;
  mediaUrl: string | null;
  showPortrait: boolean | null;
  portraitImageUrl: string | null;
  audioAction: "play" | "stop" | null;
  volume: number | null;
  fadeDuration: number | null;
  loop: boolean | null;
}

export interface SceneScriptParseResult {
  blocks: ParsedSceneScriptBlock[];
  warnings: string[];
  explicitFormat: boolean;
  speakers: { name: string; characterId: string | null }[];
}

const TYPE_ALIASES: Record<string, SceneScriptBlockType> = {
  PLAN: "heading",
  SECTION: "heading",
  TITRE: "heading",
  HEADING: "heading",
  ACTION: "action",
  NARRATION: "narration",
  DIALOGUE: "dialogue",
  TRANSITION: "transition",
  NOTE: "note",
  MUSIQUE: "music",
  MUSIC: "music",
  SFX: "sfx",
  SON: "sfx",
};

const POSITION_ALIASES: Record<string, "left" | "center" | "right"> = {
  LEFT: "left",
  GAUCHE: "left",
  CENTER: "center",
  CENTRE: "center",
  RIGHT: "right",
  DROITE: "right",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function stripMarkdown(value: string) {
  return value
    .replace(/^\s*(?:\*\*|__|\*|_)(.*?)(?:\*\*|__|\*|_)\s*$/, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
}

function characterNames(character: SceneScriptCharacter) {
  return [
    character.alias,
    character.firstName,
    [character.firstName, character.lastName].filter(Boolean).join(" "),
    character.lastName,
  ]
    .filter((name): name is string => Boolean(name?.trim()))
    .map(normalize);
}

export function matchScriptCharacter(name: string, characters: SceneScriptCharacter[]) {
  const wanted = normalize(name);
  if (!wanted) return null;
  // Full names and aliases take precedence over ambiguous first/last names.
  const exact = characters.filter(character => [character.alias, [character.firstName, character.lastName].filter(Boolean).join(" ")].some(value => value && normalize(value) === wanted));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const matches = characters.filter(character => characterNames(character).includes(wanted));
  return matches.length === 1 ? matches[0] : null;
}

function emptyBlock(type: SceneScriptBlockType): ParsedSceneScriptBlock {
  return {
    type,
    content: "",
    characterId: null,
    emotion: null,
    position: null,
    speakerNote: null,
    mediaUrl: null,
    showPortrait: null,
    portraitImageUrl: null,
    audioAction: type === "music" ? "play" : null,
    volume: type === "music" || type === "sfx" ? 100 : null,
    fadeDuration: type === "music" ? 1 : null,
    loop: type === "music" ? true : null,
  };
}

function applyAudioMetadata(block: ParsedSceneScriptBlock, metadata: string, warnings: Set<string>) {
  const parts = metadata.split("|").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const normalized = normalize(part);
    if (["STOP", "ARRET", "ARRETER"].includes(normalized)) block.audioAction = "stop";
    else if (["PLAY", "LIRE", "START"].includes(normalized)) block.audioAction = "play";
    else if (normalized === "LOOP" || normalized === "BOUCLE") block.loop = true;
    else if (/^VOLUME=/i.test(part)) block.volume = Math.max(0, Math.min(100, Number(part.split("=")[1]) || 0));
    else if (/^FADE=/i.test(part)) block.fadeDuration = Math.max(0, Math.min(30, Number(part.split("=")[1]) || 0));
    else if (part.startsWith("/uploads/") || /^https?:\/\//i.test(part)) block.mediaUrl = part;
    else if (!block.content) {
      block.content = part;
      warnings.add(`Sélectionnez le fichier audio correspondant à « ${part} » après l'import.`);
    }
  }
}

const DIRECTIVE = /^\s*(?:\[\s*(PLAN|SECTION|TITRE|HEADING|ACTION|NARRATION|DIALOGUE|TRANSITION|NOTE|MUSIQUE|MUSIC|SFX|SON)(?::([^\]]*))?\]|@(PLAN|SECTION|TITRE|HEADING|ACTION|NARRATION|DIALOGUE|TRANSITION|NOTE|MUSIQUE|MUSIC|SFX|SON)(?::([^\s]+(?:\|[^\s]+)*))?)\s*(.*)$/i;
const isCut = (line: string) => /^(?:-{3,}|(?:\*\s*){3,}|(?:_\s*){3,}|[—–]{3,})$/.test(line);

/** Mixed Markdown/Narra input, with explicit, reviewable character assignments. */
export function parseSceneScript(
  source: string,
  characters: SceneScriptCharacter[],
  assignments: Record<string, string | null> = {},
): SceneScriptParseResult {
  let lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  // A YAML header is metadata, while ordinary --- cuts remain narrative transitions.
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (end > 1 && lines.slice(1, end).every(line => !line.trim() || /^[\w-]+:/.test(line))) lines = lines.slice(end + 1);
  }
  const blocks: ParsedSceneScriptBlock[] = [];
  const warnings = new Set<string>();
  const speakers = new Map<string, string | null>();
  let current: ParsedSceneScriptBlock | null = null;
  let explicit = false;
  const explicitFormat = lines.some(line => DIRECTIVE.test(line));
  const flush = () => {
    if (current) {
      current.content = stripMarkdown(current.content);
      if (current.content || ["music", "sfx"].includes(current.type)) blocks.push(current);
    }
    current = null; explicit = false;
  };
  const dialogue = (raw: string, content = "", emotion = "", position = "") => {
    flush();
    const note = raw.match(/\s*\(([^)]+)\)\s*$/);
    const name = stripMarkdown(raw.replace(/\s*\([^)]+\)\s*$/, "")).replace(/[:：]$/, "").trim();
    const character = Object.prototype.hasOwnProperty.call(assignments, name)
      ? characters.find(c => c.id === assignments[name]) || null
      : matchScriptCharacter(name, characters);
    if (name) {
      speakers.set(name, character?.id || null);
      if (!character) warnings.add(`Personnage à associer : ${name}`);
    }
    current = { ...emptyBlock("dialogue"), content, characterId: character?.id || null,
      speakerNote: [!character ? name : "", note?.[1]].filter(Boolean).join(" · ") || null,
      emotion: emotion || null, position: POSITION_ALIASES[normalize(position)] || null };
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].replace(/^\s*(?:>\s*)+/, ""), trimmed = line.trim();
    // Ignore code fences often wrapped around generated scripts, keep their content.
    if (/^(?:`{3,}|~{3,})(?:[\w-]+)?\s*$/.test(trimmed)) { flush(); continue; }
    const directive = trimmed.match(DIRECTIVE);
    if (directive) {
      flush();
      const type = TYPE_ALIASES[normalize(directive[1] || directive[3])];
      const metadata = (directive[2] || directive[4] || "").trim();
      if (type === "dialogue") {
        const [name = "", emotion = "", position = ""] = metadata.split("|").map(part => part.trim());
        dialogue(name, directive[5], emotion, position);
      } else {
        current = { ...emptyBlock(type), content: directive[5] };
        if (type === "music" || type === "sfx") applyAudioMetadata(current, metadata, warnings);
      }
      explicit = true; continue;
    }
    if (isCut(trimmed)) { flush(); blocks.push({ ...emptyBlock("transition"), content: "—" }); continue; }
    const heading = trimmed.match(/^#{1,6}\s+(.+?)(?:\s+#+)?$/);
    if (heading) { flush(); blocks.push({ ...emptyBlock("heading"), content: stripMarkdown(heading[1]) }); continue; }
    if (trimmed && /^\s*={3,}\s*$/.test(lines[index + 1] || "")) {
      flush(); blocks.push({ ...emptyBlock("heading"), content: stripMarkdown(trimmed) }); index++; continue;
    }
    if (!trimmed) {
      if (!explicit && current?.content.trim()) flush();
      else if (explicit && current) current.content += "\n";
      continue;
    }
    if (/^(?:COUPE|CUT|FONDU|FADE)(?:[ .:：]|$)/i.test(stripMarkdown(trimmed))) {
      flush(); blocks.push({ ...emptyBlock("transition"), content: stripMarkdown(trimmed) }); continue;
    }
    const bold = trimmed.match(/^(?:\*\*|__)(.+?)(?:\*\*|__)(?:[:：]\s*(.*))?$/);
    const speakerLine = trimmed.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1");
    const inline = speakerLine.match(/^(?:[-—–]\s*)?(?:\*\*|__)?([^:：]{1,80}?)(?:\*\*|__)?[:：]\s*(.*)$/);
    const label = stripMarkdown((bold?.[1] || inline?.[1] || trimmed).replace(/[:：]$/, ""));
    const name = label.replace(/\s*\([^)]+\)$/, "");
    const known = !!matchScriptCharacter(name, characters) || Object.prototype.hasOwnProperty.call(assignments, name);
    const upperName = name.length <= 80 && /[A-ZÀ-ÖØ-Þ]/.test(name) && name === name.toLocaleUpperCase("fr") && !/[.!?]/.test(name);
    const properName = /^[\p{Lu}][\p{Ll}’'’-]+(?:\s+[\p{Lu}][\p{Ll}’'’-]+){0,3}$/u.test(name);
    const followingText = lines.slice(index + 1).find(value => value.trim());
    const bareSpeaker = upperName && name.split(/\s+/).length <= 4 && !/^(?:PLAN|SCENE|CHAPITRE|EPISODE|PARTIE|NOTE|ACTION|NARRATION)\b/i.test(normalize(name)) && followingText && !isCut(followingText.trim()) && !/^#/.test(followingText);
    if (bold || (inline && (known || upperName || properName)) || (known && !inline) || (!inline && bareSpeaker)) {
      if (bold && !known && !upperName && !properName && bold[2] === undefined) {
        flush(); blocks.push({ ...emptyBlock("heading"), content: label });
      } else dialogue(label, bold ? bold[2] || "" : inline?.[2] || "");
      continue;
    }
    if (/^\*[^*].*\*$/.test(trimmed) && current?.type === "dialogue" && !current.content) {
      current.speakerNote = [current.speakerNote, stripMarkdown(trimmed).replace(/^\(|\)$/g, "")].filter(Boolean).join(" · "); continue;
    }
    if (/^\*[^*].*\*$/.test(trimmed) && !explicit) {
      flush(); blocks.push({ ...emptyBlock("action"), content: stripMarkdown(trimmed) }); continue;
    }
    if (!current) current = emptyBlock(explicitFormat ? "narration" : "action");
    current.content += (current.content ? "\n" : "") + line;
  }
  flush();
  return { blocks, warnings: [...warnings], explicitFormat, speakers: [...speakers].map(([name, characterId]) => ({ name, characterId })) };
}

export function buildSceneScriptPrompt(characters: SceneScriptCharacter[]) {
  const names = characters
    .map((character) => character.alias || [character.firstName, character.lastName].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");

  return `Transforme ou écris la scène suivante au format Visual Novel vertical de Narra. Réponds uniquement avec les blocs, sans Markdown ni explication.

Balises autorisées :
[PLAN] Intertitre court ouvrant un nouveau plan visuel
[ACTION] Mouvement ou indication visible, affiché en petites capitales grises
[NARRATION] Description ou liaison narrative, affichée en texte blanc
[DIALOGUE:PERSONNAGE|emotion|position] Réplique
[TRANSITION] Transition visuelle
[NOTE] Note de production
[MUSIQUE:nom-ou-URL|play|volume=70|fade=2|loop] Démarre ou remplace la musique
[MUSIQUE:stop|fade=2] Arrête la musique ; sans nouveau bloc, elle continue
[SFX:nom-ou-URL|volume=90] Joue un effet sonore une fois

Règles :
- La scène se lit verticalement sur un décor de fond : plusieurs actions, narrations et dialogues peuvent appartenir au même plan.
- Commence un nouveau [PLAN] uniquement lors d'un changement visuel significatif : nouveau cadrage, nouvelle zone du décor, ellipse, entrée dans une autre pièce ou nette évolution de la tension.
- Le texte d'un [PLAN] décrit brièvement la composition visible, par exemple : « Au bout du couloir, face à la porte du Bureau du Commandement. »
- Garde les [ACTION] brèves, concrètes et directement visibles. N'y place ni explication ni résumé de dialogue.
- Utilise [NARRATION] pour les descriptions développées et les liaisons qui ne sont pas prononcées par un personnage.
- Utilise [DIALOGUE] pour toute phrase réellement prononcée, même si elle pourrait être reformulée indirectement.
- Utilise uniquement left, center ou right pour la position.
- L'émotion est facultative et doit être : neutral, happy, sad, angry, surprised ou worried. La position est facultative.
- Une balise peut contenir plusieurs lignes jusqu'à la balise suivante.
- Pour un nom audio sans URL, Narra demandera de choisir le fichier correspondant après l'import.
- N'invente pas de nom de personnage.
${names ? `- Personnages disponibles : ${names}.` : "- Aucun personnage n'est encore enregistré dans Narra."}

Scène à transformer :
`;
}
