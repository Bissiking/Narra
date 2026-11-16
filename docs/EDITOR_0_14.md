# Éditeur 0.14 : sélection, musiques et dossiers

## Sélection et presse-papiers

Cliquer un plan puis **Shift-clic** sur un autre sélectionne la plage entière. **Cmd/Ctrl-clic** ajoute ou retire un élément. Les couches visuelles et sonores du plan, ainsi que ses déclenchements musicaux explicites, accompagnent le texte.

La barre sous les commandes de timeline propose **Copier**, **Couper**, **Coller** et **Nouveau sous-bloc depuis la sélection**. Le clic droit dans le Studio ouvre les mêmes actions, plus **Dupliquer**, **Tout sélectionner** et **Supprimer la sélection**. Le menu se commande avec les flèches, Début/Fin, Entrée et Échap ; **Shift+F10** l’ouvre au clavier. Le clic droit natif reste disponible dans les champs de texte et les fenêtres.

| Raccourci hors champs | Action |
|---|---|
| Cmd/Ctrl+C, X, V | Copier, couper, coller les éléments |
| Cmd/Ctrl+A | Tout sélectionner |
| Cmd/Ctrl+D | Dupliquer la sélection |
| Suppr / Retour arrière | Supprimer les éléments sélectionnés |
| Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z | Annuler / rétablir les modifications locales |

Dans les champs, les raccourcis d’édition de texte restent natifs. Une piste verrouillée bloque les mutations qui la concernent. Un lecteur peut copier ; il ne peut pas modifier le récit.

La copie conserve le contenu, les personnages, les médias et les animations. Le collage crée de nouveaux identifiants et de nouveaux groupes de playlist, et remappe les départs musicaux internes. Il insère après la sélection et fonctionne entre sous-blocs **du même projet**. Le collage depuis un autre projet est refusé pour préserver les références aux personnages et médias. Le format du presse-papiers est un objet JSON `narra-blocks/v1` ; le collage de texte ordinaire reste disponible dans les champs.

Si l’accès au presse-papiers système est indisponible, les boutons utilisent une copie interne à Narra, conservée tant que l’application reste ouverte. Le statut le précise. Une copie coupée reste récupérable par Coller et par Annuler avant sauvegarde. Une lecture/écriture asynchrone du presse-papiers ne modifie pas une scène dont le contenu a changé pendant l’attente.

## Découper en sous-blocs

**Nouveau sous-bloc depuis la sélection** demande un nom puis déplace les éléments dans un nouveau sous-bloc, immédiatement après la source, dans la même séquence et le même épisode. Le nouveau sous-bloc devient actif et son adresse conserve `?scene=…` pour le retrouver après rechargement.

L’API `POST /api/scenes/:sceneId/extract` reçoit les éléments locaux complets, `selectedIds`, `title` et `baseVersions` (identifiants et `updatedAt` de la dernière lecture/sauvegarde). Une transaction PostgreSQL sérialisable enregistre les modifications, crée la destination, déplace les éléments et recalcule les ordres et comptes de mots. Les identifiants persistés sont conservés. Un conflit de version ou un échec annule la transaction entière ; la fenêtre et les modifications locales restent disponibles. Les personnages sont validés dans le projet avant écriture.

La sauvegarde et le déplacement ne s’exécutent pas en parallèle. Les départs musicaux dont le plan est retiré sont rattachés au premier plan restant, ou au début du sous-bloc s’il n’en reste aucun. Un découpage est une opération enregistrée ; l’historique local Annuler est remis à zéro après son succès.

## Plusieurs musiques et playlists

1. Sélectionner un plan puis **Ajouter → Musique** pour créer un déclenchement à cet endroit.
2. Choisir un fichier. Son nom lisible remplace le nom technique dans la timeline.
3. Dans l’inspecteur, **Ajouter un titre à cette playlist** ajoute une piste au même déclenchement. Le glisser-déposer sur la piste Musique permet de réordonner les titres d’une playlist.
4. **Plan de départ musical** déplace toute la playlist vers un autre plan, sans modifier le contenu visuel.
5. Pour un changement, créer une autre musique/playlist à un autre plan. **Ajouter → Arrêter la musique ici** ajoute une commande d’arrêt au plan sélectionné.

