Effectue la routine de session sur ce projet. Elle peut être appelée en début ou en fin de session.

## Étape 0 — Synchronisation Git (début de session uniquement)

Si le pull n'a pas encore été fait dans cette session :

1. `git fetch origin dev`
2. Vérifie s'il y a des modifications locales avec `git diff HEAD --stat`
3. Si `git diff HEAD` ne montre aucune vraie différence de contenu sur les fichiers listés par `git status`, c'est un faux positif Synology (fins de lignes CRLF/LF). Dans ce cas : `git checkout -- .` puis `git pull origin dev`. Ne pas demander confirmation — c'est le comportement normal sur ce poste.
4. S'il y a de vraies différences de contenu non commitées, le signaler avant de tirer.

## Étape 1 — Lecture de l'état du projet

Lis `TODO.md` et `git log --oneline -5` pour identifier ce qui a été fait depuis le dernier commit.

## Étape 2 — Mise à jour CHANGELOG.md

Ajoute une entrée datée pour tout ce qui a été produit dans cette session et qui n'y figure pas encore.

## Étape 3 — Mise à jour TODO.md

Déplace dans la section "Fait récemment" ce qui est terminé. Nettoie les entrées obsolètes.

## Étape 4 — Commit

Vérifie l'état git (`git status` + `git diff --stat HEAD`) et commite tous les fichiers modifiés avec un message conventionnel clair (feat/fix/refactor selon le contenu). Ne push pas sans confirmation si des changements sensibles sont inclus, sinon push directement.

## Étape 5 — Résumé

Affiche : fichiers commités, état du dépôt (en avance/synchro), todo restante.
