# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## URGENT

_(rien d'urgent pour l'instant)_

---

## En attente / Idées

### Contenu des questionnaires

_(rien en cours)_

### Sécurité

_(rien en cours)_

### Communication

#### Informer l'ISNAR de la question e-CPF « médecins juniors » (2026-07-20)
- Envoyer un mail à l'**ISNAR** (syndicat des internes) pour les informer que 100 000 Médecins a **ajouté une question sur la gestion de la carte e-CPF** (Carte de Professionnel en Formation) dans les questionnaires, à destination des remplaçants/internes. Cf. question livrée le 2026-07-08 (`tt_ecpf_remplacant` / `detail_ecpf_junior`).

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

#### Peupler les prix et coordonnées des éditeurs (2026-06-04)
- **Contexte** : nouveau module tarification livré (cf CHANGELOG 2026-06-04) mais peu de prix renseignés en BDD pour le moment. Le toggle global « Afficher les prix sur le site » est OFF tant qu'une masse critique n'est pas atteinte.
- **Coordonnées éditeurs** : le bloc « Contacts commerciaux » est désormais masqué par défaut (toggle OFF dans `/admin/parametres`) car beaucoup de coordonnées en BDD sont incorrectes ou inappropriées. À nettoyer + compléter pour pouvoir réactiver le toggle.
- **À faire** : demander à Agathe si elle veut s'en charger (collecte auprès des éditeurs des prix officiels + coordonnées commerciales + support à jour). Une fois la base à jour, activer les 2 toggles dans `/admin/parametres`.
- **MAJ 2026-07-22** : les contacts sont désormais **multiples** (plusieurs commerciaux/support par solution, cf CHANGELOG). ✅ **Toggle commercial réactivé (global, 2026-07-23)** — l'item « Contacts multiples — suites » est clos (archivé le 2026-07-26). Reste ici la **collecte** des coordonnées/prix à jour (Agathe, cf. ci-dessus).

#### Vidéos par solution — étendre la découverte YouTube
- **Acquis (2026-05-24)** : plomberie complète livrée — table `video_solutions` (M-N) avec RLS, script `scripts/discover-videos-youtube.mjs` avec filtres (lang fr, durée ≥ 60s, vues ≥ 100, date < 5 ans, blacklist termes dev, bonus mots pro-santé), galerie publique des fiches solutions affiche automatiquement les vidéos validées, admin a panneaux symétriques côté vidéo (multi-select solutions) et côté solution (chips vidéos), badges 🎬 dans le panel propositions à modérer.
- **Smoke test 2026-05-24** : 8 vidéos importées sur Doctolib agenda, validation manuelle dans `/admin/videos` (panel propositions). Quelques vidéos hors-sujet identifiées (chaîne « Mediia » génère du contenu IA générique qui mentionne Doctolib sans en être le sujet).
- **Étape suivante — étendre aux autres solutions Agendas** : relancer le script sur Maiia, Keldoc, Clickdoc, Mondocteur et les autres solutions actives de la catégorie. Commande type :
  ```bash
  node scripts/discover-videos-youtube.mjs --solution-name=maiia --max=8 --dry-run
  # puis sans --dry-run + --yes une fois la sélection OK
  ```
- **Étape d'après — étendre aux autres catégories** : Logiciels métier, IA Scribes, Téléconsultation, etc. Adapter peut-être la requête pour ces catégories (`"<nom>" logiciel médical` plutôt que `"<nom>" agenda`).
- **Améliorations possibles du scoring** (à voir après plusieurs runs) :
  - Blacklist par chaîne YouTube (pas seulement par mot-clé) : `Mediia` semble produire des vidéos qui matchent mais ne sont pas sur la solution recherchée.
  - Bonus si la chaîne YouTube = chaîne officielle de la solution (ex. chaîne `Doctolib` officielle).
  - Détecter les comparatifs (`X vs Y`) et lier automatiquement aux deux solutions via `video_solutions` plutôt que de réimporter.
- **Cas du doublon** : une même URL YouTube partagée par plusieurs solutions (ex. comparatif). Le script saute aujourd'hui les URLs déjà en BDD (SELECT + `continue`), donc le rattachement à la 2e solution se fait manuellement via le panneau "Vidéos liées" de la fiche solution admin. Évolution possible : si l'URL existe déjà, ajouter juste un nouveau lien `video_solutions` au lieu de skip.

### Nettoyage

