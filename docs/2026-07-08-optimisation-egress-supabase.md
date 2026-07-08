# Optimisation egress Supabase & arbitrage plan Pro

_Dernière mise à jour : 2026-07-08_

## 1. Le problème

Mail Supabase (Fair Use Policy, effet **6 août 2026**) : le **cached egress** dépasse
le quota Free (**5 GB/mois inclus**, seuil de tolérance ~5,5 GB). L'egress = octets
d'images/fichiers servis aux visiteurs depuis le CDN du Storage.

**Cause (vérifiée dans le code, pas une fuite) : aucun pipeline d'images.**
- ~170 balises `<img src>` (84 fichiers) pointent en direct sur les URLs publiques du
  Storage, en **pleine résolution, non optimisées**. Seuls 4 fichiers utilisent `next/image`,
  et `next.config.mjs` n'a aucune section `images`.
- `src/app/api/upload/route.ts` stockait les fichiers **tels quels jusqu'à 5 Mo, sans
  redimensionnement ni compression**, et **sans `cacheControl`** (TTL défaut 1 h → les
  navigateurs re-téléchargeaient toutes les heures). → **corrigé** (voir §2).

### Ce que le Storage sert réellement (audit BDD 2026-07-08)

| Source | Objets sur Storage | Poids / fréquence | Traitement |
|---|---|---|---|
| `solutions_galerie.url` (captures) | **132** | Lourd (PNG pleine réso) — **1er poste** | Script recompression (bucket `media`) |
| `avatars.url` (stock + perso) | **79** | Léger mais vu partout | Stock → `public/` (§3) ; perso → script |
| `solutions.logo_url` | 70 (+68 externes) | Moyen, listings | Script recompression |
| `editeurs.logo_url` | 29 (+45 externes) | Moyen | Script recompression |
| `categories.image_url` | 7 | Léger mais **sur la home** | Script (bucket `images`) |
| `partenaires.logo_url` | 7 | Léger | Script (bucket `images`) |

Buckets : **`media`** (galeries), **`images`** (uploads WYSIWYG + catégories), **`avatars`**.

## 2. Corrections déjà appliquées (code)

1. **`scripts/optimize-storage-images.ts`** — recompresse en WebP l'existant d'un bucket,
   ré-uploade **sous le même chemin** (donc **aucune URL à changer en base**). Dry-run par
   défaut, `--execute` requis, backup binaire des originaux + `manifest.json` avant écriture.
   GIF/SVG ignorés.
   ```bash
   # dry-run (lecture seule) sur chaque bucket, puis --execute quand les gains sont OK
   npx tsx scripts/optimize-storage-images.ts --bucket media --execute
   npx tsx scripts/optimize-storage-images.ts --bucket images --execute
   npx tsx scripts/optimize-storage-images.ts --bucket avatars --execute
   ```
2. **`src/app/api/upload/route.ts`** — tout nouvel upload raster est désormais
   redimensionné (max 1600px) + converti WebP (q80) + `cacheControl` 1 an. GIF/SVG intacts.

**Gain attendu** : WebP sur des captures PNG = **−60 à −80 %** de poids. Comme les captures
dominent l'egress, ces deux mesures seules devraient largement repasser sous 5 GB.

**Mesuré et appliqué le 2026-07-08 (`--execute`)** : `media` 72,7 → 13,6 Mo (**−81 %**, 235 objets),
`images` 24,0 → 2,3 Mo (**−90 %**, 75 objets), `avatars` déjà légers (rien à faire). URLs inchangées,
originaux sauvegardés dans `storage-backups/` (ignoré par git).

> **Note cache (vérifié empiriquement 2026-07-08)** : l'endpoint public du Storage de ce projet renvoie
> **`Cache-Control: no-cache` quelle que soit la valeur `cacheControl` passée à l'upload** (testé
> insert / upsert / update / delete+insert → tous `no-cache` ; un avatar jamais touché est aussi `no-cache`).
> Le paramètre est donc **ignoré côté header servi**. Impact réel **faible** : grâce à l'`ETag`, les visites
> répétées revalident et reçoivent un **304** (~0 octet). Le gain vient de la **taille** (−81/−90 %), pas du cache.
> Pour un vrai cache long navigateur (zéro revalidation), le levier est **`next/image` / Vercel** (qui pose son
> propre cache long sur les images optimisées) ou la config **Smart CDN** côté dashboard Supabase — **pas** le
> paramètre d'upload. Le `cacheControl` reste passé dans le code (intention correcte, sans effet ici pour l'instant).

