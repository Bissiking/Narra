# Navigation Épisode / Sous-bloc

## Audit avant modification

Narra utilise Next.js 14 App Router, React 18, TypeScript, Tailwind et Prisma/PostgreSQL. Le Studio V2 partage EditorWorkspace avec Montage. NarrativeNode stocke les saisons, épisodes et niveaux intermédiaires avec parentId/order ; Scene contient les éléments SceneBlock et est rattachée à un nœud. Les types d'éléments, les médias, personnages et animations restent ceux du moteur VN.

buildCompositePlans associe chaque élément principal aux décors en couche et effets sonores qui le précèdent ; la musique forme une playlist indépendante. PreviewMonitor parcourt ces plans et AnimatedBackdrop conserve les effets du décor actif. Les blocs sont chargés par scène et sauvegardés en totalité par PUT, avec sauvegarde automatique, protection des changements non enregistrés et collaboration WebSocket. Les composants SceneBlockItem et SceneScriptImporter sont réutilisés. Le glisser-déposer utilise déjà dnd-kit.

## Portée et compatibilité

Cette évolution porte sur les deux modes de navigation. Un sous-bloc affiché correspond à une Scene existante, ses éléments restent des SceneBlock. Les nœuds descendants d'un épisode forment ses blocs et niveaux d'organisation. Aucun identifiant, fichier, référence de lecture ou schéma de base ne change. Les scènes sans ancêtre épisode restent regroupées par racine, ou dans Sans rattachement.

Le mode Épisode expose tous les blocs et sous-blocs de l'épisode courant. Le mode Sous-bloc conserve le montage composite de la seule scène ouverte. La bascule ne modifie pas les données. Un changement de sous-bloc sauvegarde les éléments courants et reste bloqué si cette sauvegarde échoue. Le réordonnancement ne modifie que order sur les scènes du même nœud, en transaction ; il ne déplace ni médias ni éléments.

Cette extension de navigation ne nécessite aucune migration ; les migrations de la version Studio V2 sont documentées séparément dans [Studio V2 et animations](STUDIO_V2.md). Pour revenir à l'ancienne interface, ouvrir Montage : les mêmes scènes sont toujours lisibles et éditables. Les durées de l'aperçu actuel sont indicatives (pas de durée persistée par élément) ; la vue d'épisode affiche des comptes d'éléments plutôt qu'un minutage fictif.

## Direction

Les deux images fournies par l’utilisateur (`C:/Users/mathe/Pictures/LUMA/NARRA/editeur_v2.png` et `editeur_v2-1.png`, 1672 × 941px) fixent désormais la géométrie du Studio V2. Elles sont disponibles comme dispositions Compacte et Détaillée ; ce choix remplace le précédent brief visuel ouvrant sur l’épisode. La bibliothèque reste à gauche, l’aperçu dominant au centre, l’inspecteur à droite et la timeline sur toute la largeur inférieure. L’édition du texte passe par la sélection de timeline et l’inspecteur.

Mode Operate, anthracite et ambre, panneaux localement arrondis et pistes colorées conformément aux références épinglées. Cette exception s’applique uniquement à `/project/[projectId]/edit-v2`, via `studio-v2.module.css`. La bascule de portée conserve le contexte narratif ; la vue Épisode sert l’organisation, et Sous-bloc isole l’édition. Sur écran étroit, aperçu, bibliothèque, timeline et inspecteur se superposent ; le défilement horizontal reste interne à la timeline.

`DESIGN.md`, `PRODUCT.md` et `.impeccable/design.json` sont conservés. Le brief de surface `.impeccable/surfaces/src-app-project-projectid-edit-v2-page-tsx.md` consigne ce choix local et remplace, pour cette route, les indications antérieures sur une ouverture en Épisode, l’écriture centrale et la timeline optionnelle.

## Utilisation

Studio V2 démarre en mode **Sous-bloc**, dans la disposition **Compacte** si aucun choix n’est mémorisé. Le menu **Disposition** choisit Compacte (cinq pistes) ou Détaillée (sept pistes) et garde ce choix dans le navigateur. La bascule conserve les éléments et la navigation. La bibliothèque présente les scènes groupées avec leurs vignettes ; choisir une scène en mode Sous-bloc ouvre son montage isolé. Sélectionner un segment de timeline affiche son édition dans l’inspecteur **Bloc** ou **Plan**.