#### Statuer sur le comparateur orphelin `/solutions/comparer` (2026-07-08)
- **Constat** : la page + l'état `comparaisonSolutionIds` (max 3) de `useAppStore` sont un **vestige du portage Quasar** (créés 2026-02-26, commit `af0ad69`) **jamais recâblés** — aucun composant n'appelle `addToComparaison`, aucun bouton « Comparer » actif. La page n'est atteignable que via la **redirection 301** des vieilles URLs `slug-vs-slug` ([idSolution]/page.tsx](src/app/solutions/[idCategorie]/[idSolution]/page.tsx#L66)).
- **À trancher** : (1) **laisser** (sert de cible SEO aux redirects legacy, coût nul) ; (2) **ré-activer** (boutons « Comparer » + barre « Comparer (N) » qui construit `?ids=`) ; (3) **nettoyer** (retirer l'état mort du store, garder page + redirect pour le SEO). ⚠️ Ne pas supprimer la page à l'aveugle → casserait les liens `slug-vs-slug`.

#### Nettoyage progressif des ~270 erreurs ESLint préexistantes — règle CLAUDE.md active
- **État 2026-05-25** : règle « migration au fil de l'eau » ajoutée dans [CLAUDE.md](CLAUDE.md) → les `as any` typables seront nettoyés automatiquement quand je touche les fichiers concernés pour d'autres raisons.
- **Pas un sujet de fiabilité** : `tsc --noEmit` passe, `next build` passe, le site tourne.
- **Cause principale** : schema drift (`actualites`, `documents` absentes des types Supabase auto-générés) → contournement légitime via `as any`. Le vrai remède = régénérer `src/types/database.ts` (`npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts`), pas du typage manuel.
- **Pas de chantier dédié prévu** sauf si un jour on veut un lint propre en CI.

#### Couper définitivement le cordon Firebase — EN COURS (2026-07-26)
- ✅ **Fait (code, 2026-07-26)** : `firebase-admin` désinstallé (−160 packages) ; **16 scripts** important `firebase-admin` supprimés ; **0 import résiduel** dans `src/` ; `npm run build` vert.
- ✅ **Backup exporté avant coupure** : `evaluations_firebase_backup` (679 lignes) → `firebase-final-backup/…json` (1,26 Mo, gitignoré — **local à ce poste**, à copier vers une archive durable si besoin cross-machine).
- ⏳ **Reste (DDL, David)** : `DROP TABLE public.evaluations_firebase_backup;` puis régénérer `src/types/database.ts`.
- ⏳ **Côté Google (quand tu veux, sans urgence — coût nul)** : **résilier le projet Firebase** + révoquer le service-account `medecins-7a4ed-firebase-adminsdk-*.json`.

### UX / UI

#### Tooltip note globale — affiner après la livraison initiale (2026-05-30)

- **Livré (2026-05-30)** : tooltip cliquable à côté de la note globale sur chaque fiche solution (popover au survol + modale au clic), éditable depuis `/admin/pages` → « Tooltip — Note globale des solutions ».
- ~~**À améliorer — modale détaillée** : le rendu actuel utilise `prose-custom` + sanitize HTML par défaut. Travailler la lisibilité (hiérarchie typographique, aération des paragraphes, encadrés visuels pour les exemples chiffrés type « 4,2 sur 50 avis »).~~ [OK] Fait 2026-05-30 (styles Tailwind ciblés `[&_strong]`, `[&_a]`, `[&_ul]` + taille `lg` + `text-[15px] leading-relaxed`).
- ~~**Remplacer le `mailto:contact@…` par un lien vers `/contact`** dans le corps de la modale (le formulaire de contact existe déjà, c'est mieux que d'ouvrir le client mail du visiteur).~~ [OK] Fait 2026-05-30 (+ fix au passage de `sanitizeHtml` qui supprimait silencieusement les liens internes).
- ~~**À tester sur mobile** : le popover en position `absolute` peut déborder à droite de l'écran sur petit viewport.~~ [OK] Testé OK 2026-05-31 (pas de débordement constaté).
- **À retravailler (2026-06-04)** : refaire le texte de la modale d'information (titre + corps) à côté de la note globale sur les pages solutions. Le texte actuel est à revoir avant éventuelle réactivation de la modale via le nouveau toggle `modale_active` dans l'admin (livré 2026-06-04). Pour rappel, la modale est désormais désactivable par défaut depuis `/admin/pages` → « Tooltip — Note globale des solutions ».

#### Extraire des composants UI partagés (mini design system pragmatique)
- **Constat** : 7 valeurs de `rounded-*` (348× xl, 279× lg, 168× card, 72× button, 69× 2xl…), 10 variations de padding pour des boutons « primaire » (42× `px-4 py-2`, 23× `px-7 py-3`…), 4 styles de badges concurrents, 10 fichiers qui redéclarent `inputClass` inline, 10 fichiers avec leur propre overlay `fixed inset-0 bg-black/`.
- **Phase 0 livrée (2026-05-24)** : dossier `src/components/ui/` créé, conventions tokens validées dans [src/components/ui/README.md](src/components/ui/README.md) (radius = `rounded-card` 16px et `rounded-button` 12px ; primaire = `bg-navy`, secondaire = `bg-accent-blue`).
- **Phase 1 livrée (2026-05-25)** : `<Button>` étendu (l'existant a été enrichi, pas remplacé — 14 usages publics conservés). Nouveaux props : `size` (sm/md/lg, défaut lg), `loading` (spinner + disabled), `leftIcon`/`rightIcon`, `fullWidth`, support de tous les attrs HTML. Nouveaux variants : `secondary` (bg-accent-blue), `danger` (bg-red-500). **15 fichiers migrés** : 5 formulaires admin (Video/Editeur/Categorie/Partenaire/Article) + AdminLoginForm + BlogForm + SolutionForm + PropositionForm + 5 pages admin (categories/editeurs/solutions/pages/pages-nouveau) + page mon-compte/proposer/video. Tous les boutons `px-7 py-3.5 rounded-button bg-navy` sont migrés.
- **Phase 2 livrée (2026-05-25)** : `<Badge>` créé (variants info/warning/success/danger/neutral/dark × sizes sm/md, avec `dot`, `leftIcon`/`rightIcon`, `onClick`). 3 fichiers migrés : `etudes-cliniques/_public.tsx`, `questionnaires-these/page.tsx`, `VideosPendingPanel.tsx`. **Reste à migrer au fil de l'eau** : ~30 occurrences de chips `bg-*-50 text-*-700 border border-*-200` dans d'autres composants.
- **Phase 3 livrée (2026-05-25)** : `<Input>`, `<Textarea>`, `<Select>`, `<Field>` créés dans `src/components/ui/`. `<Input>` et `<Textarea>` partagent une fonction `buildInputClasses()` exportée (cohérence du style). `<Select>` rend un `<select>` natif avec chevron SVG inline. `<Field>` = wrapper label + hint + error. 6 formulaires migrés : `PartenaireForm` (complet), `CategorieForm` (complet), `EditeurForm` (2 fields démo), `BlogForm` (complet, 6 fields), `ArticleForm` (4 fields principaux), `VideoForm` (complet).
- **Phase 4 livrée (2026-05-25)** : `<Modal>` composé créé (`<Modal>`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>`). Gère pour toi : ESC pour fermer, clic backdrop (opt-out via `closeOnBackdropClick={false}`), scroll body bloqué, `aria-modal`. 4 tailles (sm/md/lg/xl). 3 modales migrées : `DeleteAccountModal` (pattern composé complet avec Footer), `ProposeCommunauteModal` (mode libre avec header custom), `PublishEmailModal` (juste l'overlay externe — contenu interne préservé). **Reste à migrer** : ~9 autres modales (`SolutionGallery` carousel/zoom, `ArticleForm`, `BlogForm`, `EmailTemplateEditor`, `LancementSyndicatsManager`, `AdminEmailsClient`, `NewslettersClient`, `etudes-cliniques/_public`, `questionnaires-these/page`).
- **Phase 5 livrée (2026-05-25)** : `<Card>` créé ([src/components/ui/Card.tsx](src/components/ui/Card.tsx)). Props : `padding` (none/sm/md/lg/xl), `hoverable` (cards cliquables), `overflow` (hidden/visible), forward de tous les attrs HTML standards. 4 fichiers migrés en démo. **Reste à migrer** : ~87 autres usages de `bg-white rounded-card shadow-card`.
- **Toutes les phases sont livrées** ✅ — règle « migration au fil de l'eau » active dans [CLAUDE.md](CLAUDE.md) (section « Design system — composants UI à utiliser »). Les ~87 cards, ~10 modales et ~11 inputs inline restants seront migrés automatiquement quand je touche les fichiers pour d'autres raisons. Pas de chantier dédié.
- **Méthode** : composant **extrait d'abord**, **remplacé ensuite** au fil de l'eau dans les fichiers qu'on touche pour d'autres raisons. Pas de big-bang.
- **Pas dans le scope** : Storybook, doc formelle — pas de valeur tant qu'on est seul à coder.

### Espace éditeur

_(rien en cours)_

### Performance

#### Réduire la CPU Vercel Fluid — passe 2 (extension ISR aux autres pages publiques)
- **Contexte** : alerte Vercel Fluid Active CPU (~91 % des 4h Hobby → **risque de pause du site**). Cause : les pages publiques lisaient les cookies (via `createServerClient`) → rendues **dynamiquement à chaque requête**. Preuve + recette : [docs/2026-07-11-plan-isr-pages-publiques.md](docs/2026-07-11-plan-isr-pages-publiques.md).
- ✅ **Passe 1 FAITE + déployée (2026-07-11)** : `createPublicClient()` (anon sans cookies, RLS conservée) + bascule des lectures publiques + `generateStaticParams` → **accueil `ƒ→○`** et **139 fiches solutions `ƒ→●`** (les 2 gros postes). Build + `tsc` OK. Cf CHANGELOG 2026-07-11.
- **Passe 2 — plan détaillé (3 recettes, phasé ROI/risque)** : [docs/2026-07-11-plan-isr-passe-2.md](docs/2026-07-11-plan-isr-passe-2.md). Recette de base : bascule vers `createPublicClient` (+ `generateStaticParams() { return [] }` pour les segments dynamiques), **fichier par fichier avec build de vérif `ƒ→○/●`**.
  - ✅ **Phase 1 FAITE (2026-07-11, build vert)** : 10 pages éditoriales fixes `ƒ→○` — `/cgu`, `/rgpd`, `/transparence`, `/qui-sommes-nous`, `/tous-ensemble`, `/difficile-de-changer`, `/irritants-esante`, `/lancement-100k`, `/comparatifs`, `/videos`.
  - ✅ **Phase 1b FAITE (2026-07-11, build vert)** : `/glossaire` + `/stories-tutos` → `○` (email prérempli lu côté client via `useAuth`, `getUserEmail` serveur + `force-dynamic` retirés).
  - ✅ **Phase 2 FAITE (2026-07-11, build vert)** : `/blog/[slug]` → `●` (switch + `generateStaticParams`).
  - ✅ **Page catégorie `/solutions/[cat]` FAITE + EN PROD** (2026-07-11, vérifié dans `main` le 2026-07-25) : `ƒ→●` — filtrage/tri déportés côté client (`filterAndSortSolutions` + `SolutionsCategoryBrowser`/`useSearchParams`, fallback Suspense = vue serveur pour le SEO). C'était le plus gros poste CPU public restant. *(Parité tri/tags = simple QA passive en prod, sans échéance.)*
  - ✅ **`/blog` liste FAITE (2026-07-21, `ƒ→○`)** : `createPublicClient` + filtre catégorie déporté client (`BlogBrowser`/`BlogView` + `useSearchParams`, fallback Suspense = vue « Tous » serveur pour le SEO).
  - ✅ **Sous-page avis `/solutions/[cat]/[sol]/evaluations` SUPPRIMÉE (2026-07-22)** : c'était un **vestige Quasar orphelin** (seul `UserReviewsSidebar`, composant mort, y menait) **et cassé** (lecture anon → RLS → « 0 avis » alors que la base en a, ex. Premiocare 6). Redondant : la fiche solution affiche déjà les avis en ligne (`#avis-utilisateurs`). Route + composants `AvisUtilisateurs`/`UserReviewsSidebar` supprimés (`getAvisUtilisateurs` laissé en dead export).
  - Hors scope : `/recherche` (dynamique par nature) ; `/actualites` (route morte, cf. Nettoyage).
- ✅ **Fix fraîcheur des notes utilisateur sur la fiche (2026-07-25)** : à l'occasion de l'alerte Vercel Fluid CPU (~93 %), diag = l'ISR tient (pas de régression) ; la remontée = **croissance + cap 4h**, pas de correctif miracle. Au passage, bug découvert : les **nouvelles notes utilisateur ne s'affichaient sur la fiche qu'après ~1h** (le chemin évaluation `recalcResultatsPourSolution` revalidait en `'layout'`, pas via `revalidateSolution` comme le fix admin du 22/07). Corrigé → revalidation ciblée de la fiche. **⚠️ Ce n'est PAS un fix CPU** (1er diagnostic erroné corrigé : le `'layout'` ne re-rendait pas les 139 fiches). Fenêtres blog 30m→1h ; crons audités (RAS). Sur `dev` (`11f5357`), à déployer. Cf CHANGELOG 2026-07-25.
- **Vrai levier CPU (reste à faire)** : le cap gratuit (4h) est minuscule et le trafic grandit → surveiller le compteur, envisager **Vercel Pro** (fin de la pause auto), et/ou **alléger `recalcResultatsPourSolution`** (dizaines de requêtes séquentielles par évaluation).

#### Optimiser `recalcResultatsPourSolution` (2026-07-25, à planifier)
- **Constat** : lancé (via `after()`) à **chaque évaluation** = **des dizaines de requêtes BDD séquentielles** (boucle par critère : SELECT résultat existant + UPDATE/INSERT, puis la ligne `type='moyenne'`). Comme l'évaluation est l'action centrale, c'est un poste réel de **CPU Vercel Fluid** qui grandit avec le trafic.
- **Pistes** : (a) **batcher** lectures et écritures (un `SELECT` groupé de tous les `resultats` de la solution + un `upsert` groupé au lieu d'une requête par critère) ; (b) **recompute incrémental** — ne recalculer que le(s) critère(s) réellement touché(s) par la note plutôt que tous.
- ⚠️ **Garde-fous à préserver** : l'**ancrage Firebase figé** (`firebase_moyenne_base5`/`firebase_nb_notes` en Supabase, blend legacy pondéré) et la règle **« 0 = NC »**. C'est la logique délicate — indépendante du fait de « couper le cordon Firebase » (infra), qui reste un chantier séparé et sûr.
- **Gain** : CPU Vercel réduit + facture à l'usage plus basse si passage Pro. Bénéfice même sans Pro.
- **Vercel Pro** : à garder en tête pour la rentrée (dépassement = **pause du site**, pas throttle ; cf. CHANGELOG 2026-07-10). La passe 1 réduit déjà fortement la CPU.

### SEO / Référencement

#### Sitemap — statut GSC « Impossible de récupérer » collant (contournement déployé 2026-07-20)
- **Serveur 100 % sain** (vérifié en Googlebot le 2026-07-20) : `/sitemap.xml` **et** `/sitemap-main.xml` = HTTP 200, `application/xml`, **240 URLs**, ~0,5 s, ISR (helper partagé `getSitemapEntries`, repli try/catch → jamais de 5xx). `robots.txt` déclare les deux.
- **Problème = côté GSC, pas le site** : `/sitemap.xml` bloqué depuis > 2 mois sur « Impossible de récupérer » (« Dernière lecture » VIDE) = état collant hérité d'un échec initial (mi-juin). L'outil « Tester l'URL active » plante aussi chez GSC (« Un problème est survenu »). **Non bloquant** : les pages sont indexées par crawl direct.
- **Contournement déployé (2026-07-20, commit `cc38782`)** : nouvelle URL `/sitemap-main.xml` (même contenu, **entité GSC vierge** sans historique d'échec) + déclarée dans `robots.txt`.
- ✅ **`sitemap-main.xml` soumis dans GSC (2026-07-21)** → surveiller que l'entrée neuve passe « lu ». Optionnel : supprimer l'ancienne entrée `/sitemap.xml` bloquée. Patience (2-4 sem).
- ✅ **`dev.*` déréférencé (vérifié 2026-07-21)** : `site:dev.100000medecins.org` sur Google = « Aucun document ». Blocage durable en place (robots Disallow + noindex). Revérif passive occasionnelle.

### Mises à jour techniques

#### Rapatrier l'email transactionnel en Europe : SendGrid → Brevo (2026-07-25)
- **Moteur** : souveraineté / « revenir en Europe » pour l'hébergement du site. **Pas d'obligation légale HDS** (pas de données de santé de patients ici, seulement de l'identité pro — à confirmer par un DPO), donc **choix de principe**, faisable incrémentalement.
- **État de la pile après la session 2026-07-25** : Supabase déjà en **UE** (`eu-west-1` Irlande, vérifié) ; région Vercel **fixée en `cdg1`** (Paris 🇫🇷) dans `vercel.json` — ⚠️ prend effet **au prochain déploiement** (avant : compute par défaut `iad1`/US → aller-retour transatlantique vers la DB). Compute à Paris, DB en Irlande (`eu-west-1`) : ~20 ms intra-UE, négligeable. **SendGrid (Twilio, US) = dernier maillon US** de la chaîne.
- **Chantier Brevo** (société française, Sarcelles) — effort **faible/moyen (~1-2 j)** :
  - Réécrire le **transport** d'envoi (SDK/API Brevo) là où on utilise `@sendgrid/mail` (`src/lib/email/`, `EMAIL_SENDER`, les routes cron d'envoi).
  - Refaire l'authentification DNS de l'expéditeur côté Brevo : **SPF / DKIM / DMARC**.
  - Re-tester : rendu des **templates** (`email_templates`), le **tracking**, et les **liens de désinscription** (`generateUnsubscribeLink`).
  - Vérifier les quotas Brevo (gratuit 300 mails/j ; les crons campagnes/newsletter peuvent dépasser → plan payant ~9-18 €/mois).
- **Ne PAS faire** (tranché en session 2026-07-25) : quitter Supabase (auto-hébergement = trop risqué en solo ; Postgres nu ailleurs = réécriture de l'Auth/PSC). On s'arrête à « données en UE + email FR ». Supabase = Postgres **+ Auth (GoTrue/PSC) + PostgREST/RLS + Storage** → ce n'est pas « juste une base » remplaçable à la volée.

#### Surveiller l'intermittence `bad_jwt` de Supabase Auth (2026-07-24)
- Appels Auth rejetés **par intermittence** (`unrecognized JWT kid <nil> for algorithm ES256`, ~1 sur 12) — incohérence côté **infra Supabase** (projet en ECC P-256, clés `sb_secret_`, **aucune rotation récente** côté *JWT Signing Keys*). Des **retries** sont en place comme filet (`retryTransientAuth`, cf. CHANGELOG 2026-07-24) → pas d'impact utilisateur visible.
- **⏰ RAPPEL — re-mesurer à partir du ~2026-08-02** (≈1 sem après le fix du 24/07) : **Dashboard Supabase → Logs → Auth**, filtre `unrecognized JWT kid` / `bad_jwt` sur ~1 sem, compter vs volume total (le helper `retryTransientAuth` retente **en silence**, il ne loggue rien). Si l'intermittence persiste → **ticket Supabase support**. *(Option compteur passif : ajouter un `console.warn` dans `retryTransientAuth` → occurrences visibles dans les logs Vercel.)* Ne **pas** revenir aux clés legacy (dépréciées).

#### Réduire le cached egress Supabase sous 5 GB avant le 6 août 2026 (Fair Use Policy) [✅ SOUS CONTRÔLE — vérifié 20/07 : 17 %]
- **Contexte** : mail Supabase (org `100KMED` / `sdljuyadmxlyjtsrvvrq`) — le **cached egress** dépasse le quota Free (**5 GB/mois inclus**, tolérance ~5,5 GB). **Fair Use Policy applicable au 6 août 2026** ; au-delà, restrictions possibles. Ce n'est pas une fuite : **aucun pipeline d'images**. Détail complet + chiffres + arbitrage Pro : [docs/2026-07-08-optimisation-egress-supabase.md](docs/2026-07-08-optimisation-egress-supabase.md).
- **Cause (vérifiée)** : ~170 `<img src>` (84 fichiers) pointent en direct sur le Storage en **pleine résolution, non optimisé** ; seuls 4 fichiers utilisent `next/image` et `next.config.mjs` n'a pas de section `images`. L'endpoint d'upload stockait tel quel jusqu'à 5 Mo, sans compression ni `cacheControl`.
- **Audit BDD (2026-07-08) — ce que le Storage sert** : **132 captures galerie** (`solutions_galerie`, bucket `media`, PNG pleine réso — **1er poste**) + **79 avatars** + 70 logos solutions + 29 logos éditeurs + 7 images catégories (sur la home) + 7 logos partenaires. Buckets : `media`, `images`, `avatars`. (Les 113 logos solutions/éditeurs « externes » sont déjà hors Supabase.)
- ✅ **Fait (2026-07-08/09)** — code commité sur `dev` **+ recompression exécutée** : `media` −81 % (72,7→13,6 Mo), `images` −90 % (24→2,3 Mo), `avatars` déjà légers (rien à gagner). Originaux dans `storage-backups/` (gitignored). ⚠️ `cacheControl` ignoré par l'endpoint public (sert `no-cache`) — impact faible (ETag→304), cf. doc. Code :
  - **`scripts/optimize-storage-images.ts`** — recompresse en WebP l'existant d'un bucket, ré-uploadé **sous le même chemin** (⇒ **aucune URL à changer en base**). Dry-run par défaut, `--execute` requis, backup binaire des originaux + `manifest.json` avant écriture, GIF/SVG ignorés.
  - **`src/app/api/upload/route.ts`** patché — tout nouvel upload raster → resize ≤1600px + WebP q80 + `cacheControl` 1 an. GIF (logo animé email) / SVG conservés intacts. (`sharp` tourne en runtime Node, la route n'est pas `edge`.)
- **Reste à faire** (recompression images + **patch upload : FAITS & déployés** — merge `dev→main` `a8f255a` du 08/07, `sharp`/WebP confirmés dans `main:upload/route.ts`) : **(b) ✅ Vérifié le 2026-07-20** — nouveau cycle (12/07→12/08) à J+8 : **cached egress 0,857/5 Go = 17 %** (vs 131 % avant le fix), egress total 23 %. Projection plein cycle ~3,3 Go → confortablement sous 5 Go. Le fix a marché ; le bandeau « grace period jusqu'au 06/08 » concerne l'**ancien** cycle. *(Le 131 % au 11/07 = un mois d'images non optimisées cumulées AVANT le fix, qui franchit le seuil en fin de cycle ; ce n'est ni un bug de comptage ni notre travail — recompression + `getNbNotes` réduisent l'egress. **Grâce jusqu'au 06/08**, aucune restriction d'ici là. Vérifier aussi le détail journalier : régulier = trafic images / pic 08-09/07 = script de recompression one-shot.)* ; **(c) passer Pro UNIQUEMENT si** encore > 5 Go après un cycle complet post-optimisation (vrai signal de trafic). Le swap avatars→`public/` est **abandonné** (79 en base vs 48 fichiers ; les avatars sont déjà minuscules). Détail/historique des étapes ci-dessous :
  1. **Dry-run** (lecture seule, sans risque) pour les vrais Mo avant/après :
     ```bash
     npx tsx scripts/optimize-storage-images.ts             # bucket media
     npx tsx scripts/optimize-storage-images.ts --bucket images
     ```
     WebP sur des PNG = **−60 à −80 %** ; comme les captures dominent l'egress, ça seul devrait repasser sous 5 GB.
  2. Si gains OK → **`--execute`** sur `media` puis `images`. **Déployer** le patch upload (sinon la compression à l'upload ne prend pas effet).
  3. **Basculer les 48 avatars stock vers `public/`** (fichiers déjà dans `public/images/portraits/avatar-N.png`) — meilleur ratio (vus sur tous les avis). ⚠️ **AVANT** : vérifier qu'une URL locale s'affiche en prod (`https://<domaine>/images/portraits/avatar-1.png` — historiquement `/images/*` renvoyait un 404, raison de la bascule initiale vers Storage) **et** qu'aucun email ne rend d'avatar (chemin relatif = cassé hors site). SQL :
     ```sql
     -- Dry-run : contrôler la correspondance
     select url, '/images/portraits/' || regexp_replace(url, '^.*/', '') as nouvelle_url
     from avatars where user_id is null and url like '%/avatars/portraits/avatar-%';
     -- Bascule (après vérif)
     update avatars set url = '/images/portraits/' || regexp_replace(url, '^.*/', '')
     where user_id is null and url like '%/avatars/portraits/avatar-%';
     ```
  4. *(Optionnel, priorité basse)* logos syndicats du « mot du président » (`pages_statiques.metadata`, page `qui-sommes-nous`) → `/images/syndicats/*.png` (déjà dans `public/`). Le footer/home utilisent déjà les chemins locaux ([src/lib/data.ts](src/lib/data.ts)).
- **Arbitrage plan Pro** : passer Pro **juste pour l'egress = traiter le symptôme** (sans optimisation, ça remonte avec le trafic + surplus 0,09 $/GB sur images non optimisées). Free (5 GB) → Pro (~25 $/mois, **250 GB egress**, backups quotidiens auto, fin de la pause après inactivité, +DB/compute). **Reco : faire l'optimisation d'abord** (gratuit, utile même en Pro — perf/SEO/coûts), **puis** décider Pro sur ses bénéfices propres (surtout backups quotidiens vs notre backup **hebდo manuel** via `/backup`) et la trajectoire de trafic — pas sous la pression du mail. **Ce mail n'est donc PAS en soi « la raison qu'on attendait » pour Pro** ; il l'est seulement si les autres bénéfices Pro nous intéressaient déjà.
- **Optionnel plus tard** : brancher `next/image` (`remotePatterns` Supabase) → Vercel sert du WebP redimensionné depuis son CDN (egress Supabase ÷ nb visiteurs, mais consomme les quotas d'optimisation Vercel) ; vérifier les logs Storage (écarter bot/scraper/hotlinking).
- **Note annexe** : le [CLAUDE.md](CLAUDE.md) dit « Next.js 14 » mais le projet est en **Next 16** — à corriger un jour.

#### Vulnérabilités npm restantes
- **État 2026-05-23 (post-`npm audit fix`)** : 12 vulnérabilités — 11 moderate, 1 high. `ws` + `protobufjs` + 1 transitive ont été résolus le 2026-05-23.
- **État 2026-06-06** : `xlsx` désinstallé (vulnérabilité high éliminée) + `xlsx-js-style` désinstallé en préventif. Audit npm : **12 moderate, 0 high**. Cf CHANGELOG 2026-06-06.
- **12 moderate restantes** : toute la chaîne `uuid` / `@google-cloud/storage` / `@google-cloud/firestore` / `gaxios` / `google-gax` / `teeny-request` / `retry-request` / `firebase-admin`. **Partira automatiquement** quand on désinstallera `firebase-admin` (cf. item Nettoyage « Couper le cordon Firebase », prévu ~2 mois post-prod).
- **✅ 2026-07-26 (coupure Firebase + `npm audit fix` NON-`--force` appliqué)** : chaîne firebase disparue ; fix appliqué → **critique `tar` + highs fixables (axios, ws, form-data, js-yaml, linkify-it, next patches) résolus**, **build vert, AUCUNE dép directe changée** (que des patches transitifs dans `package-lock`). **Reste 6 packages uniques** (le « 22 » du compte npm est par-chemin, gonflé) :
  - `esbuild` (low, dev-only) — correctif non-force théorique mais bloqué par un parent, négligeable.
  - **5 en `--force` UNIQUEMENT = BREAKING → NE PAS FAIRE** : `postcss` (→ downgrade **next@9.3.3** ⚠️ catastrophe), `uuid` (→ downgrade **exceljs@3.4.0**, annule la migration xlsx→exceljs), `sharp` (→0.35.3 ; **seul vrai enjeu prod** : parsing d'images uploadées libvips — upgrade dédié + test `/api/upload` un jour), `@anthropic-ai/sdk` (→0.115), `brace-expansion` (→eslint@10).
  - **Confirmation** : `--force` est bien destructeur (next 16→9). Rien de plus à faire sans chantier de MAJ dédié.
- ~~**1 high — `xlsx`** (Prototype Pollution + ReDoS)~~ **[OK] Fait 2026-06-06** : migration vers `exceljs` (4 scripts migrés via helper `scripts/lib/excel-helper.ts`). 5ᵉ script `export-catalogue-editeurs.ts` désactivé proprement (réutilisera `xlsx-js-style` au moment du besoin, à réinstaller ou à migrer alors).
- ⚠️ **NE JAMAIS utiliser `npm audit fix --force`** — breaking changes silencieux (downgraderait Next 16 → 9).

### Supervision admin — notifications d'activité du site

_(rien en cours)_

### Déploiement final

#### ⚠️ Kill-switch emails routiniers — à activer maintenant que le site est en prod
- Dans **Admin → Emails** (sur https://www.100000medecins.org/admin/emails), activer le toggle "Emails routiniers"
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- **Tant qu'il est OFF** : aucune relance évaluation / PSC / newsletter ne partira

### Nouvelles catégories de solutions (en cours)

#### Affichage des prix — plomberie livrée, remplissage en cours
- **Plomberie livrée 2026-06-04** : helpers `src/lib/prix.ts`, table `app_settings` + toggle `/admin/parametres` (OFF par défaut), bloc Tarification fiche solution, indicateur €/€€/€€€/€€€€ + tri, colonne « Prix » + filtre admin, aperçu éditeur.
- ~~Fix BDD préalable : `prix_ttc=0→NULL` + `prix_devise='€'→'EUR'`~~ [OK] Fait — vérifié le 2026-06-20 (0 prix à 0, 0 devise `€`, 102 solutions en `EUR`).
- **En cours** : remplissage des prix par les éditeurs — **mails envoyés**. 24 solutions ont déjà un vrai prix au 2026-06-20 (scraping abandonné : sources tierces contradictoires/périmées).
- **Reste** : une fois la masse critique atteinte, **activer le toggle** dans `/admin/parametres` + retirer le badge « Bientôt affiché sur le site » (`src/app/mon-compte/mon-espace-editeur/page.tsx`).

---

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Obsolescence des notes (pondération temporelle)
- Les avis anciens devraient peser moins que les récents dans le calcul des notes globales
- Piste 1 — decay côté SQL : score pondéré = note × exp(-λ × ancienneté_en_jours), λ réglable (ex. 0.001 → demi-vie ~700 jours)
- Piste 2 — fenêtre glissante : ne compter que les avis des N derniers mois (ex. 24 mois), afficher l'avertissement « basé sur X avis récents »
- Piste 3 — badge "note ancienne" : si la dernière évaluation date de plus de 18 mois, afficher un indicateur visuel sur la fiche solution
- À décider : seuil de decay, affichage ou non du détail dans l'UI, impact sur le classement de la page comparatif

### ROR sur le site
- Intégrer le ROR (Répertoire Opérationnel des Ressources) sur le site
- À cadrer : périmètre, source de données, modalités d'affichage et de filtrage

### La météo de l'e-santé
- Concept d'indicateur synthétique de l'état du secteur e-santé (logiciels médicaux, adoption, satisfaction)
- À cadrer : indicateurs retenus, mode de calcul, fréquence de mise à jour, format d'affichage

### Favoriser l'entraide entre utilisateurs (« trucs et astuces »)
- Compléter le support éditeur officiel par un canal communautaire où les médecins partagent leurs astuces concrètes sur chaque solution
- Pistes à explorer :
  - Espace « trucs et astuces » par solution (commentaires courts, vote utile/pas utile)
  - Forum léger (Discourse / Discord) intégré au site
- À cadrer : modération, prévention spam, articulation avec les avis existants
