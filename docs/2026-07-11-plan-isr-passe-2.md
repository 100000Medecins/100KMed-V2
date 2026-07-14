# Plan — Passe 2 ISR : basculer les pages publiques restantes en cache

**Overall Progress:** `80%`

_Créé le 2026-07-11. Suite de [2026-07-11-plan-isr-pages-publiques.md](2026-07-11-plan-isr-pages-publiques.md) (passe 1, étape 6)._

> **✅ Phase 1 FAITE (2026-07-11, build vert)** : **10 pages `ƒ→○`** — `/cgu`, `/rgpd`,
> `/transparence`, `/qui-sommes-nous`, `/tous-ensemble`, `/difficile-de-changer`,
> `/irritants-esante`, `/lancement-100k`, `/comparatifs`, `/videos`. Switchés : `getPageBySlug`,
> `getPageBySlugOrNull` (pages.ts), `getVideos`, `getVideoRubriques` (misc.ts), fetch inline
> `comparatifs`.
>
> **✅ Phase 1b FAITE (2026-07-11, build vert)** : `/glossaire` + `/stories-tutos` → **`○`** —
> l'email de préremplissage du formulaire est passé **côté client** (`useAuth`), suppression de
> `getUserEmail` serveur + `force-dynamic`.
>
> **✅ Phase 2 FAITE (2026-07-11, build vert)** : `/blog/[slug]` → **`●`** (switch `createPublicClient`
> + `generateStaticParams() { return [] }`).
>
> **✅ Phase 4 — page catégorie FAITE (2026-07-11, build vert)** : `/solutions/[cat]` → **`●`** — filtrage
> par tags + tri (global/critère/prix/nom) **déportés côté client** (`SolutionsCategoryBrowser` +
> `useSearchParams`), fallback `<Suspense>` = vue par défaut rendue serveur (SEO : solutions dans le
> HTML statique). Composants `SolutionFilters`/`SolutionSortBar` **inchangés**. ⚠️ **Parité tri/tags
> à vérifier en local (`npm run dev`) avant merge.**
>
> **⚠️ Découverte** : `/actualites` interroge la table **`public.actualites` qui n'existe pas**
> (vérifié SQL — vestige Firebase, contenu migré vers `articles`) → route **morte**, laissée
> dynamique, à nettoyer (cf TODO). **Total passe 2 à ce stade : 12 pages `ƒ→○` + 2 `ƒ→●`.**

## TLDR

La **passe 1** a rendu cacheables les 2 gros postes : accueil (`ƒ→○`) et 139 fiches solutions
(`ƒ→●`). Restent **16 pages publiques en `ƒ`** (rendu serveur à **chaque** requête, bots compris
→ CPU Vercel Fluid). Cette passe les bascule en ISR selon **3 recettes**, ordonnées par
**ROI / risque croissant** — les gains faciles d'abord.

## État vérifié (build 2026-07-11)

Pages **publiques** encore `ƒ` et leur **cause** (relevé du build + lecture des fichiers) :

| Page | Cause du `ƒ` | Recette |
|---|---|---|
| `/cgu`, `/rgpd`, `/transparence`, `/qui-sommes-nous`, `/tous-ensemble`, `/difficile-de-changer`, `/irritants-esante`, `/lancement-100k` | cookies via `getPageBySlug` (pages.ts) | **A** |
| `/actualites` | cookies via `getActualites` (misc.ts) | **A** |
| `/videos` | cookies via `getVideos` (misc.ts) | **A** |
| `/glossaire` | cookies (`createServerClient` inline, déjà partiellement service-role) | **A** |
| `/comparatifs` | cookies (`createServerClient` inline) | **A** |
| `/stories-tutos` | cookies (`createServerClient` inline + `getVideos`/`getVideoRubriques`) | **A** |
| `/blog/[slug]` | cookies inline **+** pas de `generateStaticParams` (segment dynamique) | **B** |
| `/solutions/[cat]/[sol]/evaluations` | `searchParams` (tri, page) **+** cookies via `getAvisUtilisateurs` **+** segment dynamique | **C** |
| `/blog` (liste) | `searchParams.categorie` **+** cookies inline | **C** |
| `/solutions/[cat]` (catégorie) | `searchParams` (tags/tri/critère/dir) **+** cookies | **C** |

> **Discriminant clé (vérifié)** : parmi les pages éditoriales, **seul `/blog` (liste)** lit
> `searchParams`. Toutes les autres sont `ƒ` **uniquement** à cause des cookies → un simple switch
> de client suffit (recette A). `searchParams` force le dynamique quoi qu'il arrive → recette C.

## Critical Decisions

