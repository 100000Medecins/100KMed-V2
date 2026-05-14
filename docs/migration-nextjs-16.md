# Migration Next.js 14.2.35 → 16.x

**Date du plan :** 2026-05-14
**Contexte :** mise en prod prévue ~2 semaines. La migration est faite **avant** le lancement (zéro utilisateur impacté si un bug subtil passe les tests) avec un go/no-go daté.

> `@next/bundle-analyzer` est déjà en `^16.2.6` dans `package.json` → Next.js est à la **16.x**. Le saut est **14 → 16, deux majeures**. Les breaking changes de la 15 sont documentés ici ; ceux de la 16 sont à compléter depuis le guide d'upgrade officiel Next 16.

---

## État de départ (2026-05-14)

- `next: ^14.2.0` (résolu `14.2.35`)
- `react: ^18.3.0`, `react-dom: ^18.3.0`, `@types/react: ^18.3.0`
- `eslint: ^8.0.0`, `eslint-config-next: ^14.2.0`
- `@supabase/ssr: ^0.8.0`, `@supabase/supabase-js: ^2.95.3`
- `@tiptap/* : ^3.21.0`, `zustand: ^5.0.11`, `lucide-react: ^0.400.0`
- `next.config.mjs` : wrapper `@next/bundle-analyzer` + `typescript.ignoreBuildErrors: true`

### Baseline build Next 14 (capturée 2026-05-14, branche `chore/nextjs-16`)

Build **propre, aucun warning ni erreur**.

- First Load JS partagé : **87.7 kB** (chunks/2117 = 31.7 kB, chunks/fd9d1056 = 53.6 kB, autres = 2.32 kB)
- Middleware : **73.4 kB**
- Pages les plus lourdes (First Load JS) :
  - `/solutions/[idCategorie]/[idSolution]` : 176 kB
  - `/solutions/[idCategorie]` : 168 kB
  - `/solution/noter/[...slug]` : 167 kB
  - `/comparatifs`, `/editeur/[idEditeur]`, `/recherche`, `/desabonnement-confirme` : 165 kB
  - `/mon-compte/mon-espace-editeur` : 160 kB
- Gros des autres pages : 156-161 kB
- Pages minimales : `/solutions`, `/mon-compte/health-data-hub` : 87.9 kB

---

## Décision de versioning

- **Cible retenue : `16.2.6`** (npm `latest` au 2026-05-14, sortie 2026-05-07). Le major 16 est mature (16.0/16.1/16.2 toutes publiées) ; 16.2.6 est un patch de stabilisation d'1 semaine. `16.3` n'est qu'en beta/canary → écarté.
- `eslint-config-next` à aligner sur `16.2.6`.
- **Méthode** : `npx @next/codemod@canary upgrade latest` — chaîne tous les codemods 14→15→16 en une passe.
- **Fallback** : si trop de casse, repli incrémental 14→15 d'abord (diff plus petit, plus débuggable).

---

## Phases

### Pré-vol (jour 1, ~1h)
- Branche dédiée `chore/nextjs-16` depuis `dev`
- `npm run build` sur 14 → capture baseline (tailles bundles, warnings) pour comparer après
- Noter la version exacte pour rollback : `14.2.35`
- Lire le guide d'upgrade officiel Next 16

### Phase 1 — Bump + codemod (jour 1-2)
- `npx @next/codemod@canary upgrade latest` — chaîne les codemods 14→15→16. Fait notamment : `middleware`→`proxy`, `next lint`→ESLint CLI, retrait `unstable_` des APIs stabilisées, migration config `turbopack`.
- Bump manuel si non fait par le codemod : `react` + `react-dom` → 19.2.x, `@types/react` + `@types/react-dom` → latest, `eslint-config-next` → 16.2.6, `eslint` → 9.x
- `npm install`, résoudre conflits de peer deps
- Premier `npm run build` → lister la casse

> **Alternative** : Next 16 fournit un MCP `next-devtools-mcp` qui automatise l'upgrade. Non retenu ici (on garde le contrôle manuel via codemod), mais à connaître.

