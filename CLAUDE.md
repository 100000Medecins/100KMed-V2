# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note pour Claude :** lire `memory/context.md` au début de chaque session — ce fichier contient le profil utilisateur, les préférences de travail, l'état du projet et les décisions techniques importantes. Il est versionné dans le repo pour rester synchronisé entre les postes.

> **OBLIGATOIRE avant tout chantier technique :** lire `CHANGELOG.md` (les 10-15 dernières entrées minimum) avant de planifier une migration SQL, un refactor, ou une correction de bug non triviale. La mémoire de session est compactée régulièrement — le CHANGELOG est la seule source de vérité fiable sur ce qui a déjà été fait. Ne jamais inférer l'historique depuis l'état courant du code ou de la BDD seul.

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

- Heavy use of **JSONB** for flexible data: `evaluations.scores`, `solutions.prix`, `categories.schema_evaluation`
- **Criteres** are hierarchical (self-referencing `parent_id`)
- **RLS** enabled on most tables — use service role only when needed (admin ops, registration before user is authenticated)
- Supabase join syntax: `.select('*, editeur:editeurs(*), categorie:categories(*)')`

### Evaluation flow

Multi-step form at `/solution/noter/[...slug]`. Scores stored in `evaluations.scores` JSONB. Aggregated results computed in `resultats` table per solution+critere. NPS calculated as `((promoters - detractors) / total) * 100`.

### Styling

Tailwind with custom theme: `navy` (primary), `accent-blue/yellow/orange/pink`, `rating-green/star`, `surface-light/muted`. Font: Poppins. Card radius: 16px.

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
- `solutions.updated_at` and `editeurs.updated_at` do not exist — don't use in queries
- `solutions.prix` (JSONB) no longer exists — use `prix_ttc`, `prix_devise`, `prix_frequence`, `prix_duree_engagement_mois` columns instead
- `tags.is_principale_fonctionnalite` was renamed to `is_tag_principal`
- All `editeurs` string fields are `string | null` — always add `|| ''` or `?? undefined` when passing to HTML attributes

After any SQL migration, regenerate types:
```bash
npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts
```

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
