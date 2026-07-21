# Plan de redirection 404 — ancien site Quasar → nouveau site Next.js

> Diagnostic initial — **2026-05-28**
> Mise à jour — **2026-06-11**
> Mise à jour — **2026-07-19** (domaine accentué défensif `100000médecins.org`)
> Contexte : des résultats Google encore indexés (ancien site) renvoient vers des 404 sur le nouveau site.
> Ancien site : `c:\Users\david\Documents\ancien-site-frontend` (Quasar/Vue). Routes : `src/router/routes.ts`.

---

## Constat principal

La **majorité des URLs SEO-critiques garde le même schéma** entre l'ancien et le nouveau site :
- `/`, `/contact`, `/rgpd`, `/cgu`, `/actualites`, `/videos`, `/transparence`
- `/solutions`, `/solutions/:idCategorie`, `/solutions/:idCategorie/:idSolution`, `.../evaluations`
- `/editeur/:idEditeur` (anciennement UUID, désormais slug — résolu côté sitemap)

→ Si Google renvoie une 404 sur ces URLs, ce **n'est pas un problème de format** mais l'une de ces causes :
1. La solution/catégorie est passée `actif=false` sur le nouveau site (ex. Téléconsultation, Téléexpertise, ou solutions dépubliées).
2. Le `slug` a changé entre Firebase et Supabase.
3. `archive.100000medecins.org` ne sert pas correctement le fallback (résolu le 2026-05-28).
4. **Le sitemap exposait les solutions inactives** (corrigé le 2026-05-28) → Google crawlait des pages menant à des 404.

## Redirections 301 implémentées (next.config.mjs)

Cas certains (renommage camelCase → kebab-case + pages équivalentes) :