### Phase 2 — Corriger ce que le codemod a raté (jour 2-4)
Voir la liste d'impacts ci-dessous. Points d'attention prioritaires :
- **`proxy.ts`** (ex-`middleware.ts`) : retester l'auth Supabase — le runtime passe de `edge` à `nodejs`
- **bundle-analyzer vs Turbopack** : `next build` utilise Turbopack par défaut en Next 16 ; un webpack config détecté fait **échouer le build**
- **`lib/supabase/server.ts`** : `cookies()` doit être `await`

### Phase 3 — Tests (jour 4-6)
Parcours critiques à valider sur `npm run dev` puis preview Vercel :
- Auth : connexion email/MDP, inscription, reset password, PSC, fusion PSC
- Pages dynamiques : `/solutions/[cat]`, `/solutions/[cat]/[sol]`, `/solution/noter/[...slug]`, `/editeur/[id]`
- Admin : login, sidebar badges, chaque section CRUD
- Espace éditeur : édition champs + audit log
- ISR : pages avec `revalidate` se rafraîchissent bien
- Crons (`/api/cron/*`) : un appel manuel de chaque

### Go/No-Go (jour 7)
Checkpoint ferme : **build vert + parcours critiques OK → on continue. Sinon → abandon, lancement sur 14, zéro perte.**

### Phase 4 — Déploiement (jour 7-10)
- Merge `chore/nextjs-16` → `dev`, déploie sur preview Vercel
- Laisser cuire 2-3 jours sur preview (≠ jour J du DNS)
- Promouvoir en prod **avant** la bascule DNS, pas en même temps

---

## Liste d'impacts — désamorçage rapide

Établie à partir du guide officiel Next 16 (lu le 2026-05-14, cible 16.2.6) croisé avec le code de ce projet.

### 🔴 Critiques (cassent le build ou l'auth)

| Symptôme | Cause | Fix rapide |
|---|---|---|
| **`next build` échoue : "webpack configuration was found"** | Next 16 : Turbopack par défaut sur `dev` ET `build`. Le wrapper `@next/bundle-analyzer` injecte du webpack config. | Soit `next build --webpack` dans le script `package.json`, soit vérifier que `@next/bundle-analyzer@16` supporte Turbopack. Tester `npm run build` ET `ANALYZE=true npm run build` séparément. |
| **`middleware.ts` ne fonctionne plus** | Next 16 : `middleware` renommé `proxy`. Fichier `src/middleware.ts` → `src/proxy.ts`, export `middleware` → `proxy`. Runtime passe `edge` → `nodejs`. | Le codemod fait le rename. **Retester toute l'auth Supabase** : connexion, routes protégées `/mon-compte/*`, redirections. `@supabase/ssr` marche sur nodejs, donc OK en principe. |
| `cookies()`/`headers()` : "should be awaited" — **erreur dure, plus de compat sync** (~22 fichiers, dont `lib/supabase/server.ts`) | Next 16 : APIs de requête async, la compat synchrone de Next 15 est **totalement retirée** | Codemod le fait. Si raté : `const cookieStore = await cookies()`. **Priorité absolue : `lib/supabase/server.ts`** — toute l'auth en dépend. |
| `params`/`searchParams` : "should be awaited" — **erreur dure** (~32 fichiers de routes) | Idem : compat sync retirée en Next 16 | Codemod + `npx next typegen` (génère les helpers `PageProps`/`LayoutProps`/`RouteContext`). Si raté : `const { idCategorie } = await params` |
| `npm install` échoue sur peer deps | React 19.2 pas encore accepté par une lib tierce | Tracer la lib coupable. `--legacy-peer-deps` en dernier recours. tiptap 3.x / zustand 5 sont OK React 19. |
| Script `npm run lint` cassé | Next 16 : `next lint` **supprimé**. `next build` ne lint plus. | Codemod `next-lint-to-eslint-cli` migre vers la CLI ESLint directe + retire l'option `eslint` de la config. |