- **3 recettes, pas une** :
  - **A — switch client seul** (`createServerClient` → `createPublicClient`) : pour les routes
    **fixes sans `searchParams`** → `ƒ→○`. Zéro changement de logique, risque quasi nul.
  - **B — switch client + `generateStaticParams() { return [] }`** : pour les routes à **segment
    dynamique sans `searchParams`** (`/blog/[slug]`) → `ƒ→●` (ISR à la demande, comme les fiches).
  - **C — filtres côté client** : pour les routes qui lisent `searchParams` (filtres/tri/pagination).
    Il faut **déplacer le filtrage côté client** pour retirer la dépendance `searchParams`, sinon
    la page reste `ƒ`. Vrai petit chantier par page → traité en dernier, la catégorie possiblement
    en session séparée.
- **`createPublicClient` (anon, sans cookies) et pas service-role** : garde la RLS (rôle anon = ne
  voit que le public) → filet de sécurité, même vue qu'un visiteur anonyme. Décision héritée de la
  passe 1.
- **On ne change QUE le client / le lieu du filtrage.** Aucune modification de logique métier, de
  filtres `actif=true`, de contenu affiché.
- **Vérité = la table de routes du build** : succès mesuré au passage `ƒ → ○/●`, fichier par fichier.
- **Ordre = ROI/risque** : Phase 1 (13 pages, trivial) → Phase 2 (`/blog/[slug]`) → Phase 3
  (sous-page avis) → Phase 4 (catégorie + liste blog, le gros).

## Tasks

