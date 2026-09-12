export type SceneScriptBlockType =
  | "narration"
  | "dialogue"
  | "action"
  | "transition"
  | "note"
  | "heading";

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
}

export interface SceneScriptParseResult {
  blocks: ParsedSceneScriptBlock[];
  warnings: string[];
  explicitFormat: boolean;
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
    .replace(/^\s*[*_](.+)[*_]\s*$/, "$1")
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

function findCharacter(name: string, characters: SceneScriptCharacter[]) {
  const wanted = normalize(name);
  if (!wanted) return null;
  return characters.find((character) => characterNames(character).includes(wanted)) || null;
}

function emptyBlock(type: SceneScriptBlockType): ParsedSceneScriptBlock {
  return {
    type,
    content: "",
    characterId: null,
    emotion: null,
    position: null,
    speakerNote: null,
  };
}

function parseDialogueMetadata(
  metadata: string,
  characters: SceneScriptCharacter[],
  warnings: Set<string>
) {
  const [rawSpeaker = "", rawEmotion = "", rawPosition = ""] = metadata
    .split("|")
    .map((part) => part.trim());
  const character = findCharacter(rawSpeaker, characters);
  if (rawSpeaker && !character) warnings.add(`Personnage non reconnu : ${rawSpeaker}`);

  return {
    characterId: character?.id || null,
    emotion: rawEmotion || null,
    position: POSITION_ALIASES[normalize(rawPosition)] || null,
    speakerNote: character || !rawSpeaker ? null : rawSpeaker,
  };
}

function parseExplicitFormat(
  lines: string[],
  characters: SceneScriptCharacter[]
): SceneScriptParseResult {
  const blocks: ParsedSceneScriptBlock[] = [];
  const warnings = new Set<string>();
  let current: ParsedSceneScriptBlock | null = null;

  const flush = () => {
    if (!current) return;
    current.content = current.content.trim();
    if (current.content) blocks.push(current);
    current = null;
  };

  for (const line of lines) {
    const match = line.match(
      /^\s*(?:\[\s*(PLAN|SECTION|TITRE|HEADING|ACTION|NARRATION|DIALOGUE|TRANSITION|NOTE)(?::([^\]]*))?\]|@(PLAN|SECTION|TITRE|HEADING|ACTION|NARRATION|DIALOGUE|TRANSITION|NOTE)(?::([^\s]+(?:\|[^\s]+){0,2}))?)\s*(.*)$/i
    );

    if (match) {
      flush();
      const label = normalize(match[1] || match[3]);
      const metadata = (match[2] || match[4] || "").trim();
      current = emptyBlock(TYPE_ALIASES[label]);
      current.content = match[5].trim();
      if (current.type === "dialogue") {
        Object.assign(current, parseDialogueMetadata(metadata, characters, warnings));
      }
      continue;
    }

    if (!current && line.trim()) current = emptyBlock("narration");
    if (current) current.content += `${current.content ? "\n" : ""}${line}`;
  }

  flush();
  return { blocks, warnings: [...warnings], explicitFormat: true };
}

function parseMarkdownFormat(
  lines: string[],
  characters: SceneScriptCharacter[]
): SceneScriptParseResult {
  const blocks: ParsedSceneScriptBlock[] = [];
  const warnings = new Set<string>();
  let paragraph: string[] = [];
  let dialogueCharacter: SceneScriptCharacter | null = null;
  let speakerNote: string | null = null;

  const flush = () => {
    const content = paragraph.join("\n").trim();
    if (content) {
      const block = emptyBlock(dialogueCharacter ? "dialogue" : "action");
      block.content = stripMarkdown(content);
      block.characterId = dialogueCharacter?.id || null;
      block.speakerNote = speakerNote;
      blocks.push(block);
    } else if (speakerNote) {
      blocks.push({ ...emptyBlock("action"), content: speakerNote });
    }
    paragraph = [];
    dialogueCharacter = null;
    speakerNote = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      blocks.push({ ...emptyBlock("heading"), content: stripMarkdown(heading[1]) });
      continue;
    }
    if (/^-{3,}$/.test(trimmed)) {
      flush();
      blocks.push({ ...emptyBlock("transition"), content: "—" });
      continue;
    }
    const boldLine = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (boldLine) {
      flush();
      const label = stripMarkdown(boldLine[1]);
      const character = findCharacter(label, characters);
      if (character) dialogueCharacter = character;
      else if (/^(?:COUPE|CUT|FONDU|FADE)(?:\.|\s|$)/i.test(label))
        blocks.push({ ...emptyBlock("transition"), content: label });
      else blocks.push({ ...emptyBlock("heading"), content: label });
      continue;
    }
    if (!trimmed) {
      if (dialogueCharacter && paragraph.length === 0) continue;
      flush();
      continue;
    }
    if (/^\*[^*].*\*$/.test(trimmed)) {
      if (dialogueCharacter && paragraph.length === 0) {
        speakerNote = stripMarkdown(trimmed).replace(/^\(|\)$/g, "");
        continue;
      }
      flush();
      blocks.push({ ...emptyBlock("action"), content: stripMarkdown(trimmed) });
      continue;
    }
    paragraph.push(line);
  }

  flush();
  return { blocks, warnings: [...warnings], explicitFormat: false };
}

export function parseSceneScript(
  source: string,
  characters: SceneScriptCharacter[]
): SceneScriptParseResult {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const hasDirectives = lines.some((line) =>
    /^\s*(?:\[\s*(?:PLAN|SECTION|TITRE|HEADING|ACTION|NARRATION|DIALOGUE|TRANSITION|NOTE)(?::|\s*\])|@(?:PLAN|SECTION|TITRE|HEADING|ACTION|NARRATION|DIALOGUE|TRANSITION|NOTE)\b)/i.test(line)
  );
  return hasDirectives
    ? parseExplicitFormat(lines, characters)
    : parseMarkdownFormat(lines, characters);
}

export function buildSceneScriptPrompt(characters: SceneScriptCharacter[]) {
  const names = characters
    .map((character) => character.alias || [character.firstName, character.lastName].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");

  return `Transforme ou écris la scène suivante au format Narra. Réponds uniquement avec les blocs, sans Markdown ni explication.

Balises autorisées :
[PLAN] Nouveau cadrage, décor ou moment
[ACTION] Action visible ou indication de mise en scène
[NARRATION] Texte du narrateur
[DIALOGUE:PERSONNAGE|emotion|position] Réplique
[TRANSITION] Transition visuelle
[NOTE] Note de production

Règles :
- Commence un nouveau [PLAN] chaque fois que le cadrage, le lieu, le temps ou le point de vue visuel change.
- Utilise uniquement left, center ou right pour la position.
- L'émotion est facultative et doit être : neutral, happy, sad, angry, surprised ou worried. La position est facultative.
- Une balise peut contenir plusieurs lignes jusqu'à la balise suivante.
- N'invente pas de nom de personnage.
${names ? `- Personnages disponibles : ${names}.` : "- Aucun personnage n'est encore enregistré dans Narra."}

Scène à transformer :
`;
}
