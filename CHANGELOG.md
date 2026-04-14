# CHANGELOG — 100 000 Médecins

> Plateforme de comparaison de logiciels médicaux pour médecins libéraux français.
> Stack : Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, SendGrid, Pro Santé Connect (OIDC).

---

## [2026-04-15] — Hero animé, UX mobile navbar & comparatifs

### Hero — illustration animée (Framer Motion)

- Installation de `framer-motion@11`
- Extraction du bloc illustration en `HeroIllustration.tsx` (client component)
- Flottement indépendant par élément : chaque carte/badge a sa propre amplitude, durée et délai (durées premières entre elles pour éviter toute resynchronisation)
- Ajout d'une carte "inscrits" (badge teal 👥) dans l'illustration hero : compte en temps réel depuis la table `users` via `getSiteStats` (nouveau champ `nbInscrits`)
- Repositionnement des badges "avis" et "inscrits" en superposition biais sur d'autres cartes pour plus de dynamisme

### Navbar

- **Desktop** : interversion des boutons — "Évaluer un logiciel" en premier, "Me connecter" en second
- **Mobile** : bouton "Évaluer" toujours visible dans la barre (colonne dédiée à droite du hamburger), "Me connecter" dans le menu en `variant="white"` (était `ghost`, illisible sur fond sombre)

### Logos partenaires

- Logos SML et Le Bloc augmentés (`h-6`) sur mobile uniquement, les autres partenaires conservent `h-4`

### Comparatifs — barre de tri mobile

- Bouton "Tous critères" affiché sur une deuxième ligne centrée sous le bouton de tri actif (via mesure `getBoundingClientRect`)
- `router.push` avec `{ scroll: false }` sur tous les changements de tri — la page ne remonte plus en haut

### Page solution — onglets de navigation

- Onglets (Avis rédaction, Galerie, Évaluation détaillée…) centrés sur mobile (`justify-center`), alignés à gauche sur desktop

### Comparatif détaillé par sous-critères (mobile)

- Nom du critère affiché sur sa propre ligne au-dessus des barres (layout `flex-col` sur mobile, `flex-row` sur desktop)
- Barres réduites à `w-16` sur mobile (au lieu de `w-24`) pour tenir dans l'écran

---

## [2026-04-14] — Rôle Health Data Hub, reset mot de passe, types Supabase

### Rôle Health Data Hub

- Nouveau rôle `health_data_hub` assignable depuis `/admin/utilisateurs` (badge teal)
- Page `/mon-compte/health-data-hub` : liste des utilisateurs ayant opté pour les études cliniques (`etudes_cliniques = true`), avec export CSV (UTF-8 BOM pour Excel)
- Accès conditionnel dans le layout `mon-compte` (lien "Études cliniques" visible uniquement pour ce rôle)
- Server action `getHdhOptins()` : vérifie le rôle côté serveur avant de retourner les données

### Réinitialisation du mot de passe

- Correction du blocage sur la page `/reinitialiser-mot-de-passe` : `AbortError` causée par collision entre `getSession()` et `onAuthStateChange()` dans `AuthProvider` — suppression de l'appel `getSession()` redondant (l'événement `INITIAL_SESSION` suffit)
- Contournement du lock interne `@supabase/auth-js` : `updateUser()` remplacé par un appel direct `PUT /auth/v1/user` avec le Bearer token
- Token de récupération persisté dans `sessionStorage` pour survivre aux Fast Refresh en développement
- Redirection post-succès via `window.location.href` (rechargement complet) pour éviter le freeze du client Supabase
- Header simplifié sur la page reset (sans navbar/boutons compte) pour éviter la confusion utilisateur
- `beforeunload` : déconnexion automatique si l'utilisateur quitte la page sans changer son mot de passe

### Client Supabase

- `createBrowserClient` configuré avec `lock: fn => fn()` pour désactiver `navigator.locks` (source des AbortError)
- `AuthProvider` : suppression de `getSession()` initial, `onAuthStateChange` seul gère la session initiale via `INITIAL_SESSION`

### Types Supabase

- `src/types/database.ts` régénéré — inclut désormais `articles`, `articles_categories` et toutes les tables créées depuis la dernière génération
- `createServiceRoleClientUntyped()` supprimé de `server.ts` et tous ses usages remplacés par `createServiceRoleClient()` dans `admin.ts` et les pages blog

### Callback PSC

- `psc-callback/route.ts` : nom/prénom/spécialité non écrasés si PSC renvoie `null` (protège les valeurs saisies manuellement)

---

## [2026-04-12] — Refonte page admin utilisateurs (pagination, colonnes, PSC)

### Admin — Gestion des utilisateurs (`/admin/utilisateurs`) — refonte complète

- **Pagination étendue** : boucle `.range()` côté serveur pour dépasser la limite Supabase de 1000 lignes (`getAllUsers` dans `page.tsx`)
- **Sélecteur de page directe** : champ numérique cliquable entre « Préc » et « Suiv » pour sauter directement à une page
- **Boutons première/dernière page** (« / »)
- **Lignes par page** : choix 50 / 100 / 200
- **Badge PSC** basé sur `!!user.rpps` (présence du numéro RPPS) et non plus sur l'email — fiable même si l'email n'est pas un placeholder
- **Colonne Pseudo** : affichée et modifiable inline (`EditableCell`) — sauvegardée via `updateUserField(..., 'pseudo', ...)`
- **Colonne Spécialité** : affichée en lecture seule
- **Colonne RPPS** : affiché en monospace, masqué sur petits écrans
- **Tri** par nom ou date d'inscription, avec direction toggle
- `updateUserField` : type `field` étendu à `'nom' | 'prenom' | 'email' | 'pseudo'`

---

## [2026-04-13] — Espace éditeur (rôles utilisateurs + mon compte)

### SQL requis (migration Supabase — à exécuter une seule fois)
```sql
ALTER TABLE editeurs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS editeurs_user_id_idx ON editeurs(user_id);
```

### Admin — Gestion des utilisateurs (`/admin/utilisateurs`)

