# Studio et animations

Le **Studio**, issu du V2, est désormais l’unique éditeur de projet à `/project/[projectId]/edit`. Il remplace Montage et les anciens éditeurs de scènes. Le menu du projet conserve une seule entrée d’édition, adaptée au format du récit. Les scènes, blocs, médias et sauvegardes existants sont conservés.

La mise à jour 0.14 ajoute la sélection multiple, le presse-papiers, le découpage en sous-blocs, les déclenchements musicaux et les dossiers de médias : [utilisation, migration et validation](EDITOR_0_14.md).

## Mise en scène

Studio V2 démarre dans le sous-bloc sélectionné, avec la disposition **Compacte** par défaut. **Disposition** permet de choisir **Compacte · Image 1 · cinq pistes** ou **Détaillée · Image 2 · sept pistes** ; ce choix est mémorisé dans le navigateur et conserve la scène et les modifications en cours. Les deux vues reprennent les références fournies par l’utilisateur, `C:/Users/mathe/Pictures/LUMA/NARRA/editeur_v2.png` et `editeur_v2-1.png`.

1. Choisir un épisode dans **Épisode / section**, puis un sous-bloc dans la bibliothèque de gauche. Le sélecteur reste visible dans les deux modes ; la liste ne réunit que les sous-blocs de cet épisode. Prologue et Intro hors épisodes ont leur propre section. **Épisode** ouvre l’organisation des blocs et sous-blocs ; **Sous-bloc** revient au montage de la scène sélectionnée. Voir [Navigation Épisode / Sous-bloc](STUDIO_NAVIGATION.md).
2. Sélectionner un segment dans la timeline inférieure. Modifier son texte et ses paramètres dans l’inspecteur de droite, onglet **Bloc** en Compacte ou **Plan** en Détaillée. L’aperçu occupe le panneau central.
3. Utiliser **Ajouter un élément**, ou l’insertion après le plan en Détaillée, pour créer dialogues, actions, décors, musiques, effets sonores et notes. Le bouton **Importer**, à côté d’**Ajouter**, ouvre l’import de script collé ou de fichier `.md` / `.txt`. Le glisser-déposer au pointeur ou au clavier réordonne un plan avec ses couches ; les musiques gardent leur ordre indépendant.
4. **Sauver** est visible dans l’en-tête Compacte et dans le menu **Disposition** en Détaillée. **Ctrl+S** déclenche aussi la sauvegarde. Les éléments modifiés bénéficient de la sauvegarde automatique toutes les 30 secondes. Un échec conserve le travail, affiche l’erreur et bloque le changement de sous-bloc ou d’épisode.

L’onglet **Scène** règle le statut, la séquence et le titre de lecture ; les réglages modifiés sont enregistrés avant un changement de scène ou d’épisode et avant la sauvegarde principale. **Enregistrer les réglages** permet de les sauver directement ; un échec conserve les valeurs et permet de réessayer. **Univers** donne accès aux fiches du projet. La vue Détaillée expose aussi **Ressources**, **Médiathèque**, **Effets**, **Couleurs** et **Audio**, avec les sélecteurs de médias et l’éditeur d’animations existants.

## Dispositions et lecture

Sur bureau, les deux dispositions placent la bibliothèque à gauche, un aperçu dominant au centre, l’inspecteur à droite et la timeline sur toute la largeur inférieure. Compacte présente Plans visuels, Dialogues, Musique, Effets sonores et Notes internes. Détaillée sépare Vidéo, Dialogue, Action, Arrière-plan, Musique, Effets sonores et Note interne. Sur écran étroit, l’aperçu précède la bibliothèque, puis la timeline et l’inspecteur ; la timeline défile horizontalement dans son propre panneau.

