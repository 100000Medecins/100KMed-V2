# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## URGENT

#### ⚠️ Résultats Google → 404 : plan de redirection (2026-05-28)
- **Symptôme** : les URLs de l'ancien site encore indexées dans Google renvoient vers une 404 sur le nouveau site.
- **Diagnostic complet** dans [docs/redirections-404-seo.md](docs/redirections-404-seo.md). Constat clé : la plupart des URLs SEO (solutions, catégories, éditeurs) gardent le même schéma → les 404 viennent surtout de solutions/catégories passées `actif=false`, de slugs changés (Firebase→Supabase), et du sitemap qui exposait les pages inactives.
- ✅ **Fait le 2026-05-28/29** :
  - Sitemap corrigé (filtre `actif` + catégorie active + fix typo `BASE_URL`, refonte complète : éditeurs actifs dédoublonnés, articles de blog, `force-dynamic`).
  - 10 redirections 301 dans `next.config.mjs` (camelCase→kebab : `difficileDeChanger`, `tousEnsemble`, `lancement100k`, `monCompte/*`, `connexion/creationCompte/*` + `presentation100k`→`qui-sommes-nous`).
  - **Comparaison `slug-vs-slug`** → interception dans la page solution + résolution slugs→UUIDs (`getSolutionIdsBySlugs`) → redirect 301 vers `/solutions/comparer?ids=`.
  - **`archive.100000medecins.org` réparé** : page blanche due à un mismatch de build (`index.html` demandait des hash js absents). Réupload cohérent de `dist/spa/`. Rôle = transfert SEO uniquement (noindex + canonical).
  - **`legacy.100000medecins.org`** mis en noindex (`.htaccess` avec `X-Robots-Tag: noindex, follow`, vérifié live) pour le déréférencer de Google.
- ✅ Sitemap fantôme `sitemap_v2.xml` supprimé de Search Console (2026-05-29).
- **Reste à faire (suivi)** :
  - Vérifier sous ~1 semaine que `sitemap.xml` passe en « Réussite » (recrawl Google en cours ; l'erreur « impossible de récupérer » du 27/05 était antérieure aux corrections).
  - Surveiller le déréférencement progressif de `legacy.` dans les résultats Google.

---

## En attente / Idées

### Sécurité

#### Passer DMARC de `quarantine 50%` à `quarantine 100%` puis `reject`
- ✅ `p=none` → `p=quarantine pct=10` fait le 2026-05-03
- ✅ `pct=10` → `pct=50` fait le 2026-05-15 (rapports clean : 24 mails sur 3 semaines, 100 % DKIM/SPF aligné sur Gandi + SendGrid, 0 source inconnue)
- **Prochaine étape (~2026-05-29 à 2026-06-05)** : passer à `pct=100` après 2 semaines de stabilité à 50 % et idéalement un envoi groupé légitime entre-temps
- Étape finale (après 2-3 semaines à `pct=100` clean) : passer à `p=reject`
- Modifier l'enregistrement DNS `_dmarc.100000medecins.org` chez le registrar

### Communication

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

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

#### Supprimer les fallbacks silencieux des pages BDD (try/catch vide) — partiellement fait

- **Contexte (2026-05-29)** : les pages servies via `(static)/` (cgu, rgpd, transparence, contact, actualites, etc.) utilisaient un pattern `try { dbPage = await getPageBySlug(slug) } catch {}` qui **avalait silencieusement** toute erreur d'accès BDD (notamment l'absence de GRANT pour `anon` qui a pourri la situation pendant 2 mois). Conséquence : l'admin éditait, la BDD enregistrait, mais le front affichait toujours le fallback hardcodé de 2023.
- **Bug GRANT réparé** le 2026-05-29 (`GRANT SELECT TO anon` posé), mais le pattern lui-même reste dangereux.
- ✅ **Fait 2026-05-31** sur `cgu/page.tsx`, `rgpd/page.tsx`, `transparence/page.tsx` : suppression des fallbacks hardcodés (~768 lignes mortes retirées), seule la BDD est lue. Ajout d'un `error.tsx` dans `(static)/` qui couvre toutes les pages du groupe (« Contenu temporairement indisponible » + bouton Réessayer + ref d'erreur).
- **Reste à faire** : auditer les autres pages BDD (`contact`, `actualites`, `videos`, `cgu` racine si présente, etc.) — chercher tous les `try { } catch {}` vides et les remplacer (idéalement laisser propager pour que `error.tsx` se déclenche, ou logger explicitement).