- **Nouvelle page** `src/app/admin/utilisateurs/page.tsx` + composant `AdminUtilisateursClient.tsx`
- Liste paginable de tous les utilisateurs avec recherche (email, pseudo, nom)
- Chaque ligne permet de changer le **rôle** (`médecin` / `éditeur` / `admin`) via un select
- Si rôle `éditeur` : select secondaire pour associer un éditeur parmi ceux de la base
- Avertissement "(déjà assigné)" si un éditeur est lié à un autre compte
- Sauvegarde en un clic "Enregistrer" par ligne (confirmation visuelle)
- **Lien "Utilisateurs"** ajouté dans `AdminSidebar.tsx` (entre Éditeurs et Catégories)

### Auth — Exposition du rôle (`AuthProvider.tsx`)

- Ajout de `userRole: string | null` dans le contexte `AuthContext`
- Chargé depuis `public.users` après chaque connexion/changement de session
- Disponible partout via `useAuth().userRole`

### Mon compte — Espace éditeur (`/mon-compte/mon-espace-editeur`)

- **Visible uniquement** si `userRole === 'editeur'` (lien conditionnel dans le layout)
- Affiche toutes les solutions liées à l'éditeur associé au compte
- Chaque solution est un accordéon permettant de modifier :
  - **Logo éditeur** (URL + prévisualisation)
  - **Site web**
  - **Mot de l'éditeur** (texte avec support markdown `**bold**`, liens interdits)
  - **Galerie** : ajout/suppression/réordonnancement d'images et vidéos YouTube/Vimeo (même interface que l'admin)
- Lien "Voir la page solution →" vers la page publique
- Bouton "Enregistrer" par solution avec spinner + confirmation "Enregistré ✓"

### Server actions (`src/lib/actions/admin-users.ts`)

- `assignEditeurToUser(userId, role, editeurId)` — met à jour le rôle et l'association éditeur↔utilisateur
- `getEditeurDataForUser(userId)` — vérifie le rôle, retourne l'éditeur + ses solutions (avec galerie)
- `updateSolutionByEditeur(userId, solutionId, fields)` — vérifie l'appartenance avant toute écriture
- `syncGalerieByEditeur(userId, solutionId, items)` — même vérification, synchronise la galerie

### Sécurité

- Toutes les server actions vérifient côté serveur que la solution appartient bien à l'éditeur de l'utilisateur avant toute écriture (double vérification `editeur.user_id` + `solution.id_editeur`)
- La page `/mon-compte/mon-espace-editeur` vérifie `userRole === 'editeur'` côté client + `getEditeurDataForUser` vérifie le rôle côté serveur

---

## [2026-04-13] — Galerie vidéo, UX comparatif, flux évaluation, sécurité commentaires

### Sécurité

- **Fix XSS `PublisherWord.tsx`** : le champ `mot_editeur` était injecté dans `dangerouslySetInnerHTML` sans sanitisation — un script malveillant en base s'exécutait dans le navigateur. Ajout de `sanitizeHtml()` (déjà utilisée ailleurs) autour du contenu avant rendu. `<strong>` reste autorisé pour le markdown `**bold**`.
- **Blocage URLs dans les commentaires utilisateurs** :
  - Côté client (`/solution/noter/[...slug]/page.tsx`) : avertissement orange en temps réel sous le textarea dès qu'une URL (`http://`, `https://`, `www.`) est détectée — l'utilisateur est informé et peut corriger avant soumission
  - Côté serveur (`evaluation.ts`) : fonction `stripUrls()` appelée au début de `submitEvaluation` — supprime toutes les URLs du commentaire avant sauvegarde en base, même si l'avertissement client est ignoré

---

## [2026-04-13] — Galerie vidéo, UX comparatif, flux évaluation

### Comparatif (`ComparisonSection.tsx`)

- **Légende sticky** : bandeau collant au scroll affichant le nom de chaque solution au-dessus de sa colonne de barres, dans sa couleur, avec `position: sticky top-[72px]`
- **`[overflow:clip]`** sur la `<section>` (remplace `overflow-hidden`) pour autoriser les enfants sticky tout en conservant le clipping des coins arrondis
- **Barres plus grandes** : compact mode `w-16 → w-24` (longueur), `h-1 → h-2` (épaisseur)
- **Alignement** : noms de solution alignés à gauche (bord de la barre)
- **Dropdown de swap** : cliquer sur un nom de solution comparée ouvre un menu pour la remplacer par une autre (`handleSwap` — remplace en place, conserve la couleur)
- **Bouton ×** : suppression directe d'une solution depuis la légende sticky
- **Bouton +** : ajout d'une solution depuis la légende sticky (dropdown `availableSolutions`) — visible uniquement si `canAddMore`
- **Dropdown ancré à droite** (`right-0`) pour éviter le débordement hors du cadre

### Galerie solutions (`SolutionGallery.tsx`)

- **Padding** autour de l'image principale (`px-4 py-3` sur le conteneur) pour éviter que l'image lèche les bords de la card
- **Modale zoom** : clic sur l'image principale → modale plein écran `bg-black/85`, clic n'importe où → ferme ; curseur `cursor-zoom-in / cursor-zoom-out`
- **Support vidéo YouTube / Vimeo** :
  - Détection automatique par URL (`isVideoUrl`) — fonctionne même sans champ `type` renseigné
  - Helpers `getYoutubeId`, `getVimeoId`, `getVideoEmbed`
  - Vue principale : miniature YouTube avec bouton play rouge, clic → ouvre la modale
  - Vignettes : miniature + overlay play
  - Modale vidéo : `<iframe>` avec `autoplay=1` ; clic sur l'iframe ne ferme pas la modale (`stopPropagation`)

### Admin — Galerie éditeur (`SolutionForm.tsx`, `admin.ts`, `admin-solutions.ts`)

- **Bouton "Ajouter une vidéo YouTube / Vimeo"** (rouge pointillé) → crée un item `type: 'video'`
- **Rendu adaptatif** : items vidéo affichent badge "Vidéo", champ URL dédié, miniature YouTube automatique ; items image conservent le comportement upload existant
- **Titre section dynamique** : "Galerie (3 images, 1 vidéo)"
- **`syncGalerie`** (`admin.ts`) : persist le champ `type` en base
- **`getSolutionByIdAdmin`** (`admin-solutions.ts`) : inclut `type` dans le SELECT Supabase

