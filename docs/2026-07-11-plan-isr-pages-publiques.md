# Plan — Rendre les pages publiques cacheables par ISR (réduction CPU Vercel Fluid)

**Overall Progress:** `85%`

_Créé le 2026-07-11._

> **Résultat de la passe ciblée (build vérifié, `tsc` OK)** : `/` **ƒ→○**, `/solutions/[cat]/[sol]` **ƒ→●** (les 139 fiches, le gros poste), `/editeurs` `○`, `/solutions` `○`. La page catégorie `/solutions/[cat]` **reste `ƒ`** car elle lit `searchParams` (filtres) — inhérent, 7 pages légères. **Découverte** : la plupart des fonctions du chemin fiche étaient **déjà en `createServiceRoleClient`** (cookie-less) ; le vrai déclencheur dynamique restant de la fiche n'était pas un cookie mais **l'absence de `generateStaticParams`** (segment dynamique) → corrigé par un `generateStaticParams() { return [] }` (pattern déjà utilisé par `/editeur/[slug]`). Restent : commit + déploiement + smoke test.

## TLDR

Les pages publiques (accueil, fiches solutions, catégories, éditeurs, blog) sont rendues
**dynamiquement à chaque requête** — donc à chaque visite (bots compris) = un rendu serveur
complet avec ~10-13 requêtes BDD. C'est le 1er poste de **CPU Vercel Fluid** (~91 % du quota
Hobby, risque de mise en pause). Cause : ces pages lisent la lecture BDD via `createServerClient()`
qui appelle `cookies()` → Next les marque dynamiques et **ignore `revalidate`**.

Fix : introduire un client **`createPublicClient()` (clé anon, SANS cookies)** et basculer les
fonctions de **lecture publique** dessus → les pages redeviennent **statiques/ISR** (rendues
~1×/heure au lieu de chaque requête). La RLS reste active (rôle anon) → filet de sécurité.

## Acquis (exploration vérifiée 2026-07-11)

- **Preuve** : `npm run build` → `┌ ƒ /` (accueil **Dynamique**) malgré `revalidate=3600` ; à
  l'inverse `○ /api/acronymes 1h` (client service-role **sans cookies**) est **statique/ISR**.
  ⇒ mécanisme confirmé : `cookies()` ⇒ dynamique.
- **`createServerClient()`** ([server.ts](../src/lib/supabase/server.ts)) fait `await cookies()`
  (clé anon + adaptateur cookies). Utilisé partout dans `src/lib/db/*` pour les lectures publiques.
- **`previewInactive()`** lit une **variable d'env** (pas de cookie) → pas un déclencheur dynamique.
- **Navbar = `"use client"`** (état connecté via `useAuth()` côté client) et **`layout.tsx` ne lit
  aucun cookie** → aucune lecture de session **côté serveur** dans l'arbre des pages publiques.
  ⇒ le seul déclencheur dynamique = les fonctions BDD. Rendre les pages cookie-less est **sûr**.

## Critical Decisions

- **Client cookie-less = anon, PAS service-role** : `createPublicClient()` = `createClient(url, anonKey,
  { auth: { persistSession: false } })`. Cookie-less (donc ISR) **et** RLS conservée (rôle anon = ne
  voit que le public) → même vue qu'un visiteur anonyme, filet si un filtre `actif` est oublié. Plus
  sûr que service-role (qui bypasse la RLS).
- **On garde `createServerClient` (cookies) pour le spécifique-utilisateur** : `users.ts`, mes évals /
  favoris, espace éditeur, flux auth. Ces pages (`/mon-compte/*`) sont **légitimement dynamiques**.
- **Passe ciblée d'abord** : le chemin des fiches solutions + accueil + catégories (le gros poste CPU),
  puis extension aux autres pages publiques (éditeur, blog, actualités, glossaire…).
- **Filtres `actif=true` / `previewInactive()` conservés tels quels** (aucune modification de logique
  métier ; on ne change QUE le client).
- **Vérité = la table de routes du build** : la réussite se mesure au passage `ƒ → ○/●`.

## Tasks

