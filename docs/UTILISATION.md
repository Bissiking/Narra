# Guide d’utilisation de Narra

Narra permet de regrouper une œuvre, sa structure narrative et ses éléments de référence dans un même projet.

## 1. Créer un projet

1. Connectez-vous avec Kyros.
2. Depuis la bibliothèque, choisissez **Nouveau projet**.
3. Renseignez le nom, le type d’œuvre, son statut et, si besoin, ses genres.
4. Ouvrez le projet créé.

Un projet peut représenter un roman, une série, un scénario, un visual novel, une bande dessinée ou un univers narratif.

## 2. Organiser une histoire en plusieurs saisons

Ouvrez **Structure** depuis le projet. La structure est une arborescence libre : chaque saison peut contenir ses propres épisodes, chapitres, arcs et blocs.

Exemple conseillé pour une série :

```text
Saison 1
├── Épisode 1
│   ├── Chapitre 1
│   └── Chapitre 2
└── Épisode 2
    └── Chapitre 3
Saison 2
├── Épisode 1
└── Épisode 2
```

Pour la construire :

1. Choisissez **Ajouter une saison ou une racine**.
2. Sélectionnez le type **Saison**, puis donnez-lui un titre.
3. Survolez la saison et choisissez **Ajouter** pour créer un enfant.
4. Répétez l’opération pour chaque épisode, chapitre ou autre niveau utile.

Les anciennes structures qui utilisaient un nœud **Saga** nommé « Saison » restent compatibles. Il n’est pas nécessaire de les recréer.

### Types de niveaux disponibles

La structure accepte les sagas, cycles, saisons, volumes, livres ou tomes, parties, épisodes, numéros, actes, séquences, chapitres, sections, pages, arcs narratifs, routes ou branches, blocs et niveaux personnalisés.

Lorsque vous ajoutez un enfant, Narra place en premier les types les plus logiques pour son parent. Les autres types restent disponibles afin de prendre en charge des organisations hybrides.

### Modifier, déplacer ou supprimer un niveau

Sélectionnez un niveau dans l’arborescence pour ouvrir son panneau de gestion. Vous pouvez alors :

- modifier son titre, son type et sa description ;
- choisir un autre parent pour déplacer toute sa branche ;
- changer sa position parmi les niveaux voisins ;
- supprimer le niveau et tous ses descendants.

Narra empêche de déplacer un niveau dans l’un de ses propres descendants. Lors d’une suppression, les scènes ne sont pas supprimées : elles sont conservées dans **Sans rattachement**.

## 3. Créer et écrire une scène

1. Ouvrez **Scènes**.
2. Choisissez **Nouvelle** dans la colonne de gauche.
3. Donnez un titre à la scène.
4. Dans **Emplacement**, sélectionnez la saison, l’épisode ou le chapitre auquel elle appartient.
5. Choisissez **Créer la scène**.

Les scènes sont regroupées par racine — généralement par saison — et affichent leur chemin complet. Une scène peut aussi rester **Sans rattachement**.

Dans l’éditeur, ajoutez des blocs selon le contenu :

- **Narration** pour le texte narratif ;
- **Dialogue** pour une réplique associée à un personnage et, éventuellement, une émotion ;
- **Action** pour une action ou une indication de mise en scène ;
- **Titre** pour séparer les parties de la scène.

Utilisez les flèches pour réordonner les blocs et la croix pour en retirer un. La sauvegarde automatique intervient toutes les 30 secondes ; le bouton **Sauvegarder** permet de l’effectuer immédiatement.

### Importer une scène préparée avec GPT

Dans la barre de l’éditeur, choisissez **Importer**, puis **Copier le prompt pour GPT**. Ajoutez votre scène à la fin du prompt et envoyez-le à GPT. Collez ensuite sa réponse dans Narra : un aperçu indique combien de plans, actions, dialogues et transitions ont été détectés avant toute modification.

Le format accepté est le suivant :

```text
[PLAN] INT. BUREAU — JOUR
[ACTION] Soren ouvre la porte.
[DIALOGUE:SOREN|worried|left] Ça commence bien.
[NARRATION] Le silence retombe.
[TRANSITION] FONDU AU NOIR
```

