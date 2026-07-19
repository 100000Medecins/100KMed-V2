# Audit SEO — problèmes d'indexation Google Search Console (2026-07-19)

Déclencheur : 2 mails GSC (18/07/2026) — « nouveaux motifs empêchant l'indexation » +
« échec de certaines corrections pour Indexation des pages (404) ». Analyse du rapport
« Indexation des pages » + inspection d'URLs.

## Diagnostic

### 1. Les 404 (Introuvable) — cause racine trouvée
Le lien « Site internet » des fiches solutions affichait le champ `website` **brut**
(`SolutionHero.tsx`). Quand la valeur n'a pas de protocole (`www.weda.fr`, `cgm.com/fr`…),
`<a href="www.weda.fr">` est interprété comme un **lien relatif** → 404 du type
`/solutions/<cat>/www.weda.fr` que Googlebot suit et signale.

**13 solutions** avaient un `website` sans `https://` : Heidi Health, Google Gemini,
PulseLife, Dragon Copilot, Doocteur-IA, Tandem Health, Weda, Nabla Copilot, OpenEvidence,
CGM Assistant, Microsoft Copilot, EBiM, MedGPT. (Weda avait une rustine dédiée dans
`next.config.mjs`, mais pas les 12 autres.)

- **`/5`** : URL numérique fantôme héritée de l'ancien site (ID Firebase/Quasar). Aucun lien
  interne actuel (vérifié dans le code), aucune valeur BDD = « 5 ». Les « pages d'origine »
  affichées par GSC (Weda, easycare) sont des crawls anciens. Un 404 y est *correct* ;
  « l'échec de validation » = on a demandé une validation sur une URL censée rester en 404.

### 2. « Indexée malgré le blocage par robots.txt » (5 pages)
`/solution/noter/*` et `/connexion`. Piège classique : **robots.txt bloque le crawl, pas
l'indexation**. Comme ces URLs sont liées (bouton « Évaluer », liens « connexion »), Google
indexe l'URL nue sans pouvoir lire la page — donc sans voir d'instruction de non-indexation.

### 3. Lecture du reste du rapport (aucune action)
- **Page avec redirection (53)** : NORMAL — anciennes URLs Quasar/Firebase en 301 (cf. `next.config.mjs`).
- **Bloquée par robots.txt (12)** : VOULU (`/mon-compte/`, `/api/`, etc.).
- **Exclue par noindex (1)** : VOULU.
- **Explorée, actuellement non indexée (11)** : jugement Google (pages fines), à surveiller.
- **Doublons canoniques (3+2)** : variantes de casse `/Weda` vs `/weda`, mineur.
- **Erreur serveur 5xx (0)** : OK.

## Corrections appliquées (2026-07-19)

### Code (cause racine des 404)
- Nouveau helper `ensureHttps()` — `src/lib/url.ts` : préfixe `https://` si le protocole manque.
- Appliqué partout où un `website`/`support_website` est rendu en lien ou en JSON-LD :
  `SolutionHero.tsx`, `SupportSection.tsx`, `editeur/[slug]/page.tsx`, `lib/seo/jsonld.ts`.
- Effet : plus jamais de lien relatif cassé, y compris pour les futures saisies éditeur/admin.

### Données
- `scripts/fix-website-protocol.ts` (dry-run par défaut, `--execute`, backup JSON) — a corrigé
  les **13 `solutions.website`** en base (préfixe `https://`). Vérif post-écriture : 0 valeur
  sans protocole restante. Backup : `backups/fix-website-protocol-before-*.json`.

### Indexation (« indexée malgré robots.txt »)
- `src/app/robots.ts` : `/solution/noter/` et `/connexion` **retirés** du `Disallow`
  (pour que Googlebot puisse les crawler). `/mon-compte/` et `/api/` conservés.
- `noindex` explicite ajouté via layouts serveur : `src/app/connexion/layout.tsx` et
  `src/app/solution/noter/layout.tsx` (`robots: { index: false, follow: false }`).
- Résultat attendu : Google crawle → voit le `noindex` → retire ces URLs de l'index.

### /5
- `next.config.mjs` : redirection 301 `/5 → /`.

## Suivi GSC (après déploiement sur `main`)
1. Déployer (merge `dev → main`).
2. Dans GSC, relancer la validation sur **« Introuvable (404) »** (les liens `website` cassés
   ne seront plus générés + `/5` redirige).
3. Relancer la validation sur **« Indexée malgré le blocage par robots.txt »** (le noindex
   fera sortir `/solution/noter/*` et `/connexion` de l'index — délai de plusieurs semaines).
4. Ne plus demander de validation sur les 404 réellement morts (une URL dead = 404 légitime).
5. Surveiller « Explorée actuellement non indexée » (contenu fin) sans urgence.
