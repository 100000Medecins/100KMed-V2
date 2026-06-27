# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## URGENT

#### ~~⚠️ Résultats Google → 404 : plan de redirection (2026-05-28)~~ [OK] Fait — barré 2026-06-27 (gros du travail livré ; le suivi Search Console / déréférencement `legacy.*` est doublonné dans la section SEO ci-dessous)
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

### Suivi PSC — vérifier la mesure du handoff de session (à partir du 2026-07-03)
- **Contexte** : ~28 % des inscriptions PSC n'établissent jamais de session (`verifyOtp` client jamais abouti) et ~48 % atteignent `/completer-profil` sans saisir d'email. Mesure déployée le 2026-06-26 (table `psc_session_events`, commit `c4eeab6`) pour trancher « échec `verifyOtp` » (réparable par correctif serveur = piste A) vs « abandon avant l'issue ».
- **À faire le 2026-07-03 (~1 semaine)** : vérifier qu'assez d'inscriptions PSC ont été collectées pour être significatif, puis rejouer la requête d'entonnoir (réussis / échec verifyOtp / abandon avant issue) → décider de la piste A.
- **Outils** : requête d'entonnoir sur `psc_session_events` (rejouable via MCP), script `scripts/diag-psc-parcours.ts`, doc [docs/diagnostic-emails-psc.md](docs/diagnostic-emails-psc.md) (à actualiser).

### Sécurité

#### Passer DMARC de `quarantine 50%` à `quarantine 100%` puis `reject`
- ✅ `p=none` → `p=quarantine pct=10` fait le 2026-05-03
- ✅ `pct=10` → `pct=50` fait le 2026-05-15 (rapports clean : 24 mails sur 3 semaines, 100 % DKIM/SPF aligné sur Gandi + SendGrid, 0 source inconnue)
- ✅ `pct=50` → `pct=100` fait le 2026-06-04 (rapports clean du 26 au 30/05 : 7 mails sur 5 jours, 100 % DKIM/SPF aligné, seulement Gandi `gm1` + SendGrid `s1` via `em1895`, aucune source inconnue)
- ✅ **`p=reject` fait le 2026-06-25** — déploiement final terminé. Rapports du ~18-24/06 (Google ×3, Outlook ×2) confirment 100 % du trafic légitime aligné DKIM+SPF (SendGrid `s1`/`em1895` + Gandi `gm1`). Seul échec : 1 mail `callibri.fr` usurpant `header_from`, déjà quarantiné par Outlook (non lié à notre infra). Enregistrement live vérifié : `v=DMARC1; p=reject; sp=reject; np=reject; adkim=r; aspf=r; fo=0; rua=mailto:david.azerad@100000medecins.org`. **Item clos.**

### Communication

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

#### Peupler les prix et coordonnées des éditeurs (2026-06-04)
- **Contexte** : nouveau module tarification livré (cf CHANGELOG 2026-06-04) mais peu de prix renseignés en BDD pour le moment. Le toggle global « Afficher les prix sur le site » est OFF tant qu'une masse critique n'est pas atteinte.
- **Coordonnées éditeurs** : le bloc « Contacts commerciaux » est désormais masqué par défaut (toggle OFF dans `/admin/parametres`) car beaucoup de coordonnées en BDD sont incorrectes ou inappropriées. À nettoyer + compléter pour pouvoir réactiver le toggle.
- **À faire** : demander à Agathe si elle veut s'en charger (collecte auprès des éditeurs des prix officiels + coordonnées commerciales + support à jour). Une fois la base à jour, activer les 2 toggles dans `/admin/parametres`.

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

#### Nettoyage progressif des ~270 erreurs ESLint préexistantes — règle CLAUDE.md active
- **État 2026-05-25** : règle « migration au fil de l'eau » ajoutée dans [CLAUDE.md](CLAUDE.md) → les `as any` typables seront nettoyés automatiquement quand je touche les fichiers concernés pour d'autres raisons.
- **Pas un sujet de fiabilité** : `tsc --noEmit` passe, `next build` passe, le site tourne.
- **Cause principale** : schema drift (`actualites`, `documents` absentes des types Supabase auto-générés) → contournement légitime via `as any`. Le vrai remède = régénérer `src/types/database.ts` (`npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts`), pas du typage manuel.
- **Pas de chantier dédié prévu** sauf si un jour on veut un lint propre en CI.

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

### Performance