Une playlist se poursuit jusqu’au déclenchement suivant ou à un arrêt. Ses pistes se lisent dans l’ordre, puis toute la playlist recommence si toutes les pistes autorisent la boucle. Deux déclenchements au même plan suivent l’ordre des commandes : le dernier prend effet. Les anciennes musiques sans départ explicite restent une playlist au début du sous-bloc.

`audioStartBlockId` rattache une commande à un plan ; `audioGroupId` réunit ses titres. Les identifiants de départ temporaires sont remappés à la sauvegarde. Le moteur de sélection musicale est partagé entre Studio et lecteur VN ; les fichiers audio gardent leur durée réelle. La durée affichée des plans et la répartition graphique des titres restent **estimées**. Le lecteur conserve ses fondus entre playlists.

## Médiathèque

La page Médias et tous les sélecteurs partagent le même navigateur : dossiers imbriqués, arborescence sur bureau, fil d’Ariane, recherche par nom, filtre de type et vues grille/liste. Sur mobile, **Portée des médias** permet de passer du dossier courant à tous les fichiers.

- **Nouveau dossier** crée un dossier dans l’emplacement courant ou dans le parent choisi.
- Le menu d’un dossier permet de le renommer, de changer son parent et de le supprimer s’il est vide. Un dossier ne peut pas être déplacé dans l’un de ses descendants.
- Le menu d’un fichier permet de le renommer ou de le ranger dans un autre dossier.
- **Importer** accepte plusieurs fichiers dans le dossier courant. Le dépôt de fichiers sur le navigateur de médias utilise le même envoi. La limite existante de 25 Mo par fichier est conservée.
- Supprimer un média le retire de la bibliothèque ; son fichier physique reste disponible pour les scènes existantes.

Les dossiers sont logiques : aucun fichier physique n’est déplacé, aucune URL existante ne change. Deux dossiers d’un même parent ne peuvent pas avoir le même nom, sans distinction de casse. Les créations, déplacements, renommages et suppressions demandent les droits propriétaire/éditeur.

API : `GET/POST /api/projects/:projectId/media-folders`, `PATCH/DELETE …/media-folders/:folderId`, `PATCH …/media/:mediaId` (`folderId`, `originalName`) et upload multipart avec `folderId` facultatif.

## Migration

Avant de démarrer la nouvelle version sur une base existante :

```bash
npx prisma migrate deploy
npx prisma generate
```

`20261116120000_editor_selection_audio_folders` ajoute les deux colonnes musicales facultatives, `media_folders` et `media.folder_id`. Les fichiers existants apparaissent à la racine. Les contenus narratifs, URL et playlists existantes sont conservés.

## Validation locale et reproduction

Les tests utilisent une base PostgreSQL dédiée nommée **narra_editor_update_qa**, jamais le SSO Kyros réel. Le banc API vérifie les transactions, conflits de versions, conservation des identifiants, ordres et comptes, personnages étrangers au projet, droits propriétaire/éditeur/lecteur/externe, dossiers imbriqués, doublons, cycles et upload dans un dossier.

```bash
# Dans un cluster PostgreSQL LOCAL isolé, avec DATABASE_URL pointant vers narra_editor_update_qa :
npx prisma migrate deploy
npm run test:editor-api

# Serveur local utilisé par le banc navigateur (session synthétique, port 3041) :
NARRA_SESSION_SECRET=synthetic-narra-editor-update-test-secret-only \
NARRA_NEXT_DIST_DIR=.next-qa/editor-update PORT=3041 HOSTNAME=127.0.0.1 npm run dev

# Autre terminal : chemins vers Puppeteer Core et Chrome for Testing installés localement.
NARRA_PUPPETEER_MODULE=/chemin/vers/puppeteer-core \
NARRA_CHROME=/chemin/vers/Chrome npm run test:editor-browser

npm run test:selection
npm run test:import
npm run test:navigation
npm run test:timeline
npm run test:animations
```

