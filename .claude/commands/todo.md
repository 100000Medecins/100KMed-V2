Affiche le contenu actuel de la TODO du projet.

Lis le fichier `TODO.md` a la racine du projet et affiche-le de maniere claire et lisible avec les sections bien separees.

## Filtrage des items termines

**N'affiche PAS les items deja termines** (marques avec `~~strikethrough~~` et/ou suivis de [OK] ou Fait). Ces items polluent la vue et empechent de voir ce qu'il reste a faire.

Cela inclut :
- Les items dont le titre est entoure de `~~ ~~` (strikethrough markdown)
- Les sous-bullets sous un item barre (sauf si la sous-bullet n'est pas barree elle-meme)
- La section Fait recemment complete (qui sera bientot dans TODO-archive.md de toute facon)

Si certains items En attente semblent deja faits au vu du CHANGELOG recent, signale-le sous la TODO comme suggestion :

> INFO : Items potentiellement a fermer (regarde le CHANGELOG des 10 derniers commits) :
> - Bug X semble fait au commit abc1234. A confirmer et barrer.

## Format

- **Pas de tableaux Markdown** : utilise uniquement des listes a puces
- **Hierarchie claire** : sections en `###` comme dans le fichier original
- **Items concis** : 1 ligne courte par item (titre principal + 1 element de contexte si necessaire)

## Suggestion de nettoyage

Si TODO.md contient plus de 10 items deja termines (`~~strikethrough~~`), suggere a la fin :

> INFO : N items termines accumules dans TODO.md. Tu peux lancer /todo-clean pour les archiver dans TODO-archive.md.