### Flux évaluation

- **Redirection post-soumission** (`/solution/noter/[...slug]/page.tsx`) : après `submitEvaluation`, redirige vers `/mon-compte/mes-evaluations` (au lieu de la page solution)
- **Correction `getEvaluationCompletionMap`** (`solutions.ts`) : l'ancien check (comparaison exhaustive de tous les `identifiant_tech` de la catégorie) échouait systématiquement pour le nouveau format `detail_*`. Remplacé par `submitted.size > 0` — dès qu'une évaluation est soumise, le bouton affiche "Modifier mon évaluation" au lieu de "Compléter"
- **Nettoyage** : requête Supabase sur `criteres` (devenue inutile) supprimée de `getEvaluationCompletionMap` ; join `solution:solutions(categorie_id)` supprimé

---

## [2026-04-12] — Migration DB critères logiciels métier + refonte du comparatif

### Contexte
Les anciennes évaluations utilisaient un format Firebase hérité (5 critères principaux codés en dur : `interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`, échelle 0-10). Les nouvelles évaluations collectées depuis le site utilisent 54 sous-critères `detail_*` (échelle 0-5). Ces nouvelles évaluations étaient **100% ignorées** dans le calcul des notes globales — bug critique silencieux. Ce chantier élimine la dette technique et branche les nouvelles évaluations sur toute la chaîne de calcul.

### Base de données (SQL — Supabase)

- **Bloc 1** — Sauvegardes préalables : `criteres_backup`, `evaluations_backup`, `resultats_backup`
- **Bloc 2** — Ajout de la colonne `parent_id` (text) sur `criteres` + insertion de 54 sous-critères `detail_*` avec `is_enfant = true`
- **Bloc 3** — Migration de 595 évaluations : scores JSONB transformés (ancien format clés snake_case 0-10 → nouveau `detail_*` 0-5) ; toutes les valeurs divisées par 2 ; valeurs `-1` (NC) supprimées ; fusions `detail_sav` et `detail_formation`
- **Bloc 4** — Insertion de 988 lignes dans `resultats` pour les sous-critères (trigger `trigger_update_evaluation_redac_note` désactivé temporairement — bug `uuid = text` dans sa clause WHERE, à corriger)
- **Bloc 5** — 43 anciens sous-critères passent à `type = 'archived'`

### TypeScript / Frontend

**`src/lib/db/evaluations.ts`**
- **Supprimé** : `CRITERES_PRINCIPAUX` hardcodé (ignorerait toujours les nouvelles évaluations)
- **Ajouté (exporté)** : `DETAIL_CRITERE_MAP` — mapping des 53 clés `detail_*` vers leur groupe (`interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`)
- **Ajouté** : `computeEvalGroupAvg()` — détecte l'ancien/nouveau format par préfixe de clé `detail_`, calcule la note par groupe (ancien format ÷2, nouveau format tel quel)
- **Modifié** : `getAverageNoteUtilisateurs()` — utilise `computeEvalGroupAvg`, gère les deux formats d'évaluation
- **Modifié** : `computeAggregatedResultats()` — même logique, gère les deux formats ; recalcul de la synthèse depuis les groupes (sans dépendre du champ `moyenne_utilisateur` potentiellement périmé)
- **Corrigé** : `getAvisUtilisateursPaginated()` — remplacement du heuristique `v > 5` par détection par préfixe de clé pour identifier l'ancienne échelle (pour `moyenne` et `scores`)

**`src/lib/actions/comparison.ts`**
- **Supprimé** : ancienne `getDetailedComparisonData` (utilisait `identifiant_bis` inexistant) et `SubCritereItem` — causes d'erreurs de build Vercel
- **Ajouté** : interface exportée `DetailGroupItem`
- **Ajouté** : `getDetailedComparisonData(solutionId)` — fetche les sous-critères `is_enfant = true`, les groupe par critère principal via `DETAIL_CRITERE_MAP`, retourne les données pour l'accordéon

**`src/components/solutions/detail/ComparisonSection.tsx`**
- **Supprimé** : code mort lié à `identifiant_bis`, `bisToResultat`, `stepGroups`, `getCompValByBis`, props `allResultats` et `schemaEvaluation` — causes d'erreurs de build Vercel
- **Ajouté** : prop `solutionId: string`
- **Ajouté** : états `detailMain`, `detailComps`, `detailLoading` pour l'accordéon
- **Ajouté** : `handleDetailExpand()` — lazy-charge les données au premier clic (appel direct, sans `startTransition`, pour ne pas déclencher le spinner du radar)
- **Modifié** : `handleSelect()` — fetche en parallèle (`Promise.all`) les données radar et les données détaillées de la solution comparée
- **Modifié** : `handleRemove()` — nettoie aussi `detailComps`
- **Modifié** : accordéon "Comparatif détaillé" toujours visible (suppression du `{hasDetailedData && ...}`), mention explicite "(notes utilisateurs)" dans le titre, spinner de chargement, message si aucune donnée

**`src/components/solutions/SolutionDetailPage.tsx`**
- **Ajouté** : prop `solutionId={solution.id}` passée à `<ComparisonSection>`
- **Supprimé** : props `allResultats` et `schemaEvaluation` qui n'existent plus

**Bloc 6 — Reconstitution des clés majeures (620 évaluations)**
- Les évaluations avec `detail_*` mais sans clé `interface`/`fonctionnalites`/etc. (620 lignes) ont reçu leurs clés majeures recalculées par moyenne des sous-critères de chaque groupe
- `moyenne_utilisateur` recalculée sur l'échelle 0-5 pour ces évaluations
- Correction du trigger `trigger_update_evaluation_redac_note` : `v_solution_id TEXT` → `v_solution_id UUID` (résout le bug `uuid = text` dans la clause WHERE)

### Résultat final
- `evaluations.scores` est désormais uniforme : toutes les évaluations finalisées ont les 5 clés majeures + leurs `detail_*`
- `ConfrereTestimonials` affiche les barres par critère pour l'ensemble des 676 avis
- Aucun reliquat Firebase dans le code ou la base

