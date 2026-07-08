# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## URGENT

_(rien d'urgent pour l'instant)_

---

## En attente / Idées

#### Suivi PSC — bascule verifyOtp serveur (récupérer les ~16 % d'abandons silencieux) [MERGÉ PROD 2026-07-05 — reste validation stat + cleanup]
- **✅ Statut (vérifié 2026-07-08)** : bascule **mergée sur `main` le 2026-07-05** (commit `b8ad50a`, feature `b92be61`), donc **en prod**. Smoke check 48 h passé. **Restent 2 bouts pour clôturer** : (1) **validation statistique ~1 semaine** (~120-200 handoffs, attendu ~12/07) — rejouer l'entonnoir sur `psc_session_events`, `abandon_silencieux` doit chuter de 16,2 % → ~1 % ; (2) **commit de nettoyage** : supprimer `src/app/auth/psc-session/page.tsx` + `src/app/api/psc-session-event/route.ts` (filet encore présent) — ⚠️ vérifier d'abord que `merge.ts` n'en dépend plus (fusion non migrée, cf. checklist).
- **Point de perte** : le roundtrip **`verifyOtp` côté client** (`/auth/psc-session`) après le retour de l'app PSC. ~16 % des handoffs démarrent (`handoff_start`) sans jamais émettre d'événement terminal → le navigateur perd le contexte avant l'aboutissement.
- **Solution implémentée (branche `dev`, non mergée)** : `verifyOtp` déplacé **côté serveur** dans [psc-callback/route.ts](src/app/api/auth/psc-callback/route.ts) (client SSR + cookies, modèle `/auth/confirm`), redirection directe vers `next`, plus de passage par `/auth/psc-session`. Appliqué aux flux standard + association. `tsc` OK. `/auth/psc-session` + `/api/psc-session-event` gardés en filet (à supprimer après validation).
- **État (2026-07-04)** : mesuré en dev — entonnoir **strictement post-déploiement** (après 03/07 15h) = **7/7 handoffs → session établie côté serveur, 0 perdu (100 %)**, contre ~83 % avant. Les pertes se sont arrêtées net au déploiement (dernier « perdu » le 03/07 13:08). ⚠️ Échantillon **petit** (surtout mes tests) + **mobile pas encore validé**.
- **Tests à faire AVANT le merge en main** :
  - **Persistance de session** (le vrai risque du changement) : après chaque login PSC, **F5 sur `/mon-compte/profil`** → toujours connecté ; enchaîner `/mon-compte/*` → `/solution/noter/*` sans déconnexion ni boucle.
  - **Les 6 flux PSC** : (1) nouveau compte → completer-profil → /mon-compte/profil ; (2) reconnexion d'un compte complet → **direct** /mon-compte/profil ; (3) **association** (connecté email/mdp + bouton « Connecter PSC » → `?psc=associe`, toujours connecté, RPPS rattaché) ; (4) **validation avis anonyme** (anonyme → mail → PSC → avis publié **et** connecté) ; (5) évals `en_attente_psc` d'un compte existant → publiées ; (6) **interne/CPF sans spécialité** → completer-profil éditable.
  - **⚠️ Fusion** (compte email/mdp + compte PSC même RPPS) : `merge.ts` utilise **encore l'ancien `/auth/psc-session`** (non migré) → tester que la fusion aboutit **et** qu'on est connecté. À harmoniser plus tard (même risque mobile ~16 %).
  - **⭐ MOBILE (prioritaire)** : dérouler un login PSC **depuis un smartphone (app e-CPS)** sur `dev.100000medecins.org` — c'est LE scénario cible du fix (les ~16 % perdus étaient au retour de l'app mobile). Test qui vaut de l'or.
  - **Mesure dev** : relancer l'entonnoir par `correlation_id` sur `psc_session_events` (cf [docs/diagnostic-emails-psc.md](docs/diagnostic-emails-psc.md)) une fois plus de volume → `perdus_sans_issue` doit rester ~0.
- **Vérifs post-merge PROD (le compteur démarre au merge, pas avant)** :
  - **~48 h après merge — smoke check** : pas de régression → `verify_success` ≥ ~80 %, `verify_error` proche de 0. Si ça dérape → revert (re-router vers la page client).
  - **~1 semaine après merge (~120-200 handoffs) — vérif statistique** : rejouer l'entonnoir sur `psc_session_events`, comparer `abandon_silencieux` à la baseline **16,2 %** → attendu : chute vers ~1 %.
- **Si validé** : supprimer `/auth/psc-session` + `/api/psc-session-event` (commit de nettoyage) et fermer l'item.
- **Enjeu** : ~3 inscriptions/jour perdues à ce rythme.

### Contenu des questionnaires

#### ~~Question « user-friendly pour les médecins juniors avec e-CPF » (2026-07-03)~~ [OK] Fait 2026-07-08
- **Livré** : question e-CPF ajoutée via [scripts/add-question-ecpf-junior.ts](scripts/add-question-ecpf-junior.ts) dans `questionnaire_questions` **et** `criteres` — clés `tt_ecpf_remplacant` (télétransmission, critère `fonctionnalites`) et `detail_ecpf_junior` (logiciel-medical, critère `interface`). Cf CHANGELOG 2026-07-07.

