# Import Téléexpertise — mapping à valider

> Document de travail — **2026-06-04**
> Source : `Comparatif_teleexpertise_medecins_2026.csv` (10 solutions)
> Catégorie cible : `Téléexpertise` (slug `teleexpertise`) — **à créer** (n'existe pas encore en BDD)
> Grille de tags : 4 séparateurs + 17 toggles — **à créer** (suppression de la famille « Intégrations » : déjà couverte par `Intégré au LGC` dans Architecture)

---

## Légende

- **Sites web** : devinés via convention `*.fr` / `*.com` → **à valider** par David avant exécution du SQL.
- **Tags** : numéro = `ordre` de la table `tags`. Les tags marqués **★** seront `is_tag_principal=true` dans `solutions_tags` (affichés en « Principales fonctionnalités » en haut de fiche).
- **Prix** : `prix_ttc` = montant unique ; `prix_ttc_min/max` = fourchette ; `null` = gratuit ou non communiqué (cf. décision 2026-06-03 : un prix de 0 € n'a pas de sens commercial pour un logiciel médical → on l'écrit dans le descriptif au lieu de le mettre en BDD).
- **`id_editeur`** : nullable en base. Une solution sans éditeur identifié (cas « Plateformes régionales tierces ») laisse `id_editeur = NULL`.

---

## Éditeurs

### Existants en base (à réutiliser)

| Éditeur | id |
|---|---|
| Doctolib | `3a94672f-b132-46b6-b825-b64f95d5409f` |
| Medaviz | `11f50285-5f00-4ee5-b0fc-077f529f3ae3` |
| Tessan | `4cd26cdd-1790-409d-a0f9-e57a3aca645e` |

### À créer (5 nouveaux)

| Nom | Site (à valider) | Pays |
|---|---|---|
| Omnidoc | https://www.omnidoc.fr | France |
| Rofim | https://www.rofim.doctor | France |
| Conex Santé | https://www.conexsante.com | France |
| GCS Sara | https://www.sante-ara.fr | France |
| Avisdoc | _(à instruire — site à confirmer)_ | France |

---

## Tags (4 séparateurs + 17 toggles)

> Convention : séparateurs en `is_separator=true`, parents posés via `parent_ids` pour le filtre arborescent (cf. téléconsultation).

### Famille 1 — Modèle économique (séparateur, `ordre=1`)

- 2 — `Gratuit`
- 3 — `Freemium` (essai gratuit limité, payant au-delà)
- 4 — `Payant sur devis`
- 5 — `Commission à l'acte`

### Famille 2 — Architecture (séparateur, `ordre=6`)

- 7 — `Plateforme nationale`
- 8 — `Solution régionale`
- 9 — `Intégré au LGC` (Hellodoc, Weda, Doctolib...)

### Famille 3 — Spécialisation (séparateur, `ordre=10`)

- 11 — `Multi-spécialités`
- 12 — `Dermatologie`
- 13 — `Imagerie médicale`

### Famille 4 — Cible & fonctionnalités (séparateur, `ordre=14`)

- 15 — `Libéral isolé`
- 16 — `MSP / CPTS`
- 17 — `Hôpital / GHT`
- 18 — `e-RCP` (réunion de concertation pluridisciplinaire)
- 19 — `Téléconsultation incluse`
- 20 — `Transfert d'imagerie`
- 21 — `Réseaux d'experts nationaux`
- 22 — `Annuaire régional`

---

## Solutions (10 — toutes `actif=false` au départ)

### 1) Omnidoc

- **Slug** : `omnidoc`
- **Éditeur** : Omnidoc (nouveau)
- **Description courte** : Plateforme de référence de téléexpertise et e-RCP, leader du marché, gratuite en usage individuel et largement intégrée aux LGC.
- **Description longue** : Acteur pionnier (depuis ~2018), utilisé par plus de 100 000 professionnels de santé. Permet de solliciter un confrère habituel ou de rechercher un expert/réseau de son territoire, d'attacher tout type de document, et génère automatiquement un compte rendu en fin d'avis. Inscription autonome via carte CPS/e-CPS, profil pré-rempli depuis le RPPS/ADELI. Le mode « réseau » (cabinets de groupe, ESS, hôpitaux) est une offre Premium payante sur devis. Moteur de téléexpertise embarqué nativement dans HelloDoc (CGM) et Weda (Cegedim Santé).<br><br>Différenciants : e-RCP intégrée ; réseaux nationaux de secours (Panel Omnidoc, SOS ECG…) ; interopérabilité ePansement (IDE plaies) ; ~1 000 inscriptions/semaine.
- **Prix** : `null` (gratuit en usage individuel ; Premium réseau sur devis → écrit dans le descriptif)
- **Points forts** : `["Leader avec écosystème mature", "Gratuit pour le libéral individuel", "Réseaux nationaux de recours", "Intégration LGC profonde (HelloDoc, Weda)", "Disponible web + mobile"]`
- **Points faibles** : `["Modèle réseau payant pour les structures", "Dépendance au numérique/réseau (zones blanches)", "Pas de module de téléconsultation natif"]`
- **Tags activés** : 2★ Gratuit · 7★ Plateforme nationale · 9★ Intégré au LGC · 11 Multi-spécialités · 15 Libéral isolé · 16 MSP/CPTS · 17 Hôpital · 18 e-RCP · 21 Réseaux d'experts nationaux
- **Tags finaux** : **2★, 7★, 9★, 11, 15, 16, 17, 18, 21**

### 2) Rofim

- **Slug** : `rofim`
- **Éditeur** : Rofim (nouveau)
- **Description courte** : Plateforme de télémédecine collaborative réunissant téléexpertise, e-RCP, téléconsultation et transfert d'imagerie, gratuite pour les libéraux.
- **Description longue** : Société marseillaise (depuis 2018) positionnée hôpital + ville. Quatre modules : téléexpertise, téléconsultation, e-RCP et DCC (Dossier Communicant de Cancérologie). Téléexpertise gratuite pour les médecins libéraux ; options/modules complémentaires sur devis (facturation modulable et dégressive selon nombre de modules et licences). Forte présence hospitalière et choisie comme solution régionale par plusieurs GRADeS (notamment Occitanie).<br><br>Rofim porte également la solution **DermatoExpert** en marque blanche (partenariat Pierre Fabre, cf. fiche dédiée).<br><br>Différenciants : suite complète (TE + e-RCP + TLC + imagerie) ; viewer d'imagerie médicale intégré ; transfert sécurisé d'imagerie ; module assistance chirurgicale (lunettes connectées Ama XpertEye) ; téléexpertise bucco-dentaire ; compatibilité objets connectés (ECG, dermatoscope…).
- **Prix** : `null` (gratuit pour la téléexpertise libérale ; modules avancés sur devis)
- **Points forts** : `["Suite complète TE + e-RCP + TLC + imagerie", "Viewer d'imagerie médicale intégré", "Adopté par CHU et GRADeS", "App mobile fluide", "Marque blanche (DermatoExpert)"]`
- **Points faibles** : `["Orientation hospitalière/structures marquée", "Modèle tarifaire des modules avancés peu transparent (devis)", "Richesse fonctionnelle = courbe d'apprentissage pour le solo"]`
- **Tags activés** : 2★ Gratuit · 4 Payant sur devis · 7★ Plateforme nationale · 8 Solution régionale · 11 Multi-spécialités · 13 Imagerie médicale · 16 MSP/CPTS · 17★ Hôpital · 18 e-RCP · 19 TLC incluse · 20★ Transfert d'imagerie
- **Tags finaux** : **2★, 4, 7★, 8, 11, 13, 16, 17★, 18, 19, 20★**

### 3) Medaviz

- **Slug** : `medaviz-teleexpertise`
- **Éditeur** : Medaviz (existant — déjà présent en téléconsultation)
- **Description courte** : Solution territoriale tout-en-un (téléconsultation, télésoin, téléexpertise) centrée sur la coordination ville et les organisations (CPTS/MSP/ESS).
- **Description longue** : Éditeur historique (2014) spécialisé dans la coordination des soins de territoire. Téléexpertise gratuite pour les praticiens isolés, intégrée à l'offre « Essentiels ». Invitation d'un médecin requis inscrit ou non, réponse écrite, clôture et facturation, génération automatique du compte rendu. Modèle économique à la commission sur les actes encaissés via la plateforme (téléconsultation), HDS, paiement Stripe.<br><br>Différenciants : adressage et régulation des soins non programmés ; télésoin paramédical ; partenariats mutuelles/assureurs ; « Slow téléconsultation » ; réseaux nationaux ~20 spécialités.
- **Prix** : `null` (gratuit pour la téléexpertise des praticiens isolés ; commission à l'acte sur TLC)
- **Points forts** : `["Pensé pour l'exercice coordonné (CPTS/MSP/ESS)", "Téléexpertise gratuite", "Réseaux ~20 spécialités", "Brique adressage soins non programmés"]`
- **Points faibles** : `["Absence d'intégration LGC native (double saisie)", "Modèle à la commission sur la téléconsultation", "Positionnement orienté structures et mutuelles/entreprises"]`
- **Tags activés** : 2★ Gratuit · 5 Commission à l'acte · 7★ Plateforme nationale · 11 Multi-spécialités · 15 Libéral isolé · 16★ MSP/CPTS · 19 TLC incluse · 21 Réseaux d'experts nationaux
- **Tags finaux** : **2★, 5, 7★, 11, 15, 16★, 19, 21**

### 4) Conex Santé

- **Slug** : `conex-sante`
- **Éditeur** : Conex Santé (nouveau)
- **Description courte** : Plateforme de télémédecine (téléexpertise, téléconsultation, téléconsultation assistée) avec essai gratuit jusqu'à 4 actes/mois.
- **Description longue** : Solution destinée aux libéraux, MSP, CPTS et établissements. Téléexpertise tracée et sécurisée : le requérant pose sa question, le requis répond, l'acte est rémunéré (10 € requérant / 23 € requis). Plateforme gratuite jusqu'à 4 actes/mois en individuel, illimitée dans le cadre d'un contrat de structure.<br><br>Différenciants : téléconsultation assistée par IDE au domicile ; modèle freemium lisible ; orientation MSP/CPTS.
- **Prix** : `null` (freemium : gratuit jusqu'à 4 actes/mois, illimité en contrat structure → écrit dans le descriptif)
- **Points forts** : `["Offre d'essai claire (4 actes/mois)", "Téléconsultation assistée (IDE au domicile)", "Cible exercice coordonné"]`
- **Points faibles** : `["Notoriété plus faible que Omnidoc/Rofim", "Pas d'intégration LGC native", "Écosystème de réseaux d'experts moins étendu"]`
- **Tags activés** : 3★ Freemium · 7★ Plateforme nationale · 11 Multi-spécialités · 15 Libéral isolé · 16★ MSP/CPTS · 17 Hôpital · 19 TLC incluse
- **Tags finaux** : **3★, 7★, 11, 15, 16★, 17, 19**

### 5) Doctolib Téléexpertise (Siilo)

- **Slug** : `doctolib-teleexpertise`
- **Éditeur** : Doctolib (existant)
- **Description courte** : Téléexpertise gratuite intégrée à l'écosystème Doctolib, avec compte rendu auto-versé au dossier patient pour les utilisateurs du LGC Doctolib.
- **Description longue** : Lancée début 2026, la téléexpertise est disponible gratuitement dans Doctolib connect et s'appuie sur la messagerie sécurisée Doctolib Siilo (300 000+ professionnels). Délai d'avis annoncé court (< 17 h). Pour les utilisateurs du logiciel médical Doctolib, le compte rendu est automatiquement intégré au dossier patient et la facturation se fait en un clic. Hébergement HDS UE.<br><br>Différenciants : adossement à la messagerie Siilo (300 000+ pros) ; CR auto-intégré au dossier ; facturation en 1 clic ; couplage agenda/téléconsultation.
- **Prix** : `null` (gratuit, inclus pour les utilisateurs Doctolib)
- **Points forts** : `["Intégration native dans le 1er écosystème de RDV/agenda", "Gratuit", "CR auto-versé + facturation 1 clic", "Énorme base de pairs (Siilo)", "HDS UE"]`
- **Points faibles** : `["Bénéfice maximal réservé aux abonnés Doctolib (effet d'écosystème)", "Service récent (2026) encore en enrichissement", "Dépendance à un acteur dominant"]`
- **Tags activés** : 2★ Gratuit · 9★ Intégré au LGC · 11 Multi-spécialités · 15 Libéral isolé · 19 TLC incluse · 21 Réseaux d'experts nationaux
- **Tags finaux** : **2★, 9★, 11, 15, 19, 21**

### 6) MonSisra — Téléexpertise

- **Slug** : `monsisra-teleexpertise`
- **Éditeur** : GCS Sara (nouveau)
- **Description courte** : Service régional de demande d'avis sécurisé intégré à la messagerie MonSisra (Auvergne-Rhône-Alpes), avec annuaire régional d'experts.
- **Description longue** : Service public régional (AURA) : téléexpertise intégrée dans MonSisra (messagerie sécurisée régionale). Recherche d'expert via l'annuaire régional en quelques clics, finalisation de la demande qui génère le compte rendu, page dédiée d'export Excel des données de facturation entre deux dates. Financé et accompagné par l'ARS via le GCS Sara.<br><br>Différenciants : annuaire régional intégré ; export Excel des actes pour cotation ; adossé à l'écosystème régional (MesPatients, MSSanté régionale).
- **Prix** : `null` (gratuit, financé ARS / GCS régional)
- **Points forts** : `["Gratuit et soutenu par l'ARS", "Annuaire régional d'experts", "Intégré à la messagerie régionale MonSisra", "Export facturation simplifié", "Accompagnement régional"]`
- **Points faibles** : `["Périmètre limité à la région AURA", "Pas d'intégration LGC native", "Ergonomie institutionnelle"]`
- **Tags activés** : 2★ Gratuit · 8★ Solution régionale · 11 Multi-spécialités · 15 Libéral isolé · 16 MSP/CPTS · 17 Hôpital · 22★ Annuaire régional
- **Tags finaux** : **2★, 8★, 11, 15, 16, 17, 22★**

### 7) Plateformes régionales tierces (marchés GRADeS)

- **Slug** : `plateformes-regionales-grades`
- **Éditeur** : **`NULL`** (pas d'éditeur unique — concept regroupant les marchés régionaux ; pas de page éditeur publique, pas de lien éditeur sur la fiche)
- **Description courte** : Solutions nationales (Rofim, Omnidoc…) déployées en marché public régional comme service officiel d'une région (gratuit pour les PS du territoire).
- **Description longue** : Plusieurs GRADeS attribuent leur service régional de téléexpertise et de transfert d'imagerie à un éditeur national : Rofim est la solution régionale du GRADeS Occitanie (e-santé Occitanie) ; Pulsy (Grand Est) pilote la feuille de route télémédecine 2024-2026 incluant le déploiement de la téléexpertise libérale. Service gratuit pour les professionnels du territoire concerné, accompagnement et hotline régionaux.<br><br>Différenciants : accompagnement régional (Pulsy, e-santé Occitanie…) ; intégration aux parcours territoriaux ; transfert d'imagerie régional.
- **Prix** : `null` (gratuit, financement régional ARS / feuille de route)
- **Points forts** : `["Gratuit et accompagné (hotline, formation régionale)", "Structuration territoriale ville-hôpital", "Financement ARS dédié"]`
- **Points faibles** : `["Disponibilité variable selon la région", "Périmètre et fonctionnalités fixés par le marché public régional", "Hétérogénéité nationale"]`
- **Tags activés** : 2★ Gratuit · 8★ Solution régionale · 11 Multi-spécialités · 13 Imagerie médicale · 16 MSP/CPTS · 17 Hôpital · 20 Transfert d'imagerie · 22 Annuaire régional
- **Tags finaux** : **2★, 8★, 11, 13, 16, 17, 20, 22**

### 8) DermatoExpert

- **Slug** : `dermatoexpert`
- **Éditeur** : Rofim (mention Pierre Fabre dans le descriptif)
- **Description courte** : Téléexpertise dermatologique en marque blanche (moteur Rofim), pilotée par Pierre Fabre pour réduire l'errance diagnostique en dermatologie.
- **Description longue** : Solution thématique lancée en 2024 par **Pierre Fabre** sur la technologie **Rofim**, pensée pour réduire le délai d'accès au dermatologue (~95 jours en moyenne). Le requérant transmet un dossier avec photos via une plateforme sécurisée et obtient un avis dermatologique en quelques jours. Conçue avec un board de dermatologues + un généraliste ; formation fournie aux utilisateurs.<br><br>Différenciants : marque blanche pilotée par un laboratoire ; board médical dédié ; focalisation mélanome/dermatoses chroniques ; déploiement notable en pharmacie.
- **Prix** : `null` (gratuit pour le requérant, porté par le laboratoire)
- **Points forts** : `["Réponse dermato rapide (quelques jours)", "Pensé pour l'errance diagnostique", "Formation incluse", "Multi-supports"]`
- **Points faibles** : `["Mono-spécialité (dermatologie)", "Déploiement ciblé (pharmacies/parcours)", "Dépendance à un sponsor industriel"]`
- **Tags activés** : 2★ Gratuit · 7 Plateforme nationale · 12★ Dermatologie · 15 Libéral isolé · 21 Réseaux d'experts nationaux
- **Tags finaux** : **2★, 7, 12★, 15, 21**

### 9) Tessan — Téléexpertise dermatologique

- **Slug** : `tessan-teleexpertise-dermatologique`
- **Éditeur** : Tessan (existant — déjà présent en téléconsultation)
- **Description courte** : Téléexpertise dermatologique adossée à un dermatoscope connecté piloté à distance, dans le réseau de cabines/points Tessan.
- **Description longue** : Pionnier (depuis 2018) de la téléexpertise dermatologique « augmentée » : un généraliste reçoit le patient (souvent en pharmacie), un dermatoscope connecté capture des clichés haute précision, et un dermatologue rend son avis sous ~48 h ouvrées. Orienté télémédecine assistée par dispositifs et maillage territorial (cabines/officines).<br><br>Différenciants : dermatoscope connecté piloté à distance ; télémédecine assistée par dispositifs ; modèle officine.
- **Prix** : `null` (selon contrat structure / point Tessan — pas de grille publique côté médecin)
- **Points forts** : `["Télé-sémiologie réelle (dermatoscope connecté)", "Réponse < 48 h", "Maillage officines/cabines"]`
- **Points faibles** : `["Dépend d'un équipement/point Tessan", "Orienté structures et pharmacies plus que le cabinet libéral isolé", "Mono-domaine fort (dermato)"]`
- **Tags activés** : 4★ Payant sur devis · 7★ Plateforme nationale · 12★ Dermatologie · 16 MSP/CPTS
- **Tags finaux** : **4★, 7★, 12★, 16**

### 10) Avisdoc

- **Slug** : `avisdoc`
- **Éditeur** : Avisdoc (nouveau)
- **Description courte** : Solution de téléexpertise entre médecins (réseau de soins), historiquement mise en avant en dermatologie. **Fiche en cours d'instruction.**
- **Description longue** : Plateforme de communication confraternelle pour solliciter un avis spécialisé à distance, présentée notamment comme un réseau de soins utile en dermatologie pour fluidifier les échanges généraliste ↔ spécialiste. Acteur de niche centré sur la mise en relation et la traçabilité des avis.<br><br>**Note 100kMed :** informations publiques limitées (tarifs, conformité, fonctionnalités précises). Fiche **en cours d'instruction** auprès de l'éditeur — à compléter après entretien.<br><br>Différenciants : positionnement réseau de soins par spécialité ; à instruire en entretien éditeur.
- **Prix** : `null` (non communiqué publiquement — à vérifier)
- **Points forts** : `["Centré sur l'avis confraternel rapide", "Logique réseau de soins"]`
- **Points faibles** : `["Informations publiques limitées (tarifs, conformité)", "Notoriété et écosystème réduits face aux leaders"]`
- **Tags activés** : 7 Plateforme nationale · 12 Dermatologie · 15 Libéral isolé · 21 Réseaux d'experts nationaux
- **Tags finaux** : **7, 12, 15, 21**

---

## Récapitulatif chiffré

- **1** catégorie à créer (`Téléexpertise`)
- **21** tags à créer (4 séparateurs + 17 toggles)
- **5** éditeurs à créer (Omnidoc, Rofim, Conex Santé, GCS Sara, Avisdoc)
- **3** éditeurs réutilisés (Doctolib, Medaviz, Tessan)
- **10** solutions à créer (toutes `actif=false`)
- **1** solution sans éditeur (`id_editeur = NULL` pour « Plateformes régionales tierces »)
- **~80** liaisons `solutions_tags` (somme des tags finaux × marqués `is_tag_principal` quand ★)

---

## Décisions actées 2026-06-04

1. ❌ Famille « Intégrations » (PSC, FSE, DMP, intégré HelloDoc/Weda) **retirée** : pas assez différenciante, et le tag `Intégré au LGC` couvre déjà le besoin.
2. ✅ Doctolib (Siilo) et Tessan dermato → solutions distinctes sous les éditeurs existants.
3. ✅ DermatoExpert → éditeur = **Rofim**, mention Pierre Fabre dans le descriptif (pas de création éditeur Pierre Fabre).
4. ✅ Avisdoc → import en `actif=false` avec descriptif honnête « en cours d'instruction ».
5. ✅ Catégorie `actif=false` jusqu'à : logos uploadés + questionnaire d'évaluation prêt + 1-2 fiches review (même règle que Téléconsultation).
6. ✅ « Plateformes régionales tierces » → solution importée avec `id_editeur=NULL` (pas de page éditeur publique).
7. ✅ Solutions gratuites → `prix_ttc = NULL` (le « 0 € » est écrit dans le descriptif, pas en BDD).

---

## Reste à valider avant exécution SQL

- [ ] Sites web des 5 nouveaux éditeurs (URLs devinées par convention)
- [ ] Slugs des 10 solutions (pas de doublon avec une solution Téléconsultation déjà en base ?)
- [ ] Numérotation finale des tags (ordre `1` à `22`) — à figer ici avant insertion
- [ ] Description courte/longue, points forts/faibles : relecture éditoriale 100kMed

Quand la doc est validée, on enchaîne avec 5 blocs SQL inline :
- **A** — `INSERT category` Téléexpertise
- **B** — `INSERT tags` (4 séparateurs + 17 toggles, avec `parent_ids`)
- **C** — `INSERT editeurs` (5 nouveaux)
- **D** — `INSERT solutions` (10, `actif=false`)
- **E** — `INSERT solutions_tags` (M-N, avec `is_tag_principal=true` sur les ★)
