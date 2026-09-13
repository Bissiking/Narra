export type EditorBlockType =
  | "narration"
  | "dialogue"
  | "action"
  | "heading"
  | "transition"
  | "note"
  | "background"
  | "music"
  | "sfx";

export type EditorProfile = {
  key: "manuscript" | "screenplay" | "comic" | "visualNovel" | "universe";
  label: string;
  description: string;
  unit: [singular: string, plural: string];
  blocks: { value: EditorBlockType; label: string; shortLabel: string }[];
};

export type ProjectFormat = {
  label: string;
  content: {
    singular: string;
    plural: string;
    definite: string;
    indefinite: string;
    ofDefinite: string;
    newLabel: string;
    emptyLabel: string;
    recentLabel: string;
    titlePlaceholder: string;
  };
  structure: {
    title: string;
    description: string;
    emptyHint: string;
    titlePlaceholder: string;
    nodeTypes: string[];
  };
  nav: {
    read: string;
    edit: string;
    structure: string;
    lore: string;
    timeline: string;
    analysis: string;
    presentation: string;
  };
  presentation: {
    title: string;
    fallbackPitch: string;
    action: string;
  };
};

const formats: Record<string, ProjectFormat> = {
  story: {
    label: "Histoire",
    content: { singular: "passage", plural: "passages", definite: "le passage", indefinite: "un passage", ofDefinite: "du passage", newLabel: "Nouveau passage", emptyLabel: "Aucun passage", recentLabel: "Passages récents", titlePlaceholder: "Ex. L’arrivée", },
    structure: {
      title: "Trame narrative",
      description: "Organisez le récit en parties, chapitres et arcs narratifs.",
      emptyHint: "Commencez par une partie, un chapitre ou un arc narratif.",
      titlePlaceholder: "Ex. Partie I — Le départ",
      nodeTypes: ["part", "chapter", "section", "arc", "block", "custom"],
    },
    nav: { read: "Lire", edit: "Écrire", structure: "Trame", lore: "Univers", timeline: "Chronologie", analysis: "Analyse du texte", presentation: "Page du récit" },
    presentation: { title: "Page du récit", fallbackPitch: "Ajoutez une accroche pour présenter votre histoire.", action: "Commencer l’histoire" },
  },
  novel: {
    label: "Roman",
    content: { singular: "passage", plural: "passages", definite: "le passage", indefinite: "un passage", ofDefinite: "du passage", newLabel: "Nouveau passage", emptyLabel: "Aucun passage", recentLabel: "Passages récents", titlePlaceholder: "Ex. Chapitre 1 — Le départ" },
    structure: {
      title: "Plan du roman",
      description: "Composez le manuscrit en tomes, parties, chapitres et sections.",
      emptyHint: "Commencez par un tome, une partie ou un chapitre.",
      titlePlaceholder: "Ex. Chapitre 1 — Le départ",
      nodeTypes: ["cycle", "volume", "book", "part", "chapter", "section", "arc", "block", "custom"],
    },
    nav: { read: "Lire", edit: "Manuscrit", structure: "Plan du roman", lore: "Univers", timeline: "Chronologie", analysis: "Analyse du texte", presentation: "Page du livre" },
    presentation: { title: "Page du livre", fallbackPitch: "Ajoutez une accroche pour présenter votre roman.", action: "Commencer la lecture" },
  },
  screenplay: {
    label: "Scénario",
    content: { singular: "scène", plural: "scènes", definite: "la scène", indefinite: "une scène", ofDefinite: "de la scène", newLabel: "Nouvelle scène", emptyLabel: "Aucune scène", recentLabel: "Scènes récentes", titlePlaceholder: "Ex. INT. COULOIR — NUIT" },
    structure: {
      title: "Découpage du scénario",
      description: "Structurez le scénario en actes, séquences et scènes de travail.",
      emptyHint: "Commencez par un acte ou une séquence.",
      titlePlaceholder: "Ex. Acte I — Mise en place",
      nodeTypes: ["act", "sequence", "section", "block", "custom"],
    },
    nav: { read: "Lire", edit: "Scénario", structure: "Découpage", lore: "Bible", timeline: "Continuité", analysis: "Analyse du script", presentation: "Page du scénario" },
    presentation: { title: "Page du scénario", fallbackPitch: "Ajoutez une logline pour présenter votre scénario.", action: "Lire le scénario" },
  },
  comic: {
    label: "Bande dessinée",
    content: { singular: "planche", plural: "planches", definite: "la planche", indefinite: "une planche", ofDefinite: "de la planche", newLabel: "Nouvelle planche", emptyLabel: "Aucune planche", recentLabel: "Planches récentes", titlePlaceholder: "Ex. Planche 01" },
    structure: {
      title: "Découpage de la BD",
      description: "Organisez la bande dessinée en volumes, numéros, chapitres et pages.",
      emptyHint: "Commencez par un volume, un numéro ou un chapitre.",
      titlePlaceholder: "Ex. Tome 1 — L’éveil",
      nodeTypes: ["cycle", "volume", "issue", "chapter", "sequence", "page", "block", "custom"],
    },
    nav: { read: "Lire", edit: "Planches", structure: "Découpage", lore: "Univers", timeline: "Chronologie", analysis: "Analyse des textes", presentation: "Page de la BD" },
    presentation: { title: "Page de la BD", fallbackPitch: "Ajoutez une accroche pour présenter votre bande dessinée.", action: "Découvrir la BD" },
  },
  vn: {
    label: "Visual Novel",
    content: { singular: "scène", plural: "scènes", definite: "la scène", indefinite: "une scène", ofDefinite: "de la scène", newLabel: "Nouvelle scène", emptyLabel: "Aucune scène", recentLabel: "Scènes récentes", titlePlaceholder: "Ex. Couloir — Première rencontre" },
    structure: {
      title: "Routes et embranchements",
      description: "Construisez les routes, actes et séquences de votre récit interactif.",
      emptyHint: "Commencez par une route, un acte ou une séquence.",
      titlePlaceholder: "Ex. Route de Soren",
      nodeTypes: ["route", "act", "chapter", "sequence", "section", "arc", "block", "custom"],
    },
    nav: { read: "Jouer", edit: "Mise en scène", structure: "Routes", lore: "Univers", timeline: "Chronologie", analysis: "Analyse des dialogues", presentation: "Page du VN" },
    presentation: { title: "Page du Visual Novel", fallbackPitch: "Ajoutez une accroche pour présenter votre Visual Novel.", action: "Commencer l’histoire" },
  },
  universe: {
    label: "Univers narratif",
    content: { singular: "article", plural: "articles", definite: "l’article", indefinite: "un article", ofDefinite: "de l’article", newLabel: "Nouvel article", emptyLabel: "Aucun article", recentLabel: "Articles récents", titlePlaceholder: "Ex. Les cités orbitales" },
    structure: {
      title: "Sommaire de l’univers",
      description: "Classez les dossiers, chapitres et sections qui documentent votre monde.",
      emptyHint: "Commencez par un dossier, un chapitre ou une section.",
      titlePlaceholder: "Ex. Géographie et territoires",
      nodeTypes: ["book", "part", "chapter", "section", "block", "custom"],
    },
    nav: { read: "Consulter", edit: "Articles", structure: "Sommaire", lore: "Fiches d’univers", timeline: "Chronologie", analysis: "Analyse du corpus", presentation: "Page de l’univers" },
    presentation: { title: "Page de l’univers", fallbackPitch: "Ajoutez une accroche pour présenter votre univers.", action: "Explorer l’univers" },
  },
};

