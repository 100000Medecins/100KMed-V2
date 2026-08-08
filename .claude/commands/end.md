Routine de fin de session sur ce projet. Usage : /end.

Sauvegarde le code, documente ce qui a ete fait, met a jour la TODO, push sur GitHub, et met a jour le vault Obsidian (base de connaissances) si pertinent. Le but : pouvoir reprendre proprement sur l'autre machine (laptop / desktop).

## Etape 0 - Nettoyage des serveurs de dev orphelins (prealable, Windows)

Avant tout, balaie les serveurs Next de CE projet restes en arriere-plan (`next dev`/`next start` oublies d'anciennes sessions). Sous Windows ils **survivent a la fermeture du terminal** et s'accumulent (RAM), et l'un d'eux peut **bloquer un fichier supprime** (handle ouvert -> suppression differee -> `Build Error` Tailwind `ENOENT` sur un `.tsx` fantome au demarrage suivant).

Liste-les d'abord :

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match '100000Medecins_websiteV2.*next (dev|start)' } |
  Select-Object ProcessId, CreationDate, CommandLine | Format-Table -Wrap
```

- **Liste vide** : rien a faire, passe a l'etape 1 (ne le mentionne meme pas).
- **Serveurs trouves** : signale-les (PID + heure de demarrage), puis tue-les :

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match '100000Medecins_websiteV2.*next (dev|start)' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Le filtre ne cible **que** les process `next dev`/`next start` de ce projet — il ne touche ni `tsserver` (VS Code/Cursor) ni les serveurs MCP. Mentionne le nombre de serveurs tues dans le bilan final (etape 8). Note : cela **arrete aussi le serveur dev de la session courante** — normal en fin de session.

## Etape 1 - Verification initiale

Lance `git status` et `git branch --show-current`.

### Cas A - Rien a sauvegarder

Si working tree clean ET aucun commit local en avance sur origin :

> "OK : Rien a sauvegarder, ta session est deja cloturee. Tu peux fermer."

N'enchaine PAS sur les etapes suivantes. C'est termine.

### Cas B - Si tu es sur `main`

Affiche un avertissement avant de continuer :

> "ATTENTION : Tu es sur `main` (la branche stable). Tu es sur de vouloir commiter ici plutot que sur `dev` ? La pratique habituelle est de commiter sur `dev` puis merger vers `main`."

Demande confirmation avant de continuer. Si l'utilisateur veut basculer, lance `git checkout dev` puis continue sur `dev`.

### Cas C - Sinon

Continue normalement.

## Etape 2 - Presentation des modifications

Affiche un resume clair des fichiers modifies. Utilise `git diff --stat` pour avoir une vue d'ensemble, puis `git diff <fichier>` cible si besoin de comprendre le detail d'un changement.

Format de presentation :

> "Voici ce que tu as fait pendant cette session :
> - **`src/lib/auth/psc.ts`** : ajout de `normaliseRpps()` (12 lignes ajoutees)
> - **`AuthProvider.tsx`** : controle email existant (8 lignes modifiees)
> - **3 nouveaux fichiers** dans `src/app/auth/...` (creation de la feature X)"

**N'utilise JAMAIS de tableaux Markdown** pour cette presentation. Listes a puces uniquement.

### Cas particulier - Fichiers de commandes Claude Code

Si la session ne concerne **que** des fichiers `.claude/commands/*.md` (mise en place ou ajustement de commandes slash), c'est un contexte special : la session est de l'outillage, pas du dev applicatif. Dans ce cas :

- **Saute l'etape 3** (pas de mise a jour CHANGELOG.md - ce n'est pas une feature applicative)
- **Saute l'etape 4** (pas de mise a jour TODO.md applicative)
- **Saute l'etape 7** (pas de note Obsidian pour une session d'outillage)
- Va directement a l'etape 5 avec un message de commit du type `chore(claude-code): ...`

## Etape 3 - Mise a jour du CHANGELOG.md

Lis `CHANGELOG.md` a la racine du projet pour comprendre le format existant.

### Format a respecter strictement

Inspire directement du style du CHANGELOG existant :

```
## [YYYY-MM-DD] - Titre court resumant la session

### Categorie - Sous-titre descriptif
- Bullet avec contexte clair
- Bullet avec `code inline` pour fichiers/fonctions
- Pour les bugs : structure "Cause / Fix" si pertinent

### TODO - Mises a jour
- Marque termine : ...
- Ajout : ...
```

### Regles strictes

- **Date** au format ISO `YYYY-MM-DD` entre crochets
- **Tiret cadratin** entre la date et le titre (caractere Unicode utilise dans le CHANGELOG existant)
- **Separateur** : chaque entree separee par `---` sur sa propre ligne
- **Position** : ajouter en HAUT du fichier (apres l'en-tete, donc apres le `---` qui suit la description du projet)
- **Si plusieurs sessions le meme jour** : completer l'entree existante du jour plutot que d'en creer une nouvelle

### Categories courantes

Identifie la categorie selon le domaine fonctionnel :

- `Fix` - corrections de bugs
- `Feature` - nouvelles fonctionnalites
- `Module` - module entier (ex : "Module Etudes & Theses")
- `Admin -` - feature cote admin
- `PSC -` - touche a Pro Sante Connect
- `Email -` - emails (transactionnels, newsletter, relances)
- `Infrastructure` - devops, scripts, deploiement
- `Nettoyage` - suppression de code, refactoring de proprete
- `Securite`
- `UX / UI`

### Processus

1. **Redige l'entree** a partir du diff de la session
2. **Ecris-la directement** dans le fichier, sans demander de validation prealable
3. **Montre a l'utilisateur ce que tu as ecrit** (le texte exact de l'entree ajoutee)
4. **S'il veut modifier**, prends ses corrections en compte et reecris

## Etape 4 - Mise a jour du TODO.md

Lis `TODO.md` a la racine du projet.

### Detection automatique

Pour chaque commit ou modification de cette session, verifie :

1. **Items termines** : si le travail fait couvre entierement un item de la TODO, barre-le avec `~~texte~~ [OK] Fait YYYY-MM-DD`
2. **Nouvelles taches detectees** : si tu vois apparaitre dans le code des `// TODO`, des bugs decouverts mentionnes dans les commentaires, des limitations notees dans la doc - ajoute-les a la TODO

### Ce que tu montres apres coup

Ecris d'abord, puis rends compte :

> "**TODO mise a jour :**
> - 'Bug X' : barre (fait dans le commit `abc1234`)
> - Ajout : 'Optimiser la requete de `src/lib/db/foo.ts`' (vu un `// TODO` dans le code)
>
> As-tu d'autres taches a ajouter ?"

### Validation

Ecris directement dans le fichier, puis montre ce que tu as ecrit. Pas de validation prealable.

**Deux exceptions** ou tu poses la question AVANT d'ecrire :

1. **Item partiellement fait** : ne le barre pas de toi-meme, demande a l'utilisateur s'il le considere termine
2. **Travail qui contredit une tache** au lieu de l'achever (la session a pris une direction opposee a ce que l'item prevoyait) : signale-le et demande quoi faire de l'item

### Suggestion de nettoyage

Apres mise a jour de TODO.md, **compte les items barres** (avec `~~strikethrough~~`) presents dans le fichier. Si le total est superieur a 10 :

> "INFO : N items termines accumules dans TODO.md. Pour garder TODO.md focus sur ce qu'il reste a faire, tu peux lancer /todo-clean apres ce commit. Cela archivera ces items dans TODO-archive.md."

Ne lance PAS `/todo-clean` automatiquement - c'est juste une suggestion.

## Etape 5 - Commit

Lance `git add -A` (par defaut). Si l'utilisateur veut exclure quelque chose, il le dira.

Lance `git status` pour confirmer ce qui sera commite.

### Composer le message de commit

Format **conventional commits** :

```
<type>: <description imperative courte>

<corps optionnel pour les commits importants>
```

**Types** :
- `feat` : nouvelle fonctionnalite
- `fix` : correction de bug
- `chore` : maintenance, outillage, mise a jour de dependances
- `refactor` : restructuration sans changement de comportement
- `docs` : documentation uniquement
- `style` : formatage, pas de changement de code
- `perf` : amelioration de performance
- `test` : ajout/modif de tests

**Scope optionnel** entre parentheses : `feat(psc):`, `fix(admin):`, `chore(claude-code):`

**Exemples** :
- `feat(psc): restreindre la connexion PSC aux medecins uniquement`
- `fix: inscription email existant, nettoyage code excuse, backup BDD`
- `chore(claude-code): ajout des commandes /start /end /sync`

### Plusieurs commits si plusieurs sujets distincts

Si la session a touche a plusieurs sujets sans rapport entre eux (ex : fix d'un bug PSC + ajout d'une feature admin + mise a jour de docs), **propose plusieurs commits successifs** :

1. `fix(psc): ...`
2. `feat(admin): ...`
3. `docs: mise a jour CHANGELOG et TODO`

## Etape 6 - Push

Lance `git push origin <branche>`. Verifie le succes dans la sortie.

### Gestion des erreurs

- **Authentication failed** - l'utilisateur doit se reauthentifier via Git Credential Manager. Donne les instructions, ne tente pas de resoudre toi-meme.
- **Non-fast-forward** (la branche distante a avance) - lance `git pull --rebase` puis re-push. Si conflit, arrete et demande a l'utilisateur de gerer manuellement.
- **Autre erreur** - affiche l'erreur exacte, demande a l'utilisateur ce qu'il veut faire.

## Etape 7 - Mise a jour du vault Obsidian (base de connaissances) - si juge necessaire

Cette etape alimente le vault Obsidian "Projets Pro" de David (base de connaissances perso, distincte du repo projet). But : capitaliser la session en notes reliees, pour ne pas avoir a tout refaire.

### Vault cible et convention

- Emplacement : `C:\Users\david\Documents\Obsidian\Projets Pro`, dossier du projet courant : `100000Medecins/` (hub = `Vue d'ensemble.md`).
- Une note = un sujet ; notes reliees par des `[[wikilinks]]` ; frontmatter YAML avec un champ `updated:` a rafraichir a chaque modification. Contenu en francais correct (avec accents).
- Le vault est un **repo git DISTINCT**, avec auto-commit/push gere par le plugin Obsidian Git. **Ne lance JAMAIS de commande git sur le vault** (add/commit/push) : ecris seulement les fichiers, le plugin synchronise seul. Ne confonds pas avec le push du repo projet (etape 6).

### Robustesse

Verifie d'abord que le dossier du vault existe sur cette machine (`Test-Path`). S'il est absent, **saute cette etape** et signale-le en une ligne au bilan final ("vault Obsidian introuvable sur ce poste, note non generee").

### Quand generer / mettre a jour (le "si juge necessaire")

Mets a jour ou cree une note **seulement si la session a produit quelque chose digne de la base de connaissances** : nouvelle feature, fix non trivial porteur d'une lecon, decision d'architecture, plan/diagnostic, migration de donnees, decision figee.

**Ne genere PAS de note** si : session d'outillage (`.claude/commands/*`), micro-fix cosmetique, WIP non concluant. Regle simple : si ca meritait une vraie entree CHANGELOG avec une decision/feature/fix, c'est probablement a refleter dans une note ; si c'est un micro-changement, saute. En cas de doute leger, propose et laisse David trancher.

### Approche incrementale

- **Mets a jour la (les) note(s) existante(s) pertinente(s)** plutot que d'en creer de nouvelles. Mappe le sujet de la session sur les notes du dossier : `[[Architecture]]`, `[[PSC — Pro Santé Connect]]`, `[[Chantiers en cours]]`, `[[Scoring & évaluations]]`, `[[Performance & ISR]]`, `[[Questionnaires & imports de catégories]]`, `[[PSC, Auth & Emails]]`, `[[Migration Firebase & BDD]]`, etc.
- La note **`Chantiers en cours`** est la note vivante a rafraichir par defaut (statut des chantiers actifs, decisions figees).
- Ne relis pas tout le projet : appuie-toi sur le **diff de la session** + l'entree CHANGELOG qui vient d'etre redigee.
- Ne cree une **nouvelle note** que si le sujet est vraiment neuf (aucune note existante ne convient), en respectant la convention (bon dossier, frontmatter, liens vers le hub et les notes voisines).
- A chaque note touchee : mets a jour `updated:` (date du jour) et, si pertinent, ajoute une ligne ou un callout date.

### Validation (comme CHANGELOG / TODO)

Propose a David quelle(s) note(s) tu comptes creer/mettre a jour et un resume du contenu. **Attends sa validation avant d'ecrire.** La base de connaissances n'est jamais modifiee sans accord explicite, exactement comme le CHANGELOG et la TODO.

## Etape 8 - Confirmation finale + TODO restante detaillee

Termine par un bilan en francais, en INCLUANT la TODO restante au **format detaille** (1 ligne par item).

**IMPORTANT** : N'affiche PAS les items deja termines (`~~strikethrough~~`) dans cet apercu - on veut voir uniquement ce qu'il reste a faire.

> "OK : **Session cloturee :**
> - 1 commit pousse sur `origin/dev` : `feat(psc): ...`
> - CHANGELOG.md mis a jour (entree du 2026-04-25)
> - TODO.md : 2 taches barrees, 1 nouvelle ajoutee
> - Vault Obsidian : note `Chantiers en cours` mise a jour (ou "aucune note - session non concernee")
>
> **Voici ce qu'il reste a faire la prochaine fois :**
>
> **IMPORTANT**
> - Traiter les remarques de Ben (rapport efficience du code)
> - Partenariats contenu (Mediia, La rhumatologue, Whydoc)
>
> **Autres sections :**
>
> **Deploiement final** (1 item) :
>   - Activer kill-switch emails routiniers a la mise en prod
>
> **Bugs a corriger** (5 items) :
>   - Images manquantes /difficileDeChanger
>   - Cadre note hors du cadre titre (page solution)
>   - Fil d'Ariane contraste insuffisant
>   - Email deja existant (a confirmer resolu)
>   - Note globale incoherente
>
> **UX / UI** (3 items) :
>   - Alleger le bundle (methode Ben)
>   - Ameliorer menu burger mobile
>   - Revoir fond pages solutions + DA generale
>
> **Emails** (1 item) :
>   - Tableau de bord vue calendrier des envois
>
> **Notifications** (1 item) :
>   - Notifications etudes cliniques par specialite
>
> **Blog** (1 item) :
>   - Planification publication article
>
> **Performance** (1 item) :
>   - Rapport efficience Ben
>
> **Idees long terme** (6 items) :
>   - Backups automatiques BDD Supabase
>   - Themes alternatifs (Pinky, Dark)
>   - Nouvelles categories (Teletransmission, Teleconsultation, Teleexpertise)
>   - Refonte avatars utilisateurs
>   - Obsolescence des notes (ponderation temporelle)
>   - DNS - mise en prod (jour J)
>
> Tu peux fermer ton ordinateur. Pour reprendre sur l'autre machine, lance `/start` au prochain demarrage."

### Suggestion /todo-clean si necessaire

Si l'etape 4 a detecte plus de 10 items barres dans TODO.md, ajoute a la fin :

> "INFO : N items termines accumules dans TODO.md. Tu peux lancer /todo-clean maintenant pour les archiver dans TODO-archive.md (ca gardera TODO.md focus sur ce qu'il reste a faire)."

### Regles pour le format detaille de la TODO restante

- **Sections "URGENT" et "IMPORTANT"** : afficher en entier, avec items detailles
- **Autres sections** : nombre d'items + liste detaillee, **1 ligne courte par item** (titre court extrait du TODO, max 60-80 caracteres)
- **Pour le titre court** : garde l'essentiel, pas les sous-details. Si l'item a un titre clair dans le TODO, utilise-le tel quel ou raccourcis-le
- **Ne PAS afficher les items barres** (deja archives ou en cours d'archivage)
- **Pas de tableaux Markdown** - listes a puces uniquement

## Regles importantes

- **Jamais de force-push** (`--force`, `-f`) sans demande explicite et comprehension claire des consequences.
- **Si la branche est `main`** : double-confirmation avant de pusher.
- **Si Git est dans un etat bizarre** (rebase, merge, conflit non resolu) : arrete et demande a l'utilisateur.
- **Le CHANGELOG et le TODO sont ecrits directement**, sans validation prealable : tu ecris, puis tu montres le texte exact. Deux exceptions ou tu demandes avant : un item de TODO partiellement fait (ne le barre pas seul) et un travail qui contredit une tache au lieu de l'achever.
- **Toujours en francais**, ton conversationnel.
- **Jamais de tableaux Markdown** pour afficher des donnees : listes a puces.
- **Le vault Obsidian est un repo distinct** : ne lance jamais de git dessus (le plugin Obsidian Git synchronise). L'etape 7 ecrit seulement des fichiers.