**Épisode** affiche tous les blocs et sous-blocs de l’épisode actif ; le sélecteur change d’épisode. Sélectionner une ligne affiche les réglages du sous-bloc sans entrer dans son montage. Les flèches changent l’ordre des sous-blocs d’un même bloc. Gérer les blocs et épisodes ouvre l’éditeur de structure existant. **Ouvrir**, **Monter ce sous-bloc** ou un segment du déroulé inférieur revient au mode Sous-bloc. La bascule **Épisode** retrouve l’organisation sans réinitialiser les éléments courants.

Changer de sous-bloc ou d’épisode sauvegarde les éléments modifiés et les réglages courants ; un échec bloque le changement et conserve les valeurs avec un message d’erreur. **Sauver** est dans l’en-tête Compacte et dans **Disposition** en Détaillée ; **Ctrl+S** déclenche la même sauvegarde principale. Les éléments sont aussi sauvegardés automatiquement toutes les 30 secondes. L’onglet **Scène** expose le statut, la séquence et le titre de lecture ; **Enregistrer les réglages** permet une sauvegarde directe. La création propose le bloc courant comme rattachement.

Le déroulé de l’épisode représente l’ordre narratif des sous-blocs ; il n’assemble pas leurs éléments dans une timeline globale. Les cinq ou sept pistes et **Temps estimés** concernent uniquement la scène ouverte. Les durées sont calculées depuis le texte, pas persistées comme des clips. **Exporter**, disponible en Détaillée, télécharge l’instantané JSON `.narra.json` de cette scène ; aucun rendu vidéo n’est produit. Voir [Studio V2 et animations](STUDIO_V2.md) pour les contrôles de lecture, d’insertion et d’inspection.

## Validation

La première extension Épisode / Sous-bloc du 8 octobre 2026 avait passé 4 tests de navigation et 4 tests d’animations, TypeScript et la compilation de production. Son banc `node tests/studio-navigation.browser.cjs`, à API simulées, couvrait 1920, 1440 et 390px : regroupement, isolation, réordonnancement/rechargement simulé, sauvegarde de tous les éléments, panne de sauvegarde et lecture seule. Ces résultats historiques concernent la navigation avant la reconstruction des dispositions.

La reconstruction Compacte/Détaillée a ensuite passé TypeScript, les mêmes 8 tests unitaires et `node tests/studio-v2-layout.browser.cjs`. Ce nouveau banc couvre la persistance locale de la disposition, les cinq/sept pistes, l’édition conservée à la bascule, les interactions de timeline, annuler/rétablir, masquer/verrouiller, le téléchargement JSON, l’organisation et le montage isolé, le réordonnancement, la sauvegarde intégrale des éléments, les échecs et reprises des réglages, l’accès en lecture et les cinq largeurs 1672, 1440, 1920, 390 et 320px sans débordement de page. La revue finale, limitée aux deux finitions demandées, confirme les corrections de texte et de libellé Temps estimés dans les dix captures. ESLint : 0 erreur, 4 avertissements d’images dynamiques. Les captures et journaux restent sous `.impeccable/`, ignoré par Git.

Le banc `tests/studio-navigation.browser.cjs` a aussi été relancé avec l’interface actuelle et `NARRA_QA_SKIP_CAPTURE=1` : modes, isolation, réordonnancement puis rechargement simulé, sauvegarde complète, panne bloquante, épisodes vides, lecture seule et absence de débordement à 1920, 1440 et 390px passent. Cette relance n’a pas remplacé les captures de référence.

Définir `NARRA_CHROME` et `NARRA_PLAYWRIGHT_MODULE` si ces outils sont installés hors du projet ; `NARRA_STUDIO_QA_PORT` choisit le port du nouveau banc. Les bancs utilisent des API simulées, ne modifient aucune donnée réelle et retirent leur route temporaire à la fin.

La base PostgreSQL configurée localement était indisponible pendant la reconstruction. La persistance et le réordonnancement sur une base réelle, le SSO et le minutage de lecture des médias restent à vérifier de bout en bout. Le rechargement du banc utilise uniquement l’état des API simulées. L’API de réordonnancement vérifie les droits d’édition du projet et exige la liste exacte des scènes actives du même nœud ; sa transaction sérialisable évite un ordre partiellement enregistré. La compilation directe Next.js a réussi (journal `.impeccable/studio-v2-build.log`, code de sortie 0). Le pipeline complet `npm run build` n’est pas validé : la régénération du client Prisma a rencontré un verrou Windows (`EPERM` sur `query_engine-windows.dll.node`, DLL en cours d’utilisation). Aucune mise en production n’est lancée.
