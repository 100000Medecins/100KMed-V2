# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note pour Claude :** lire `memory/context.md` au début de chaque session — ce fichier contient le profil utilisateur, les préférences de travail, l'état du projet et les décisions techniques importantes. Il est versionné dans le repo pour rester synchronisé entre les postes.

> **OBLIGATOIRE avant tout chantier technique :** lire `CHANGELOG.md` (les 10-15 dernières entrées minimum) avant de planifier une migration SQL, un refactor, ou une correction de bug non triviale. La mémoire de session est compactée régulièrement — le CHANGELOG est la seule source de vérité fiable sur ce qui a déjà été fait. Ne jamais inférer l'historique depuis l'état courant du code ou de la BDD seul.

## Contrat comportemental

- **Définir « done » en 1 ligne avant de commencer** toute tâche non triviale — sinon l'agent boucle sans critère de succès.
- **Vérifier l'état réel du code / de la BDD avant d'agir** — jamais sur hypothèse, ni sur mémoire seule. Les memos peuvent être périmés ; le code et la base sont la vérité.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite configured.

## Architecture

**Next.js 14 App Router** + **Supabase** (PostgreSQL + Auth) + **Tailwind CSS** + **Zustand**

French medical software review platform where healthcare professionals browse, compare, and evaluate software solutions organized by specialty categories.

### Key directories

- `src/app/` — Pages (App Router). Main routes: `/solutions/[idCategorie]/[idSolution]`, `/solution/noter/[...slug]`, `/admin/*`, `/mon-compte/*`
- `src/lib/db/` — Database query functions (read-only, server-side). Use `createServerClient()` for user queries (RLS enforced), `createServiceRoleClient()` for admin/public data (bypasses RLS)
- `src/lib/actions/` — Server Actions (`'use server'`). All form submissions go through here
- `src/lib/supabase/` — Supabase client setup: `server.ts` (server client + service role), `client.ts` (browser), `middleware.ts` (session refresh)
- `src/components/solutions/detail/` — Solution detail page components (editorial review, ratings, testimonials)
- `src/stores/useAppStore.ts` — Zustand store (selected category, mobile menu, comparison list max 3)
- `src/types/database.ts` — Auto-generated Supabase types; `models.ts` — App-level interfaces

### Auth

- **Users**: Supabase Auth with email/password and Pro Santé Connect (PSC) OIDC
- **Admin**: Separate cookie-based auth with HMAC token (`ADMIN_PASSWORD` env var), not Supabase
- **Middleware** only runs on `/mon-compte/*`, `/solution/noter/*`, `/api/auth/*`

#### Pro Santé Connect (PSC) — custom OAuth 2.0 flow

PSC is implemented as a **manual OIDC flow** (not via Supabase OAuth provider). Key files:
- `src/lib/auth/psc.ts` — `connectWithPsc()` builds the auth URL, stores `state`/`nonce` in **cookies** (not sessionStorage — PSC redirects through a mobile app which loses sessionStorage)
- `src/app/api/auth/psc-callback/route.ts` — GET handler: exchanges code for tokens, fetches userInfo, creates/updates Supabase user via admin API, generates magiclink, verifies OTP server-side to create session cookie

PSC endpoints (env-dependent via `NEXT_PUBLIC_PSC_ENV=bas|production`):
- **BAS (test)**: auth=`wallet.bas.psc.esante.gouv.fr/auth`, token/userinfo=`auth.bas.psc.esante.gouv.fr/auth/realms/esante-wallet/protocol/openid-connect/[token|userinfo]`
- **Production**: auth=`wallet.esw.esante.gouv.fr/auth`, token/userinfo=`auth.esw.esante.gouv.fr/...`

PSC userInfo provides: `given_name`, `family_name`, `email`, `preferred_username` (= RPPS), `SubjectRefPro.exercices[0]` for speciality (codeSavoirFaire, type='S') and mode d'exercice (activities[0].codeModeExercice: L=Libéral, S=Salarié).

Speciality SM codes are resolved to French labels via `SM_SPECIALITES` map in `src/lib/constants/profil.ts`.

PSC-authenticated users have `rpps` set in `users` table. Fields sourced from PSC (nom, prénom, spécialité, mode exercice) are **read-only** in the profile UI (`isFromPsc` flag).

### Database patterns

- Heavy use of **JSONB** for flexible data: `evaluations.scores`, `resultats.notes` / `resultats.repartition`, `solutions.meta`, `solutions.contacts_commerciaux` / `contacts_support`, `app_settings.value`, `pages_statiques.metadata`
- ⚠️ **`categories` n'a AUCUNE colonne JSONB** (ce fichier mentionnait un `categories.meta` qui n'a jamais existé — la colonne `meta` est sur `solutions`). Colonnes réelles : `nom`, `slug`, `intro`, `icon`, `image_url`, `position`, `actif`, `categorie_defaut`, `groupe_id`, `has_note_redac`, `label_filtres`, `label_fonctionnalites`, `meta_description`. **Conséquence** : tout contenu libre à attacher à une catégorie exige une vraie migration (nouvelle colonne), pas un `meta` existant — vérifier `src/types/database.ts` avant de supposer un champ disponible.
- **Criteres** are hierarchical (self-referencing `parent_id`)
- **RLS** enabled on most tables — use service role only when needed (admin ops, registration before user is authenticated)
- Supabase join syntax: `.select('*, editeur:editeurs(*), categorie:categories(*)')`