#### Versioning/audit des contenus admin (pages_statiques, articles, etc.)

- **Contexte (2026-05-29)** : un écrasement involontaire de `pages_statiques.contenu` (slug=transparence) a fait perdre ~1600 caractères (toute la section "Déclarations publiques d'intérêt des représentants"). Seule la version backup quotidien Synology a permis de constater l'écart. Aucune trace en base de l'historique des modifications (juste le dernier `updated_at`).
- **Idée 1 — table d'audit `pages_statiques_history`** : trigger PG qui INSERT l'ancienne version avant chaque UPDATE. Idem pour `articles`, `editeurs_edit_log` (qui existe déjà).
- **Idée 2 — diff visuel dans l'admin** : avant de sauvegarder, montrer ce qui change vs version actuelle (vert/rouge).
- **Idée 3 — autosave + brouillons** : éviter qu'une perte de focus efface le travail en cours.
- À cadrer selon priorité.

#### Nettoyage progressif des ~270 erreurs ESLint préexistantes — règle CLAUDE.md active
- **État 2026-05-25** : règle « migration au fil de l'eau » ajoutée dans [CLAUDE.md](CLAUDE.md) → les `as any` typables seront nettoyés automatiquement quand je touche les fichiers concernés pour d'autres raisons.
- **Pas un sujet de fiabilité** : `tsc --noEmit` passe, `next build` passe, le site tourne.
- **Cause principale** : schema drift (`actualites`, `documents` absentes des types Supabase auto-générés) → contournement légitime via `as any`. Le vrai remède = régénérer `src/types/database.ts` (`npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts`), pas du typage manuel.
- **Pas de chantier dédié prévu** sauf si un jour on veut un lint propre en CI.

#### ✅ Audit Firebase ↔ Supabase — TERMINÉ (2026-05-29)

