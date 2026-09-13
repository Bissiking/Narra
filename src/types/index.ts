import { Prisma } from "@prisma/client";

// ============================================================
// PROJECT
// ============================================================

export type ProjectStatus = "idea" | "writing" | "paused" | "completed" | "archived";

export type ProjectType = "story" | "novel" | "screenplay" | "vn" | "comic" | "universe";

export interface ProjectWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  type: ProjectType;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    scenes: number;
    characters: number;
    locations: number;
    organizations: number;
  };
  genres: { genre: string }[];
}

// ============================================================
// NARRATIVE NODE
// ============================================================

export interface NarrativeNodeWithChildren {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order: number;
  depth: number;
  children: NarrativeNodeWithChildren[];
  _count: {
    scenes: number;
  };
}

// ============================================================
// SCENE
// ============================================================

export type SceneStatus = "draft" | "writing" | "review" | "final";

export interface SceneWithDetails {
  id: string;
  title: string;
  status: SceneStatus;
  order: number;
  wordCount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  node: {
    id: string;
    title: string;
    type: string;
  } | null;
  location: {
    id: string;
    name: string;
  } | null;
  characters: {
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      portraitUrl: string | null;
    };
  }[];
  _count: {
    blocks: number;
  };
}

// ============================================================
// SCENE BLOCK
// ============================================================

export type BlockType = "narration" | "dialogue" | "action" | "transition" | "note" | "heading" | "music" | "sfx";

export interface SceneBlockWithCharacter {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  emotion: string | null;
  position: string | null;
  speakerNote: string | null;
  mediaUrl: string | null;
  showPortrait: boolean;
  portraitImageUrl: string | null;
  audioAction: string | null;
  volume: number | null;
  fadeDuration: number | null;
  loop: boolean | null;
  character: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    alias: string | null;
    portraitUrl: string | null;
  } | null;
}

// ============================================================
// CHARACTER
// ============================================================

export type CharacterStatus = "active" | "dead" | "missing" | "unknown" | "retired";

export interface CharacterWithRelations {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  portraitUrl: string | null;
  nameColor: string;
  role: string | null;
  description: string | null;
  biography: string | null;
  age: string | null;
  birthDate: string | null;
  status: CharacterStatus;
  personality: string | null;
  motivations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  quotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  images: {
    id: string;
    label: string;
    emotion: string;
    url: string;
    order: number;
  }[];
  relationsFrom: CharacterRelation[];
  relationsTo: CharacterRelation[];
  sceneAppearances: {
    scene: {
      id: string;
      title: string;
      node: { title: string } | null;
    };
  }[];
  organizationMemberships: {
    organization: {
      id: string;
      name: string;
    };
    role: string | null;
    rank: string | null;
  }[];
  _count: {
    sceneAppearances: number;
  };
}

// ============================================================
// CHARACTER RELATION
// ============================================================

export type RelationType = "friend" | "family" | "couple" | "colleague" | "enemy" | "hierarchy" | "custom";

export interface CharacterRelation {
  id: string;
  type: RelationType;
  label: string | null;
  reverseLabel: string | null;
  description: string | null;
  bidirectional: boolean;
  fromCharacter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    alias: string | null;
    portraitUrl: string | null;
  };
  toCharacter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    alias: string | null;
    portraitUrl: string | null;
  };
}

// ============================================================
// LOCATION
// ============================================================

export interface LocationWithDetails {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  imageUrl: string | null;
  textualLocation: string | null;
  ambiance: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  parent: {
    id: string;
    name: string;
  } | null;
  children: {
    id: string;
    name: string;
    type: string | null;
  }[];
  _count: {
    scenes: number;
  };
}

// ============================================================
// ORGANIZATION
// ============================================================

export interface OrganizationWithMembers {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  type: string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    role: string | null;
    rank: string | null;
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      portraitUrl: string | null;
    };
  }[];
  _count: {
    members: number;
  };
}

// ============================================================
// LORE
// ============================================================

export type LoreCategory = "history" | "technology" | "politics" | "organizations" | "objects" | "concepts" | "rules" | "events" | "custom";

export interface LoreEntryWithLinks {
  id: string;
  title: string;
  category: LoreCategory;
  content: string | null;
  notes: string | null;
  status: "planned" | "in_progress" | "established" | "review";
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  linksFrom: {
    toLore: {
      id: string;
      title: string;
      category: LoreCategory;
    };
    type: string;
    description: string | null;
  }[];
  linksTo: {
    fromLore: {
      id: string;
      title: string;
      category: LoreCategory;
    };
    type: string;
    description: string | null;
  }[];
}

// ============================================================
// TIMELINE
// ============================================================

export interface TimelineEventWithDetails {
  id: string;
  title: string;
  description: string | null;
  narrativeDate: string | null;
  sortKey: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  location: {
    id: string;
    name: string;
  } | null;
  characters: {
    character: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      alias: string | null;
      portraitUrl: string | null;
    };
    role: string | null;
  }[];
  organizations: {
    id: string;
    name: string;
  }[];
  scenes: {
    id: string;
    title: string;
  }[];
}

// ============================================================
// MEDIA
// ============================================================

export interface MediaWithMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  category: string | null;
  description: string | null;
  alt: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// TAG
// ============================================================

export interface TagWithCount {
  id: string;
  name: string;
  color: string | null;
  _count: {
    entities: number;
  };
}

// ============================================================
// SEARCH
// ============================================================

export type SearchEntityType = "scene" | "character" | "location" | "organization" | "lore" | "timeline";

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}
