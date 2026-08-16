# Diagnostic — « Impossible de récupérer le sitemap » (GSC prod), 2026-08-16

État bloqué depuis le **2026-05-27** sur les deux entrées sitemap de la propriété
`https://www.100000medecins.org/` **et** de la propriété domaine `100000medecins.org` :
« Impossible de récupérer le sitemap », Type « Inconnu », **0 page découverte**,
« Dernière lecture » figée au **19 juil. 2026** (= date de la dernière soumission).

## Conclusion

**Le serveur, le DNS et le réseau sont entièrement hors de cause.** Le blocage est côté
Google Search Console. Il a survécu à 5 tentatives de correction en 3 mois.

## Vérifications menées le 2026-08-16 (toutes vertes)

| Contrôle | Méthode | Résultat |
|---|---|---|
| Disponibilité | 65 requêtes en UA Googlebot | **65 × HTTP 200**, `X-Vercel-Cache: HIT`, 36–136 ms |
| Absence de 5xx intermittent | idem + 25 hits sur `/robots.txt` (force-dynamic) | **0 erreur** |
| Structure XML | parseur strict + dump hexa des 1ers octets | bien formé, **pas de BOM** (`3c 3f 78` = `<?x`) |
| Contenu | comptage + diff | 240 URLs, **0 doublon**, **0 URL hors périmètre `www`** |
| Cohérence des 2 sitemaps | diff des `<loc>` | **0 différence** |
| `Content-Type` | en-têtes | `application/xml` ✅ |
| Compression | `Accept-Encoding: gzip` | OK (45 388 o → 4 204 o) |
| Protocole | `--http1.1` forcé | 200 ✅ |
| Requête conditionnelle | `If-None-Match` | **304** correct ✅ |
| DNS | `Resolve-DnsName` sur NS autoritatif Gandi **et** sur 8.8.8.8 | `www` → CNAME Vercel → `216.198.79.65` / `64.29.17.65` ✅ |
| DNSSEC | requête DS sur le parent `.org` | **aucun DS** → pas de validation cassée |
| IPv6 | requête AAAA | **aucun AAAA** → piège IPv6 écarté |
| TLS | `ssl_verify_result` | `0` (valide) |
| Redirections | `curl -IL` depuis l'apex | apex → `www` en **un seul 308** ✅ |
| Déclaration | `robots.txt` | les sitemaps y sont bien listés ✅ |
| Pare-feu Vercel | dashboard Firewall | **Bot Protection : Inactive**, **Custom Rules : 0** ✅ |

⚠️ **Hypothèse enterrée** : le cold-start `force-dynamic` → 5xx retenu le 2026-06-15 n'est
plus possible — le fichier est servi par le **cache edge** (`X-Vercel-Cache: HIT`), la
fonction n'est même pas sollicitée.

## Historique des tentatives (toutes infructueuses)

| Date | Tentative | Résultat |
|---|---|---|
| 2026-05-29 | Refonte du sitemap + re-soumission | échec |
| 2026-06-07 | `sitemap-v2.xml` (casseur de cache négatif) | échec, route retirée depuis |
| 2026-06-15 | `force-dynamic` → ISR + `try/catch` anti-5xx | échec (mais correctif juste, conservé) |
| 2026-07-09 | Suppression des 2 entrées GSC + re-soumission | échec |
| 2026-07-19 | URL entièrement neuve `/sitemap-main.xml` | échec |
| 2026-08-16 | `<sitemapindex>` — **type de document** différent | à observer |

## Mise en proportion — pourquoi ce n'est pas grave

Le sitemap affiche « 0 page découverte » depuis le début, **et pourtant** l'index Google est
passé d'environ **50 pages (mi-mai) à 139 (16/08)**, soit ×2,8, sur ~262 pages connues.
Google découvre tout par **crawl direct** : le site est intégralement maillé par sa
navigation, et 240 URLs est une volumétrie où un sitemap n'apporte rien de décisif.

Un sitemap est un **accélérateur de découverte**, pas une condition d'indexation. Le
symptôme est cosmétique ; le coût d'investigation a déjà largement dépassé l'enjeu.

## Dernière tentative (2026-08-16) et critère d'arrêt

Nouvelle route `src/app/sitemap-index.xml/route.ts` : un `<sitemapindex>` pointant vers
`/sitemap-main.xml`. C'est le **seul paramètre jamais modifié** — les 2 sitemaps existants
sont des `<urlset>`, que GSC classe en type « Sitemap » ; un index est un type distinct
(« Index de sitemap »).

**À faire dans GSC** : soumettre `sitemap-index.xml` sur la propriété `www`.

**Lecture du résultat, dans les deux cas :**
- Index lu ✅ / enfant en échec ❌ → le blocage vise la récupération du `<urlset>` ;
  garder l'index comme sitemap de référence et retirer les 2 autres entrées.
- Index également en échec ❌ → blocage au niveau de la **propriété GSC**. Plus rien à
  tenter côté code. **Clore le sujet** et ne plus y revenir.

⚠️ **Faux espoir à écarter** : l'endpoint de *ping* sitemap de Google
(`google.com/ping?sitemap=`) a été supprimé — inutile de chercher de ce côté.

## Nettoyage prévu

`robots.ts` déclare aujourd'hui **3 sitemaps au contenu identique** (empilement des
tentatives). Dès qu'une entrée passe en « Réussite » : ne garder que celle-là, supprimer
les autres routes et les entrées GSC correspondantes.