Le curseur, la lecture/pause et le passage au plan précédent ou suivant pilotent le même aperçu. La timeline s’ouvre à une échelle de travail lisible, avec défilement horizontal. Le zoom ajuste cette échelle ; **Adapter** montre toute la scène et devient **Lisible** pour revenir à l’échelle de travail. Le curseur est gardé à l’écran lors de la lecture, du passage à un autre plan ou du zoom. Les cadenas bloquent l’édition et le déplacement sur une piste ; la vue Détaillée permet aussi de masquer ses pistes. Masquer agit sur l’aperçu et le son ; les états des pistes restent locaux à la session du Studio. **Annuler** et **Rétablir** concernent les modifications locales des éléments ; l’historique est remis à zéro après sauvegarde ou changement de scène.

Les musiques et effets sonores utilisent les médias du projet. Les formes d’onde sont calculées à partir de l’audio décodé ; si le décodage échoue, le segment conserve son libellé sans forme d’onde inventée. La lecture des sons dépend de leur disponibilité dans le navigateur.

**Temps estimés** reste visible dans les deux dispositions, y compris sur mobile : la durée de chaque plan est calculée depuis son texte, entre 3 et 20 secondes. Ces valeurs ne sont pas des durées de clips enregistrées et ne constituent pas un moteur de découpe temporelle. Le mode Épisode présente l’ordre narratif et les comptes d’éléments, sans assembler toutes les scènes dans une timeline de montage.

**Exporter**, en Détaillée, télécharge la scène sélectionnée et ses éléments courants au format JSON `.narra.json`. Il s’agit d’un instantané des données présentes dans l’éditeur, pas d’un rendu vidéo.

La reconstruction est une exception visuelle locale épinglée par l’utilisateur : anthracite, ambre, panneaux arrondis et pistes colorées suivent les deux références. Elle ne remplace pas l’identité globale de Narra. Les scènes, blocs, médias et animations existants restent compatibles après retrait de Montage. La liste des scènes récupère uniquement l’URL du premier décor disponible pour sa vignette, sans nouveau schéma ni migration. Aucun nouveau raster de livraison n’a été généré.

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


## Patch Studio du 13 novembre 2026

Les poignées de la bibliothèque et de l’organisation **Épisode** réordonnent les sous-blocs au sein de leur bloc actuel. Glisser la poignée à la souris ou au toucher ; au clavier, la sélectionner, appuyer sur Espace, utiliser les flèches, puis Espace pour déposer ou Échap pour annuler. L’ordre est enregistré par l’API existante ; un échec conserve l’ordre précédent et propose de réessayer. Le déplacement entre blocs reste accessible par **Scène → Séquence**.

Dans la timeline, déposer un élément de texte sur **Dialogues**, **Notes internes** ou **Action** change son type. En Compacte, **Plans visuels** convertit le texte en action. Le texte, le personnage et les autres paramètres restent conservés, ce qui permet de revenir au type précédent. Un déplacement sur la même piste réordonne les plans et leurs couches. Les médias et les pistes verrouillées ne sont pas convertis. Le sélecteur **Type du bloc** reste disponible pour changer de type au clavier ; **Annuler/Rétablir** prend en charge les conversions locales.

Cliquer sur le titre du sous-bloc dans l’en-tête pour le renommer, puis Entrée ou le bouton d’enregistrement pour valider. Échap annule. Le titre est aussi accessible dans l’onglet **Scène**. Un échec garde le titre saisi et affiche l’erreur ; le changement de sous-bloc attend la réussite de l’enregistrement.

Les menus utilisent la couche supérieure native du navigateur, ce qui leur permet de dépasser les panneaux du Studio. Les fenêtres d’import, de médias et d’aide utilisent un dialogue modal natif : arrière-plan inactif, Échap pour fermer et restitution du focus. Les explications de portraits, décors, animations et timeline sont disponibles via leurs boutons **Aide**.

### Import Markdown et personnages

**Importer → Ouvrir un fichier .md / .txt** accepte aussi `.markdown` (UTF-8, 2 Mo maximum). Le texte collé reste disponible. L’aperçu liste les blocs avant toute modification. Les balises Narra et le Markdown peuvent cohabiter : titres `#`, noms en gras ou `NOM: réplique`, indications de dialogue, coupes `---` (même sans ligne vide), `***`, `___` et variantes espacées. Les clôtures de code englobantes sont ignorées ; un en-tête YAML simple n’est pas importé comme contenu narratif.