- **Contexte** : audit complet réalisé le 2026-05-28 ([docs/audit-evaluations-firebase-vs-supabase.md](docs/audit-evaluations-firebase-vs-supabase.md)). Fix #1 (378 évals), Fix #1bis (37 évals), Fix #2 (10 commentaires) appliqués.
- ✅ **Fix #3 — FAIT** (vérifié 2026-05-29 : 0 éval en ancien format restante). Script `scripts/fix-anciennes-evals-format.ts`. Mapping idTech→detail_* figé (cf [docs/mapping-criteres-firebase-vers-supabase.md](docs/mapping-criteres-firebase-vers-supabase.md)).
- ✅ **Fix #4 — SANS OBJET** (vérifié 2026-05-29 via le mapping Excel + dry-run du script). Sur les 718 évals Firebase : 656 déjà présentes, 15 sur des solutions non reprises au catalogue (Medaplix, OSOFT…), et **44 « absentes » qui sont en réalité des coquilles vides** (49 scores tous à 0, aucune note/date/commentaire = formulaire ouvert jamais rempli). Le garde-fou `isEmpty` du script `scripts/fix-import-evals-manquantes.ts` les skip à juste titre → **aucune vraie évaluation perdue, rien à importer**.
- **560 users Firebase non migrés = profils dormants** (`isComplete=false`, pas d'email, jamais finalisés, dont 0 avec une vraie éval). **Décision : ne PAS les importer** — s'ils reviennent un jour, leur RPPS sera récupéré à l'inscription, ce qui évite des fusions de comptes.
- Mapping de correspondance Firebase↔Supabase généré via `scripts/export-mapping-firebase-supabase.ts` (Excel local, non commité car données perso).

#### *(~2 mois après la mise en prod du site)* Couper définitivement le cordon Firebase — tout d'un coup
- `DROP TABLE evaluations_firebase_backup` (Supabase)
- Désinstaller `firebase-admin` du `package.json`
- Supprimer les scripts `scripts/*firebase*.ts` qui ne servent plus
- Vérifier qu'aucun import résiduel de `firebase-admin` ne traîne dans `src/`
- Exporter une dernière fois les collections clés (`users`, `evaluations`, `criteres`, `categories`) en JSON local au cas où (archive longue durée)
- **Résilier le projet Firebase** côté console Google
- Révoquer le service-account `medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json`

### UX / UI

#### Tooltip note globale — affiner après la livraison initiale (2026-05-30)

- **Livré (2026-05-30)** : tooltip cliquable à côté de la note globale sur chaque fiche solution (popover au survol + modale au clic), éditable depuis `/admin/pages` → « Tooltip — Note globale des solutions ».
- ~~**À améliorer — modale détaillée** : le rendu actuel utilise `prose-custom` + sanitize HTML par défaut. Travailler la lisibilité (hiérarchie typographique, aération des paragraphes, encadrés visuels pour les exemples chiffrés type « 4,2 sur 50 avis »).~~ [OK] Fait 2026-05-30 (styles Tailwind ciblés `[&_strong]`, `[&_a]`, `[&_ul]` + taille `lg` + `text-[15px] leading-relaxed`).
- ~~**Remplacer le `mailto:contact@…` par un lien vers `/contact`** dans le corps de la modale (le formulaire de contact existe déjà, c'est mieux que d'ouvrir le client mail du visiteur).~~ [OK] Fait 2026-05-30 (+ fix au passage de `sanitizeHtml` qui supprimait silencieusement les liens internes).
- ~~**À tester sur mobile** : le popover en position `absolute` peut déborder à droite de l'écran sur petit viewport.~~ [OK] Testé OK 2026-05-31 (pas de débordement constaté).

#### ~~URLs éditeurs en slug lisible (au lieu de l'UUID)~~ [OK] Fait 2026-05-30
- ~~**Constat (2026-05-28)** : les 55 éditeurs ont tous un `id` UUID → les URLs `/editeur/<uuid>` ne sont ni lisibles ni SEO-friendly.~~
- ~~**Chantier** : route `/editeur/[slug]` + redirections.~~
- **Pas de redirection 301 UUID→slug nécessaire** : le format `/editeur/<uuid>` n'a quasiment jamais existé en prod (fenêtre courte entre la mise en ligne et la bascule en slug le 2026-05-30, peu de chances que des liens externes pointent dessus). Si Search Console signale des 404 dessus à l'avenir, on les ajoutera ponctuellement.

#### ✅ Référencement éditeurs — livré (2026-05-30)
- Nouvelle page publique `/editeurs/` (liste de tous les éditeurs) + composant `EditeursListClient`.
- Formulaire public `EditeurReferencementForm` pour qu'un éditeur non référencé puisse demander son ajout au catalogue.
- Côté admin : panneau `AdminEditeurDemandesRef` pour modérer les demandes + action server dans `src/lib/actions/admin.ts`.
- Lien dans la Navbar vers `/editeurs`.

#### Éditeurs orphelins (0 solution) — à nettoyer
- 4 éditeurs sans aucune solution rattachée au 2026-05-28 : `MediStory`, `Aatlantide`, `MEDEXT Group`, `Semble`. Vérifier si ce sont des vestiges de seeding à supprimer ou des éditeurs en attente de fiche.

#### ~~Logo condensé sur l'index — nouvel essai~~ [OK] Validé 2026-05-31
- ~~Retenter une version condensée du logo sur la page d'accueil du site.~~ Le logo 3 lignes débordant dans la navbar (livré 2026-05-31) couvre le besoin.

#### ~~Mettre le logo 3 lignes dans les templates emails~~ [OK] Fait 2026-06-01
- ~~**Contexte (2026-05-31)** : la navbar utilise désormais le logo 3 lignes. Aligner les templates emails sur ce visuel.~~
- ✅ **Fait 2026-06-01** : refonte complète du `master_layout` (logo 3 lignes débordant en haut à gauche + label à droite + footer simple avec logo 110px). 13 templates sur 14 migrés vers `<tr><td>` + master_layout. Nouvelle colonne BDD `email_templates.label` injectée via `{{label}}`. Bac à sable « 🧪 Master layout de test » ajouté dans `/admin/emails` pour itérer sur les layouts sans risque. Cf CHANGELOG 2026-06-01.

#### Migrer `lancement_syndicat` vers le master_layout (cas particulier en-tête)
- **Contexte (2026-06-01)** : lors de la refonte design system emails, 9 templates ont été migrés en `<tr><td>` + master_layout. `lancement_syndicat` est resté en full-HTML car son en-tête contient un montage tripartite (logo 100K + ❤ + logo syndicat dynamique via `{{logo_syndicat}}`).
- **Pistes** : créer un `master_layout_syndicat` dédié OU étendre le master_layout actuel pour accepter un slot d'en-tête optionnel (`{{header_logo_extra}}` injecté à droite du logo principal).
- **Pas urgent** : le template fonctionne. À traiter quand on enverra à nouveau ce type de mail.

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

### Performance

_(rien à faire pour l'instant)_

### SEO / Référencement

#### Sitemap propre (demande Ben, 2026-05-28) — fait, en attente validation Google
- ✅ **Sitemap dynamique** (`src/app/sitemap.ts`, `force-dynamic`) : recalculé à chaque requête HTTP. **Pas besoin de le régénérer manuellement** quand on crée/modifie un éditeur, une solution ou un article — le prochain GET sur `/sitemap.xml` reflète l'état BDD.
- ✅ **Bug URLs éditeurs UUID brut** : résolu de facto par le passage en slug (2026-05-30). Le code ne génère plus jamais d'URL `/editeur/<uuid>`.
- **À surveiller** : Search Console → propriété `100000medecins.org` → menu **Sitemaps** → vérifier que `https://www.100000medecins.org/sitemap.xml` passe en « Réussite ». Recrawl Google en cours.

### Mises à jour techniques

#### Audit grants Supabase avant le 30 octobre 2026
- **Contexte** : à partir du 30/10/2026, Supabase n'exposera plus automatiquement les nouvelles tables `public` à la Data API (PostgREST/`supabase-js`). Les tables existantes ne sont pas touchées — elles conservent leurs grants implicites.
- **Réflexe déjà actif** dans [CLAUDE.md](CLAUDE.md) : tout nouveau `CREATE TABLE` doit inclure les `GRANT` explicites par rôle.
- **À faire ~1 mois avant la deadline (≈ fin septembre 2026)** :
  - Utiliser le Security Advisor du dashboard Supabase pour lister les tables actuellement exposées
  - Vérifier qu'aucune table sensible n'est ouverte au rôle `anon` sans raison
  - Vérifier qu'aucune table dont on a besoin n'est en `permission denied` (cf. cas `solution_liens` fixé le 2026-05-27)
- **Pas urgent** : informatif tant que la deadline est lointaine.

#### Vulnérabilités npm restantes
- **État 2026-05-23 (post-`npm audit fix`)** : 12 vulnérabilités — 11 moderate, 1 high. `ws` + `protobufjs` + 1 transitive ont été résolus le 2026-05-23.
- **11 moderate** : toute la chaîne `uuid` / `@google-cloud/storage` / `@google-cloud/firestore` / `gaxios` / `google-gax` / `teeny-request` / `retry-request` / `firebase-admin`. **Partira automatiquement** quand on désinstallera `firebase-admin` (cf. item Nettoyage « Couper le cordon Firebase », prévu ~2 mois post-prod).
- **1 high — `xlsx`** (Prototype Pollution + ReDoS) : no fix sur npm. **Utilisé uniquement dans 3 scripts de seed admin** (`import-agendas.ts`, `import-ia-documentaires.ts`, `import-ia-scribes.ts`), pas dans le code du site. **Plan** : remplacer par `exceljs` après l'import des 2 catégories encore en attente (Téléconsultation, Téléexpertise). API très proche, ~10 lignes à adapter par script.
- ⚠️ **NE JAMAIS utiliser `npm audit fix --force`** — breaking changes silencieux (downgraderait Next 16 → 9).

### Déploiement final

#### ⚠️ Kill-switch emails routiniers — à activer maintenant que le site est en prod
- Dans **Admin → Emails** (sur https://www.100000medecins.org/admin/emails), activer le toggle "Emails routiniers"
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- **Tant qu'il est OFF** : aucune relance évaluation / PSC / newsletter ne partira

---

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Nouvelles catégories de solutions
- Créer les catégories : Télétransmission, Téléconsultation, Téléexpertise

#### Télétransmission — finitions après seeding initial (2026-05-17)
- Seeding fait : 1 catégorie (inactive), 4 éditeurs créés, 23 tags, 20 solutions, 203 liaisons
- **Vérifier dans l'admin** : 1-2 solutions au hasard (description, tags, prix retenus)
- **Uploader les logos** des 20 solutions via l'admin
- **Compléter les 4 nouveaux éditeurs** (Aatlantide, Olaqin, VITALONLINE, Calimed Santé) : website, description, logo
- **Activer** (`actif=true`) la catégorie quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)

#### Téléconsultation — finitions après seeding initial (2026-05-25)
- Seeding fait : 7 nouveaux éditeurs, 19 tags (4 séparateurs + 15 toggles), 15 solutions (toutes en `actif=false`), 90 liaisons tags, 7 liens vers solutions existantes. Mapping détaillé dans [docs/teleconsultation-import.md](docs/teleconsultation-import.md).
- **Concevoir le questionnaire d'évaluation pour la catégorie Téléconsultation** (équivalent du chantier livré pour Télétransmission le 2026-05-17 — brouillon à démarrer dans `docs/teleconsultation-questionnaire.md`)
- **Vérifier dans l'admin** : 1-2 solutions au hasard (description, tags, prix retenus)
- **Uploader les logos** des 15 solutions via l'admin
- **Compléter les 7 nouveaux éditeurs** (Qare, Livi, MEDADOM, Tessan, MédecinDirect, Globule, Solutions régionales) : website (URLs devinées à valider), description, logo
- **Renseigner le SEO** (`meta.title`, `meta.description`) pour les 15 fiches
- **Activer** (`actif=true`) la catégorie quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)

### Obsolescence des notes (pondération temporelle)
- Les avis anciens devraient peser moins que les récents dans le calcul des notes globales
- Piste 1 — decay côté SQL : score pondéré = note × exp(-λ × ancienneté_en_jours), λ réglable (ex. 0.001 → demi-vie ~700 jours)
- Piste 2 — fenêtre glissante : ne compter que les avis des N derniers mois (ex. 24 mois), afficher l'avertissement « basé sur X avis récents »
- Piste 3 — badge "note ancienne" : si la dernière évaluation date de plus de 18 mois, afficher un indicateur visuel sur la fiche solution
- À décider : seuil de decay, affichage ou non du détail dans l'UI, impact sur le classement de la page comparatif

### Refaire le système d'affichage des prix
- **État actuel (2026-05-15)** : édition côté éditeur en place dans `/mon-compte/mon-espace-editeur`
  - Soit **prix unique** : `prix_ttc`
  - Soit **plage de prix** : `prix_ttc_min` + `prix_ttc_max`
  - Plus `prix_devise`, `prix_frequence`, `prix_duree_engagement_mois`
  - Badge « Bientôt affiché sur le site » dans le formulaire éditeur
- **Restant à décider / faire** :
  - **Logique de classement** : quelle valeur retenir pour trier une solution en plage de prix ? (min, max, moyenne, médiane ?) → trancher
  - **Indicateur visuel** : 1 à 4 euros jaunes calculés vs. médiane de la catégorie (ou autre)
  - **Bouton classement par prix** dans la page comparatif (`/solutions/[idCategorie]`)
  - **Toggle admin** « Afficher le prix sur le front » (OFF par défaut) pour switcher quand prêt
  - Affichage côté front (page solution + listing comparatif) une fois la logique tranchée

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
