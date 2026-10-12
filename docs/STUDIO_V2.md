# Studio V2 et animations — 0.12.0

Le menu du projet propose **Studio V2**, en parallèle de l’éditeur **Montage**. Les deux interfaces modifient les mêmes scènes et blocs. On peut passer de l’une à l’autre après sauvegarde ; les protections contre la perte de modifications restent actives.

## Mise en scène

Studio V2 démarre dans le sous-bloc sélectionné, avec la disposition **Compacte** par défaut. **Disposition** permet de choisir **Compacte · Image 1 · cinq pistes** ou **Détaillée · Image 2 · sept pistes** ; ce choix est mémorisé dans le navigateur et conserve la scène et les modifications en cours. Les deux vues reprennent les références fournies par l’utilisateur, `C:/Users/mathe/Pictures/LUMA/NARRA/editeur_v2.png` et `editeur_v2-1.png`.

1. Choisir une scène dans la bibliothèque de gauche. **Épisode** ouvre l’organisation des blocs et sous-blocs ; **Sous-bloc** revient au montage de la scène sélectionnée. Voir [Navigation Épisode / Sous-bloc](STUDIO_NAVIGATION.md).
2. Sélectionner un segment dans la timeline inférieure. Modifier son texte et ses paramètres dans l’inspecteur de droite, onglet **Bloc** en Compacte ou **Plan** en Détaillée. L’aperçu occupe le panneau central.
3. Utiliser **Ajouter un élément**, ou l’insertion après le plan en Détaillée, pour créer dialogues, actions, décors, musiques, effets sonores et notes. Le menu permet aussi d’importer un scénario. Le glisser-déposer au pointeur ou au clavier réordonne un plan avec ses couches ; les musiques gardent leur ordre indépendant.
4. **Sauver** est visible dans l’en-tête Compacte et dans le menu **Disposition** en Détaillée. **Ctrl+S** déclenche aussi la sauvegarde. Les éléments modifiés bénéficient de la sauvegarde automatique toutes les 30 secondes. Un échec conserve le travail, affiche l’erreur et bloque le changement de sous-bloc ou d’épisode.

L’onglet **Scène** règle le statut, la séquence et le titre de lecture ; les réglages modifiés sont enregistrés avant un changement de scène ou d’épisode et avant la sauvegarde principale. **Enregistrer les réglages** permet de les sauver directement ; un échec conserve les valeurs et permet de réessayer. **Univers** donne accès aux fiches du projet. La vue Détaillée expose aussi **Ressources**, **Médiathèque**, **Effets**, **Couleurs** et **Audio**, avec les sélecteurs de médias et l’éditeur d’animations existants.

## Dispositions et lecture

Sur bureau, les deux dispositions placent la bibliothèque à gauche, un aperçu dominant au centre, l’inspecteur à droite et la timeline sur toute la largeur inférieure. Compacte présente Plans visuels, Dialogues, Musique, Effets sonores et Notes internes. Détaillée sépare Vidéo, Dialogue, Action, Arrière-plan, Musique, Effets sonores et Note interne. Sur écran étroit, l’aperçu précède la bibliothèque, puis la timeline et l’inspecteur ; la timeline défile horizontalement dans son propre panneau.

Le curseur, la lecture/pause et le passage au plan précédent ou suivant pilotent le même aperçu. Le zoom et **Adapter** changent l’échelle de la timeline. Les cadenas bloquent l’édition et le déplacement sur une piste ; la vue Détaillée permet aussi de masquer ses pistes. Masquer agit sur l’aperçu et le son ; les états des pistes restent locaux à la session du Studio. **Annuler** et **Rétablir** concernent les modifications locales des éléments ; l’historique est remis à zéro après sauvegarde ou changement de scène.

Les musiques et effets sonores utilisent les médias du projet. Les formes d’onde sont calculées à partir de l’audio décodé ; si le décodage échoue, le segment conserve son libellé sans forme d’onde inventée. La lecture des sons dépend de leur disponibilité dans le navigateur.

**Temps estimés** reste visible dans les deux dispositions, y compris sur mobile : la durée de chaque plan est calculée depuis son texte, entre 3 et 20 secondes. Ces valeurs ne sont pas des durées de clips enregistrées et ne constituent pas un moteur de découpe temporelle. Le mode Épisode présente l’ordre narratif et les comptes d’éléments, sans assembler toutes les scènes dans une timeline de montage.

**Exporter**, en Détaillée, télécharge la scène sélectionnée et ses éléments courants au format JSON `.narra.json`. Il s’agit d’un instantané des données présentes dans l’éditeur, pas d’un rendu vidéo.

