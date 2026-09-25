import { z } from "zod";

const imageUrlField = z
  .string()
  .max(2000)
  .refine(
    (v) => v.startsWith("/uploads/") || z.string().url().safeParse(v).success,
    "URL d'image invalide",
  );

// ============================================================
// PROJECT
// ============================================================

export const ProjectStatus = z.enum([
  "idea",
  "writing",
  "paused",
  "completed",
  "archived",
]);

export const ProjectType = z.enum([
  "story",
  "novel",
  "screenplay",
  "vn",
  "comic",
  "universe",
]);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  description: z.string().max(5000).optional(),
  type: ProjectType.default("story"),
  status: ProjectStatus.default("idea"),
  genres: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// ============================================================
// NARRATIVE NODE
// ============================================================

export const createNarrativeNodeSchema = z.object({
  parentId: z.string().uuid().nullish(),
  type: z.string().min(1, "Le type est requis"),
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(5000).nullish(),
  order: z.number().int().min(0).default(0),
});

export const updateNarrativeNodeSchema = createNarrativeNodeSchema.partial();

// ============================================================
// SCENE
// ============================================================

export const SceneStatus = z.enum(["draft", "writing", "review", "final"]);

export const createSceneSchema = z.object({
  nodeId: z.string().uuid().optional(),
  title: z.string().min(1, "Le titre est requis").max(200),
  status: SceneStatus.default("draft"),
  order: z.number().int().min(0).default(0),
  notes: z.string().max(10000).optional(),
  locationId: z.string().uuid().optional(),
  characterIds: z.array(z.string().uuid()).optional(),
});

export const updateSceneSchema = createSceneSchema.partial();

// ============================================================
// SCENE BLOCK
// ============================================================

export const BlockType = z.enum([
  "narration",
  "dialogue",
  "action",
  "transition",
  "note",
  "heading",
  "background",
  "music",
  "sfx",
]);

export const createSceneBlockSchema = z.object({
  type: BlockType,
  content: z.string().max(50000),
  order: z.number().int().min(0).default(0),
  characterId: z.union([z.string().uuid(), z.literal("__unknown__")]).nullish(),
  emotion: z.string().max(100).nullish(),
  position: z.enum(["left", "center", "right"]).nullish(),
  speakerNote: z.string().max(500).nullish(),
  displayMode: z.enum(["solo", "caption", "layer"]).nullish(),
  showPortrait: z.boolean().optional(),
  portraitImageUrl: z
    .string()
    .max(2000)
    .refine(
      (value) => value.startsWith("/uploads/") || z.string().url().safeParse(value).success,
      "URL de portrait invalide",
    )
    .nullish(),
  mediaUrl: z
    .string()
    .max(2000)
    .refine(
      (value) =>
        value.startsWith("/uploads/") ||
        z.string().url().safeParse(value).success,
      "URL de média invalide",
    )
    .nullish(),
  audioAction: z.enum(["play", "stop"]).nullish(),
  volume: z.number().int().min(0).max(100).nullish(),
  fadeDuration: z.number().min(0).max(30).nullish(),
  loop: z.boolean().nullish(),
  animationPreset: z.enum(["none", "zoom-in", "zoom-out", "pan-left-right", "pan-right-left", "drift-up", "fade-in", "float"]).nullish(),
});

export const updateSceneBlockSchema = createSceneBlockSchema.partial();

export const reorderBlocksSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number().int().min(0),
    }),
  ),
});

// ============================================================
// CHARACTER
// ============================================================

export const CharacterStatus = z.enum([
  "active",
  "dead",
  "missing",
  "unknown",
  "retired",
]);

const characterFieldsSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  alias: z.string().max(100).optional(),
  portraitUrl: imageUrlField.nullish(),
  nameColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide")
    .optional(),
  role: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  biography: z.string().max(50000).optional(),
  age: z.string().max(50).optional(),
  birthDate: z.string().max(100).optional(),
  status: CharacterStatus.default("active"),
  personality: z.string().max(5000).optional(),
  motivations: z.string().max(5000).optional(),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
  notes: z.string().max(10000).optional(),
  quotes: z.string().max(10000).optional(),
  wikiSections: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().min(1, "Le titre est requis").max(160),
        content: z.string().max(20000),
      }),
    )
    .max(30)
    .optional(),
  promptNotes: z.string().max(20000).optional(),
});