_(rien à faire pour l'instant)_

### SEO / Référencement

#### Sitemap propre (demande Ben, 2026-05-28) — fait, en attente validation Google
- ✅ **Sitemap dynamique** (`src/app/sitemap.ts`, `force-dynamic`) : recalculé à chaque requête HTTP. **Pas besoin de le régénérer manuellement** quand on crée/modifie un éditeur, une solution ou un article — le prochain GET sur `/sitemap.xml` reflète l'état BDD.
- ✅ **Bug URLs éditeurs UUID brut** : résolu de facto par le passage en slug (2026-05-30). Le code ne génère plus jamais d'URL `/editeur/<uuid>`.
- ✅ **Sitemap-v2 alternatif soumis dans Search Console** (2026-06-07) : `https://www.100000medecins.org/sitemap-v2.xml` créé pour tenter de casser le cache négatif Google qui maintenait `/sitemap.xml` en erreur depuis le 27/05. Soumis dans Search Console.
- ✅ **Indexation `dev.100000medecins.org` bloquée** (2026-06-07) : robots.txt `Disallow: /` + meta robots noindex + sitemap vide hors prod. Demande de suppression du préfixe `dev.*` soumise dans Search Console (effet ~6 mois, masquage Google immédiat).
- **À surveiller** : Search Console → vérifier que `/sitemap.xml` OU `/sitemap-v2.xml` passe en « Réussite » (≈ 1-2 semaines après soumission v2). Surveiller aussi le déréférencement progressif de `dev.*`.

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
- **État 2026-06-06** : `xlsx` désinstallé (vulnérabilité high éliminée) + `xlsx-js-style` désinstallé en préventif. Audit npm : **12 moderate, 0 high**. Cf CHANGELOG 2026-06-06.
- **12 moderate restantes** : toute la chaîne `uuid` / `@google-cloud/storage` / `@google-cloud/firestore` / `gaxios` / `google-gax` / `teeny-request` / `retry-request` / `firebase-admin`. **Partira automatiquement** quand on désinstallera `firebase-admin` (cf. item Nettoyage « Couper le cordon Firebase », prévu ~2 mois post-prod).
- ~~**1 high — `xlsx`** (Prototype Pollution + ReDoS)~~ **[OK] Fait 2026-06-06** : migration vers `exceljs` (4 scripts migrés via helper `scripts/lib/excel-helper.ts`). 5ᵉ script `export-catalogue-editeurs.ts` désactivé proprement (réutilisera `xlsx-js-style` au moment du besoin, à réinstaller ou à migrer alors).
- ⚠️ **NE JAMAIS utiliser `npm audit fix --force`** — breaking changes silencieux (downgraderait Next 16 → 9).

### Supervision admin — notifications d'activité du site

#### Flux d'activité + alertes admin (idée 2026-06-21)
- **Besoin** : que l'admin voie en quasi temps réel ce qui se passe (inscriptions, évaluations) **et** les modifications de contenu sensibles faites par les éditeurs (prix, texte, image, paramètres), pour modérer/surveiller sans fouiller.
- **Événements à tracer (1er jet)** :
  - Inscriptions (email + PSC), comptes incomplets / décrocheurs PSC
  - Nouvelles évaluations (publiées / en attente PSC / partielles « à compléter »)
  - Modifs éditeur sur leur fiche & solutions : prix, description, logo/image, coordonnées, mot de l'éditeur, toggles (visibilité…)
  - Propositions (idée/correction/vidéo/acronyme) à modérer ; revendications de fiche ; demandes de référencement
  - Changements admin sensibles (toggles globaux, suppressions)
- **Pistes techniques** : table `activity_log` append-only (acteur, type, cible, **diff avant/après**, date) alimentée par les server actions ; page `/admin/activite` (flux filtrable, badges « non lu ») ; **digest email hebdomadaire** (SendGrid + master_layout).
- **Cadrage figé (2026-06-21)** :
  - **Périmètre** : événements *sensibles* uniquement (= crée/modifie/supprime une donnée métier OU attend une action admin). Hors périmètre : lectures, navigation, recherches, brouillons intermédiaires.
  - **Diff** : avant/après **champ par champ**, on ne loggue que les champs modifiés.
  - **Canaux** : in-app (`/admin/activite` + badge non-lus) **+ digest hebdo**. **Pas de mail immédiat** (mail à la suppression déjà en place ; alerte prix non souhaitée).
  - **Rétention** : aucune purge (volume négligeable, ~10 Mo/an ; sert aussi de trace d'audit).
- ✅ **Implémenté (2026-06-21)** : table `activity_log` (GRANTs + RLS), helper `logActivity()` ([src/lib/activity/log.ts](src/lib/activity/log.ts)), 12 événements branchés (inscriptions email/PSC, évals publiée/en attente/à compléter, modifs éditeur fiche+solution avec diff, propositions, revendications, demandes de référencement, suppression & paramètre admin), page [/admin/activite](src/app/admin/activite/page.tsx) (flux filtrable + badge non-lus + « tout marquer comme lu »), digest hebdo [/api/cron/digest-activite](src/app/api/cron/digest-activite/route.ts) (lundi 7h30 → david.azerad@). Doc : [docs/supervision-activite.md](docs/supervision-activite.md).
  - **Reste éventuel** : tester en conditions réelles ; gater le digest si besoin (clé `digest_activite_actif`) — non fait, volontaire.

### Déploiement final

#### ⚠️ Kill-switch emails routiniers — à activer maintenant que le site est en prod
- Dans **Admin → Emails** (sur https://www.100000medecins.org/admin/emails), activer le toggle "Emails routiniers"
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- **Tant qu'il est OFF** : aucune relance évaluation / PSC / newsletter ne partira

### Nouvelles catégories de solutions (en cours)

#### ~~Télétransmission — finitions après seeding initial (2026-05-17)~~ [OK] Fait — vérifié 2026-06-27 (catégorie active, 19 solutions actives, 0 sans logo/SEO, 4 éditeurs complets)
- Seeding fait : 1 catégorie (inactive), 4 éditeurs créés, 23 tags, 20 solutions, 203 liaisons
- **Vérifier dans l'admin** : 1-2 solutions au hasard (description, tags, prix retenus)
- **Uploader les logos** des 20 solutions via l'admin
- **Compléter les 4 nouveaux éditeurs** (Aatlantide, Olaqin, VITALONLINE, Calimed Santé) : website, description, logo
- **Activer** (`actif=true`) la catégorie quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)

#### ~~Téléconsultation — finitions après seeding initial (2026-05-25)~~ [OK] Fait — vérifié 2026-06-27 (catégorie active, 15 solutions actives, 0 sans logo/SEO, 7 éditeurs complets)
- Seeding fait : 7 nouveaux éditeurs, 19 tags (4 séparateurs + 15 toggles), 15 solutions (toutes en `actif=false`), 90 liaisons tags, 7 liens vers solutions existantes. Mapping détaillé dans [docs/teleconsultation-import.md](docs/teleconsultation-import.md).
- ~~**Concevoir le questionnaire d'évaluation pour la catégorie Téléconsultation**~~ [OK] Fait — 18 questions / 3 sections en BDD (`questionnaire_sections` + `questionnaire_questions`, préfixe `tlc_*`). Doc : [docs/teleconsultation-questionnaire.md](docs/teleconsultation-questionnaire.md).
- **Vérifier dans l'admin** : 1-2 solutions au hasard (description, tags, prix retenus)
- **Uploader les logos** des 15 solutions via l'admin
- **Compléter les 7 nouveaux éditeurs** (Qare, Livi, MEDADOM, Tessan, MédecinDirect, Globule, Solutions régionales) : website (URLs devinées à valider), description, logo
- **Renseigner le SEO** (`meta.title`, `meta.description`) pour les 15 fiches
- **Activer** (`actif=true`) la catégorie quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)

#### ~~Téléexpertise — finitions après seeding initial (2026-06-04)~~ [OK] Fait — vérifié 2026-06-27 (catégorie active, 10 solutions actives, 0 sans logo/SEO, 5 éditeurs complets dont Avisdoc instruit)
- Seeding fait : 1 catégorie (inactive), 5 nouveaux éditeurs (Omnidoc, Rofim, Conex Santé, GCS Sara, Avisdoc), 22 tags (4 séparateurs + 18 toggles), 10 solutions (toutes en `actif=false`), 79 liaisons tags (24 tags principaux). Mapping détaillé dans [docs/teleexpertise-import.md](docs/teleexpertise-import.md). Une solution sans éditeur : « Plateformes régionales (marchés GRADeS) » → `id_editeur=NULL` (volontaire, concept regroupant les marchés régionaux, pas de page éditeur publique).
- ~~**Concevoir le questionnaire d'évaluation pour la catégorie Téléexpertise**~~ [OK] Fait 2026-06-21 — 17 questions / 3 sections en BDD (préfixe `tle_*`). Les 3 catégories (Télétransmission, Téléconsultation, Téléexpertise) ont désormais leur questionnaire. Doc : [docs/teleexpertise-questionnaire.md](docs/teleexpertise-questionnaire.md).
- **Vérifier dans l'admin** : 1-2 solutions au hasard (description, tags, points forts/faibles)
- **Uploader les logos** des 10 solutions via l'admin
- **Compléter les 5 nouveaux éditeurs** (Omnidoc, Rofim, Conex Santé, GCS Sara, Avisdoc) : description, logo. URLs devinées par convention à valider/corriger. Avisdoc → site NULL pour l'instant.
- **Instruire Avisdoc** : entretien éditeur pour compléter la fiche (tarifs, conformité, fonctionnalités précises). Fiche actuelle indique « en cours d'instruction » dans le descriptif.
- **Renseigner le SEO** (`meta.title`, `meta.description`) pour les 10 fiches
- **Activer** (`actif=true`) la catégorie + les solutions quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)

#### Tester le parcours de notation (questionnaire) des 3 nouvelles catégories (2026-06-21)
- **Quand** : une fois le questionnaire Téléexpertise créé (les 3 questionnaires prêts).
- **Quoi** : dérouler le parcours complet de notation pour Télétransmission, Téléconsultation et Téléexpertise — étape 1 (5 critères majeurs) + étape 2 (questions détaillées BDD), vérifier que les sous-questions s'affichent, sont skippables, et que la note se calcule.
- **Où** : URL directe `/solution/noter/[catégorie]/[solution]` (le parcours ne vérifie pas `actif`, donc testable catégories inactives). Exemples :
  - `/solution/noter/teletransmission/acteurfr-teletransmission`
  - `/solution/noter/teleconsultation/clickdoc-teleconsultation`
  - `/solution/noter/teleexpertise/<slug-solution>` (après création du questionnaire)
- **Note** : rien n'est visible en navigation normale tant que les catégories sont `actif=false` — ce test passe par l'URL directe.

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
