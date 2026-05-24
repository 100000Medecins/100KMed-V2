# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

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

#### ~~Email de lancement par syndicat — finaliser le wording~~ ✅ (fait le 2026-05-24)
- ~~Base livrée le 2026-05-21 (template + admin + rendus versionnés). Wording finalisé le 2026-05-24.~~

### Nettoyage

#### ~~Vider la table `evaluations_vides_supprimees`~~ ✅ (DROP fait le 2026-05-24)
- ~~48 évaluations vides supprimées le 2026-05-23, backup `evaluations_vides_supprimees` droppé le 2026-05-24 (pas de rétention utile, données vides par définition).~~

#### *(quand on aura un moment)* Nettoyer les ~270 erreurs ESLint préexistantes
- **État** : `npm run lint` remonte ~270 erreurs, principalement `@typescript-eslint/no-explicit-any` sur la couche Supabase (`src/lib/db/`, `src/lib/actions/`), plus quelques `react/no-unescaped-entities` et `no-img-element`.
- **Pas un sujet de fiabilité** : ces erreurs sont du style, pas du comportement. `tsc --noEmit` passe, le `next build` passe, le site tourne. La règle reste utile pour le code nouveau.
- **Cause de fond** : les types Supabase auto-générés ont divergé de la BDD (cf. CLAUDE.md sur la "schema drift" — `actualites`, `documents` absentes des types, etc.). Le `as any` est un contournement.
- **Remède durable** : régénérer `src/types/database.ts` (`npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts`) puis retirer les `as any` au fil de l'eau dans les fichiers qu'on touche. Pas de chantier dédié sauf si on veut un lint propre en CI.

#### *(~2 mois après la mise en prod du site)* Couper définitivement le cordon Firebase — tout d'un coup
- `DROP TABLE evaluations_firebase_backup` (Supabase)
- Désinstaller `firebase-admin` du `package.json`
- Supprimer les scripts `scripts/*firebase*.ts` qui ne servent plus
- Vérifier qu'aucun import résiduel de `firebase-admin` ne traîne dans `src/`
- Exporter une dernière fois les collections clés (`users`, `evaluations`, `criteres`, `categories`) en JSON local au cas où (archive longue durée)
- **Résilier le projet Firebase** côté console Google
- Révoquer le service-account `medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json`

### UX / UI