### Accès BDD pour analyses (MCP) vs écritures (service_role) — IMPORTANT

Deux chemins d'accès distincts, à ne pas confondre :

- **Analyses / comptages / lecture** → outil MCP `mcp__supabase__query` (rôle `claude_readonly`).
  Ce rôle a `SELECT` seul sur les 38 tables **+ `BYPASSRLS`** (posé le 2026-05-28) → il voit
  **toutes les lignes** mais **ne peut rien écrire**. Fiable pour `count(*)`, audits, vérifs.
  - **Piège historique résolu** : avant le `BYPASSRLS`, ce rôle était soumis à la RLS et
    renvoyait silencieusement `count = 0` sur `users`/`evaluations` (tables protégées) → faux
    diagnostics de « colonnes/tables vides ». Si un jour un comptage paraît anormalement bas,
    vérifier `SELECT rolbypassrls FROM pg_roles WHERE rolname='claude_readonly'` (doit être `true`).
  - Réversible : `ALTER ROLE claude_readonly NOBYPASSRLS;`
- **Écritures (fix de données, migrations de contenu)** → script `tsx` + `SUPABASE_SERVICE_ROLE_KEY`.
  `service_role` bypass tout (lecture **et** écriture). Toujours : **dry-run par défaut**,
  `--execute` requis, **backup JSON avant écriture** (cf `scripts/fix-firebase-*.ts`).
- **DDL (CREATE/ALTER/DROP)** → le MCP ne peut pas (lecture seule). C'est David qui lance le SQL
  dans le SQL Editor Supabase (rôle `postgres`). Après tout DDL : régénérer `src/types/database.ts`.

### Pages publiques & ISR (CPU Vercel Fluid)

Les pages **publiques** doivent être **statiques/ISR** (`○`/`●`), pas dynamiques (`ƒ`), sinon elles se rendent à chaque visite → CPU Vercel qui grimpe (risque de pause du site sur Hobby). Une page bascule en `ƒ` **automatiquement** dès qu'elle lit des cookies (`createServerClient`), `searchParams`, `cookies()`/`headers()`, ou `force-dynamic`.

