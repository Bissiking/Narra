# Studio V2 et animations — 0.12.0

Le menu du projet propose **Studio V2**, en parallèle de l’éditeur **Montage**. Les deux interfaces modifient les mêmes scènes et blocs. On peut passer de l’une à l’autre après sauvegarde ; les protections contre la perte de modifications restent actives.

## Mise en scène

1. Choisir une scène, puis un bloc dans le déroulé de gauche.
2. Écrire directement sous l’aperçu. L’inspecteur Bloc règle le personnage, l’expression, l’image, le son et les effets selon le type sélectionné.
3. Ajouter un arrière-plan comme décor du plan pour qu’il reste affiché pendant les dialogues.
4. Sauver, ou laisser la sauvegarde automatique de 30 secondes enregistrer les modifications. Un échec conserve le travail dans l’éditeur et affiche un état d’erreur.

L’onglet Scène règle le statut, le rattachement narratif et le titre de lecture. Univers ouvre les fiches et médias dans un autre onglet. Disposition permet de masquer la timeline ou la distribution ; ces choix sont mémorisés dans ce navigateur. Duplication et déplacement sont accessibles sous le texte. Le glisser-déposer de la timeline continue de déplacer un plan avec ses couches.

## Effets combinables

Chaque arrière-plan dispose de pistes ordonnées dans deux comportements :

- **Entrée** : une exécution à l’apparition de ce bloc de décor, après le délai configuré.
- **Continue** : active tant que ce décor reste affiché, pendant les dialogues ; aucune répétition, boucle ou nombre défini.

Le catalogue contient les 38 effets demandés : 8 caméra, 7 action, 9 apparition/disparition (fade in et out séparés, flous entrant et sortant séparés), 7 cinéma et 7 environnement. Fumée, poussière, étincelles, pluie, neige, braises et brouillard utilisent des couches CSS animées superposées. L’aberration et les effets numériques sont des effets stylisés de rendu web.

Les transformations et filtres se composent sur des couches imbriquées ; les opacités se multiplient. L’ordre des pistes suit leur création. Une piste peut être dupliquée ou retirée. Maximum : 24 pistes par décor.

Exemple : Fade in d’entrée de 1200ms, Fade out d’entrée de 1200ms avec 4000ms de délai, et Drift continu de 14000ms. L’image apparaît, reste visible, puis disparaît ; le mouvement se poursuit durant l’affichage. Pour une disparition complète, régler l’intensité de Fade out à 100%. Le fondu enchaîné conserve temporairement l’image précédente lors du changement de décor.

Durée et délai sont en millisecondes. La vitesse lente divise la vitesse par deux, rapide la double ; personnalisée utilise un multiplicateur de 0.1 à 10. Les coordonnées d’ancrage sont des pourcentages de l’image. Focus utilise cet ancrage pour cibler le zoom. Chaque effet interprète direction et intensité selon sa nature (une saturation n’a pas de direction spatiale).

Les pistes d’entrée ne redémarrent pas au dialogue suivant. Revenir à un autre décor puis à ce décor relance son entrée. Une modification des paramètres relance uniquement la piste modifiée. La préférence système de réduction des animations désactive les mouvements, y compris les particules.

Les anciens `animationPreset` restent lisibles, et sont convertis en piste au rendu. Modifier ces effets depuis l’inspecteur enregistre `animationConfig` et neutralise le preset ancien pour éviter tout doublon.

## Wiki

Les fiches affichent désormais personnalité, motivations, forces, faiblesses, sections personnalisées et apparitions. Ces dernières réunissent les associations explicites de scène et les dialogues attribués au personnage. L’index contient aussi lieux, organisations et lore. Les notes internes ne sont pas affichées.

Le Wiki public reste réservé aux histoires publiées. `wiki-preview` est dynamique et accessible au propriétaire et aux collaborateurs du projet. Ses liens restent dans l’aperçu, y compris pour une histoire non publiée.

## Installation et validations

Avant de lancer cette version sur une base existante :

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
```

La migration `20261008120000_scene_animation_tracks` ajoute `scene_blocks.animation_config` (JSONB, tableau vide par défaut). `20261008121000_complete_workspace_schema` complète des ajouts antérieurs absents de l’historique : tri des lieux, collaborateurs, invitations et progression de lecture. Les créations manquantes sont idempotentes pour les bases déjà mises à jour par `db push`. Aucune ligne narrative n’est supprimée.

Tests du moteur : `npm run test:animations`. La validation locale du 8 octobre 2026 utilise une base PostgreSQL isolée créée depuis les migrations, des sessions synthétiques et Chrome for Testing via Puppeteer. Elle ne valide ni le SSO réel, ni une base de production, ni un déploiement.

Pour reproduire le parcours navigateur, préparer une base dédiée dont le nom contient `_qa_`, appliquer les migrations, puis exécuter `npx tsx tests/studio-v2.seed.ts` avec `DATABASE_URL` et un `NARRA_SESSION_SECRET` local. Lancer l’application avec les mêmes variables, en production sur le port 3034. Exécuter `node tests/studio-v2.browser.cjs` avec `NARRA_CHROME` (chemin de Chrome for Testing) et `NARRA_PUPPETEER_MODULE` si Puppeteer Core est installé hors du projet. `NARRA_QA_BASE_URL` permet de changer le port. Les sessions synthétiques et captures restent sous `.impeccable/`, ignoré par Git. Ne pas utiliser les sessions QA pour le SSO réel.

Résultats de cette validation : compilation de production et TypeScript réussis ; schéma Prisma valide et sans différence après migration ; 4 tests moteur réussis ; parcours navigateur réussis sur 1440px et 390px (sauvegarde/rechargement, préférences, compatibilité de l’éditeur actuel, validation des paramètres, Wiki privé et public, actualisation des fiches, fondu entre deux décors, filtre chromatique et réduction des mouvements). ESLint exécuté explicitement sur le moteur et le Studio : 0 erreur, 3 avertissements existants concernant les images et une dépendance de hook.