---

## [2026-04-11] — Session UI/UX polish + correctifs admin

### Added
- **Composant `ScrollToSolution`** (`src/components/admin/ScrollToSolution.tsx`) : composant client qui lit le query param `?scroll={id}` après une redirection et fait défiler la page admin jusqu'à la ligne correspondante, avec un bref surlignage visuel.
- **Fil d'Ariane (Breadcrumb) généralisé** (`src/components/ui/Breadcrumb.tsx`) : ajout d'une prop `variant` (`"default"` | `"light"`) pour adapter les couleurs selon le fond de page. Mode `"light"` : texte blanc avec `drop-shadow` pour lisibilité sur gradients sombres.
- **Bouton "Mettre à jour et activer"** dans `SolutionForm.tsx` : affiché uniquement quand une solution est inactive, permet de mettre à jour et passer `actif: true` en un seul clic (pattern `<button name="_activer" value="true">`).

### Changed
- **Navbar** (`src/components/layout/Navbar.tsx`) :
  - Mobile : fond en dégradé sombre unifié (`linear-gradient(135deg, rgba(10,90,90,0.95)...)`) ; texte `text-white`
  - Desktop index : navbar transparente non-scrollée, fondue avec le hero
  - Mega menu : opacité augmentée (~0.97), même dégradé navy
