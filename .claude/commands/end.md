Routine de fin de session sur ce projet. Usage : /end.

Sauvegarde le code, documente ce qui a été fait, met à jour la TODO, push sur GitHub. Le but : pouvoir reprendre proprement sur l'autre machine (laptop → desktop).

## Étape 1 — Vérification initiale

Lance `git status` et `git branch --show-current`.

### Cas A — Rien à sauvegarder

Si working tree clean ET aucun commit local en avance sur origin :

> "✅ Rien à sauvegarder, ta session est déjà clôturée. Tu peux fermer."

N'enchaîne PAS sur les étapes suivantes. C'est terminé.

### Cas B — Si tu es sur `main`

Affiche un avertissement avant de continuer :

> ⚠️ **Tu es sur `main`** (la branche stable). Tu es sûr de vouloir commiter ici plutôt que sur `dev` ? La pratique habituelle est de commiter sur `dev` puis merger vers `main`.

Demande confirmation avant de continuer. Si l'utilisateur veut basculer, lance `git checkout dev` puis continue sur `dev`.

### Cas C — Sinon

Continue normalement.

## Étape 2 — Présentation des modifications

Affiche un résumé clair des fichiers modifiés. Utilise `git diff --stat` pour avoir une vue d'ensemble, puis `git diff <fichier>` ciblé si besoin de comprendre le détail d'un changement.

Format de présentation :

> "Voici ce que tu as fait pendant cette session :
> - **`src/lib/auth/psc.ts`** : ajout de `normaliseRpps()` (12 lignes ajoutées)
> - **`AuthProvider.tsx`** : contrôle email existant (8 lignes modifiées)
> - **3 nouveaux fichiers** dans `src/app/auth/...` (création de la feature X)"

**N'utilise JAMAIS de tableaux Markdown** pour cette présentation. Listes à puces uniquement.

### Cas particulier — Fichiers de commandes Claude Code

Si la session ne concerne **que** des fichiers `.claude/commands/*.md` (mise en place ou ajustement de commandes slash), c'est un contexte spécial : la session est de l'outillage, pas du dev applicatif. Dans ce cas :

- **Saute l'étape 3** (pas de mise à jour CHANGELOG.md — ce n'est pas une feature applicative)
- **Saute l'étape 4** (pas de mise à jour TODO.md applicative)
- Va directement à l'étape 5 avec un message de commit du type `chore(claude-code): ...`

## Étape 3 — Mise à jour du CHANGELOG.md

Lis `CHANGELOG.md` à la racine du projet pour comprendre le format existant.

### Format à respecter strictement

Inspiré directement du style du CHANGELOG existant :

```
## [YYYY-MM-DD] — Titre court résumant la session

### Catégorie — Sous-titre descriptif
- Bullet avec contexte clair
- Bullet avec `code inline` pour fichiers/fonctions
- Pour les bugs : structure "Cause / Fix" si pertinent

### TODO — Mises à jour
- Marqué terminé : ...
- Ajout : ...
```

### Règles strictes