### 🟠 Importants (comportement change, à vérifier)

| Symptôme | Cause | Fix rapide |
|---|---|---|
| ESLint ne tourne plus / config rejetée | `@next/eslint-plugin-next` v16 défaut = **Flat Config**. Le projet est en `.eslintrc` legacy. | Migrer vers `eslint.config.mjs` (flat config). Voir guide de migration ESLint. |
| Scroll de navigation différent (les ancres internes interfèrent) | `globals.css` a `scroll-behavior: smooth` ligne 7. Next 16 **n'override plus** ce réglage pendant les navigations SPA. | Ajouter `data-scroll-behavior="smooth"` sur `<html>` dans `app/layout.tsx` pour garder l'ancien comportement. |
| Images : revalidation / qualité / srcset changent (`next/image`, 6 fichiers) | Next 16 : `minimumCacheTTL` 60s→4h, `qualities` → `[75]` only, `16` retiré de `imageSizes` | Comportement par défaut OK pour la plupart. Si une `<Image quality={X}>` avec X≠75 : ajouter `images.qualities` dans `next.config.mjs`. |
| Pages ISR : données périmées | `fetch` n'est plus caché par défaut depuis Next 15 | Vérifier les pages `export const revalidate`. Ajouter `cache: 'force-cache'` explicite si besoin. |
| Page blanche / erreur React 19 sur composant tiers | tiptap / zustand / lucide-react × React 19.2 | tiptap 3.x et zustand 5 supportent React 19. Si souci : bump `lucide-react`. Console navigateur. |

### 🟡 Mineurs / informatifs

| Point | Détail |
|---|---|
| `next build` n'affiche plus `size` / `First Load JS` | Next 16 a retiré ces métriques (jugées inexactes en RSC). **La baseline capturée ci-dessus ne sera pas comparable via `next build`.** Pour comparer : `ANALYZE=true npm run build` (bundle-analyzer) ou Lighthouse. |
| `next dev` sort dans `.next/dev` | Dossiers de sortie séparés `dev`/`build`. Vérifier que `.gitignore` couvre `.next` (déjà le cas en principe). |
| `next/font/google` (Poppins, `layout.tsx`) | Import correct moderne — rien à faire. |
| `next.config.mjs` | Pas de `experimental.turbopack`, pas d'option `images`, pas d'option `eslint` → peu de surface. Le codemod adapte si besoin. `typescript.ignoreBuildErrors` reste valide. |

### Sources de casse Next 15/16 évitées d'office (vérifié dans le code au 2026-05-14)
- Pas de `useFormState` (renommé `useActionState` en React 19)
- Pas de `export const runtime`, pas de `.geo` / `.ip` sur `NextRequest`
- Pas de `revalidateTag` (qui exige un 2e argument en Next 16)
- Pas de `serverRuntimeConfig` / `publicRuntimeConfig` / `getConfig` (supprimés en Next 16)
- Pas de parallel routes (`@folder`) → pas d'exigence `default.js`
- Pas de config AMP (supprimé en Next 16)
- Node v24 + TS 5.9 → bien au-dessus des minimums (Node 20.9+, TS 5.1+)

---

## Rollback

Trivial à tout moment avant la promotion prod : `git checkout dev` (la branche `chore/nextjs-16` est isolée). Le `package-lock.json` de `dev` restaure les versions 14.

---

## Après la migration

- Comparer les bundles via `ANALYZE=true npm run build` (bundle-analyzer) ou Lighthouse — **pas via la sortie `next build`** qui n'affiche plus `size`/`First Load JS` en Next 16
- Lancer `npm audit` sur le reliquat — la portion `next/eslint` des vulnérabilités sera réglée par cette maj
- Vérifier le `package.json` : scripts `dev`/`build` n'ont plus besoin de `--turbopack` (défaut en 16), script `lint` migré vers ESLint CLI
- Mettre à jour `CHANGELOG.md`