- **Hero sections** — toutes les pages catégorie (`/solutions/[slug]`) utilisent `bg-hero-gradient` (identique à la homepage). Breadcrumb intégré directement dans le hero (suppression du bandeau gris intercalaire).
- **Espacement intro** (`/solutions/[slug]`) : paragraphes via `[&_p]:mb-3 [&_p:last-child]:mb-0` (note : `@tailwindcss/typography` n'est pas installé, `prose` n'a pas d'effet).
- **Page `/comparatifs`** : fond `#CDD5EA`, cartes `linear-gradient(135deg, #8BAFC4 → #C47A9A → #C9A06A)`, illustrations `h-[220px]`, emoji `text-[120px]`.
- **Page `/solution/noter`** : cartes catégories refaites (grille 2 col, `min-h-[140px]`, dégradé, état actif plus sombre, support illustrations).
- **Fil d'Ariane** ajouté sur toutes les pages : `/comparatifs`, `/solutions/[slug]`, `/blog`, `/blog/[slug]`, `/solution/noter`, `/qui-sommes-nous`, pages détail solution — intégré dans le hero pour les pages à fond sombre.
- **Filtres solutions mobile** (`SolutionFilters.tsx`) : accordéon par groupe de tags (séparateurs deviennent des boutons toggle), groupes avec filtres actifs ouverts par défaut, indicateur visuel (point bleu).
- **Barre de tri** (`SolutionSortBar.tsx`) : style arrondi sticky (`rounded-2xl shadow-card border`).
- **Logo partenaires** (`HeroSection.tsx`) : plus petits sur mobile (`h-5 max-w-[70px]`).
- **Admin — scroll après édition** (`src/lib/actions/admin.ts`) : `updateSolution` redirige vers `/admin/solutions?scroll={id}`.
- **Admin — IDs de ligne** (`src/app/admin/solutions/page.tsx`) : chaque `<tr>` a `id="solution-{id}"` + `<ScrollToSolution />` en `<Suspense>`.

### Fixed
- **Bug "Valide aussi" non persisté** (`src/lib/db/admin-solutions.ts`) : la colonne `parent_ids` était absente du SELECT Supabase → les cases s'affichaient toujours vides au rechargement. Ajout de `parent_ids` dans la requête.

---

## [2026-04-11] — Robustesse publication réseaux sociaux + persistance messages

### Added
- **Persistance des messages générés** (`src/components/admin/SocialPanel.tsx`) : les posts générés pour chaque article sont sauvegardés dans `localStorage` (clé `social_posts_{id}`). Ils sont rechargés automatiquement à la réouverture de la page, avec les textes modifiés et les dates choisies. "Regénérer les messages" efface le cache.

### Fixed
- **Erreur JSON sur envoi Make.com** (`src/app/api/social-publish/route.ts`, `src/components/admin/SocialPanel.tsx`) : ajout de try/catch autour du fetch Make.com et du `res.json()` côté client — les erreurs réseau ou timeouts affichent maintenant un message lisible dans le panneau au lieu de crasher la page.

---

## [2026-04-11] — Améliorations UI pages solutions

### Changed
- **Masquage "Edité par"** (`src/components/solutions/detail/SolutionHero.tsx`) : le sous-titre "Edité par" n'apparaît plus si aucun éditeur n'est associé à la solution.
- **Layout hero aligné sur le contenu** (`src/components/solutions/detail/SolutionHero.tsx`) : la carte héro utilise désormais la même grille `lg:grid-cols-[1fr_340px]` que le reste de la page — la carte principale a exactement la même largeur que les sections "Avis de la rédaction" en dessous, et les notes (utilisateurs + rédaction) s'affichent dans la sidebar droite.
- **Onglets de navigation conditionnels** (`src/components/solutions/detail/SolutionHero.tsx`, `src/components/solutions/SolutionDetailPage.tsx`) : les boutons d'ancrage n'apparaissent que si la section correspondante a du contenu :
  - "Galerie" → masqué si `galerie` est vide
  - "Evaluation détaillée" → masqué si aucune note de rédaction détaillée
  - "Mot éditeur" → masqué si `mot_editeur` non renseigné
  - "Notes utilisateurs" → toujours visible (invite à évaluer même sans avis existants)
- **Zone de commentaire redimensionnable** (`src/app/solution/noter/[...slug]/page.tsx`) : le textarea du commentaire utilisateur passe de `resize-none` à `resize-y` — l'utilisateur peut agrandir la zone verticalement pour plus de lisibilité.
- **Bouton "Modifier mon commentaire"** (`src/app/mon-compte/mes-evaluations/page.tsx`) : bouton ajouté sur chaque ligne d'évaluation, pointe vers `/solution/noter/[categorie]/[slug]#commentaire`. La page de notation scrolle automatiquement jusqu'au bloc commentaire après chargement des données (`useEffect` sur `loading`).
- **Page "Mes notifications"** (`src/app/mon-compte/mes-notifications/page.tsx`) : section "Études cliniques" enrichie avec badge "avec le Digital Medica Hub" et mention "Plus d'informations prochainement." ; même mention ajoutée sous "Questionnaires de recherche".

---

## [2026-04-09 → 2026-04-10] — Blog IA + publication réseaux sociaux via Make.com

### Added
- **Nouveau module Blog public** (`src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`) : page listing avec hero article mis en avant, grille en deux colonnes, filtres par catégorie (navigation par query param `?categorie=`). Revalidation ISR toutes les 5 minutes.
- **Gestion du blog en admin** (`src/app/admin/blog/page.tsx`, `/nouveau`, `/[id]/modifier`) : tableau de bord listant les articles avec statut (publié / brouillon), date, catégorie. Boutons Éditer et Supprimer inline.
- **Composant `ArticleForm`** avec WYSIWYG TipTap, champ titre, image de couverture (URL), chapeau, meta description SEO, catégorie, statut (brouillon/publié), date de publication planifiable. Champs en state React pour permettre la génération automatique.
- **Génération d'article par IA** (`src/app/api/generer-article/route.ts`) : endpoint POST appelant Claude (claude-sonnet-4-6) avec un system prompt incarnant le "Dr Azerty", président de l'association 100 000 Médecins. Retourne un objet JSON structuré `{ titre, chapeau, contenu_html, meta_description }`. L'article est en prose (pas de listes), 700–1000 mots, avec balises `<h2>`, `<p>`, `<strong>`, `<em>`. Ton à la 1ère personne du pluriel ("nous", "notre association").
- **Génération de posts sociaux par IA** (`src/app/api/generer-posts-sociaux/route.ts`) : endpoint POST générant simultanément trois posts (Instagram, LinkedIn, Facebook) adaptés au ton de chaque réseau, avec hashtags pour Instagram, à partir du titre + chapeau + URL de l'article.
- **Panneau "Publier sur les réseaux"** (`src/components/admin/SocialPanel.tsx`) : accessible depuis la page de modification d'article, avec toggle Immédiat / Programmer par réseau et avertissement si l'article n'est pas encore publié.
- **Recherche de visuels Unsplash** (`src/app/api/suggerer-image/route.ts`) : extrait les mots-clés pertinents du titre via Claude Haiku, lance une recherche Unsplash orientée paysage, retourne 8 suggestions avec thumbnails et crédits photographes.
- **Publication sur les réseaux sociaux via Make.com** (`src/app/api/social-publish/route.ts`) : webhook générique envoyant à Make.com un payload `{ network, text, scheduled_at, image_url, article_url }`. Supporte la publication immédiate ou planifiée pour LinkedIn, Facebook, Instagram. Buffer abandonné (tokens OIDC dépréciés côté tiers) au profit de Make.com.
- **Gestion des catégories d'articles** (`ArticleCategoriesManager`) : CRUD inline des catégories de blog avec champ nom et slug, positionnement par glisser-déposer.
- `createServiceRoleClientUntyped()` dans `server.ts` : client Supabase sans typage strict pour les tables `articles` et `articles_categories` absentes des types Supabase générés, en attendant la prochaine régénération.
- **Améliorations cosmétiques** (commit `97374f0`) : images de catégories sur les cartes de la page `/comparatifs`, corrections visuelles diverses.

### Changed
- Navigation admin étendue avec entrée "Blog" pointant vers `/admin/blog`.
- Page d'accueil admin (`/admin/index`) : ajout des clés `nav_blog_visible` et `nav_irritants_visible` dans `site_config` pour contrôler l'affichage des entrées de navigation.

---

## [2026-04-07 → 2026-04-08] — Page "Irritants e-santé" + relances mail PSC + tags agendas

### Added
- **Page `/irritants-esante`** (`src/app/irritants-esante/page.tsx`) : page statique dont le contenu est géré depuis l'admin via la table `pages_statiques` (slug `irritants-esante`). Rendu via le composant `PageStatique` avec breadcrumb.
- **Cron de relance PSC** (`src/app/api/cron/relance-psc/route.ts`) : job GET sécurisé par `CRON_SECRET`. Envoie jusqu'à 4 relances espacées de 7 jours aux évaluateurs dont l'évaluation est en statut `en_attente_psc`. Utilise le template `relance_psc` de la table `email_templates`, avec variables `{{solution_nom}}`, `{{psc_link}}`, `{{relance_num}}`, `{{max_relances}}`. Tracks `last_relance_psc_sent_at` et `relance_psc_count` sur la table `evaluations`.
- **Tags sur les agendas** (commit `3ad5d7c`) : système de tags spécifique à la catégorie "agendas médicaux", avec gestion admin.

### Changed
- Petites améliorations de l'admin (commit `fd78485`) : corrections d'affichage, navigation.

---

## [2026-04-06] — Questionnaires IA médicaux + index admin modifiable

### Added
- **Questionnaires spécialisés** (`src/app/admin/questionnaires/page.tsx`, `src/lib/actions/questionnaires.ts`) : interface admin pour éditer les questions détaillées du formulaire d'évaluation par catégorie. Quatre profils : logiciels métier (défaut), agenda médical, IA Scribes (`intelligence-artificielle-medecine`), IA Documentaires. L'éditeur de questionnaire (`QuestionnaireEditor`) sauvegarde les questions immédiatement (commit `ec879ba`).
- **Questionnaires IA Scribes** (commit `eda2130`) et **IA Documentaires** (commit `9b04202`) : sections de questions spécifiques à ces catégories ajoutées dans le formulaire d'évaluation step-by-step.
- **Index modifiable depuis l'admin** (`src/app/admin/index/page.tsx`, `AdminIndexEditor`) : l'admin peut configurer le contenu de la page d'accueil (titre hero, sous-titre, image hero, label partenaires, titre section articles, slugs d'articles mis en avant, visibilité des entrées de navigation irritants/blog). Commit `090ffde`/`efa5b78` : corrections et stabilisation.
- **Section `/comparatifs`** (`src/app/comparatifs/page.tsx`) : page publique regroupant toutes les catégories actives de solutions, organisées par groupes (`groupes_categories`) avec images.