## 3. Assets à sortir vers `public/` (servis gratuitement par Vercel)

Le script (§2) traite tout le **dynamique** (uploads). Restent les assets **fixes déjà
dupliqués dans `public/`** — les basculer met leur egress Supabase à **zéro** :

| Asset | Statut | Action |
|---|---|---|
| **Avatars stock** (79 en base) | ⚠️ `public/` n'en contient que **48** → swap direct impossible (les 31 manquants feraient 404) | **Préférer** : recompresser le bucket `avatars` en place (`--bucket avatars`, §2), URLs inchangées. Swap `public/` différé (cf. ci-dessous). |
| **Logos syndicats « mot du président »** (~8) | Déjà dans `public/images/syndicats/` ; footer/home déjà locaux | Swap des URLs dans `pages_statiques.metadata` (page `qui-sommes-nous`). Priorité basse (1 page). |
| Logo GIF en-tête email | `images/logos/` | **NE PAS bouger** — les mails exigent une URL absolue. |
| Logos solutions/éditeurs externes (113) | Déjà hors Supabase | Rien. |

**⚠️ Pré-requis avant tout swap vers `/images/…`** :
1. Vérifier qu'une URL locale s'affiche en prod (ex. `https://<domaine>/images/portraits/avatar-1.png`).
   Historiquement le site renvoyait un 404 sur `/images/*` (raison de la bascule vers Storage).
2. Vérifier qu'aucun **email** ne rend d'avatar (les chemins relatifs cassent hors du site).

### SQL de bascule des avatars stock — DIFFÉRÉ (79 en base vs 48 dans `public/`)

⚠️ **Ne pas lancer tel quel** : la table `avatars` a 79 lignes stock mais `public/images/portraits/`
n'a que 48 fichiers → 31 avatars feraient 404. Recompresser le bucket `avatars` (§2) apporte
l'essentiel du gain sans ce risque. Ce swap n'a de sens qu'après avoir copié les **79** fichiers
dans `public/` **et** validé les points 1/2 ci-dessus.

```sql
-- 1) Dry-run : contrôler la correspondance
select url, '/images/portraits/' || regexp_replace(url, '^.*/', '') as nouvelle_url
from avatars
where user_id is null and url like '%/avatars/portraits/avatar-%';

-- 2) Bascule
update avatars
set url = '/images/portraits/' || regexp_replace(url, '^.*/', '')
where user_id is null and url like '%/avatars/portraits/avatar-%';
```

## 4. Arbitrage : rester Free (optimisé) vs passer Pro

_Chiffres indicatifs — reconfirmer sur la page pricing Supabase, les paliers évoluent._

| | Free (optimisé) | Pro |
|---|---|---|
| Prix | 0 € | **~25 $/mois** (crédit compute 10 $ inclus) |
| Egress inclus | 5 GB | **250 GB** (surplus ~0,09 $/GB) |
| Storage / DB | 1 GB / 0,5 GB | 100 GB / 8 GB |
| Backups | ❌ (on a un backup **hebდo manuel** via `/backup`) | **Quotidiens auto (7 j)** |
| Pause projet | après 7 j d'inactivité | jamais |
| Support | communauté | email |

**Lecture :**
- Passer Pro **juste pour l'egress** = traiter le symptôme. Sans l'optimisation §2/§3,
  l'egress remonterait avec le trafic, et on paierait le surplus 0,09 $/GB **sur des images
  non optimisées** en plus des 25 $.
- Les vrais arguments Pro sont **ailleurs** : backups quotidiens auto (vs notre hebდo manuel),
  fin de la pause après inactivité, plus de compute/DB. Le mail de croissance est un bon
  déclencheur **si ces bénéfices-là nous intéressaient déjà**.

**Reco : faire §2 + §3 d'abord** (gratuit, utile même en Pro — perf, SEO, coûts), **puis**
décider Pro sur ses bénéfices propres et la trajectoire de trafic — sans la pression egress.

## 5. Reste à faire (optionnel, plus tard)

- Brancher `next/image` (`remotePatterns` Supabase) → Vercel sert du WebP redimensionné
  depuis **son** CDN, egress Supabase divisé par le nb de visiteurs. Contrepartie : quotas
  d'optimisation d'images Vercel. À arbitrer une fois §2/§3 mesurés.
- Vérifier les logs Storage : écarter un bot/scraper ou du hotlinking d'images.