| Ancienne URL | Nouvelle URL | Date |
|---|---|---|
| `/difficileDeChanger` | `/difficile-de-changer` | 2026-05-28 |
| `/tousEnsemble` | `/tous-ensemble` | 2026-05-28 |
| `/lancement100k` | `/lancement-100k` | 2026-05-28 |
| `/presentation100k` | `/qui-sommes-nous` | 2026-05-28 |
| `/monCompte` | `/mon-compte/profil` | 2026-05-28 |
| `/monCompte/mesFavoris` | `/mon-compte/mes-favoris` | 2026-05-28 |
| `/monCompte/mesPreferences` | `/mon-compte/mes-preferences` | 2026-05-28 |
| `/monCompte/MesOutils` | `/mon-compte/profil` | 2026-05-28 |
| `/monCompte/mesEvaluations` | `/mon-compte/mes-evaluations` | **2026-06-11** |
| `/connexion/creationCompte/identifiants` | `/inscription` | 2026-05-28 |
| `/connexion/creationCompte/donneesPerso` | `/inscription` | 2026-05-28 |
| `/solutions/LogicielsMetiers[/...]` | `/solutions/logiciels-metiers[/...]` | **2026-06-11** |
| `/solutions/AgendasMedicaux[/...]` | `/solutions/agendas-medicaux[/...]` | **2026-06-11** |
| `/solutions/IntelligenceArtificielleMedecine[/...]` | `/solutions/intelligence-artificielle-medecine[/...]` | **2026-06-11** |
| `/solutions/IaDocumentaires[/...]` | `/solutions/ia-documentaires[/...]` | **2026-06-11** |
| `/solutions/Agendas[/...]` | `/solutions/agendas-medicaux[/...]` | **2026-06-11** |
| `/solutions/agendas[/...]` | `/solutions/agendas-medicaux[/...]` | **2026-06-11** |
| `/editeur/{cegedim,cgm,openxtrem,adsion,eigsante,rdservices,almaPro,medextgroup,ICTSolutions,OuvrezLaBoite}` | slug Supabase actuel | **2026-06-11** |
| `/editeurs/<idem ci-dessus>` | slug Supabase actuel | **2026-06-11** |
| `/editeur/sephira` et `/editeurs/sephira` | `/editeur/orisha` *(fusion d'entités)* | **2026-06-11** |
| `/editeur/odaiji` et `/editeurs/odaiji` | `/editeur/madeformed` *(rachat)* | **2026-06-11** |
| `/editeurs/:slug` *(catch-all pluriel→singulier)* | `/editeur/:slug` | **2026-06-11** |
| `/manifeste.html` | `/tous-ensemble` | **2026-06-11** |
| `/communique.html` | `/lancement-100k` | **2026-06-11** |

## Redirections dynamiques (en code, pas en config)

- **`/solutions/:cat/:slugA-vs-:slugB`** : interception dans `src/app/solutions/[idCategorie]/[idSolution]/page.tsx` (ligne ~44). Résout les slugs en UUIDs via `getSolutionIdsBySlugs()` et redirige en 308 vers `/solutions/comparer?ids=uuid1,uuid2`. Vérifié 2026-06-11.

- **Normalisation casse `/solutions/:cat/:slug`** (**2026-06-11**) : interception en début de la page solution. Si `idSolution` ou `idCategorie` contient des majuscules (héritage Firebase `firebaseId` type `HelloDoc`, `AxiSante`…), redirection 308 vers la version minuscule. Couvre **toutes les solutions présentes et futures**.
  - Idem pour la **page liste catégorie** (`/solutions/:idCategorie`) qui normalise aussi la casse en début de page.
  - Cas réel résolu 2026-06-11 : Search Console remontait 6 URLs 404 `/solutions/logiciels-metiers/{HelloDoc,AxiSante,Medimust,Odaiji,Medicab,Crossway}`. Toutes routées vers leur slug minuscule existant.

## Audit slugs Firebase ↔ Supabase (2026-06-11)

Audit lancé via `scripts/audit-slugs-firebase-vs-supabase.ts` après remarque collègue sur 4 cas restés non couverts. Bilan :

- **Solutions Firebase → Supabase** : ✅ 24/24 OK (slug Supabase = firebaseId.toLowerCase()). Aucun renommage métier au sein de la collection solutions. La normalisation casse-only suffit.
- **Catégories Firebase → Supabase** : ⚠️ 1 cas renommé sur 4. Firebase id="Agendas" → Supabase slug="agendas-medicaux". Redirections ajoutées dans `next.config.mjs`.
- **Éditeurs Firebase → Supabase** : ⚠️ **12 cas renommés sur 19**, car le slug Supabase est généré via `slugify(nom)` au lieu de `firebaseId.toLowerCase()`. Map complète ajoutée dans `next.config.mjs` (préfixes `/editeur/` ET `/editeurs/` couverts).
- **Cas particuliers éditeurs** :
  - `sephira` → `orisha` (fusion d'entités confirmée par David)
  - `odaiji` → `/editeur/madeformed` (Odaiji racheté par MadeForMed ; la solution Odaiji existe encore sous cet éditeur)
- **Catch-all pluriel→singulier** : règle générique `/editeurs/:slug → /editeur/:slug` ajoutée en fin de liste pour couvrir tous les éditeurs **non renommés** (les renommés étant traités explicitement avant).
- **Pages HTML pré-Quasar** : `/manifeste.html` et `/communique.html` identifiées par David comme étant des URLs encore référencées depuis l'extérieur (réseaux sociaux, mails, articles). Redirections ajoutées.

## Domaine accentué défensif `100000médecins.org` (2026-07-19)

Domaine **secondaire/défensif** (IDN accentué, punycode `xn--100000mdecins-*`) acheté chez Gandi pour empêcher un tiers de l'enregistrer et pour rattraper les visiteurs qui saisiraient le nom **avec l'accent**. Le domaine **canonique** reste `www.100000medecins.org` (sans accent).

**Config Gandi — Redirections Web (301 PERMANENT)** :

| Adresse source | Redirige vers | Date |
|---|---|---|
| `https://100000médecins.org` + `http://100000médecins.org` (apex) | `https://www.100000medecins.org` | (initial) |
| `www.100000médecins.org` | `https://www.100000medecins.org` | **2026-07-19** |

- **Le manque initial** : seule la redirection de l'**apex** (sans `www`) existait. Gandi exige une redirection **par hôte** — taper `www.100000médecins.org` ne matchait donc rien. La 2ᵉ redirection (`www`) ajoutée le 2026-07-19 → couverture complète : apex/www × avec/sans accent → tous vers le canonique.

> ⚠️ **Avertissement navigateur « site sosie » — PAS un problème DNS/Gandi.**
> Chrome/Edge affichent « Le site semble faux… Vouliez-vous accéder à 100000medecins.org ? » **avant** même de charger la page. C'est la **protection anti-homographe (IDN lookalike)** du navigateur : `médecins` (avec `é`) ressemble au domaine principal `medecins` (sans accent). C'est **côté client**, non corrigeable dans Gandi, et ça **persiste** même après la redirection. Renforcé pour David car il visite en permanence le vrai domaine (Chrome le connaît → signale d'autant plus le quasi-jumeau).

- **Règle de com'** : **ne jamais communiquer** le domaine accentué (flyers, emails, cartes, QR codes) → toujours promouvoir `www.100000medecins.org` (sans accent) comme adresse canonique.
- **Impact SEO** : neutre à positif. La 301 permanente transmet l'éventuelle « link equity » vers le canonique ; pas de *duplicate content* (tout est redirigé, jamais servi en double). Le `<link rel="canonical">` / `metadataBase` du site pointe déjà sur le non-accentué.
- **Test propre** : vérifier la redirection en **navigation privée** (pas d'historique → l'heuristique sosie ne se déclenche généralement pas).

## Cas volontairement non redirigés

Routes Quasar **non SEO-critiques** (pages de test ou erreur interne) :
- `/errorConnexion` → page d'erreur Quasar, pas indexable par Google de toute façon.
- `/testFlex` → page de test interne, jamais référencée.
- `/monCompte/mesDiscussions` → fonctionnalité non reprise (forum/Q&A archivé sans projet de revenir).

## État du Reste à faire (2026-06-11)

### ✅ Point 1 — `archive.100000medecins.org` (placeholder minimal)
- **Résolu** : répond en HTTP 200 avec `Last-Modified: 2026-05-28 20:44:57`. Le réupload de `dist/spa/` (528 fichiers) a été appliqué.

### ✅ Point 2 — `legacy.100000medecins.org` (déréférencement)
- **Résolu** : `.htaccess` avec `X-Robots-Tag: noindex, follow` confirmé live (vérifié 2026-06-11). Le déréférencement progressif est en cours côté Google (effet ~3-6 mois).

### ✅ Point 3 — Sitemap éditeurs en UUID
- **Résolu** : `src/app/sitemap.ts:128` génère désormais `/editeur/${slug}` (et plus l'UUID). La migration vers les slugs éditeurs a été livrée le 30 mai.

### ⏳ Point 4 — Sitemap Search Console (cache négatif Google)

**Constat 2026-06-11** : les 2 sitemaps répondent en HTTP 200, XML valide, 138 URLs :
- `https://www.100000medecins.org/sitemap.xml`
- `https://www.100000medecins.org/sitemap-v2.xml` (soumis le 2026-06-07 pour casser le cache négatif)

Mais Search Console garde un état d'erreur **collant** sur `/sitemap.xml` depuis le 27/05. Les pages sont **bien indexées par crawl direct** (cf Search Console > Pages indexées), donc **c'est cosmétique, pas bloquant pour le SEO**.

Pistes (par ordre de préférence) :
1. **Attendre** — un cache négatif Google se vide en 4-8 semaines en général.
2. **Re-soumettre** `sitemap-v2.xml` dans Search Console, supprimer l'ancien `sitemap.xml`, attendre validation de v2 (1-2 semaines), puis re-soumettre `sitemap.xml`.
3. (Si vraiment bloqué après 2 mois) renommer définitivement `sitemap.xml` en un nouveau path.

### ⏳ Point 5 — Surveillance Google Search Console

À refaire régulièrement (≈ une fois par semaine pendant la phase de transition) :
- Search Console → **Pages › Non indexées › 404** → exporter la liste réelle
- Comparer avec les redirections existantes → ajouter au mapping ci-dessus si nouvelles routes anciennes détectées
- Surveiller le déréférencement progressif de `legacy.100000medecins.org`

### ⏳ Point 6 — Mention `dev.100000medecins.org`

Bloqué de l'indexation depuis le 2026-06-07 (`robots.txt` + meta robots `noindex` + sitemap vide hors prod). Demande de suppression du préfixe `dev.*` soumise dans Search Console (effet ~6 mois, masquage Google immédiat).