- [x] 🟩 **Étape 0 : Exploration & preuve** *(fait 2026-07-11)*
  - [x] 🟩 Build → accueil `ƒ` ; cause = `cookies()` via `createServerClient` ; Navbar/layout sans cookie serveur.

- [x] 🟩 **Étape 1 : Ajouter `createPublicClient()`** dans [server.ts](../src/lib/supabase/server.ts) *(fait)*
  - [x] 🟩 `createClient<Database>(url, anonKey, { auth: { persistSession: false } })` — anon, sans cookies, commenté.

- [x] 🟩 **Étape 2 : Basculer les fonctions de lecture publique du chemin fiche/accueil/catégorie** *(fait — beaucoup étaient déjà service-role ; basculé : solutions.ts, tooltips.ts, categories.ts publiques, misc.getHomepageVideos/getTags/getCriteresMajeurs, + 4 composants d'accueil)*
  - [ ] 🟥 `solutions.ts` : `getSolutions`, `getSolutionBySlug`, `getSolutionIdsBySlugs`, `getNotesRedac`, `getNotesUtilisateursGlobales`, `getNotesRedacGlobales`, `getNbNotesUtilisateurs`, `getSiteStats`.
  - [ ] 🟥 `resultats.ts` : `getAllResultats` (+ lectures publiques du fichier).
  - [ ] 🟥 `evaluations.ts` : `getAvisUtilisateursPaginated`, `getAverageNoteUtilisateurs`, `computeAggregatedResultats` (lectures publiques uniquement — **ne pas** toucher aux lectures liées à `user_id`).
  - [ ] 🟥 `solution-liens.ts` : `getSolutionsLiees` ; `solution-communautes.ts` : `getCommunautesPubliques`.
  - [ ] 🟥 `tooltips.ts` : `getNoteGlobaleTooltip` ; `settings.ts` : `getDisplayPrixFront`, `getDisplayContactsCommerciaux`.
  - [ ] 🟥 `categories.ts` : `getCategories` (nav + home) ; `misc.ts` : `getHomepageVideos`, `getVideosForSolutionAsGalerie`.
  - [ ] 🟥 **Composants de sections qui fetchent en direct** (sinon l'accueil reste `ƒ`) : `HeroSection`, `AboutMission`, `BlogPreview`, `CommunautePreview` appellent `createServerClient()` **inline** → les basculer aussi.
  - [ ] 🟥 Conserver `.eq('actif', true)` / `previewInactive()` partout. Ne changer QUE le client.

- [x] 🟩 **Étape 3 : Vérifier l'absence d'autres lectures de cookies** *(fait)*
  - [x] 🟩 Composants fiche = `import type` seulement (aucun fetch). Vrai reste = `generateStaticParams` manquant (pas un cookie) → `generateStaticParams() { return [] }` ajouté à la fiche solution.

- [x] 🟩 **Étape 4 : Build de vérification** *(fait — `/` ƒ→○, `/solutions/[cat]/[sol]` ƒ→● ; `/solutions/[cat]` reste ƒ = searchParams ; `tsc` OK)*

- [ ] 🟥 **Étape 5 : Smoke test fonctionnel**
  - [ ] 🟥 Pages publiques : contenu identique **déconnecté ET connecté** (la Navbar affiche toujours l'état via le client). Un nouvel avis / une modif admin se reflètent (revalidation à la volée déjà en place via `revalidatePath`).

- [ ] 🟥 **Étape 6 : Extension (passe suivante, hors périmètre immédiat)**
  - [ ] 🟥 Même bascule pour les autres pages publiques restées `ƒ` : `editeur/[slug]`, `editeurs`, `blog`, `blog/[slug]`, `actualites`, `glossaire`, `comparatifs`, `stories-tutos`… (une par une, avec vérif build).

## Hors scope

- Pas de mutualisation/refonte des requêtes (gain marginal vs le passage en ISR).
- Pas de `next/image` / Smart CDN (autre sujet, cf. egress).
- On ne touche pas aux pages `/mon-compte/*` ni aux server actions (dynamiques par nature).
