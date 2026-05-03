Archive les items deja termines de TODO.md vers TODO-archive.md, pour garder TODO.md propre et focus sur ce qu'il reste a faire.

Usage : /todo-clean

Cette commande effectue une **operation destructrice** sur TODO.md (suppression des items archives). Elle demande TOUJOURS confirmation avant d'ecrire quoi que ce soit.

## Etape 1 - Detection des items termines

Lis `TODO.md` a la racine du projet et identifie tous les items termines, c'est-a-dire :

- Items dont le titre est entoure de `~~ ~~` (strikethrough markdown), avec ou sans [OK] ou date Fait YYYY-MM-DD
- Items contenant explicitement [OK] Fait YYYY-MM-DD dans leur titre
- L'integralite de la section Fait recemment (si elle existe encore dans TODO.md)

Pour chaque item termine, conserve aussi :
- Ses sous-bullets (qui donnent le contexte de ce qui a ete fait)
- La date Fait YYYY-MM-DD si elle existe
- Le numero de section d'origine (URGENT, IMPORTANT, Bugs, etc.) - en conservant la categorie d'origine en metadonnee

## Etape 2 - Presentation a l'utilisateur

Affiche un resume :

> Detection :
> - **N items barres** dans la TODO active (sections URGENT, IMPORTANT, etc.)
> - **M items** dans la section Fait recemment
> - **Total : N+M items** a archiver
>
> Voici les items qui seront deplaces vers TODO-archive.md :
> - Migration dev hors Synology (Idees long terme, fait 2026-04-25)
> - Easter egg Konami (Idees long terme, fait 2026-04-25)
> - PSC BAS prod (Deploiement final, fait 2026-04-23)
> - ... (afficher TOUS les items concernes, pas une sous-liste)
>
> Ces items seront SUPPRIMES de TODO.md et AJOUTES a TODO-archive.md.
> Confirme avec OUI pour proceder, ou NON pour annuler.

**Attends une reponse explicite de l'utilisateur** (oui, OK, valide, ou equivalent). Sans confirmation, ne fais rien.

## Etape 3 - Archivage

Si l'utilisateur confirme :

### 3.1 - Creer ou lire TODO-archive.md

Si le fichier `TODO-archive.md` n'existe pas a la racine du projet, cree-le avec cet en-tete :

```
# TODO Archive - 100 000 Medecins

Historique des items termines du projet.
Les items sont organises par date (du plus recent au plus ancien).

---

```

S'il existe deja, lis son contenu.

### 3.2 - Ajouter les items archives

Pour chaque item archive, ajoute dans TODO-archive.md (au-dessus du contenu existant, pour avoir le plus recent en haut) :

```
- [OK] YYYY-MM-DD : <Titre de l'item> (<categorie d'origine>)
  <eventuelles sous-bullets de contexte, sans le ~~strikethrough~~>
```

Si la date Fait YYYY-MM-DD n'est pas connue dans le titre original, utilise la date la plus probable (date du commit ayant probablement traite l'item, ou date du jour si rien d'autre).

### 3.3 - Supprimer les items de TODO.md

Pour chaque item archive, supprime-le de TODO.md :
- Si l'item est dans la section Fait recemment : retirer la ligne complete (et la sous-liste associee)
- Si l'item est dans une section active (Bugs, UX, etc.) : retirer juste cet item, garder la section et les autres items

Si la section Fait recemment devient completement vide apres archivage, supprime-la entierement (l'en-tete ## Fait recemment aussi).

## Etape 4 - Verification et resume

Apres modification, affiche un resume :

> Archivage termine :
> - **N items deplaces** vers TODO-archive.md
> - **TODO.md** reduit de X lignes a Y lignes
> - **TODO-archive.md** : Z items au total maintenant
>
> Tu peux verifier avec :
> - /todo (TODO.md, sans les items barres)
> - /todo-archive (TODO-archive.md, l'historique)
>
> Si tout est OK, n'oublie pas de commiter ces changements (idealement
> via /end ou un commit manuel docs(todo): archivage des items termines).

## Regles importantes

- **Confirmation obligatoire** avant toute modification
- **Aucun item ne doit etre perdu** : si un item est supprime de TODO.md, il DOIT etre present dans TODO-archive.md (verification croisee)
- **Preserver le contexte** : sous-bullets, dates, categories - on garde tout dans l'archive
- **Pas de tableaux Markdown**, listes a puces uniquement
- **Toujours en francais**