Les noms sont rapprochés des alias, noms complets, prénoms et noms de famille sans tenir compte de la casse, des accents ou de la ponctuation. Les noms ambigus restent à associer. La section **Personnages du script** permet de corriger une association pour toutes les répliques portant ce nom source ; aucun personnage n’est créé ou renommé dans l’univers. Les noms inconnus restent conservés dans les indications du dialogue. Vérifier l’aperçu pour les titres en gras qui peuvent aussi ressembler à des noms.

### Vérification locale du patch

- `npm run test:import` : découpage, formats mixtes, noms ambigus, associations et conversion des types.
- `npm run test:navigation` et `npm run test:animations` : régressions des fonctions partagées.
- `NARRA_PUPPETEER_MODULE=/chemin/vers/puppeteer-core NARRA_CHROME=/chemin/vers/chrome npm run test:studio-patch` : lance un serveur Next.js local avec une route QA temporaire, teste les interactions au pointeur et au clavier, les erreurs, l’import, les fenêtres et les dispositions Compacte/Détaillée à 1440, 390 et 320 px. Captures et rapport sous `.impeccable/review/patch-*`. La route est supprimée en fin de test.

Ce parcours utilise des réponses API interceptées. Il ne prouve ni la persistance PostgreSQL réelle, ni le SSO Kyros, ni le fonctionnement sur appareil tactile physique, ni un déploiement.

Validation locale effectuée le 13 novembre 2026 : les 21 tests import/navigation/animations passent ; le parcours Chrome for Testing via Puppeteer passe en Compacte et Détaillée aux trois largeurs, sans erreur JavaScript. Le build Next.js de production compile, vérifie les types et génère les pages. `npm run lint` demande une configuration ESLint absente du dépôt ; un contrôle ciblé des fichiers modifiés avec la configuration Next Core Web Vitals passe sans erreur (11 avertissements : images natives et une dépendance de hook dans le moniteur existant).


## Réglages du sous-bloc

**Réglages**, dans l’en-tête des deux dispositions, ouvre une fenêtre dédiée au sous-bloc sélectionné. Les trois points d’une ligne de bibliothèque ouvrent la même fenêtre pour ce sous-bloc, après sauvegarde du travail courant si nécessaire. Le bouton est désactivé en l’absence de sous-bloc sélectionné.

La fenêtre réutilise les champs de l’inspecteur **Scène** : titre, statut, séquence, titre de lecture, visibilité du titre, décor et animations. **Enregistrer** sauvegarde le titre, les réglages et les éléments modifiés ; un échec garde la fenêtre et les valeurs avec un message d’erreur. **Fermer** ou Échap ferme la fenêtre et conserve les valeurs en cours dans l’éditeur ; ce n’est pas une annulation. Le sélecteur de médias peut s’ouvrir au-dessus puis restitue le focus à la fenêtre de réglages. En lecture seule, les champs sont protégés et l’action d’enregistrement est masquée.

Auparavant, depuis le commit `4a361f5`, le bouton sélectionnait uniquement l’onglet Scène de l’inspecteur, déjà actif par défaut ; aucun dialogue n’était ouvert. Le clic pouvait donc ne produire aucun changement visible, particulièrement lorsque l’inspecteur se trouvait plus bas sur mobile.

Le banc `npm run test:studio-patch` couvre l’ouverture depuis l’état initial, l’enregistrement, les échecs et reprises, Échap et le focus, les trois points d’une autre scène, le sélecteur de médias imbriqué, la lecture seule et les fenêtres à 1440, 390 et 320 px dans les deux dispositions. Captures `settings-*` sous `.impeccable/review/`. Les appels API restent simulés dans ce banc.

Validation du correctif Réglages : parcours Puppeteer réussi avec erreurs API simulées et médias imbriqués, 25 tests unitaires réussis, build complet `NARRA_NEXT_DIST_DIR=.next-qa/settings-build npm run build` réussi. ESLint ciblé : 0 erreur, 2 avertissements d’images natives. Aucun déploiement ni essai PostgreSQL/SSO réel.