#### Extraire des composants UI partagés (mini design system pragmatique)
- **Constat** : 7 valeurs de `rounded-*` (348× xl, 279× lg, 168× card, 72× button, 69× 2xl…), 10 variations de padding pour des boutons « primaire » (42× `px-4 py-2`, 23× `px-7 py-3`…), 4 styles de badges concurrents, 10 fichiers qui redéclarent `inputClass` inline, 10 fichiers avec leur propre overlay `fixed inset-0 bg-black/`.
- **Phase 0 livrée (2026-05-24)** : dossier `src/components/ui/` créé, conventions tokens validées dans [src/components/ui/README.md](src/components/ui/README.md) (radius = `rounded-card` 16px et `rounded-button` 12px ; primaire = `bg-navy`, secondaire = `bg-accent-blue`).
- **Phase 1 livrée (2026-05-25)** : `<Button>` étendu (l'existant a été enrichi, pas remplacé — 14 usages publics conservés). Nouveaux props : `size` (sm/md/lg, défaut lg), `loading` (spinner + disabled), `leftIcon`/`rightIcon`, `fullWidth`, support de tous les attrs HTML. Nouveaux variants : `secondary` (bg-accent-blue), `danger` (bg-red-500). **15 fichiers migrés** : 5 formulaires admin (Video/Editeur/Categorie/Partenaire/Article) + AdminLoginForm + BlogForm + SolutionForm + PropositionForm + 5 pages admin (categories/editeurs/solutions/pages/pages-nouveau) + page mon-compte/proposer/video. Tous les boutons `px-7 py-3.5 rounded-button bg-navy` sont migrés.
- **Phase 2 livrée (2026-05-25)** : `<Badge>` créé (variants info/warning/success/danger/neutral/dark × sizes sm/md, avec `dot`, `leftIcon`/`rightIcon`, `onClick`). 2 fichiers migrés : `etudes-cliniques/_public.tsx`, `questionnaires-these/page.tsx`. `VideosPendingPanel.tsx` également migré mais **réverté par un processus externe** — à re-appliquer après diagnostic. **Reste à migrer au fil de l'eau** : ~30 occurrences de chips `bg-*-50 text-*-700 border border-*-200` dans d'autres composants.
- **Phase 3 livrée (2026-05-25)** : `<Input>`, `<Textarea>`, `<Select>`, `<Field>` créés dans `src/components/ui/`. `<Input>` et `<Textarea>` partagent une fonction `buildInputClasses()` exportée (cohérence du style). `<Select>` rend un `<select>` natif avec chevron SVG inline. `<Field>` = wrapper label + hint + error. 5 formulaires migrés : `PartenaireForm` (complet), `CategorieForm` (complet), `EditeurForm` (2 fields démo), `BlogForm` (complet, 6 fields), `ArticleForm` (4 fields principaux). **`VideoForm` et `VideosPendingPanel` réverttés à plusieurs reprises par un processus externe** — à diagnostiquer avant de réessayer (probable conflit avec une autre session ou hook git).
- **Phases restantes** (chaque phase = commit revertable indépendant) :
  - Phase 3 — `<Input>` / `<Textarea>` / `<Select>` — 1h extraction + 1-2h de remplacements formulaire par formulaire (commencer par les petits : EditeurForm, CategorieForm…)
  - Phase 4 — `<Modal>` (consolide les 10 overlays existants) — 1h + 1h de remplacements
  - Phase 5 — `<Card>` (finition) — 30 min
- **Méthode** : composant **extrait d'abord**, **remplacé ensuite** au fil de l'eau dans les fichiers qu'on touche pour d'autres raisons. Pas de big-bang.
- **Pas dans le scope** : Storybook, doc formelle — pas de valeur tant qu'on est seul à coder.

### Performance

_(rien à faire pour l'instant)_

### Mises à jour techniques

#### Vulnérabilités npm restantes
- **État 2026-05-23 (post-`npm audit fix`)** : 12 vulnérabilités — 11 moderate, 1 high. `ws` + `protobufjs` + 1 transitive ont été résolus le 2026-05-23.
- **11 moderate** : toute la chaîne `uuid` / `@google-cloud/storage` / `@google-cloud/firestore` / `gaxios` / `google-gax` / `teeny-request` / `retry-request` / `firebase-admin`. **Partira automatiquement** quand on désinstallera `firebase-admin` (cf. item Nettoyage « Couper le cordon Firebase », prévu ~2 mois post-prod).
- **1 high — `xlsx`** (Prototype Pollution + ReDoS) : no fix sur npm. **Utilisé uniquement dans 3 scripts de seed admin** (`import-agendas.ts`, `import-ia-documentaires.ts`, `import-ia-scribes.ts`), pas dans le code du site. **Plan** : remplacer par `exceljs` après l'import des 2 catégories encore en attente (Téléconsultation, Téléexpertise). API très proche, ~10 lignes à adapter par script.
- ⚠️ **NE JAMAIS utiliser `npm audit fix --force`** — breaking changes silencieux (downgraderait Next 16 → 9).

### Déploiement final

#### Kill-switch emails routiniers — à activer au déploiement final *(pas urgent, juste avant la mise en prod)*
- Dans Admin → Emails, activer le toggle "Emails routiniers" avant de mettre le site en production
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- Ne pas oublier : sans ce switch, aucune relance évaluation / PSC / newsletter ne partira

#### Checklist technique passage en prod (www)
- **Vercel** → `NEXT_PUBLIC_SITE_URL` (Production) : changer `https://dev.100000medecins.org` → `https://www.100000medecins.org`
- **Supabase** → Authentication → URL Configuration → **Site URL** : changer vers `https://www.100000medecins.org`
- **Supabase** → Redirect URLs : vérifier que `https://www.100000medecins.org/reinitialiser-mot-de-passe` est dans la liste
- **PSC** : aucune action — le relay `/connexionPsc` gère automatiquement le basculement dev→www (déjà en place)

#### DNS — mise en prod *(jour J uniquement)*
- `@ A` : remplacer `217.70.184.55` par `76.76.21.21` (IP Vercel apex)
- `www` : remplacer CNAME `webacc8.sd6.ghst.net` par `cname.vercel-dns.com.`
- Supprimer les 4 CNAME SSL sectigo/comodoca (certificats ancien hébergeur)
- Vérifier que le wildcard `* CNAME webredir.vip.gandi.net.` n'interfère pas

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

### Liens entre solutions — évolution future
- Permettre aux éditeurs de proposer un lien entre solutions depuis `/mon-compte/mon-espace-editeur` (avec validation admin). La base — table `solution_liens`, UI sidebar, manager admin — est livrée (voir archive 2026-05-18).

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