const profiles: Record<string, EditorProfile> = {
  story: {
    key: "manuscript",
    label: "Écriture narrative",
    description: "Une page continue pour privilégier le rythme du récit.",
    unit: ["passage", "passages"],
    blocks: [
      { value: "narration", label: "Paragraphe", shortLabel: "Paragraphe" },
      { value: "dialogue", label: "Dialogue", shortLabel: "Dialogue" },
      { value: "heading", label: "Intertitre", shortLabel: "Intertitre" },
      { value: "transition", label: "Séparateur", shortLabel: "Séparateur" },
      { value: "note", label: "Note interne", shortLabel: "Note" },
    ],
  },
  novel: {
    key: "manuscript",
    label: "Manuscrit",
    description: "Une composition sobre centrée sur la prose longue.",
    unit: ["passage", "passages"],
    blocks: [
      { value: "narration", label: "Paragraphe", shortLabel: "Paragraphe" },
      { value: "dialogue", label: "Dialogue", shortLabel: "Dialogue" },
      { value: "heading", label: "Intertitre", shortLabel: "Intertitre" },
      { value: "transition", label: "Saut de scène", shortLabel: "Saut" },
      { value: "note", label: "Note interne", shortLabel: "Note" },
    ],
  },
  screenplay: {
    key: "screenplay",
    label: "Scénario",
    description: "Plans, actions et dialogues suivent les conventions du script.",
    unit: ["élément", "éléments"],
    blocks: [
      { value: "heading", label: "En-tête de scène", shortLabel: "Scène" },
      { value: "action", label: "Action", shortLabel: "Action" },
      { value: "dialogue", label: "Dialogue", shortLabel: "Dialogue" },
      { value: "transition", label: "Transition", shortLabel: "Transition" },
      { value: "note", label: "Note interne", shortLabel: "Note" },
    ],
  },
  comic: {
    key: "comic",
    label: "Découpage BD",
    description: "Chaque bloc décrit ce que le lecteur voit ou lit dans une case.",
    unit: ["case", "cases"],
    blocks: [
      { value: "action", label: "Description de case", shortLabel: "Case" },
      { value: "narration", label: "Cartouche", shortLabel: "Cartouche" },
      { value: "dialogue", label: "Bulle", shortLabel: "Bulle" },
      { value: "heading", label: "Titre de séquence", shortLabel: "Séquence" },
      { value: "note", label: "Note interne", shortLabel: "Note" },
    ],
  },
  vn: {
    key: "visualNovel",
    label: "Mise en scène VN",
    description: "Texte, personnages, décors et son sont pilotés passage par passage.",
    unit: ["temps", "temps"],
    blocks: [
      { value: "dialogue", label: "Dialogue", shortLabel: "Dialogue" },
      { value: "action", label: "Action", shortLabel: "Action" },
      { value: "heading", label: "Écran-titre", shortLabel: "Titre" },
      { value: "background", label: "Arrière-plan", shortLabel: "Fond" },
      { value: "music", label: "Musique", shortLabel: "Musique" },
      { value: "sfx", label: "Effet sonore", shortLabel: "SFX" },
      { value: "note", label: "Note interne", shortLabel: "Note" },
    ],
  },
  universe: {
    key: "universe",
    label: "Dossier d’univers",
    description: "Des sections structurées pour exposer les règles et éléments du monde.",
    unit: ["section", "sections"],
    blocks: [
      { value: "heading", label: "Section", shortLabel: "Section" },
      { value: "narration", label: "Texte", shortLabel: "Texte" },
      { value: "note", label: "Note interne", shortLabel: "Note" },
    ],
  },
};

export function getEditorProfile(projectType: string) {
  return profiles[projectType] || profiles.story;
}

export function getProjectFormat(projectType: string) {
  return formats[projectType] || formats.story;
}

export const fallbackBlockLabels: Record<EditorBlockType, string> = {
  narration: "Narration",
  dialogue: "Dialogue",
  action: "Action",
  heading: "Titre / plan",
  transition: "Transition",
  note: "Note",
  background: "Arrière-plan",
  music: "Musique",
  sfx: "SFX",
};
