# Changelog

## En préparation — patch Studio (2026-11-13)

- Timeline lisible sur les scènes longues : échelle de travail par défaut, défilement horizontal, vue d’ensemble à la demande, repères de temps espacés selon le zoom et suivi du curseur.

- Le Studio issu du V2 devient l’unique éditeur à `/edit` ; Montage et les anciens écrans de scènes sont retirés, avec redirections permanentes conservant les liens vers les scènes.

- Le bouton Réglages et les trois points d’un sous-bloc ouvrent une fenêtre dédiée dans les deux dispositions, avec sauvegarde complète, erreurs visibles et restitution du focus.

- Navigation isolée par épisode : sélecteur permanent, ouverture sur le premier épisode réel, bibliothèque limitée à ses sous-blocs, Prologue/Intro dans Hors épisodes et création correctement rattachée dans les épisodes vides.

- Poignées de réordonnancement fonctionnelles dans la bibliothèque et l’organisation de l’épisode, au pointeur et au clavier ; conservation de l’ordre en cas d’échec de sauvegarde.
- Menus du Studio dans la couche supérieure du navigateur et fenêtres d’import/médias accessibles, indépendantes du rognage des panneaux, en Compacte comme en Détaillée.
- Conversion des éléments de texte par dépôt sur une autre piste : Dialogue, Action, Note ; texte et paramètres conservés, pistes verrouillées respectées.
- Import de fichiers `.md`, `.markdown` et `.txt`, découpage mixte Markdown/balises, coupes `---`, `***`, `___`, noms accentués et correspondances de personnages vérifiables avant import.
- Renommage depuis le titre du sous-bloc, aides ouvertes à la demande et réglage de boucle musicale dans l’inspecteur.

## 0.12.0 — 2026-10-08

- Studio V2 en parallèle du montage actuel : déroulé vertical, écriture directe, aperçu VN, inspecteur Bloc/Scène/Univers, duplication, déplacement et disposition mémorisée.
- 38 effets de caméra, action, transition, cinéma et environnement combinables, avec pistes d’entrée et pistes continues, durées, délais, intensité, direction, vitesse, progression, répétition et ancrage.
- Moteur partagé entre aperçu et lecteur : les animations continues restent actives entre les dialogues ; Fade in et Fade out peuvent se superposer avec un délai.
- Wiki enrichi avec personnalité, motivations, forces, faiblesses, apparitions déduites des dialogues, lieux, organisations et lore ; navigation de l’aperçu et contrôle d’accès corrigés.
- Migrations complétées pour les animations et les anciens ajouts de schéma non suivis (lieux, collaborations, invitations, progression de lecture).

## 0.11.25 — 2026-09-28

- L’éditeur peut ouvrir une lecture de contrôle directement depuis le plan sélectionné, sans reprendre l’œuvre depuis le début.

## 0.10.2 — 2026-09-13

- Chaque dialogue du Visual Novel peut masquer le portrait ou afficher précisément le portrait principal ou une image du personnage.

## 0.10.0 — 2026-09-13

- Nouvelle bibliothèque éditoriale avec œuvres à la une, couvertures, métadonnées et progression.
- Pages publiques d’histoire avec navigation lecteur réduite à Lire/Reprendre et Wiki.
- Wiki public des personnages avec fiches, portraits, biographies, sections libres, relations et organisations.
- Éditeur de personnage enrichi : portrait principal, sections de wiki et gestion des relations.
- Espaces Personnages, Organisations et Lieux fusionnés avec navigation interne et atelier de prompts contextualisés.
- Séparation de la couverture de bibliothèque et du décor de lecture dans la page de présentation.
- Fond de secours composé pour le lecteur Visual Novel lorsqu’aucun décor n’est renseigné.
- Les changements d’arrière-plan deviennent des temps de lecture à part entière, avec le choix « Image seule » ou « Image + texte ».
