Routine de début de session sur ce projet. Usage : /start.

Le projet est synchronisé exclusivement via Git/GitHub. Plus aucune synchronisation Synology sur le code. Toute modification détectée par Git est donc une vraie modification, jamais un faux positif.

## Étape 1 — État Git actuel

Lance `git status` et `git branch --show-current`.

Identifie :
- La branche active
- S'il y a des modifications locales non commitées
- S'il y a des commits locaux non pushés

### Vérification de la branche

**Si la branche active est `main`** : affiche un avertissement explicite avant de continuer :

> ⚠️ **Tu es sur `main`** (la branche stable, déployée en production).
>
> Pour le développement quotidien, tu devrais être sur `dev`. Veux-tu basculer maintenant avec `git checkout dev` ?

Demande confirmation avant de basculer. Si l'utilisateur dit oui, lance `git checkout dev` puis continue les étapes suivantes sur la nouvelle branche. S'il dit non (par exemple parce qu'il fait volontairement de la maintenance sur main), continue normalement sur main.

**Si la branche active est `dev` ou une branche feature** : continue sans alerte.

## Étape 2 — Synchronisation avec le remote

Lance `git fetch origin` puis `git status` à nouveau pour voir si la branche locale est en retard sur `origin/<branche>`.

### Cas A — Working tree clean et à jour

Affiche : "✅ À jour avec `origin/<branche>`" et passe à l'étape 3.

### Cas B — Working tree clean mais en retard

Lance `git pull --ff-only`. Si ça réussit, continue. Si ça échoue (merge requis), affiche l'erreur et arrête-toi : demande à l'utilisateur ce qu'il veut faire.

### Cas C — Working tree pas clean

NE FAIS PAS de pull automatique. Avant de demander à l'utilisateur ce qu'il veut faire, vérifie si les seuls fichiers non commités sont des fichiers de commandes Claude Code en cours de mise en place (style `.claude/commands/*.md` qui n'existaient pas avant). Dans ce cas, signale-le sans alarmer :

> ℹ️ Tu as des fichiers `.claude/commands/*.md` non commités — c'est normal si tu es en train de mettre en place tes commandes slash personnalisées. Je continue.

Pour les autres modifications, affiche les fichiers et demande à l'utilisateur :

1. Commit ces modifs avant pull
2. Stash temporairement
3. Continuer sans pull pour l'instant

Attends sa décision.

## Étape 3 — Résumé des changements récents

Lance `git log --oneline -10`. Présente un résumé en français clair de ce qui s'est passé récemment, avec interprétation. Format :

> "Depuis ta dernière session :
> - ✨ [feat] Glossaire e-Santé déployé
> - 🐛 [fix] Inscription pour emails déjà existants
> - 🔧 [chore] Migration dev hors Synology"

Icônes suggérées par type de commit :
- ✨ feat
- 🐛 fix
- 🔧 chore
- 📋 docs / changelog
- ♻️ refactor
- 🎨 style / UI
- 🔒 security
- ⚡ perf
- 🧪 test

## Étape 4 — Affichage de la TODO

Lis le fichier `TODO.md` à la racine du projet.

### Format d'affichage — IMPORTANT

**N'utilise JAMAIS de tableaux Markdown** (avec `|` et `---`) pour afficher la TODO ou ses sections. Utilise uniquement des listes à puces. Les tableaux se rendent mal et collent les colonnes.

**Pour les sections "URGENT" et "IMPORTANT"** : affiche en entier, avec leurs items détaillés (sous-bullets compris).

**Pour les autres sections** : utilise un **format compact mais détaillé** — pour chaque section, indique le nombre d'items ET liste chaque item sur une ligne courte (titre court extrait du TODO, sans les sous-détails). Exemple :

> **Autres sections** :
>
> 🤝 **Partenariats contenu** (1 item) :
>   - Contacter créateurs de contenu (Médiia, La rhumatologue, Whydoc)
>
> 🚀 **Déploiement final** (1 item) :
>   - Activer kill-switch emails routiniers à la mise en prod
>
> 🐛 **Bugs à corriger** (5 items) :
>   - Images manquantes /difficileDeChanger
>   - Cadre note hors du cadre titre (page solution)
>   - Fil d'Ariane contraste insuffisant
>   - Email déjà existant (à confirmer résolu)
>   - Note globale incohérente
>
> 🎨 **UX / UI** (3 items) :
>   - Alléger le bundle (méthode Ben)
>   - Améliorer menu burger mobile
>   - Revoir fond pages solutions + DA générale
>
> 📧 **Emails** (1 item) :
>   - Tableau de bord vue calendrier des envois

**Règles pour le titre court** :
- Une ligne par item, **maximum 60-80 caractères**
- Garde l'essentiel : le quoi, pas le pourquoi/comment (qui sont dans le TODO complet)
- Si l'item original a un titre clair, utilise-le tel quel ou raccourcis-le
- Pour les bugs : nom du composant/page + nature du problème
- Pour les features : verbe d'action + objet

**Marquage visuel** :
- Tâches non terminées : texte normal
- Tâches terminées : préserver le `~~strikethrough~~ ✅` du fichier original

## Étape 5 — Vérifications croisées TODO ↔ CHANGELOG

Avant la question finale, fais une vérification automatique :

Pour chaque item de la TODO marqué "à faire", regarde les 10 derniers commits (déjà obtenus à l'étape 3). Si un commit récent semble avoir traité un item, signale-le sous forme d'alerte à la fin de l'affichage TODO :

> ⚠️ **Items potentiellement à fermer** :
> - "Création de compte — email déjà existant en DB" : semble fait au commit `b175db1`. À confirmer et barrer.
> - "Migrer le développement en local — hors Synology" : semble fait suite à la migration récente. À barrer.

Si rien à signaler, n'affiche pas cette section.

## Étape 6 — Question d'orientation

Termine par : "Sur quoi tu veux travailler aujourd'hui ?"

## Règles importantes

- **Aucune action destructive sans confirmation explicite** : pas de `git reset --hard`, pas de `git checkout -- .` sans accord, pas de force-push.
- **Si Git est dans un état bizarre** (rebase, merge, conflit non résolu), arrête-toi et demande à l'utilisateur de gérer.
- **Toujours en français**, ton conversationnel.
- **Sortie compacte mais informative** : préfère des résumés clairs aux dumps bruts.
- **Jamais de tableaux Markdown** pour afficher des données structurées : utilise des listes à puces.