**Réflexe pour toute NOUVELLE page publique** :
- Lire les données avec **`createPublicClient()`** (anon, sans cookies — RLS conservée), **jamais** `createServerClient()`.
- **Déporter filtre/tri côté client** : composant `'use client'` + `useSearchParams`, sous `<Suspense>`, avec la vue par défaut rendue serveur en `fallback` (SEO). Modèles : `/blog` et `/solutions/[cat]` (composants `*Browser` + `*View`).
- Route avec `[param]` → ajouter `export async function generateStaticParams()` (même `return []` suffit pour de l'ISR à la demande).
- Ajouter `export const revalidate = <sec>` (ex. 1800).
- **Vérifier** après `npm run build` : la route doit sortir `○`/`●`, pas `ƒ`.

À l'inverse, une page **privée/authentifiée** (`/mon-compte/*`, `/admin/*`) *doit* rester dynamique → `createServerClient()` est correct. Détails : `docs/2026-07-11-plan-isr-*.md`.

### Evaluation flow

Multi-step form at `/solution/noter/[...slug]`. Scores stored in `evaluations.scores` JSONB. Aggregated results computed in `resultats` table per solution+critere. NPS calculated as `((promoters - detractors) / total) * 100`.

### Styling

Tailwind with custom theme: `navy` (primary), `accent-blue/yellow/orange/pink`, `rating-green/star`, `surface-light/muted`. Font: Poppins. Card radius: 16px.

### Design system — composants UI à utiliser

Un mini design system existe dans [src/components/ui/](src/components/ui/) (conventions : voir [src/components/ui/README.md](src/components/ui/README.md)). Pour tout **nouveau code**, utilise ces composants au lieu des classes Tailwind brutes :

- `<Button variant="primary|secondary|outline|ghost|danger|white|cta" size="sm|md|lg" loading={...}>` — au lieu de `<button className="bg-navy text-white px-7 py-3.5 rounded-button ...">`
- `<Card padding="none|sm|md|lg|xl" hoverable>` — au lieu de `<div className="bg-white rounded-card shadow-card ...">`
- `<Input>` / `<Textarea>` / `<Select>` — au lieu de classes inline comme `w-full rounded-button bg-white border border-gray-200 ...`
- `<Field label="..." hint="..." error="...">` — wrapper label + hint + erreur pour les champs de formulaire
- `<Badge variant="info|warning|success|danger|neutral|dark" size="sm|md">` — au lieu de `<span className="inline-flex rounded-full bg-*-50 text-*-700 ...">`
- `<Modal>` + `Modal.Header` / `Modal.Body` / `Modal.Footer` — au lieu de `<div className="fixed inset-0 bg-black/50 ...">` (gère ESC, backdrop, scroll lock automatiquement)

**Règle « migration au fil de l'eau »** : quand tu modifies un fichier `.tsx` pour une raison X (fix bug, ajout feature), **si tu vois dans ce même fichier des patterns obsolètes ci-dessus, migre-les par la même occasion**. Cela élimine progressivement la dette de style sans chantier dédié.

Cas où **ne pas migrer** : si la modification déborderait largement du périmètre demandé (ex. fichier de 1000 lignes avec 20 inputs à migrer alors que la tâche demandée touche 5 lignes) → signale-le à la fin et propose de le faire en session séparée. La migration ne doit jamais cacher le diff de la vraie tâche.

### HTML content from DB

Editorial text may contain HTML tags. Use `sanitizeHtml()` from `src/lib/sanitize.ts` with `dangerouslySetInnerHTML` — only allows `<br>`, `<u>`, `<b>`, `<strong>`, `<em>`, `<i>`, `<p>`.

### Navigation conventions

- "Mon compte" always links to `/mon-compte/profil` (not `/mon-compte/mes-evaluations`)
- Sidebar order: "Mon compte" (`/mon-compte/profil`) first, then "Mes évaluations"
- After login/PSC callback/password reset → redirect to `/mon-compte/profil`

### Known schema drift (Firebase migration)

Some fields exist in code but not in the auto-generated DB types — use `as any` casts:
- Tables `actualites` and `documents` are absent from `database.ts` types → `(supabase as any).from('actualites')`
- `Actualite` and `DocumentRow` types in `models.ts` are typed as `any`
- `editeurs.updated_at` and `solutions.updated_at` now exist (added 2026-05-08) — safe to use in queries
- `solutions.prix` (JSONB) no longer exists — use `prix_ttc`, `prix_devise`, `prix_frequence`, `prix_duree_engagement_mois` columns instead
- `tags.is_principale_fonctionnalite` was renamed to `is_tag_principal`
- All `editeurs` string fields are `string | null` — always add `|| ''` or `?? undefined` when passing to HTML attributes

After any SQL migration, regenerate types:
```bash
npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts
```

### Erreurs ESLint préexistantes — règle « migration au fil de l'eau »

`npm run lint` remonte ~270 erreurs dans la base existante, majoritairement `@typescript-eslint/no-explicit-any` sur la couche Supabase (`src/lib/db/`, `src/lib/actions/`) à cause de la schema drift décrite ci-dessus. Ces erreurs **ne bloquent pas le build** (`next build` passe, `tsc --noEmit` passe), elles sont du style, pas du comportement.

**Règle « migration au fil de l'eau »** : quand tu modifies un fichier `.ts` ou `.tsx` pour une raison X, **si tu vois un `as any` ou un `// eslint-disable-next-line @typescript-eslint/no-explicit-any` que tu peux typer proprement sans effort disproportionné, fais-le par la même occasion**. Cela élimine progressivement la dette ESLint sans chantier dédié.

Cas où **ne pas typer** : si le `as any` contourne une vraie schema drift non résolue (table absente de `database.ts`, ex. `actualites`/`documents`) → laisse tel quel, c'est un contournement légitime. La régénération des types est le vrai remède, pas le typage manuel.

Pour tout **nouveau code** : pas de `as any`, type proprement dès le début.

### GRANTs explicites sur toute nouvelle table (anticipation Supabase 2026-10-30)

À partir du **30 octobre 2026**, Supabase n'expose plus automatiquement les nouvelles tables de `public` à la Data API (PostgREST/`supabase-js`) : il faut des `GRANT` explicites. Les tables existantes ne sont pas affectées.

**Réflexe à appliquer dès maintenant** sur toute migration `CREATE TABLE` dans `public` :

```sql
CREATE TABLE public.ma_table (
  id uuid primary key default gen_random_uuid(),
  ...
);

-- GRANTs (anticipation du changement 2026-10-30)
GRANT SELECT ON public.ma_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_table TO service_role;

-- RLS (niveau ligne, distinct des GRANTs niveau table)
ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;
-- + CREATE POLICY adaptées au cas d'usage
```

Ajuster les `GRANT` par rôle selon le cas : par exemple, ne pas accorder `INSERT/UPDATE/DELETE` à `anon` si la table ne doit pas être modifiable sans auth. Si un GRANT manque, PostgREST renvoie `42501` avec le `GRANT` exact à exécuter.

### Supabase types

`src/types/database.ts` is auto-generated. Always remind the user to run the command above after providing SQL migrations.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ADMIN_PASSWORD
NEXT_PUBLIC_PSC_CLIENT_ID
PSC_CLIENT_SECRET
NEXT_PUBLIC_PSC_ENV        # "bas" (test) or "production"
```
