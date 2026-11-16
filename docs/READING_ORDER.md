# Correctif 0.14.1 : ordre de lecture entre épisodes

## Défaut identifié

Le lecteur privé chargeait `GET /api/projects/:projectId/scenes`, qui triait toutes les scènes par `Scene.order`. Les chargements publics `getPublishedStory` et de prévisualisation `getStoryForPreview` appliquaient le même tri global.

Or cet ordre est **local à la séquence** : la création calcule le maximum dans le même `nodeId`, et le réordonnancement repart de zéro pour les scènes de ce nœud. Ainsi, les sous-blocs d’Épisode 1, Épisode 2, Épisode 3 et Épisode 4 peuvent tous avoir les ordres 0, 1, 2. Les trier ensemble entrelace les épisodes. Deux éléments consécutifs du compteur global peuvent alors afficher des épisodes différents en pleine section.

Les captures de production montrent Épisode 4 au compteur 1140/4021 puis Épisode 2 à 1141/4021. Le défaut est confirmé dans le code et reproduit avec des données synthétiques locales ; les données du projet de production n’ont pas été consultées.

## Règle commune

`src/lib/narrative-order.ts` fournit `orderNarrativeScenes` :

1. Parcourir les racines dans l’ordre enregistré de la structure narrative.
2. Pour chaque nœud, lire ses scènes directes dans leur ordre local, puis ses enfants dans leur ordre enregistré.
3. Terminer la branche avant de passer au frère suivant : une saison, un épisode ou un bloc n’est plus entrelacé avec un autre.
4. Utiliser le titre puis l’identifiant uniquement pour départager les ordres égaux de manière déterministe.
5. Conserver les scènes sans rattachement ou liées à un nœud absent à la fin. Les parents manquants et cycles hérités sont parcourus sans perdre ni dupliquer les scènes.

L’ordre enregistré fait autorité ; aucun numéro n’est deviné dans les titres. Prologue et Intro suivent leur position dans la structure, avant les épisodes si c’est leur ordre enregistré. Les scènes directes avant les sections enfants correspondent à l’organisation du Studio.

Le tri est partagé par l’API des scènes, le lecteur public et la prévisualisation du récit. Les formats VN et document utilisent ainsi le même déroulé. La correction ne modifie ni les rattachements ni les ordres sauvegardés. Les liens `?block=…` restent basés sur l’identifiant de l’élément ; son numéro dans le compteur peut changer pour refléter l’ordre corrigé. La reprise automatique via l’API de progression est actuellement désactivée par le garde de stabilité existant dans `src/app/layout.tsx` ; ce correctif conserve ce comportement.

Le lien direct du lecteur public transmet aussi l’identifiant demandé depuis sa page serveur : le premier rendu du serveur et celui du navigateur ciblent le même bloc, ce qui évite les erreurs d’hydratation des liens `?block=…`.

## Déploiement

Aucune nouvelle migration de base n’est nécessaire pour 0.14.1. Après installation du correctif, recharger le lecteur pour récupérer le déroulé corrigé. Les liens existants de lecture de contrôle gardent leur cible.

## Contrôles et reproduction

```bash
npm run test:reading-order

# Base PostgreSQL LOCALE jetable nommée narra_reader_order_qa, migrations appliquées.
# Le banc refuse les autres noms de base et les hôtes distants.
DATABASE_URL='postgresql://utilisateur@127.0.0.1:5589/narra_reader_order_qa' \
NARRA_PUPPETEER_MODULE=/chemin/vers/puppeteer-core \
NARRA_CHROME=/chemin/vers/Chrome npm run test:reading-browser
```

Le banc navigateur crée un propriétaire et un projet synthétiques, démarre son serveur local sur le port 3043, et utilise les vraies routes Next.js et PostgreSQL. Il ne passe pas par Kyros et ne se connecte pas à la production. Il arrête son serveur à la fin ; les données synthétiques restent dans la base jetable pour inspection.

Le projet de contrôle comprend quatre épisodes et douze sous-blocs insérés volontairement dans le désordre, avec des ordres locaux 0/1/2 répétés, et 4 021 éléments. L’ancien tri SQL est comparé au déroulé attendu pour confirmer l’interclassement. Le nouveau déroulé vérifie notamment 1140 → 1141 dans Épisode 4, B1 → B2 → B3, les frontières entre épisodes, les retours arrière, les liens de contrôle depuis le Studio, les rechargements et la conservation des cibles par identifiant. Il couvre aussi le lecteur VN public sans session et l’ordre des articles du lecteur document.

Rapport et captures : `.impeccable/review/reader-order-*`, ignorés par Git. Ces contrôles locaux ne prouvent pas un déploiement ni une vérification des données de production.

Validation locale du 16 novembre 2026 :

- [x] 41 tests unitaires réussis, dont sept régressions de tri (épisodes, blocs imbriqués, saisons, ordres égaux, rattachements absents et arbre profond).
- [x] PostgreSQL 14 local isolé, API réelle et ancien tri SQL comparés sur le projet synthétique de 4 021 éléments.
- [x] Chrome for Testing/Puppeteer : 1140 → 1141 dans Épisode 4, B1 → B2 → B3, frontières entre épisodes dans les deux sens, rechargements et lien réel Lecture de contrôle du Studio.
- [x] Lecture VN privée et publique sans session ; ordre des articles du lecteur document public.
- [x] Captures 1440 et 390 px, sans débordement de page ; aucune erreur JavaScript, y compris d’hydratation des liens directs publics.
- [x] Build complet `NARRA_NEXT_DIST_DIR=.next-qa/reader-order-build npm run build` réussi.
- [x] ESLint ciblé : zéro erreur et deux avertissements préexistants dans le lecteur (dépendances d’effet et image native).

Aucune donnée de production n’a été consultée ou modifiée. Le correctif est livré dans le dépôt local, sans déploiement.
