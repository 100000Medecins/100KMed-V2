Affiche le contenu de TODO-archive.md - l'historique des items termines du projet.

Lis le fichier `TODO-archive.md` a la racine du projet et affiche-le de maniere claire.

## Comportement selon l'etat du fichier

### Cas 1 : Le fichier existe et contient des items

Affiche les items en les groupant si possible par mois (selon les dates Fait YYYY-MM-DD qui suivent chaque item).

Format de presentation :

> Voici l'historique des items termines :
>
> **Avril 2026** (12 items)
> - [OK] 2026-04-26 : Migration dev hors Synology
> - [OK] 2026-04-25 : Mise en place commandes /start /end /sync
> - [OK] 2026-04-24 : ...
>
> **Mars 2026** (8 items)
> - ...

### Cas 2 : Le fichier n'existe pas

Affiche :

> INFO : Le fichier TODO-archive.md n'existe pas encore.
> Pour le creer et y deplacer les items deja termines de TODO.md,
> lance la commande /todo-clean.

### Cas 3 : Le fichier existe mais est vide

Affiche :

> INFO : Le fichier TODO-archive.md existe mais est vide.
> Aucun item archive pour le moment.

## Recherche optionnelle

Si l'utilisateur fournit un argument apres /todo-archive (par exemple /todo-archive PSC), filtre les items contenant ce mot-cle (insensible a la casse) et affiche uniquement ceux-la avec un compteur :

> Recherche PSC dans TODO-archive.md : 5 resultats trouves
> - [OK] 2026-04-25 : PSC RPPS normalisation
> - ...

## Format

- **Pas de tableaux Markdown** : listes a puces uniquement
- **Tri chronologique inverse** : du plus recent au plus ancien
- **Si le fichier est tres long** (>200 items), n'affiche par defaut que les 50 plus recents et signale le total