- **PLAN** crée une nouvelle section ou un nouveau cadrage dans la lecture visual novel ;
- **DIALOGUE** accepte le personnage, puis facultativement l’émotion et la position (`left`, `center` ou `right`) ;
- les personnages sont associés automatiquement aux fiches du projet par leur prénom, nom complet ou alias ;
- l’import peut être ajouté à la suite des blocs existants ou les remplacer ;
- un scénario déjà écrit en Markdown peut aussi être collé directement : Narra reconnaît les titres et les noms de personnages en gras.

## 4. Développer l’univers

Les autres sections du projet servent de base de référence :

- **Personnages** : identité, rôle, biographie, motivations et relations ;
- **Lieux** : endroits et sous-lieux utilisés dans l’histoire ;
- **Organisations** : groupes, membres et rôles ;
- **Lore** : règles, concepts, événements historiques et éléments d’univers ;
- **Timeline** : chronologie interne de l’œuvre ;
- **Médias** : images et autres ressources liées au projet ;
- **Recherche** : recherche transversale dans les éléments du projet.

### Ajouter un personnage

Depuis **Personnages**, choisissez **Ajouter**. Un prénom, un nom ou un alias suffit pour créer la fiche ; les autres champs peuvent être complétés immédiatement ou plus tard. Après la création, Narra ouvre directement la fiche détaillée du personnage.

### Couleur de nom et expressions des personnages

La fiche d’un personnage contient une **couleur de nom**. Elle est utilisée dans les dialogues afin de retrouver le code visuel des visual novels et AVN.

Dans la section **Expressions**, ajoutez autant d’images que nécessaire : joyeux, triste, en colère, surpris, neutre, etc. Chaque image possède un libellé, une émotion et une URL. Vous pouvez aussi téléverser une image directement depuis la fiche. Dans un bloc de dialogue, choisissez ensuite l’émotion voulue pour afficher l’expression correspondante.

### Construire les lieux et organisations

- Dans **Lieux**, choisissez **Ajouter**, puis indiquez éventuellement un lieu parent pour créer une géographie hiérarchique (monde, pays, ville, bâtiment, pièce…).
- Dans **Organisations**, choisissez **Ajouter** pour consigner un groupe, son type, son statut, sa description et son emblème.

### Suivre l’avancement du lore

Dans **Lore**, créez une entrée et classez-la par catégorie. Son état permet de distinguer une idée planifiée, un élément en cours, un fait établi ou un point à revoir. Le pourcentage d’avancement est modifiable depuis la fiche et visible dans la liste.

### Alimenter la frise narrative

Dans **Timeline**, choisissez **Ajouter**. Renseignez une date narrative lisible et une clé de tri si l’ordre chronologique ne peut pas être déduit de la date. Un événement peut être lié simultanément à un lieu, plusieurs personnages, organisations et scènes. La page principale les présente sur une frise verticale.

### Centraliser les médias

La section **Médias** accepte les images, fichiers audio, vidéos et PDF jusqu’à 25 Mo. Les images peuvent ensuite être réutilisées par leur URL, notamment comme expression de personnage ou arrière-plan de la page d’histoire. La suppression depuis la médiathèque masque la ressource du projet.

### Personnaliser la page de l’histoire

Ouvrez **Page histoire** pour régler le titre public, le sous-titre, l’arrière-plan, les couleurs du fond, du texte et de l’accent, ainsi que le thème général. L’aperçu se met à jour immédiatement. Activez **Publier la page** lorsque la présentation est prête.

### Repérer les répétitions

La page **Répétitions** analyse localement les scènes épisode par épisode. Choisissez un seuil, puis consultez les mots les plus fréquents, leur densité et les scènes concernées. Lorsqu’un synonyme pertinent est disponible, Narra le propose comme piste de remplacement. Cette aide reste indicative : vérifiez toujours le sens et le registre dans la phrase.

## 5. Conseils de structure

- Gardez les saisons au premier niveau pour obtenir un regroupement clair des scènes.
- Placez une scène sur le niveau le plus précis connu, par exemple un chapitre plutôt que sa saison.
- Utilisez les arcs sous une saison ou en parallèle des épisodes selon votre méthode d’écriture.
- Une structure simple peut se limiter à des chapitres racines : les saisons ne sont pas obligatoires.

## 6. États courants

Les projets peuvent être marqués comme **Idée**, **En écriture**, **En pause**, **Terminé** ou **Archivé**. Les scènes utilisent les états brouillon, écriture, relecture et final afin de suivre leur avancement.