### Fixed
- Sauvegarde immédiate des questions dans le questionnaire (commit `ec879ba`).
- Corrections diverses admin post-ajout des nouvelles catégories (commits `50b4187`, `7ebcc9d`, `090ffde`).

---

## [2026-04-05] — Recherche IA solutions + éditeurs + agendas médicaux et IA Scribes

### Added
- **Recherche IA solutions** (`src/lib/actions/searchSolution.ts`) : lors de la création/modification d'une solution en admin, bouton "Rechercher avec l'IA" qui appelle Tavily (recherche web FR + EN en parallèle) puis Claude Haiku avec function calling (`extraire_infos_logiciel`) pour générer une description ultra-concise et un avis éditorial factuel. Détecte le site officiel et récupère le logo via logo.dev.
- **Recherche IA éditeurs** (`src/lib/actions/searchEditeur.ts`) : même mécanique appliquée aux fiches éditeurs.
- **Catégorie "Agendas médicaux"** (commit `4710134`) : nouvelle catégorie avec formulaire d'import spécifique, critères de notation adaptés (prise de RDV patient, rappels SMS, interopérabilité), gestion admin complète.
- **Catégorie "IA Scribes"** (commit `eda2130`) : catégorie pour les logiciels d'aide à la rédaction médicale par IA.
- **Catégorie "IA Documentaires"** (commit `9b04202`) : catégorie pour les outils IA de gestion documentaire médicale.
- **Pages éditeurs** (`src/app/editeur/[idEditeur]/page.tsx`) : page publique de présentation d'un éditeur avec ses solutions associées.
- **Admin éditeurs** (`src/app/admin/editeurs/`, `EditeurForm`, `EditeurDiffPanel`, `EditeurWithSearch`) : CRUD complet des éditeurs avec recherche IA intégrée et panneau de diff affichant les champs avant/après modification.
- **Page "Qui sommes-nous"** (`src/components/QuiSommesNousPage.tsx`) : contenu éditorial et syndicats fondateurs avec accordéon glisser-déposer, correction d'affichage (commit `2d84398`).

### Fixed
- Fix import et gestion des catégories agendas (commits `dc73862`, `ad1b323`).
- Corrections diverses (commits `a191ac1`, `7124f61`, `5495e73`).

---

## [2026-04-04] — Emails de relance, centre de notifications, suppression de compte

### Added
- **Centre de notifications utilisateur** (`src/app/mon-compte/mes-notifications/page.tsx`) : page avec toggles pour 4 préférences : rappels de revalidation, annonces & nouveautés, études cliniques, questionnaires de recherche. Sauvegarde instantanée en base via `updateNotificationPreferences` (`src/lib/actions/notifications.ts`).
- **Cron de relance évaluations** (`src/app/api/cron/relance-evaluations/route.ts`) : job sécurisé envoyant :
  - Email `relance_1an` : 1 an après la dernière évaluation si jamais relancé.
  - Email `relance_3mois` : tous les 3 mois indéfiniment jusqu'à revalidation ou désabonnement.
  - Respecte la préférence `relance_emails` de l'utilisateur. Utilise des liens de réévaluation 1-clic signés (`src/lib/email/revalidation.ts`).