- [x] 🟩 **Phase 1 — Recette A : pages éditoriales fixes (`ƒ→○`)** *(FAITE 2026-07-11, build vert)*
  - [x] 🟩 **Couche `db`** — basculé sur `createPublicClient` les lectures publiques :
    - [x] 🟩 `pages.ts` : `getPageBySlug`, `getPageBySlugOrNull`. *(`getPagesStatiques` laissé sur `createServerClient` : consommé uniquement par l'admin, aucune page publique `ƒ` — garde-fou OK.)*
    - [x] 🟩 `misc.ts` : `getVideos`, `getVideoRubriques`. *(`getActualites` **reverté** — table fantôme, cf. découverte ci-dessous. `getAvatars`/`getDocuments`/`getTagsPrincipauxForSolution` non touchés, hors périmètre.)*
  - [x] 🟩 **Fetch inline** `comparatifs/page.tsx` → `createPublicClient`. *(`glossaire`/`stories-tutos` **non** switchés → Phase 1b : ils lisent la session.)*
  - [x] 🟩 **Vérif build** : `/cgu`, `/rgpd`, `/transparence`, `/qui-sommes-nous`, `/tous-ensemble`, `/difficile-de-changer`, `/irritants-esante`, `/lancement-100k`, `/comparatifs`, `/videos` → **`○`**. `next build` OK (type-check inclus).
  - [x] 🟩 **Garde-fou `getPagesStatiques`** : vérifié non consommé par une page publique → laissé tel quel.

- [x] 🟩 **Phase 1b — `/glossaire` + `/stories-tutos` : sortir la lecture de session (`ƒ→○`)** *(FAITE 2026-07-11, build vert : les 2 pages → `○`)*
  - Constat : les 2 pages appelaient `getUserEmail()` **côté serveur** (`supabase.auth.getUser()`) pour préremplir l'email du formulaire → forçait le dynamique. `stories-tutos` avait en plus `export const dynamic = 'force-dynamic'`.
  - [x] 🟩 Préremplissage email déplacé **côté client** via `useAuth()` dans `GlossaireSuggestForm` / `StoriesTutosSuggestForm` : `const email = userEmail ?? user?.email ?? null` (la prop serveur reste prioritaire pour `/mon-compte/proposer/acronyme`). `getUserEmail` serveur supprimé des 2 pages.
  - [x] 🟩 `getAcronymes` (glossaire) → `createPublicClient` ; `force-dynamic` retiré + `revalidate = 3600` (stories-tutos). Build → **`○`**.
  - **Micro-changement de comportement assumé** : l'email prérempli = email de **session** (auth) au lieu de `contact_email` (table users). Identiques dans l'immense majorité des cas ; l'utilisateur voit l'email et peut décocher. Fidélité totale possible plus tard via un endpoint `/api/me` si besoin.

- [ ] 🟥 **Nettoyage — route morte `/actualites`** *(hors ISR, mais découvert ici)*
  - Table `public.actualites` **inexistante** (SQL vérifié) → `getActualites` échoue à l'exécution. Route non liée dans la nav/footer. **À trancher** : supprimer la route + `getActualites` + le type `Actualite`, OU rediriger `/actualites → /blog` (le contenu a migré vers `articles`). Idem `getDocuments` (table `public.documents` inexistante) si non utilisé.

- [x] 🟩 **Phase 2 — Recette B : `/blog/[slug]` (`ƒ→●`)** *(FAITE 2026-07-11, build vert)*
  - [x] 🟩 `blog/[slug]/page.tsx` : `createServerClient` inline (fn `getArticle`) → `createPublicClient`.
  - [x] 🟩 `export async function generateStaticParams() { return [] }` ajouté (pattern éditeur/fiche → ISR à la demande).
  - [x] 🟩 `AcronymText`/`AcronymHtml` = composants **client** (fetch `/api/acronymes` déjà `○`) → pas de cookie serveur. Build → `/blog/[slug]` = **`●`**.

- [ ] 🟥 **Phase 3 — Recette C : sous-page avis `/solutions/[cat]/[sol]/evaluations` (`ƒ→●`)** — *ROI faible, à faire après la catégorie*
  - **Investigation (2026-07-11)** : le tri passe par `router.push('?tri=')` dans `AvisUtilisateurs` → re-render serveur = cause du `ƒ`. La page est **minimaliste** (10 avis, ni notes par critère ni commentaires réellement rendus car `getAvisUtilisateurs` ne peuple pas `avisGeneral`/`avisSynthese`) et **peu trafiquée** → **faible gain CPU**.
  - [ ] 🟥 `getAvisUtilisateurs` → `createPublicClient` ; exposer `moyenne_utilisateur` dans les objets `avis` (pour trier côté client).
  - [ ] 🟥 Trier **côté client** dans `AvisUtilisateurs` (tableau en mémoire) au lieu de `router.push` ; fetch de tous les avis publiés (cap raisonnable) côté serveur.
  - [ ] 🟥 Ajouter `generateStaticParams() { return [] }`. Build → `●`.

- [ ] 🟨 **Phase 4 — Recette C : filtres côté client** *(page catégorie FAITE ; reste `/blog` liste)*
  - **Investigation (2026-07-11)** : `SolutionFilters` + `SolutionSortBar` pilotent tout par `router.push('?...')` → re-render serveur = cause du `ƒ`. Toutes les fonctions de données sont déjà cookie-less.
  - [x] 🟩 **`/solutions/[cat]` (catégorie) FAITE — `ƒ→●` (build vert)** : la page serveur charge **tout** (toutes solutions + notes rédac/utilisateurs/nb + tags via `getSolutionsTagsMap` + notes par critère via `getNotesParCritere`) **sans lire `searchParams`**. Filtrage/tri porté dans une **fonction pure** `filterAndSortSolutions` ([src/lib/solutions-filter-sort.ts](../src/lib/solutions-filter-sort.ts)), appelée côté client par `SolutionsCategoryBrowser` (`useSearchParams`, sous `<Suspense>`) **et** côté serveur pour le **fallback = vue par défaut** (`SolutionsCategoryView`) → liste dans le HTML statique (SEO). `SolutionFilters`/`SolutionSortBar` **inchangés** (gardent `router.push` ; sur page statique ça met à jour `useSearchParams` sans round-trip serveur). `generateStaticParams(){return []}`.
    - [ ] 🟥 **Vérif parité en local (`npm run dev`) AVANT merge** : tri (direction ↑↓, `prix` null en fin de liste, tri par critère via dropdown « Note globale »), filtre tags (ET + implication des tags parents), URL partageable (`?tags=&tri=&critere=&dir=`), retour arrière navigateur, contenu identique déconnecté/connecté.
  - [ ] 🟥 **`/blog` (liste)** : plus simple — même principe (filtre catégorie côté client). Route `/blog` → `○`.

- [ ] 🟥 **Phase 5 — Contrôle final**
  - [ ] 🟥 Build complet : 0 page publique restée `ƒ` hors `/recherche` (dynamique par nature) et pages `/mon-compte/*`.
  - [ ] 🟥 **Revalidation à la volée** : une modif admin (article, actualité, page statique) se reflète toujours (vérifier que `revalidatePath` couvre blog/actualités/pages après switch).
  - [ ] 🟥 Smoke test déconnecté **et** connecté (Navbar = client, contenu identique).

## Ce qui peut casser (points de vigilance)

- **Brouillons éditoriaux** : `createPublicClient` = anon + RLS. Si une `page_statique`/un article
  non publié n'est protégé que par un filtre applicatif (pas par la RLS), l'anon le verrait déjà
  aujourd'hui — mais à re-vérifier au switch (les requêtes gardent leur `.eq('statut','publié')`).
- **Revalidation** : après bascule ISR, une modif admin doit toujours rafraîchir la page →
  `revalidatePath` déjà câblé en passe 1, à confirmer pour blog/actualités/pages.
- **SEO catégorie (Phase 4)** : le tri client-side ne doit pas vider le HTML initial — les solutions
  doivent rester rendues côté serveur (juste ré-ordonnées par JS).
- **`generateStaticParams() { return [] }`** = ISR à la demande : la 1ʳᵉ visite rend + met en cache
  (comportement identique aux 139 fiches, déjà validé).

## Hors scope

- `/recherche` (dynamique par nature — recherche live).
- Pages `/mon-compte/*`, server actions, admin (légitimement dynamiques).
- `next/image` / Smart CDN (autre sujet — cf. egress).
- Refonte/mutualisation des requêtes (gain marginal vs le passage ISR).