## Retraite des anciens éditeurs

Le V2 devient le Studio principal à `/project/[projectId]/edit`, sans commutateur de version. L’en-tête affiche **Studio** et le menu Disposition ne propose plus d’ancien éditeur. Le code de Montage, les deux anciennes pages d’édition de scènes et leur feuille de style sont retirés. Les styles de la vue d’épisode restent dans son propre module.

Les anciennes adresses répondent par une redirection permanente HTTP 308 : `/edit-v2` et `/scenes` mènent à `/edit` ; `/scenes/[sceneId]` mène à `/edit?scene=[sceneId]`. Les paramètres de requête sont conservés. Un lien de scène ouvre son épisode et ce sous-bloc précis ; un identifiant absent du projet revient à la sélection habituelle. La route cible conserve les contrôles d’accès du projet. Les liens du tableau de bord et du lecteur utilisent directement l’adresse canonique.

Le lecteur et ses fonctions de lecture restent disponibles ; aucune migration ni modification de contenu n’accompagne ce retrait.

Validation du retrait V1 : 25 tests unitaires réussis ; parcours Chrome/Puppeteer sur les deux dispositions à 1440, 390 et 320 px, avec vérification réelle des trois redirections HTTP 308, conservation de la scène et des paramètres répétés, protection de la route canonique sans session et entrée d’édition unique. Le rendu du Studio et les mutations utilisent les API simulées du banc ; PostgreSQL, SSO réel et déploiement restent hors validation. Build complet `NARRA_NEXT_DIST_DIR=.next-qa/studio-main-build npm run build` réussi. ESLint ciblé : 0 erreur, 3 avertissements d’images natives.


## Scènes longues et échelle de timeline

La largeur de travail ne dépend plus uniquement de la durée totale de la scène : à l’échelle normale, un plan estimé à trois secondes dispose d’environ 188 px utiles, même dans une scène de plusieurs centaines d’éléments. Les pistes se parcourent horizontalement, avec les intitulés fixes à gauche. Le pointeur, le clavier et les gestes habituels de défilement restent disponibles ; le conteneur des pistes peut recevoir le focus au clavier.

**Adapter** fournit une vue d’ensemble qui tient dans le panneau. Les petits segments y sont volontairement dessinés comme des repères, sans vignettes ni texte illisible. Leur largeur respecte leur position temporelle : aucune largeur minimale ne les fait déborder sur leurs voisins. Le bouton devient **Lisible** pour retrouver l’échelle de travail. Les graduations temporelles sont espacées en fonction du nombre de pixels disponibles, y compris sur mobile. Les titres complets restent disponibles au survol et via les libellés accessibles des plans.

Le curseur est ramené dans la partie visible lors de la lecture, du passage au début ou au dernier plan et des changements de zoom. Un défilement manuel reste possible pour parcourir la scène. Le changement de sous-bloc revient à l’échelle normale. Les durées restent des estimations ; aucune durée, aucun ordre ni contenu enregistré n’est modifié par ce changement d’affichage.

Le banc navigateur inclut une scène synthétique de **267 éléments et près de treize minutes**, en Compacte et Détaillée à 1440, 390 et 320 px : échelle initiale, vue d’ensemble, absence de chevauchement des segments et graduations, maintien du plan sélectionné lors du zoom, accès au dernier plan, retour au début et réordonnancement. Captures `timeline-long-*` sous `.impeccable/review/`. `npm run test:timeline` contrôle la géométrie sur scènes courtes, longues et vides. Ces essais utilisent des API simulées, sans modifier la production.

Validation de la timeline longue : 29 tests unitaires réussis, parcours Chrome for Testing/Puppeteer réussi sur les deux dispositions à 1440/390/320 px, sans chevauchement de plans/graduations et sans commandes rognées dans la barre d’outils. Le build complet `NARRA_NEXT_DIST_DIR=.next-qa/timeline-readable-build npm run build` passe. ESLint ciblé : 0 erreur, 3 avertissements d’images natives. Aucun déploiement ni essai sur les données réelles de production.
