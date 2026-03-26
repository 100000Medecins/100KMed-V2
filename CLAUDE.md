# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

- **Users**: Supabase Auth with email/password (dev) and Pro Sante Connect/PSC OIDC (production)
- **Admin**: Separate cookie-based auth with HMAC token (`ADMIN_PASSWORD` env var), not Supabase
- **Middleware** only runs on `/mon-compte/*`, `/solution/noter/*`, `/api/auth/*`

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

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
ADMIN_PASSWORD
```