La reconstruction est une exception visuelle locale épinglée par l’utilisateur : anthracite, ambre, panneaux arrondis et pistes colorées suivent les deux références. Elle ne remplace pas l’identité globale de Narra. Montage conserve son rendu ; les scènes, blocs, médias et animations restent compatibles. La liste des scènes récupère uniquement l’URL du premier décor disponible pour sa vignette, sans nouveau schéma ni migration. Aucun nouveau raster de livraison n’a été généré.

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

## Installation et validation initiale des animations

Avant de lancer cette version sur une base existante :

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
```

La migration `20261008120000_scene_animation_tracks` ajoute `scene_blocks.animation_config` (JSONB, tableau vide par défaut). `20261008121000_complete_workspace_schema` complète des ajouts antérieurs absents de l’historique : tri des lieux, collaborateurs, invitations et progression de lecture. Les créations manquantes sont idempotentes pour les bases déjà mises à jour par `db push`. Aucune ligne narrative n’est supprimée.

Tests du moteur : `npm run test:animations`. La validation initiale des animations du 8 octobre 2026, antérieure à la reconstruction des deux dispositions, utilise une base PostgreSQL isolée créée depuis les migrations, des sessions synthétiques et Chrome for Testing via Puppeteer. Elle ne valide ni le SSO réel, ni une base de production, ni un déploiement.

Pour reproduire le parcours navigateur, préparer une base dédiée dont le nom contient `_qa_`, appliquer les migrations, puis exécuter `npx tsx tests/studio-v2.seed.ts` avec `DATABASE_URL` et un `NARRA_SESSION_SECRET` local. Lancer l’application avec les mêmes variables, en production sur le port 3034. Exécuter `node tests/studio-v2.browser.cjs` avec `NARRA_CHROME` (chemin de Chrome for Testing) et `NARRA_PUPPETEER_MODULE` si Puppeteer Core est installé hors du projet. `NARRA_QA_BASE_URL` permet de changer le port. Les sessions synthétiques et captures restent sous `.impeccable/`, ignoré par Git. Ne pas utiliser les sessions QA pour le SSO réel.

Résultats de cette validation : compilation de production et TypeScript réussis ; schéma Prisma valide et sans différence après migration ; 4 tests moteur réussis ; parcours navigateur réussis sur 1440px et 390px (sauvegarde/rechargement, préférences, compatibilité de l’éditeur actuel, validation des paramètres, Wiki privé et public, actualisation des fiches, fondu entre deux décors, filtre chromatique et réduction des mouvements). ESLint exécuté explicitement sur le moteur et le Studio : 0 erreur, 3 avertissements existants concernant les images et une dépendance de hook.

## Validation des deux dispositions

La reconstruction du 8 octobre 2026 a passé la vérification TypeScript, les 4 tests de navigation et les 4 tests d’animations. ESLint sur les composants modifiés rapporte 0 erreur et 4 avertissements concernant les images dynamiques. La revue finale, limitée aux deux finitions demandées, a confirmé la correction de l’échelle du texte détaillé et du libellé Temps estimés sur écran étroit dans les dix captures Compacte/Détaillée à 1672, 1440, 1920, 390 et 320px.

`node tests/studio-v2-layout.browser.cjs` utilise des API simulées et une route temporaire retirée après le parcours. Définir `NARRA_CHROME` et, si nécessaire, `NARRA_PLAYWRIGHT_MODULE` ; `NARRA_STUDIO_QA_PORT` permet de changer le port local. Le banc vérifie les deux dispositions et leur persistance locale, les cinq/sept pistes, le texte conservé à la bascule, annuler/rétablir, le curseur et la lecture de la timeline, masquer/verrouiller, le téléchargement JSON, l’isolation des scènes, le réordonnancement, la sauvegarde de tous les éléments, les échecs de sauvegarde et de réglages avec reprise, l’accès en lecture et l’absence de débordement de page aux cinq largeurs. Les captures restent sous `.impeccable/review/studio-{compact,detailed}-{1672,1440,1920,390,320}.png`, ignoré par Git.

Le banc `tests/studio-navigation.browser.cjs` a également passé le parcours de navigation avec l’interface actuelle, des API simulées et `NARRA_QA_SKIP_CAPTURE=1` : modes, isolation, réordonnancement/rechargement, sauvegarde complète, panne bloquante, épisodes vides, lecture seule et absence de débordement à 1920, 1440 et 390px.

PostgreSQL était indisponible pendant cette reconstruction : les échanges réels avec la base, le SSO et le minutage de la lecture des médias n’ont pas été validés de bout en bout. Les résultats initiaux ci-dessus ne remplacent pas cette vérification des nouveaux layouts. La compilation directe Next.js a réussi (journal `.impeccable/studio-v2-build.log`, code de sortie 0). Le pipeline complet `npm run build` n’est pas validé : une tentative de régénération du client Prisma a rencontré un verrou Windows (`EPERM` sur `query_engine-windows.dll.node`, DLL en cours d’utilisation). Aucun déploiement n’a été lancé.
