import { getProjectFormat } from "@/lib/editor-profiles";

export const NARRATIVE_NODE_TYPES = [
  { value: "saga", label: "Saga" },
  { value: "cycle", label: "Cycle" },
  { value: "season", label: "Saison" },
  { value: "volume", label: "Volume" },
  { value: "book", label: "Livre / Tome" },
  { value: "part", label: "Partie" },
  { value: "episode", label: "Épisode" },
  { value: "prologue", label: "Prologue" },
  { value: "interlude", label: "Interlude" },
  { value: "epilogue", label: "Épilogue" },
  { value: "issue", label: "Numéro" },
  { value: "act", label: "Acte" },
  { value: "sequence", label: "Séquence" },
  { value: "chapter", label: "Chapitre" },
  { value: "section", label: "Section" },
  { value: "page", label: "Page" },
  { value: "arc", label: "Arc narratif" },
  { value: "route", label: "Route / Branche" },
  { value: "block", label: "Bloc" },
  { value: "custom", label: "Personnalisé" },
] as const;

export type NarrativeNodeType = (typeof NARRATIVE_NODE_TYPES)[number]["value"];

export const NARRATIVE_NODE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  NARRATIVE_NODE_TYPES.map(({ value, label }) => [value, label])
);

const ROOT_TYPES: NarrativeNodeType[] = [
  "saga",
  "cycle",
  "season",
  "volume",
  "book",
  "part",
  "prologue",
  "interlude",
  "epilogue",
  "act",
  "chapter",
  "arc",
  "route",
  "custom",
];

const SUGGESTED_CHILDREN: Partial<Record<NarrativeNodeType, NarrativeNodeType[]>> = {
  saga: ["cycle", "season", "volume", "book", "arc", "custom"],
  cycle: ["season", "volume", "book", "arc", "custom"],
  season: ["prologue", "episode", "interlude", "epilogue", "arc", "part", "volume", "custom"],
  volume: ["part", "chapter", "act", "issue", "arc", "custom"],
  book: ["part", "chapter", "act", "arc", "custom"],
  part: ["chapter", "act", "episode", "section", "interlude", "arc", "custom"],
  episode: ["prologue", "part", "act", "sequence", "chapter", "interlude", "epilogue", "arc", "custom"],
  issue: ["chapter", "page", "section", "custom"],
  act: ["sequence", "chapter", "section", "block", "custom"],
  sequence: ["section", "block", "custom"],
  chapter: ["section", "block", "custom"],
  section: ["block", "custom"],
  page: ["block", "custom"],
  arc: ["part", "episode", "act", "chapter", "sequence", "custom"],
  route: ["prologue", "part", "episode", "act", "chapter", "interlude", "epilogue", "arc", "custom"],
  prologue: ["part", "act", "sequence", "chapter", "section", "block", "custom"],
  interlude: ["part", "act", "sequence", "chapter", "section", "block", "custom"],
  epilogue: ["part", "act", "sequence", "chapter", "section", "block", "custom"],
  block: ["custom"],
  custom: NARRATIVE_NODE_TYPES.map(({ value }) => value),
};

export function getSuggestedNarrativeTypes(parentType?: string | null): NarrativeNodeType[] {
  if (!parentType) return ROOT_TYPES;
  return SUGGESTED_CHILDREN[parentType as NarrativeNodeType] || ["custom"];
}

export function getDefaultNarrativeType(parentType?: string | null): NarrativeNodeType {
  return getSuggestedNarrativeTypes(parentType)[0] || "custom";
}

export function getNarrativeTypesForProject(
  projectType: string,
  parentType?: string | null
): NarrativeNodeType[] {
  const allowed = getProjectFormat(projectType).structure.nodeTypes as NarrativeNodeType[];
  const contextual = getSuggestedNarrativeTypes(parentType).filter((type) => allowed.includes(type));
  return contextual.length > 0 ? contextual : allowed;
}

export function getDefaultNarrativeTypeForProject(
  projectType: string,
  parentType?: string | null
): NarrativeNodeType {
  return getNarrativeTypesForProject(projectType, parentType)[0] || "custom";
}