Le banc API prépare un nouveau projet synthétique à chaque exécution et écrit sa session locale dans `.impeccable/editor-update-fixture.json` (ignoré par Git). Relancer le banc API avant chaque exécution du parcours navigateur. Ce dernier crée ses fichiers audio/image sous `public/uploads/editor-update-qa`, à supprimer après les essais. Arrêter ensuite le serveur et le cluster dédiés.

Le parcours navigateur utilise les vraies routes Next et la base locale. Il simule uniquement un refus HTTP du déplacement pour vérifier la reprise ; le second essai exécute la transaction réelle. Il couvre sélection/plage, presse-papiers, duplication, annulation, champs natifs, menu clavier, découpage, playlists, lecture WAV réelle et arrêt dans Studio/lecteur, dossiers, renommage/rangement et lecture seule. Captures à 1440/390/320 px et rapport dans `.impeccable/review/editor-update-*`.

Le banc historique `test:studio-patch` reste un parcours aux API simulées et couvre aussi les scènes de 267 éléments et les deux dispositions. Ces preuves locales ne constituent pas un déploiement, une validation du SSO réel ou un essai sur appareil tactile physique.

Validation effectuée le 16 novembre 2026 :

- [x] 14 migrations appliquées sur un cluster PostgreSQL 14 local isolé (port 5589).
- [x] 34 tests unitaires import, navigation, timeline, animations, sélection et commandes musicales réussis.
- [x] Banc API sur PostgreSQL réel : transaction de découpage, conflit et rollback, éléments encore temporaires avec départ musical remappé, conservation des identifiants, droits et rangement de médias.
- [x] Parcours Chrome for Testing/Puppeteer sur les vraies routes locales : sélection Shift, presse-papiers, copie entre sous-blocs avec musiques, raccourcis, texte natif, menu contextuel au clavier, échec/reprise du déplacement, playlists et arrêt persistés, lecture WAV réelle dans le Studio et le lecteur VN, sous-dossiers, rangement/renommage et lecture seule.
- [x] Rendu vérifié à 1440, 390 et 320 px, fenêtres de découpage dans l’écran, aucun débordement de page et aucune erreur JavaScript.
- [x] Banc historique `test:studio-patch` réussi sur les deux dispositions, y compris la scène synthétique de 267 éléments, les pistes verrouillées, le glisser-déposer, Réglages, les redirections et l’isolation des épisodes. Les API de ce banc historique restent simulées.
- [x] `NARRA_NEXT_DIST_DIR=.next-qa/editor-014-build npm run build` réussi ; contrôle TypeScript séparé réussi.
- [x] ESLint ciblé avec Next Core Web Vitals : zéro erreur, neuf avertissements (images natives et dépendance d’un effet du lecteur préexistant). Correction au passage d’un `useMemo` du lecteur placé après un retour conditionnel.

Les captures et rapports locaux se trouvent dans `.impeccable/review/editor-update-*` et `patch-browser-report.json`. Le contrôle Impeccable n’a remonté aucune règle bloquante ; les nouveaux petits textes de la médiathèque suivent les pas documentés. L’exception antérieure `border-accent-on-rounded`, limitée au fichier Studio pour le triangle CSS du curseur, est conservée, sans nouvelle suppression. Les avis sur les couleurs, tailles et arrondis existants du Studio sont conservés : cette identité est l’exception documentée dans `STUDIO_V2.md`. La désynchronisation signalée entre `DESIGN.md` et son référentiel Impeccable n’a pas été réparée dans cette mise à jour.

Ces essais ne constituent pas un déploiement, un test du SSO Kyros réel, un essai sur les données de production ou une validation tactile sur appareil physique.