### Sécurité

_(rien en cours)_

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

#### ~~Auditer le scoring des sous-critères sur toutes les catégories (2026-07-07)~~ [OK] Fait 2026-07-08
- **Résultat de l'audit** : requête `questionnaire_questions.key` LEFT JOIN `criteres.identifiant_tech` → **0 orphelin** (toutes catégories confondues). Les données sont **100 % synchro** : chaque question du formulaire a bien son jumeau `criteres` (moyenne de sous-critère + « Comparatif détaillé par sous-critères »).
- **Cause racine identifiée (2026-07-07)** : deux tables parallèles — `questionnaire_questions` (formulaire, admin) et `criteres` (scoring). L'admin (`createQuestion`, [src/lib/actions/questionnaires.ts](src/lib/actions/questionnaires.ts)) n'écrit QUE dans `questionnaire_questions` → risque de désynchro à chaque question créée en admin. **Correctif = l'item de synchro ci-dessous** (aujourd'hui 0 orphelin car complétés à la main, mais fragile).

#### ~~Synchroniser `questionnaire_questions` ↔ `criteres` — supprimer la désynchro à la source (2026-07-08)~~ [OK] Fait 2026-07-08
- **Livré** : miroir `criteres` dans `createQuestion`/`updateQuestion`/`deleteQuestion`/`deleteSection` (helper `resolveCritereTwin`) + colonne+input `nom_court` (Option A) + fix data `tt_ecpf_remplacant`. `tsc` OK + test d'intégration BDD **19/19** (0 orphelin). Cf CHANGELOG 2026-07-08 + [docs/plan-synchro-questionnaire-criteres.md](docs/plan-synchro-questionnaire-criteres.md). **Reste (optionnel)** : smoke test UI dans `/admin/questionnaires`.
- **But** : que créer/modifier/supprimer une question en admin maintienne automatiquement le sous-critère `criteres` jumeau (aujourd'hui l'admin n'écrit que `questionnaire_questions`). Correctif de la cause racine de l'item d'audit ci-dessus.
- **Faisabilité vérifiée (2026-07-08)** : effort ~½ journée, risque faible. Le resolver du parent est trivial car les **5 critères majeurs sont uniques** dans `criteres` (`type='note'`, UUID stables) et **tous** les sous-critères (toutes catégories) pointent vers ces 5 mêmes parents. On n'ajoute que des lignes (comme les seeds), sans toucher au scoring/affichage public. Données déjà 100 % synchro (0 orphelin) → pas de backfill.
- **Approche retenue : A — miroir dans les server actions** ([src/lib/actions/questionnaires.ts](src/lib/actions/questionnaires.ts)) :
  1. Resolver `resolveCritere(categorieSlug, critereMajeur) → { id_categorie (via slug), parent_id (majeur canonique unique) }`.
  2. **Décision à prendre — source du `nom_court`** (le form ne l'a pas) : colonne `nom_court` sur `questionnaire_questions` + input « Libellé court » dans `QuestionnaireEditor` (propre, 1 DDL + régé types) OU dérivé du texte (zéro DDL, moche).
  3. `createQuestion` → INSERT jumeau `criteres` (`type='detail'`, `is_enfant=true`) ; `updateQuestion` → UPDATE (clé→`identifiant_tech`, majeur→`parent_id`, `nom_court`) ; `deleteQuestion` → DELETE jumeau ; `reorderQuestions` → rien (`criteres` n'a pas d'`ordre`).
  4. Vérifier la FK de `deleteSection` : si cascade sur les questions, supprimer d'abord les jumeaux `criteres` des clés de la section.
  5. Atomicité : pragmatique d'abord (écritures séquentielles + audit orphelins en filet) ; durcissement possible via fonction Postgres (RPC) atomique.
  6. Garde-fou : requête d'orphelins (`questionnaire_questions.key` vs `criteres.identifiant_tech`) en mini-script / check santé admin.
- **Alternatives écartées pour l'instant** : C — trigger Postgres (couvre aussi scripts + SQL manuel, mais PL/pgSQL + `nom_court` à sourcer + plus opaque) ; B — unifier en 1 table (théoriquement « le bien » mais migration de plusieurs jours touchant le scoring/affichage public → risque élevé, non).

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

#### Cartes de solutions — compteur d'avis + clic vers les avis (2026-07-08)
- **(a) Nombre d'évaluations sur toutes les cartes** : afficher « X avis » sur chaque carte de solution — pas seulement l'index, mais **toutes** les pages qui affichent des cartes (comparatif catégorie, fiche éditeur, recherche, comparateur…). À faire : recenser les composants de carte (`SolutionList` + variantes), vérifier que le compteur (`nbNotesUtilisateurs`) est fourni partout par la couche `db`, ajouter l'affichage de façon cohérente.
- **(b) Clic sur les avis → bas de la fiche solution (ancre)** : cliquer sur « X avis » / la note utilisateurs doit amener directement à la section des avis en bas de la fiche.
  - **Déjà en place** : l'ancre existe — `<div id="avis-utilisateurs" className="scroll-mt-[140px]">` dans [SolutionDetailPage.tsx](src/components/solutions/SolutionDetailPage.tsx#L117) (la navbar interne de `SolutionHero` y pointe déjà). Rien à créer côté fiche.
  - **Reste** : rendre le « X avis » cliquable **sur les cartes** → lien `/solutions/[categorieSlug]/[solutionSlug]#avis-utilisateurs` (le navigateur scrolle à l'ancre à l'arrivée ; `scroll-mt` gère la navbar fixe). Le compteur du (a) et la cible du clic = même élément → traiter (a) et (b) ensemble.

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

_(rien à faire pour l'instant)_

### SEO / Référencement

#### Sitemap propre (demande Ben, 2026-05-28) — fait, en attente validation Google
- ✅ **Sitemap dynamique** (`src/app/sitemap.ts`, `force-dynamic`) : recalculé à chaque requête HTTP. **Pas besoin de le régénérer manuellement** quand on crée/modifie un éditeur, une solution ou un article — le prochain GET sur `/sitemap.xml` reflète l'état BDD.
- ✅ **Bug URLs éditeurs UUID brut** : résolu de facto par le passage en slug (2026-05-30). Le code ne génère plus jamais d'URL `/editeur/<uuid>`.
- ✅ **Sitemap-v2 alternatif soumis dans Search Console** (2026-06-07) : `https://www.100000medecins.org/sitemap-v2.xml` créé pour tenter de casser le cache négatif Google qui maintenait `/sitemap.xml` en erreur depuis le 27/05. Soumis dans Search Console.
- ✅ **Indexation `dev.100000medecins.org` bloquée** (2026-06-07) : robots.txt `Disallow: /` + meta robots noindex + sitemap vide hors prod. Demande de suppression du préfixe `dev.*` soumise dans Search Console (effet ~6 mois, masquage Google immédiat).
- **À surveiller** : Search Console → vérifier que `/sitemap.xml` OU `/sitemap-v2.xml` passe en « Réussite » (≈ 1-2 semaines après soumission v2). Surveiller aussi le déréférencement progressif de `dev.*`.

### Mises à jour techniques

#### ⚠️ Réduire le cached egress Supabase sous 5 GB avant le 6 août 2026 (Fair Use Policy)
- **Contexte** : mail Supabase (org `100KMED` / `sdljuyadmxlyjtsrvvrq`) — le **cached egress** dépasse le quota Free (**5 GB/mois inclus**, tolérance ~5,5 GB). **Fair Use Policy applicable au 6 août 2026** ; au-delà, restrictions possibles. Ce n'est pas une fuite : **aucun pipeline d'images**. Détail complet + chiffres + arbitrage Pro : [docs/optimisation-egress-supabase.md](docs/optimisation-egress-supabase.md).
- **Cause (vérifiée)** : ~170 `<img src>` (84 fichiers) pointent en direct sur le Storage en **pleine résolution, non optimisé** ; seuls 4 fichiers utilisent `next/image` et `next.config.mjs` n'a pas de section `images`. L'endpoint d'upload stockait tel quel jusqu'à 5 Mo, sans compression ni `cacheControl`.
- **Audit BDD (2026-07-08) — ce que le Storage sert** : **132 captures galerie** (`solutions_galerie`, bucket `media`, PNG pleine réso — **1er poste**) + **79 avatars** + 70 logos solutions + 29 logos éditeurs + 7 images catégories (sur la home) + 7 logos partenaires. Buckets : `media`, `images`, `avatars`. (Les 113 logos solutions/éditeurs « externes » sont déjà hors Supabase.)
- ✅ **Déjà fait (code, sur `dev`, non commité/non déployé au 2026-07-08)** :
  - **`scripts/optimize-storage-images.ts`** — recompresse en WebP l'existant d'un bucket, ré-uploadé **sous le même chemin** (⇒ **aucune URL à changer en base**). Dry-run par défaut, `--execute` requis, backup binaire des originaux + `manifest.json` avant écriture, GIF/SVG ignorés.
  - **`src/app/api/upload/route.ts`** patché — tout nouvel upload raster → resize ≤1600px + WebP q80 + `cacheControl` 1 an. GIF (logo animé email) / SVG conservés intacts. (`sharp` tourne en runtime Node, la route n'est pas `edge`.)
- **Séquence recommandée (reste à faire)** :
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

#### Vérifier le domaine `100000médecins.org` sur Gandi (2026-07-05)
- **Contexte** : domaine `100000médecins.org` (variante accentuée / IDN) récemment acheté, actuellement **en erreur** sur Gandi suite à l'achat.
- **À faire** : vérifier la configuration du domaine sur Gandi (état du domaine, zone DNS, redirection vers le domaine principal `100000medecins.org`), identifier la cause de l'erreur et la corriger.

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
