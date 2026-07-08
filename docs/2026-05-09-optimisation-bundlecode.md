# Optimisation bundle & code — mai 2026

**Date :** 2026-05-09
**Contexte :** Analyse du bundle initiée suite à un audit visuel fait par Ben (inspection navigateur sur une fiche solution). Observations initiales : code RSC sérialisé volumineux, duplication de SVGs étoiles, 31 avis chargés d'un coup, pas de lazy loading visible.

---

## Outil utilisé

`@next/bundle-analyzer` installé en dev dependency.

Commande de lancement :
```powershell
$env:ANALYZE="true"; npm run build
```

Ouvre automatiquement 3 onglets : bundle **client**, bundle **server**, bundle **middleware**.

---

## Findings — bundle client

### framer-motion — 🔴 Supprimé

- **Chunk :** `8342.js` — `proxy.mjs + 250 modules`
- **Usage :** uniquement dans `src/components/sections/HeroIllustration.tsx` pour 9 éléments flottants sur le Hero de la homepage (`animate: { y, rotate }`, `repeat: Infinity`, `repeatType: 'mirror'`)
- **Action :** remplacement par `@keyframes hero-float` en CSS pur + CSS custom properties (`--y-from`, `--y-to`, `--r-from`, `--r-to`) injectées en inline style sur chaque élément. Même rendu visuel, même timing, exécution GPU sans JS.
- **Bonus :** `HeroIllustration.tsx` perd son `'use client'` et devient un Server Component — il sort entièrement du bundle client.
- **framer-motion désinstallé** du `package.json`.

### @tiptap + prosemirror — 🟡 Sans action

- Présent dans le bundle client mais **uniquement dans des chunks isolés aux pages `/admin/*`**
- Composants concernés : `ArticleForm`, `BlogForm`, `SolutionForm`, `AdminEmailsClient`, `AdminIndexEditor`, `AdminTargetedSendPanel`, `CategorieForm`, `EmailTemplateEditor`, `EditeurForm`
- Certains utilisent déjà `dynamic(() => import(...), { ssr: false })` (bonne pratique) ; les autres font un import statique, mais tous sont sous routes admin → pas d'impact visiteurs
- **Décision : aucune modification nécessaire.**

---

## Findings — bundle serveur

### @anthropic-ai/sdk — 🟡 Sans action

- **Chunk :** `8995.js` — `index.mjs + 60 modules`
- **Usage réel :** 2 routes API seulement importent le SDK (`generer-newsletter-draft/route.ts`, `generer-newsletter/route.ts`). Toutes les autres routes IA utilisent un `fetch()` direct sur `api.anthropic.com`.
- Isolé côté serveur dans des routes API dédiées. **Aucune action requise.**

### mime-db / db.json — 🟡 Sans action

- Apparaît dans plusieurs gros chunks serveur (2375.js, 2880.js)
- Tiré en transitive par `axios` → `@sendgrid`
- Duplication inhérente au build serveur, non actionnable sans changer de librairie email. **Non prioritaire.**

---

## Findings — bundle middleware

### ua-parser-js — ⚪ Fausse alerte

- Visible dans le bundle middleware mais source : `next/dist/compiled/ua-parser-js`
- C'est une dépendance **interne à Next.js**, non importée par le code projet
- La taille gzippée du middleware reste raisonnable (~16 KB)
- **Aucune action possible.**

---

## Findings — payload RSC (avis sur fiches solution)

### Pagination des avis — ✅ Déjà optimisé

- Observation initiale de Ben : "31 avis sérialisés d'un coup dans le flux RSC"
- **Réalité vérifiée dans le code :** `ConfrereTestimonials.tsx` reçoit `initialAvis` (10 avis max, `PER_PAGE = 10`) depuis le serveur au moment du rendu
- Les changements de page font un `fetch('/api/solutions/[id]/avis?page=...&limit=10')` côté client → **pagination serveur**, pas client
- Le RSC payload ne contient que la première page (10 avis). **Aucune action requise.**

---

## Résultat

| Élément | Avant | Après |
|---|---|---|
| framer-motion | chunk client 250 modules | supprimé |
| HeroIllustration | `'use client'` (bundle client) | Server Component |
| Animations Hero | JS runtime (framer-motion) | CSS GPU (keyframes) |
| Avis fiches solution | déjà optimisé | — |
| Tiptap admin | isolé `/admin/*` | — |

---

## Prochaines pistes possibles (non urgentes)

- **Next.js 14 → 15** : mise à jour majeure à planifier en session dédiée (peut impacter App Router, Tailwind config)
- **Vulnérabilités npm** : 26 vulnérabilités (1 critical, 10 high) — traiter paquet par paquet
- **Rapport Ben complet** : revoir les autres points remontés (requêtes redondantes, composants à optimiser)