- **Cron de relance incomplets** (`src/app/api/cron/relance-incomplets/route.ts`) : relance les utilisateurs ayant commencé mais pas terminé leur profil.
- **Admin emails** (`src/app/admin/emails/page.tsx`) : interface accordion pour éditer 6 templates : lancement, relance_1an, relance_3mois, verification_psc, suppression_compte, réinitialisation_mot_de_passe. Support de l'envoi massif pour le mail de lancement via `/api/admin/send-lancement`.
- **Suppression de compte** (`src/components/mon-compte/DeleteAccountModal.tsx`, `src/lib/actions/account.ts`) : modal de confirmation double validation, suppression de toutes les données utilisateur, email de confirmation, enregistrement dans `compte_suppressions`.
- **Tableau de bord Statistiques admin** (`src/app/admin/statistiques/page.tsx`) : KPI cards (total avis, utilisateurs, solutions, note moyenne, comptes supprimés), graphiques SVG maison (line chart, bar chart horizontal, donut chart, distribution des notes), fraîcheur des avis (< 1 an vs > 1 an), top solutions par nb avis et par note, démographie utilisateurs (spécialités, mode d'exercice), inscriptions par mois.
- **Amélioration parcours nouvel utilisateur** (commit `fe51c32`) : onboarding plus fluide.

### Changed
- Page connexion : amélioration du flux de récupération de mot de passe.
- Page "Mon compte" (profil, layout) : comportement des boutons et changement d'email (commit `fa2601e`).
- Amélioration de la recherche par tags et de l'admin (commit `320233b`).

### Fixed
- Fix 1er login : correction de la redirection après authentification initiale (commit `904be4f`).
- Fix oubli de mot de passe (commit `904be4f`).
- Stabilisation des relances et de la suppression (commits `e21cb22`, `cbffea1`, `b3724a1`, `00dc231`).

---

## [2026-04-03] — Parcours de notation sans email + validation PSC stabilisée

### Added
- **Nouveau parcours de notation via URL signée** (`src/app/solution/noter/[...slug]/page.tsx`) : accès à la notation d'une solution directement via une URL signée sans être connecté. Formulaire multi-étapes : notes principales (5 critères sur 5 étoiles), questions détaillées par sections (Avant/Pendant/Après la consultation, subdivisées en sous-étapes), commentaire libre.
- **Évaluation anonyme avec vérification PSC** (`submitEvaluationAnonyme` dans `src/lib/actions/evaluation.ts`) : l'évaluateur non connecté fournit un email temporaire, reçoit un lien PSC par mail, valide son identité de professionnel de santé via Pro Santé Connect. L'évaluation reste en statut `en_attente_psc` jusqu'à validation.
- **Toggle actif/inactif sur solutions** (`src/components/admin/ToggleSolutionActif.tsx`) : interrupteur inline dans l'admin pour activer/désactiver une solution sans passer par le formulaire complet (commit `51df47a`).

### Fixed
- Nombreuses corrections de stabilité PSC et du parcours de notation (commits `344698f` → `f89881a`) : gestion des redirections, validation des tokens, états d'erreur, récupération de session.
- Fix changement d'email et comportement des boutons page "Mon compte" (commit `fa2601e`).
- Corrections antérieures liées aux modifications précédentes (commit `21f6855`).

---

## [2026-04-02] — Amélioration admin, filtres comparatif, corrections TypeScript et stabilité

### Added
- **Filtres comparatif** (`src/components/solutions/SolutionFilters.tsx`, commit `464ebbd`) : filtres latéraux pour les pages de listing solutions (catégorie, note minimale). Filtres optimisés pour les pages comparatifs (commit `06eac3e`).
- Améliorations admin (commits `53a77c4`, `c4b55e3`) : présentation des listes, navigation, formulaires.

### Fixed
- Fix Navbar : conversion en composant client (`'use client'`) pour supporter les hooks React (commit `c4b55e3`).
- Fix import nommé `TextStyle` depuis `@tiptap/extension-text-style` — était importé par défaut (commit `48e8ba0`).
- Fix erreurs TypeScript : suppression import inutilisé, ajout vérification null sur `categorie` (commit `21a5793`).
- Fix vérification null sur toutes les pages serveur pour éviter les erreurs 500 au runtime (commit `5163240`).
- Fix erreur 500 : ajout `export const dynamic = 'force-dynamic'` sur les pages solutions utilisant `searchParams` en conflit avec ISR (commit `a7c241c`).

---

## [2026-03-31 → 2026-04-01] — Ordre des catégories, header fixé, WYSIWYG amélioré

### Changed
- **Ordre des catégories** (commit `aa0c12d`) : gestion de l'ordre d'affichage des catégories en admin, avec déplacement par glisser-déposer et persistance en base.
- **Header fixé** (commit `ed7f030`) : la Navbar reste visible lors du scroll (position sticky).
- **Éditeur WYSIWYG TipTap** amélioré (commit `aa0c12d`) : ajout des contrôles couleur et taille de police dans la barre d'outils.

### Fixed
- Corrections sur les catégories après refonte de leur ordre (commit `7047725`).

---

## [2026-03-29 → 2026-03-30] — Fixes WYSIWYG, formulaire contact, récupération mot de passe

### Fixed
- Corrections successives du `RichTextEditor.tsx` (commits `0fc5e29`, `50eff59`) : stabilisation des extensions TipTap (police, couleur, image, tableau), résolution des conflits d'hydratation SSR.
- Fix formulaire de contact : l'email n'était pas envoyé via SendGrid (commit `2c44b6a`).
- Fix flux de récupération de mot de passe : le lien de réinitialisation ne fonctionnait pas correctement (commit `2c44b6a`).

### Changed
- Changement des credentials admin (commit `b988283`).

---

## [2026-03-28] — Éditeur WYSIWYG (TipTap), galerie images, migration vers Supabase Storage

### Added
- **Éditeur WYSIWYG TipTap** (`src/components/admin/RichTextEditor.tsx`, commit `3f8fff7`) pour le contenu des pages statiques et des solutions. Extensions intégrées : StarterKit, Underline, Link, Table (TableRow, TableCell, TableHeader), Image, Color, TextStyle, extension personnalisée `FontSize` (glisser sur liste de tailles prédéfinies), palette de 12 couleurs.
- **Upload d'images vers Supabase Storage** (`src/app/api/upload/route.ts`) : endpoint utilisé par le WYSIWYG et les galeries.
- **Bouton upload galeries** dans `SolutionForm` (commit `623f4f2`) : upload d'images dans la galerie d'une solution depuis l'admin.
- **Déplacement d'images dans la galerie** (commit `0fc5e29`) : réordonnancement par glisser-déposer.
- **Mise à jour `SolutionForm.tsx`** (commit `bb6c088`) : intégration du WYSIWYG et du gestionnaire de galerie.

### Changed
- Suppression des images locales migrées vers Supabase Storage (commit `6cba419`) : nettoyage du répertoire `public/` des assets déplacés en cloud.

---

## [2026-03-26] — Page Vidéos YouTube, intégration Premiocare

### Added
- **Page `/videos`** (`src/app/(static)/videos/page.tsx`, commit `d66b97d`) : grille de vidéos YouTube embed en format 9:16 (portrait), chargées depuis la table Supabase `videos`. Revalidation ISR toutes les heures. Regex de détection des IDs YouTube (watch, embed, shorts, youtu.be).
- **Bouton d'accès vidéos** depuis la homepage et mise à jour de la Navbar (commit `d66b97d`).
- **`.gitignore`** et **`README.md`** : fichiers de base du projet ajoutés (commit `d66b97d`).
- Intégration **Premiocare** (commit `8f8d5b2`) : solution partenaire ajoutée dans la base.

---

## [2026-03-24] — UI admin thème navy, spécialités PSC, tri des critères

### Changed
- **Admin UI thème navy** (`src/app/admin/layout.tsx`, `src/components/admin/AdminHeader.tsx`, commit `e303d5f`) : refonte visuelle complète de l'interface d'administration aux couleurs navy/blanc du site. Sidebar avec navigation claire par sections (Solutions, Catégories, Éditeurs, Pages, Emails, Statistiques…).
- **Mapping spécialités PSC** (`src/lib/auth/psc-specialites.ts`) : correspondance des codes de spécialités ANS (SM26, SM53, SM54 → médecine générale ; 50+ spécialités) vers leurs libellés lisibles pour les statistiques et le profil utilisateur.
- **Tri des critères** dans `SolutionForm` : les critères de notation sont organisés et triés par catégorie.
- Correction de la typo du nom du site (commit `e303d5f`).

---

## [2026-03-20] — Pages légales, formulaire de contact SendGrid, nettoyage UI

### Added
- **Page RGPD** (`src/app/(static)/rgpd/page.tsx`) : 17 articles couvrant la politique de confidentialité complète (définitions, données collectées, finalités, droits RGPD art. 15-22, cookies, sous-traitants Supabase/Vercel, transferts hors UE, mineurs). Contenu gérable depuis l'admin ou affiché en dur si absent de la DB.
- **Page CGU** (`src/app/(static)/cgu/page.tsx`) : conditions générales d'utilisation.
- **Page Transparence** (`src/app/(static)/transparence/page.tsx`) : charte de transparence sur la méthodologie de notation et l'indépendance éditoriale.
- **Formulaire de contact** (`src/app/(static)/contact/page.tsx`, `src/lib/actions/contact.ts`) : formulaire avec nom, email, sujet, message. Envoi via SendGrid vers contact@100000medecins.org.

### Changed
- Nettoyage UI général : suppression d'éléments visuels superflus, harmonisation des espacements sur les pages publiques.

---

## [2026-03-03] — Sidebar filtres, fix évaluation "plus utilisé", sanitize HTML

### Added
- **`src/lib/sanitize.ts`** : utilitaire `sanitizeHtml` filtrant les balises autorisées (`<br>`, `<u>`, `<b>`, `<strong>`, `<em>`, `<i>`, `<p>`) dans les avis utilisateurs pour prévenir les XSS.

### Changed
- **Layout sidebar filtres** : refonte du layout de la page de listing solutions avec sidebar de filtres latérale sticky (catégorie, note minimale, critères de tri) et grille solutions 3 colonnes à partir de `xl`.

### Fixed
- Fix évaluation "plus utilisé" : cocher "je n'utilise plus ce logiciel" n'enregistrait pas correctement la date de fin dans la table `evaluations`.
- Fix affichage des avis : les balises HTML (`<br>`, `<u>`, `<b>`) s'affichaient en texte brut au lieu d'être rendues.

---

## [2026-02-26] — Point de sauvegarde initial

### Context
Sauvegarde de référence documentant l'état du projet : admin blog fonctionnel (liste, création, modification d'articles avec WYSIWYG), système de pages statiques en place (CGU, RGPD, À propos, gestion depuis l'admin). Correspond à la base depuis laquelle toutes les évolutions suivantes ont été développées.

---

## Notes techniques d'architecture

### Stack et services externes

| Composant | Technologie |
|---|---|
| Framework | Next.js 14 (App Router, React Server Components + Client Components) |
| Base de données | Supabase (PostgreSQL, Row Level Security) |
| Authentification | Supabase Auth (email/password) + Pro Santé Connect (OIDC) |
| Storage | Supabase Storage (images galeries, logos) |
| Emails transactionnels | SendGrid avec templates HTML personnalisables depuis l'admin |
| Génération IA articles | Anthropic API — claude-sonnet-4-6 |
| Enrichissement IA fiches | Anthropic API — claude-haiku-4-5 (function calling) |
| Recherche web pour IA | Tavily API (recherche FR + EN, extraction contenu) |
| Publication réseaux sociaux | Make.com via webhook générique |
| Images stock blog | Unsplash API |
| Logos logiciels | logo.dev |
| Déploiement | Vercel (Edge Network) |

### Modèle de données principal (tables Supabase)

- `solutions` — logiciels comparés (nom, slug, description, logo, galerie, critères, notes)
- `categories` — catégories de solutions avec groupes, position, image
- `groupes_categories` — regroupement de catégories (ex : "Logiciels métier", "IA Médicale")
- `editeurs` — éditeurs de logiciels
- `evaluations` — avis des médecins (notes critères, commentaire, statut PSC, dates relances)
- `users` — profils médecins (spécialité PSC, mode exercice, densité pop., RPPS)
- `users_notification_preferences` — préférences email par utilisateur (relances, marketing, études, thèses)
- `pages_statiques` — contenu éditorial admin (RGPD, CGU, Transparence, Qui sommes-nous, Irritants…)
- `articles` — articles de blog (titre, slug, contenu HTML, statut, date publication, id_categorie)
- `articles_categories` — catégories du blog (nom, slug, position)
- `email_templates` — templates HTML des emails transactionnels et de relance (sujet + contenu_html avec variables `{{…}}`)
- `site_config` — configuration dynamique clé/valeur de la page d'accueil
- `videos` — vidéos YouTube embarquées
- `partenaires` — logos partenaires (position, url, image)
- `questionnaire_sections` — questions détaillées du formulaire d'évaluation par catégorie-slug
- `compte_suppressions` — log horodaté des suppressions de comptes

### Pro Santé Connect (PSC)

- Intégration OIDC manuelle : flow code → échange token côté serveur (`/api/auth/psc-initier`, `/api/auth/psc-callback`)
- Deux environnements configurables via `NEXT_PUBLIC_PSC_ENV` : `bas` (préproduction ANS, wallet.bas.psc.esante.gouv.fr) et `production` (wallet.esw.esante.gouv.fr)
- Extraction du RPPS depuis `preferred_username` ou `otherIds[{ origine: 'RPPS' }].identifiant`
- State + nonce stockés en cookies (durée 10 min) pour résister aux redirects cross-contexte

### Conventions de code

- `export const dynamic = 'force-dynamic'` obligatoire sur toutes les pages utilisant `searchParams` (conflit avec ISR Next.js 14)
- Client Supabase typé : `createServiceRoleClient()` (admin, service role) vs `createServerClient()` (pages publiques, user role)
- Crons sécurisés par header `Authorization: Bearer <CRON_SECRET>`
- Toutes les mutations sensibles passent par des Server Actions Next.js (`'use server'`)
- Tables `articles` et `articles_categories` utilisent `createServiceRoleClientUntyped()` en attendant la régénération des types TypeScript

### Migration Firebase → Supabase

Le projet a été migré depuis Firebase vers Supabase. Des colonnes héritées de Firebase peuvent être présentes dans le schéma mais inutilisées — nettoyage différé à la stabilisation du projet (voir `project_db_cleanup.md`).

Pour régénérer les types TypeScript Supabase après une migration de schéma :
```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```
