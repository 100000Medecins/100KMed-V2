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

#### Favoriser l'entraide entre utilisateurs (« trucs et astuces »)
- Compléter le support éditeur officiel par un canal communautaire où les médecins partagent leurs astuces concrètes sur chaque solution
- Pistes à explorer :
  - Espace « trucs et astuces » par solution (commentaires courts, vote utile/pas utile)
  - ~~Lien vers groupe WhatsApp ou Telegram dédié à la catégorie / solution~~ [OK] Fait 2026-05-19 (module Communautés livré)
  - Forum léger (Discourse / Discord) intégré au site
- À cadrer : modération, prévention spam, articulation avec les avis existants

### Nettoyage

#### *(~2 mois après la mise en prod du site)* Couper définitivement le cordon Firebase — tout d'un coup
- `DROP TABLE evaluations_firebase_backup` (Supabase)
- Désinstaller `firebase-admin` du `package.json`
- Supprimer les scripts `scripts/*firebase*.ts` qui ne servent plus
- Vérifier qu'aucun import résiduel de `firebase-admin` ne traîne dans `src/`
- Exporter une dernière fois les collections clés (`users`, `evaluations`, `criteres`, `categories`) en JSON local au cas où (archive longue durée)
- **Résilier le projet Firebase** côté console Google
- Révoquer le service-account `medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json`

### UX / UI

#### Créer un design system pour le site
- Définir les tokens de design (couleurs, typographie, espacement, ombres, border-radius) dans un fichier de référence
- Documenter les composants UI existants (Button, Card, Badge, StarRating, Breadcrumb…) avec leurs variantes
- Identifier les incohérences visuelles entre pages et les normaliser
- Objectif : base solide pour toute nouvelle feature et pour les éventuels contributeurs

### Performance

_(rien à faire pour l'instant)_

### Mises à jour techniques

#### Passer en main avec Next.js 16
- ✅ Migration Next 16 en cours sur `dev`, site de test live, comportement OK partout
- **Restant** : merger `dev` → `main` (la branche `main` est encore en Next 14.2.35)
- Avant merge : vérifier la liste des changements depuis dernier push `main` (`git log main..dev`), faire une preview Vercel finale sur main avant déploiement prod
- Voir `docs/migration-nextjs-16.md` pour le détail des points migrés

#### Régler les vulnérabilités npm (`npm audit`)
- 26 vulnérabilités : 2 low, 13 moderate, 10 high, 1 critical
- Procéder paquet par paquet : `npm audit` pour identifier, tester après chaque correctif
- ⚠️ **NE PAS utiliser `npm audit fix --force`** — peut introduire des breaking changes silencieux

#### Refacto questionnaires d'évaluation — sortir du fallback ambigu `default`
- **Constat** : le slug `default` joue 2 rôles incompatibles → (1) le vrai questionnaire "Logiciels métier" (labellisé "Logiciels métier (défaut)" dans l'admin), (2) le filet de secours pour toute catégorie sans entrée BDD. Résultat : les utilisateurs des catégories non-migrées (aujourd'hui `objetsconnectes`, `teleconsultation`) voient le questionnaire Logiciels métier au lieu d'un message adapté.
- **Étape 1** : créer un slug `logiciels-metiers` en BDD avec le contenu actuel de `default` (copie des 10 sections + ~40 questions), puis vider `default` ou le remplacer par un questionnaire neutre court. Adapter `slugLabels` dans `src/app/admin/questionnaires/page.tsx`.
- **Étape 2** : modifier `getSectionsForSlug` (`src/lib/actions/questionnaires.ts`) pour ne plus tomber silencieusement sur `default` quand la catégorie n'a pas de questionnaire — afficher plutôt un message UX "Questionnaire en cours d'élaboration pour cette catégorie" côté front.
- **Étape 3** : supprimer le code mort `SECTIONS_DETAILLEES` (~120 lignes) et `SECTIONS_PAR_CATEGORIE` (~70 lignes) dans `src/app/solution/noter/[...slug]/page.tsx` une fois que toutes les catégories ont leur questionnaire BDD et que le filet de secours hardcodé n'est plus utile.

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
- **Questionnaire d'évaluation — concevoir** : lister les critères pertinents pour évaluer une solution de télétransmission (ex. fiabilité de la télétransmission, qualité du rapprochement NOEMIE, gestion du tiers payant, support, ergonomie, intégration LGC…), les organiser en sections/sous-critères, rédiger les libellés des questions
- **Questionnaire d'évaluation — implémenter en BDD** : créer les `criteres` (avec hiérarchie `parent_id`), remplir `categories.schema_evaluation` (JSONB) et `categories.criteres_recherche` (liste d'IDs critères mis en avant dans la page comparatif), tester le flow `/solution/noter/teletransmission/[idSolution]` de bout en bout — chantier principal restant
- **Uploader les logos** des 20 solutions via l'admin
- **Compléter les 4 nouveaux éditeurs** (Aatlantide, Olaqin, VITALONLINE, Calimed Santé) : website, description, logo
- ~~Classer dans la sur-catégorie "Logiciels médicaux"~~ [OK] Fait 2026-05-18 (groupe correct en BDD)
- **Activer** (`actif=true`) la catégorie quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)
- ~~Tooltip téléservices CNAM~~ [OK] Fait 2026-05-18 — `<AcronymText>` déjà appliqué sur les libellés de tags dans `SolutionFilters.tsx`, et les 7 sigles `ADRi`, `AATi`, `ALDi`, `DMTi`, `IMTi`, `HRi`, `INSi` sont en BDD `acronymes` avec leurs définitions complètes

### ~~Solutions liées (interopérabilités, suites produits)~~ [OK] Fait 2026-05-18
- Table `solution_liens` + UI sidebar `SolutionLiensCard` + admin `SolutionLiensManager` + seed initial 22 liens (voir CHANGELOG 2026-05-18).
- **Évolution future possible** : permettre aux éditeurs de proposer un lien depuis `/mon-compte/mon-espace-editeur` (avec validation admin).

### Avatars

- ~~Page admin `/admin/utilisateurs/avatars` (CRUD catalogue avec drag & drop `@dnd-kit/sortable`)~~ [OK] Fait 2026-05-18
- ~~Génération d'avatar perso (photo → pixel art) — abandonnée~~ [OK] Décision finale 2026-05-18 : remplacée par génération text-to-image basée sur description user (composant `<RequestCustomAvatar>` réécrit, `generatePersonalAvatar(description)` wrap dans le prompt master low_res 64)

#### Pistes futures pour génération avatar perso depuis photo (si réenvie un jour)
- Pipeline 2 étapes : img2img RD (strength modéré) + post-traitement `sharp` côté server (downscale 64×64 nearest + quantize palette + re-upscale 256×256). ~1h de dev. Probabilité succès ~60-70 %.
- Service dédié photo→pixel art (Pixel Me, Replicate avec modèle entraîné spécifiquement). Probabilité plus élevée mais migration API.
- ControlNet (face detection + style transfer) avec un modèle pixel art dédié.

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
