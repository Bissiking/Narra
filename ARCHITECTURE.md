# Narra — Architecture

## Vision

Narra est une application web de gestion et création d'œuvres narratives. Elle doit être suffisamment générique pour accueillir romans, séries, scénarios, visual novels, bandes dessinées, et univers narratifs.

## Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (credentials + OAuth futur)
- **UI**: Composants custom sur shadcn/ui base
- **Stockage médias**: Disque local (V1), S3-compatible (futur)

## Architecture du projet

```
narra/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── (auth)/             # Login, register
│   │   ├── (library)/          # Bibliothèque (racine)
│   │   ├── (project)/          # Routes projet
│   │   │   ├── [projectId]/
│   │   │   │   ├── page.tsx            # Dashboard
│   │   │   │   ├── scenes/             # Éditeur
│   │   │   │   ├── characters/         # Personnages
│   │   │   │   ├── locations/          # Lieux
│   │   │   │   ├── organizations/      # Organisations
│   │   │   │   ├── lore/               # Lore
│   │   │   │   ├── timeline/           # Timeline
│   │   │   │   ├── media/              # Médiathèque
│   │   │   │   ├── structure/          # Arborescence
│   │   │   │   └── settings/           # Paramètres
│   │   └── api/                # API Routes
│   │       ├── projects/
│   │       ├── scenes/
│   │       ├── characters/
│   │       ├── locations/
│   │       ├── organizations/
│   │       ├── lore/
│   │       ├── timeline/
│   │       ├── media/
│   │       └── search/
│   ├── components/
│   │   ├── ui/                 # Composants de base (Button, Input, etc.)
│   │   ├── layout/             # Sidebar, Header, etc.
│   │   ├── editor/             # Éditeur de scènes
│   │   ├── library/            # Vues bibliothèque
│   │   ├── characters/         # Fiches personnages
│   │   ├── locations/          # Fiches lieux
│   │   ├── organizations/      # Fiches organisations
│   │   ├── lore/               # Lore
│   │   ├── timeline/           # Timeline
│   │   └── media/              # Médiathèque
│   ├── lib/
│   │   ├── db.ts               # Client Prisma
│   │   ├── auth.ts             # Configuration auth
│   │   ├── utils.ts            # Utilitaires
│   │   └── validations.ts      # Zod schemas
│   ├── types/
│   │   └── index.ts            # Types TypeScript
│   └── hooks/                  # Hooks React custom
├── public/
│   └── uploads/                # Fichiers uploadés (V1 local)
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## Schéma de données

### Entités principales

1. **User** — Utilisateur de l'application
2. **Project** — Un projet narratif (ARC, roman, etc.)
3. **NarrativeNode** — Nœud générique de la structure (saison, épisode, chapitre, partie...)
4. **Scene** — Une scène (contient les blocs de contenu)
5. **SceneBlock** — Bloc de contenu (narration, dialogue, action...)
6. **Character** — Personnage
7. **CharacterRelation** — Relation entre personnages
8. **Location** — Lieu
9. **Organization** — Organisation/faction
10. **OrganizationMember** — Membre d'une organisation
11. **LoreEntry** — Entrée de lore
12. **TimelineEvent** — Événement temporel
13. **Media** — Fichier média
14. **Tag** — Tag générique
15. **EntityTag** — Liaison entité-tag

### Relations clés

- Un **Project** contient des **NarrativeNode** (arborescence)
- Un **NarrativeNode** peut contenir des **Scene**
- Une **Scene** contient des **SceneBlock** (ordonnés)
- Les **SceneBlock** de type dialogue référencent un **Character**
- **Character**, **Location**, **Organization** sont liés à un **Project**
- **Scene** peut référencer un **Location**
- **TimelineEvent** peut lié des **Character**, **Location**, **Organization**, **Scene**
- **LoreEntry** peut lié des entités multiples
- **Media** peut lié une entité quelconque (polymorphique via entityType + entityId)
- **Tag** peut lié toute entité via **EntityTag**

### NarrativeNode — Arborescence générique

Le concept central. Chaque nœud possède :
- `parentId` (nullable) — racine si null
- `type` — rôle sémantique (saison, arc, partie, chapitre...)
- `order` — position parmi les frères
- `depth` — profondeur dans l'arbre (pour requêtes)

Exemples :
```
ARC (Project)
└── Saison 1 (NarrativeNode, type="saga", order=0)
    ├── Épisode 1 (NarrativeNode, type="arc", order=0)
    │   ├── B1 — La nomination (NarrativeNode, type="chapter", order=0)
    │   └── B2 — Bravo-10 (NarrativeNode, type="chapter", order=1)
    └── Épisode 2 (NarrativeNode, type="arc", order=1)

Mon Roman (Project)
└── Partie 1 (NarrativeNode, type="volume", order=0)
    ├── Chapitre 1 (NarrativeNode, type="chapter", order=0)
    └── Chapitre 2 (NarrativeNode, type="chapter", order=1)
```

## Principes

1. **Pas de silos** — Toute entité peut lier toute entité
2. **Générique** — Pas de logique métier codée pour un format spécifique
3. **UUID** — Toutes les clés primaires sont des UUID
4. **Soft delete** — `deletedAt` sur les entités principales
5. **Timestamps** — `createdAt`, `updatedAt` partout
6. **Validation** — Zod schemas côté serveur
7. **Optimistic UI** — Mises à jour optimistes côté client
