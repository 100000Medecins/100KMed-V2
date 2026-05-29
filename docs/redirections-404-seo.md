# Plan de redirection 404 — ancien site Quasar → nouveau site Next.js

> Diagnostic — **2026-05-28**
> Contexte : des résultats Google encore indexés (ancien site) renvoient vers des 404 sur le nouveau site.
> Ancien site : `c:\Users\david\Documents\ancien-site-frontend` (Quasar/Vue). Routes : `src/router/routes.ts`.

---

## Constat principal

La **majorité des URLs SEO-critiques garde le même schéma** entre l'ancien et le nouveau site :
- `/`, `/contact`, `/rgpd`, `/cgu`, `/actualites`, `/videos`, `/transparence`
- `/solutions`, `/solutions/:idCategorie`, `/solutions/:idCategorie/:idSolution`, `.../evaluations`
- `/editeur/:idEditeur` (UUID des deux côtés)

→ Si Google renvoie une 404 sur ces URLs, ce **n'est pas un problème de format** mais l'une de ces causes :
1. La solution/catégorie est passée `actif=false` sur le nouveau site (ex. Téléconsultation, ou solutions dépubliées).
2. Le `slug` a changé entre Firebase et Supabase.
3. `archive.100000medecins.org` ne sert pas correctement le fallback (voir plus bas).
4. **Le sitemap exposait les solutions inactives** (corrigé le 2026-05-28) → Google crawlait des pages menant à des 404.

## Redirections 301 implémentées (next.config.mjs, 2026-05-28)

Cas certains (renommage camelCase → kebab-case + pages équivalentes) :

| Ancienne URL | Nouvelle URL |
|---|---|
| `/difficileDeChanger` | `/difficile-de-changer` |
| `/tousEnsemble` | `/tous-ensemble` |
| `/lancement100k` | `/lancement-100k` |
| `/monCompte` | `/mon-compte/profil` |
| `/monCompte/mesFavoris` | `/mon-compte/mes-favoris` |
| `/monCompte/mesPreferences` | `/mon-compte/mes-preferences` |
| `/monCompte/MesOutils` | `/mon-compte/profil` |
| `/connexion/creationCompte/identifiants` | `/inscription` |
| `/connexion/creationCompte/donneesPerso` | `/inscription` |

## Cas à confirmer (PAS encore redirigés)

- **`/presentation100k`** → probablement `/qui-sommes-nous`, mais à confirmer (contenu pas vérifié). Non redirigé pour éviter une mauvaise cible.
- **`/solutions/:cat/:left-vs-:right`** (comparaison ancienne, slugs dans le path) → la nouvelle route `/solutions/comparer?ids=uuid1,uuid2` attend des **UUID**, pas des slugs. Redirection statique impossible : il faudrait résoudre slug→UUID dynamiquement (middleware ou route handler). À traiter si Search Console montre du trafic sur ces URLs.

## Reste à faire

1. **Google Search Console** : exporter le rapport « Pages › Non indexées › 404 » pour obtenir la liste réelle des URLs en erreur, puis compléter le mapping ci-dessus.
2. **`archive.100000medecins.org`** : le sous-domaine répond mais ne sert qu'un placeholder minimal (« 100000medecins »), pas l'ancien site Quasar (528 fichiers censés y avoir été copiés le 2026-05-25). À diagnostiquer côté Gandi (vhost / racine documentaire / cert HTTPS).
3. **Sitemap éditeurs en UUID** : voir TODO « Sitemap propre + URLs éditeurs en UUID » — décider si on retire les éditeurs du sitemap ou si on leur ajoute un `slug`.