export const createCharacterSchema = characterFieldsSchema.refine(
  (character) =>
    Boolean(
      character.firstName?.trim() ||
      character.lastName?.trim() ||
      character.alias?.trim(),
    ),
  { message: "Renseignez au moins un prénom, un nom ou un alias" },
);

export const updateCharacterSchema = characterFieldsSchema.partial();

export const createCharacterImageSchema = z.object({
  label: z.string().min(1, "Le libellé est requis").max(100),
  emotion: z.string().min(1, "L’émotion est requise").max(100),
  url: z
    .string()
    .max(2000)
    .refine(
      (value) =>
        value.startsWith("/uploads/") ||
        z.string().url().safeParse(value).success,
      "URL d’image invalide",
    ),
});

// ============================================================
// CHARACTER RELATION
// ============================================================

export const RelationType = z.enum([
  "friend",
  "family",
  "couple",
  "colleague",
  "enemy",
  "hierarchy",
  "custom",
]);

export const createCharacterRelationSchema = z.object({
  toCharacterId: z.string().uuid("ID de personnage invalide"),
  type: RelationType,
  label: z.string().max(100).optional(),
  reverseLabel: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  bidirectional: z.boolean().default(false),
});

export const updateCharacterRelationLabelSchema = z.object({
  label: z.string().max(100).nullable(),
});

// ============================================================
// LOCATION
// ============================================================

export const createLocationSchema = z.object({
  parentId: z.string().uuid().nullish(),
  name: z.string().min(1, "Le nom est requis").max(200),
  type: z.string().max(100).optional(),
  imageUrl: imageUrlField.nullish(),
  description: z.string().max(5000).optional(),
  textualLocation: z.string().max(500).optional(),
  ambiance: z.string().max(2000).optional(),
  notes: z.string().max(10000).optional(),
  promptNotes: z.string().max(20000).optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

// ============================================================
// ORGANIZATION
// ============================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  type: z.string().max(100).optional(),
  logoUrl: imageUrlField.nullish(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(10000).optional(),
  promptNotes: z.string().max(20000).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const addOrganizationMemberSchema = z.object({
  characterId: z.string().uuid("ID de personnage invalide"),
  role: z.string().max(100).optional(),
  rank: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().max(100).optional(),
  endDate: z.string().max(100).optional(),
});

// ============================================================
// LORE
// ============================================================

export const LoreCategory = z.enum([
  "history",
  "technology",
  "politics",
  "organizations",
  "objects",
  "concepts",
  "rules",
  "events",
  "custom",
]);

export const createLoreEntrySchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  category: LoreCategory,
  content: z.string().max(100000).optional(),
  notes: z.string().max(10000).optional(),
  status: z
    .enum(["planned", "in_progress", "established", "review"])
    .default("planned"),
  progress: z.number().int().min(0).max(100).default(0),
});

export const updateLoreEntrySchema = createLoreEntrySchema.partial();

export const updateStoryPageSchema = z.object({
  coverUrl: imageUrlField.nullish(),
  pageTitle: z.string().max(150).nullish(),
  pageSubtitle: z.string().max(500).nullish(),
  pageBackgroundUrl: imageUrlField.nullish(),
  pageBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pageTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pageAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pageTheme: z.enum(["editorial", "cinematic", "visual-novel", "minimal"]),
  pagePublished: z.boolean(),
});

// ============================================================
// TIMELINE EVENT
// ============================================================

export const createTimelineEventSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(10000).optional(),
  narrativeDate: z.string().max(200).optional(),
  sortKey: z.string().max(100).optional(),
  order: z.number().int().min(0).default(0),
  locationId: z.string().uuid().optional(),
  characterIds: z.array(z.string().uuid()).optional(),
  organizationIds: z.array(z.string().uuid()).optional(),
  sceneIds: z.array(z.string().uuid()).optional(),
});

export const updateTimelineEventSchema = createTimelineEventSchema.partial();

// ============================================================
// MEDIA
// ============================================================

export const createMediaSchema = z.object({
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().uuid().optional(),
});

// ============================================================
// TAG
// ============================================================

export const createTagSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(50),
  color: z.string().max(7).optional(),
});

export const tagEntitySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid("ID d'entité invalide"),
});

// ============================================================
// SEARCH
// ============================================================

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  types: z
    .array(
      z.enum([
        "scene",
        "character",
        "location",
        "organization",
        "lore",
        "timeline",
      ]),
    )
    .optional(),
  tags: z.array(z.string().uuid()).optional(),
});
