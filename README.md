# Narra

Application web de gestion et création d'œuvres narratives (romans, séries, scénarios, visual novels, bandes dessinées...).

Pour prendre en main l’application et organiser une œuvre en plusieurs saisons, consultez le [guide d’utilisation](docs/UTILISATION.md).

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
| `NARRA_BASE_URL` | URL publique de Narra (ex. `http://localhost:3000`) |
| `NARRA_SESSION_SECRET` | Clé secrète d'au moins 32 caractères pour les sessions Narra |
| `KYROS_BASE_URL` | Serveur Kyros principal (ex. `http://localhost:3001`) |
| `KYROS_FALLBACK_BASE_URL` | Serveur Kyros de repli (ex. `https://kyros.mhemery.fr`) |
| `KYROS_CLIENT_ID` | Identifiant du client Narra configuré en SSO v4 |
| `KYROS_CLIENT_SECRET` | Secret du client confidentiel (optionnel pour un client public PKCE) |
| `KYROS_RESOURCE_AUDIENCE` | Audience ressource exacte déclarée pour Narra |

Narra utilise le SSO natif Kyros v4 : découverte, PAR, Authorization Code avec PKCE S256,
validation du paramètre `iss` et vérification RS256 via le JWKS. Les scopes OIDC
`openid` et `offline_access` ne doivent pas être demandés sur ce flux natif.

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
