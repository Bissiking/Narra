# Narra

Application web de gestion et création d'œuvres narratives (romans, séries, scénarios, visual novels, bandes dessinées...).

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL + Prisma ORM

## Installation

```bash
git clone <repo-url>
cd narra
npm install
```

## Configuration

```bash
cp .env.example .env
```

Modifier les variables dans `.env` :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `NEXTAUTH_URL` | URL de l'app (ex: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Clé secrète pour les sessions |

## Commandes

```bash
npm run dev          # Lancer en développement
npm run build        # Build de production
npm run start        # Lancer en production
npm run lint         # Vérifier le code

# Database
npm run db:generate  # Générer le client Prisma
npm run db:push      # Push le schema vers la DB
npm run db:migrate   # Créer une migration
npm run db:studio    # Ouvrir Prisma Studio
npm run db:seed      # Peupler la base
```

## Structure

```
src/
├── app/          # Pages & API Routes (App Router)
├── components/   # Composants React
├── lib/          # Utilitaires, config DB, validation
└── types/        # Types TypeScript
```

## Fonctionnalités

- Gestion de projets narratifs
- Éditeur de scènes avec blocs (narration, dialogue, action)
- Personnages, lieux, organisations
- Lore, timeline, médiathèque
- Arborescence générique (saisons, chapitres, arcs...)
- Recherche à travers les entités