- **Date** au format ISO `YYYY-MM-DD` entre crochets
- **Tiret cadratin** `—` (caractère Unicode, pas tiret simple `-`) entre la date et le titre
- **Séparateur** : chaque entrée séparée par `---` sur sa propre ligne
- **Position** : ajouter en HAUT du fichier (après l'en-tête, donc après le `---` qui suit la description du projet)
- **Si plusieurs sessions le même jour** : compléter l'entrée existante du jour plutôt que d'en créer une nouvelle

### Catégories courantes

Identifie la catégorie selon le domaine fonctionnel :

- `Fix` — corrections de bugs
- `Feature` — nouvelles fonctionnalités
- `Module` — module entier (ex : "Module Études & Thèses")
- `Admin —` — feature côté admin
- `PSC —` — touche à Pro Santé Connect
- `Email —` — emails (transactionnels, newsletter, relances)
- `Infrastructure` — devops, scripts, déploiement
- `Nettoyage` — suppression de code, refactoring de propreté
- `Sécurité`
- `UX / UI`

### Processus

1. **Propose une ÉBAUCHE** d'entrée à l'utilisateur basée sur le diff
2. **Demande validation** avant d'écrire dans le fichier
3. **Si l'utilisateur veut modifier**, prends ses corrections en compte et repropose
4. **Une fois validé**, écris dans le fichier

## Étape 4 — Mise à jour du TODO.md

Lis `TODO.md` à la racine du projet.

### Détection automatique

Pour chaque commit ou modification de cette session, vérifie :

1. **Items potentiellement terminés** : si le travail fait correspond à un item de la TODO, propose de le barrer avec `~~texte~~ ✅ Fait YYYY-MM-DD`
2. **Nouvelles tâches détectées** : si tu vois apparaître dans le code des `// TODO`, des bugs découverts mentionnés dans les commentaires, des limitations notées dans la doc — propose de les ajouter à la TODO

### Demandes à l'utilisateur

Présente sous forme de propositions :

> "**Tâches à barrer ?**
> - "Bug X" : semble fait dans le commit, je propose de le barrer
> - "Feature Y" : partiellement fait, à confirmer
>
> **Nouvelles idées à ajouter ?**
> - J'ai vu un `// TODO: optimiser cette requête` dans `src/lib/db/foo.ts`
> - As-tu d'autres tâches à ajouter ?"

### Section "Fait récemment"

Ajoute en bas du fichier `TODO.md`, dans la section "Fait récemment", les principales réalisations du jour (1-3 lignes max par item, format compact).

### Validation

Comme pour le CHANGELOG : propose, attends validation, puis écris.

## Étape 5 — Commit

Lance `git add -A` (par défaut). Si l'utilisateur veut exclure quelque chose, il le dira.

Lance `git status` pour confirmer ce qui sera commité.

### Composer le message de commit

Format **conventional commits** :

```
<type>: <description impérative courte>

<corps optionnel pour les commits importants>
```

**Types** :
- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `chore` : maintenance, outillage, mise à jour de dépendances
- `refactor` : restructuration sans changement de comportement
- `docs` : documentation uniquement
- `style` : formatage, pas de changement de code
- `perf` : amélioration de performance
- `test` : ajout/modif de tests

**Scope optionnel** entre parenthèses : `feat(psc):`, `fix(admin):`, `chore(claude-code):`

**Exemples** :
- `feat(psc): restreindre la connexion PSC aux médecins uniquement`
- `fix: inscription email existant, nettoyage code excuse, backup BDD`
- `chore(claude-code): ajout des commandes /start /end /sync`

### Plusieurs commits si plusieurs sujets distincts

Si la session a touché à plusieurs sujets sans rapport entre eux (ex : fix d'un bug PSC + ajout d'une feature admin + mise à jour de docs), **propose plusieurs commits successifs** :

1. `fix(psc): ...`
2. `feat(admin): ...`
3. `docs: mise à jour CHANGELOG et TODO`

## Étape 6 — Push

Lance `git push origin <branche>`. Vérifie le succès dans la sortie.

### Gestion des erreurs

- **Authentication failed** — l'utilisateur doit se réauthentifier via Git Credential Manager. Donne les instructions, ne tente pas de résoudre toi-même.
- **Non-fast-forward** (la branche distante a avancé) — lance `git pull --rebase` puis re-push. Si conflit, arrête et demande à l'utilisateur de gérer manuellement.
- **Autre erreur** — affiche l'erreur exacte, demande à l'utilisateur ce qu'il veut faire.

## Étape 7 — Confirmation finale + TODO restante détaillée

Termine par un bilan en français, en INCLUANT la TODO restante au **format détaillé** (1 ligne par item) :

> "✅ **Session clôturée :**
> - 1 commit poussé sur `origin/dev` : `feat(psc): ...`
> - CHANGELOG.md mis à jour (entrée du 2026-04-25)
> - TODO.md : 2 tâches barrées, 1 nouvelle ajoutée
>
> **🔥 Voici ce qu'il reste à faire la prochaine fois :**
>
> 🔥 **IMPORTANT**
> - Traiter les remarques de Ben (rapport efficience du code)
> - Partenariats contenu (Médiia, La rhumatologue, Whydoc)
>
> **Autres sections :**
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
>
> 🔔 **Notifications** (1 item) :
>   - Notifications études cliniques par spécialité
>
> 📝 **Blog** (1 item) :
>   - Planification publication article
>
> ⚡ **Performance** (1 item) :
>   - Rapport efficience Ben
>
> 💡 **Idées long terme** (6 items) :
>   - Backups automatiques BDD Supabase
>   - Thèmes alternatifs (Pinky, Dark)
>   - Nouvelles catégories (Télétransmission, Téléconsultation, Téléexpertise)
>   - Refonte avatars utilisateurs
>   - Obsolescence des notes (pondération temporelle)
>   - DNS — mise en prod (jour J)
>
> Tu peux fermer ton ordinateur. Pour reprendre sur l'autre machine, lance `/start` au prochain démarrage."

### Règles pour le format détaillé de la TODO restante

- **Sections "URGENT" et "IMPORTANT"** : afficher en entier, avec items détaillés
- **Autres sections** : nombre d'items + liste détaillée, **1 ligne courte par item** (titre court extrait du TODO, max 60-80 caractères)
- **Pour le titre court** : garde l'essentiel, pas les sous-détails. Si l'item a un titre clair dans le TODO, utilise-le tel quel ou raccourcis-le
- **Pas de tableaux Markdown** — listes à puces uniquement

## Règles importantes

- **Jamais de force-push** (`--force`, `-f`) sans demande explicite et compréhension claire des conséquences.
- **Si la branche est `main`** : double-confirmation avant de pusher.
- **Si Git est dans un état bizarre** (rebase, merge, conflit non résolu) : arrête et demande à l'utilisateur.
- **Le CHANGELOG et le TODO ne sont JAMAIS modifiés sans validation explicite** sur le contenu proposé.
- **Toujours en français**, ton conversationnel.
- **Jamais de tableaux Markdown** pour afficher des données : listes à puces.
