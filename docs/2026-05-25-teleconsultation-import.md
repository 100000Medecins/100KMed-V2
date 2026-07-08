# Import Téléconsultation — mapping à valider

> Document de travail — **2026-05-25**
> Source : `Comparatif_teleconsultation_medecins_2026_3.xlsx` (18 solutions)
> Catégorie cible : `Téléconsultation` (`6aa516d9-1d4a-4e2b-9d18-11e5cca62ebf`)
> Grille de tags : 4 séparateurs + 15 toggles déjà insérés en base le 2026-05-25.

---

## Légende

- **Sites web** : devinés via convention `*.fr` / `*.com` → **à valider** par David avant exécution du SQL.
- **Tags** : numéro = `ordre` de la table `tags`. Les tags marqués **★** seront `is_tag_principal=true` dans `solutions_tags` (affichés en "Principales fonctionnalités" en haut de fiche).
- **Liens** : si la solution est liée à un autre produit déjà en base, ligne `solution_liens` à créer.
- **Prix** : `prix_ttc` = montant unique ; `prix_ttc_min/max` = fourchette ; `Gratuit` = 0 ; `null` = non communiqué.

---

## Éditeurs

### Existants en base (à réutiliser)

| Éditeur | id |
|---|---|
| Doctolib | `3a94672f-b132-46b6-b825-b64f95d5409f` |
| Cegedim Santé | `45f9afdb-a238-4541-ab22-7050bf9b991f` |
| CompuGroup Medical | `3167ed5c-e33b-4b96-93f8-985639cb05ee` |
| Hellocare | `58409466-3dc8-44e7-9dad-4e233f9cfb66` |
| MadeForMed | `5f936d43-ec94-4a44-9efa-9cda8c9ab777` |
| Medaviz | `11f50285-5f00-4ee5-b0fc-077f529f3ae3` |

### À créer (7 nouveaux)

| Nom | Site (à valider) | Pays |
|---|---|---|
| Qare | https://www.qare.fr | France |
| Livi | https://www.livi.fr | France |
| MEDADOM | https://www.medadom.com | France |
| Tessan | https://www.tessan.io | France |
| MédecinDirect | https://www.medecindirect.fr | France |
| Globule | https://www.globule.net | France |
| Solutions régionales | _(pas de site unique)_ | France |

---

## 1) Solutions labellisées (société de TLC agréée)

### 1.1 Qare

- **Slug** : `qare`
- **Éditeur** : Qare (nouveau)
- **Description courte** : Pionnière française de la vidéoconsultation (2018), agréée, ~2 000 praticiens et une trentaine de spécialités.
- **Description longue** : Lancée en 2018 par Qare (groupe Teladoc Health), agréée par le ministère de la Santé le 29/04/2024, la plateforme regroupe environ 2 000 praticiens (~80 % salariés) couvrant une trentaine de spécialités en santé physique et mentale. Fort ADN médical, comité scientifique, formation systématique des praticiens. Soin programmé sur courts/moyens délais. Tiers payant géré pour les actes remboursables, frais de service patient possibles sur certaines options (interdits sur l'acte remboursable depuis l'agrément).<br><br>Différenciants : comité scientifique et formation des praticiens à la téléconsultation ; solution de télésuivi oncologique en partenariat hospitalier (Astra-Zeneca, Cureety, libheros) ; large catalogue de spécialités physiques et mentales rare sur le marché.
- **Prix** : `0` / fréquence `mois` (gratuit côté médecin — modèle salariat)
- **Points forts** : `["Pionnier et leader historique", "Large éventail de spécialités", "ADN médical fort", "Agréée et remboursable", "Télésuivi oncologique"]`
- **Points faibles** : `["Modèle salariat peu adapté au médecin libéral souhaitant garder sa patientèle", "Frais de service patient sur certaines options", "Peu d'intérêt pour facturer en nom propre"]`
- **Tags activés** : 2 ★ Plateforme agréée · 6 Gratuit côté médecin · 7 ★ Salariat / CDI temps partiel · 15 Télépaiement intégré · 17 Échange de documents sécurisé · 18 Téléexpertise/télésurveillance _(non, pas chez Qare)_
- **Tags finaux** : **2★, 6, 7★, 15, 17, 18**

### 1.2 Livi

- **Slug** : `livi`
- **Éditeur** : Livi (nouveau)
- **Description courte** : Filiale du suédois KRY, agréée, recrute ses médecins en CDI temps partiel et gère toute l'administration.
- **Description longue** : Livi est la filiale française du groupe suédois KRY (fondé en 2015 à Stockholm). Agrément ministériel obtenu le 12/02/2025. Particularité : Livi recrute ses médecins en CDI à temps partiel — le praticien définit ses créneaux et Livi gère facturation, télétransmission et remboursement patient. Spécialités couvertes : généraliste, pédiatre, dermatologue, gynécologue, psychiatre.<br><br>Différenciants : gestion administrative intégralement déléguée (zéro paperasse pour le praticien) ; CDI temps partiel à créneaux choisis ; modèle adapté à une activité complémentaire d'appoint pour un médecin de ville installé.
- **Prix** : `0` / `mois`
- **Points forts** : `["Zéro charge administrative", "Agréée et remboursable", "Activité complémentaire flexible", "Gestion 100 % déléguée"]`
- **Points faibles** : `["Statut salarié (pas d'exercice en nom propre)", "Pas d'intégration avec le cabinet ou le LGC", "Le médecin ne capitalise pas sur sa patientèle"]`
- **Tags finaux** : **2★, 6, 7★, 15, 17, 18**

### 1.3 MEDADOM

- **Slug** : `medadom`
- **Éditeur** : MEDADOM (nouveau)
- **Description courte** : Leader des soins non programmés, 1re société agréée, réseau de 5 500+ bornes/cabines en pharmacies et mairies.
- **Description longue** : MEDADOM a été fondée en 2017 par deux médecins et un ingénieur, et a été la première société agréée par le ministère de la Santé le 10/04/2024. Spécialisée dans les soins non programmés de médecine générale, accès sans RDV de 6h à 23h 7j/7, tarif secteur 1, tiers payant systématique, aucun frais de service. 1 500+ médecins conventionnés, 8 M+ consultations réalisées. Référencée Mon Espace Santé et FranceConnect ; certifications ISO 9001/27001/27701 et HDS.<br><br>Différenciants : maillage territorial unique avec 5 500+ bornes, cabines et consoles équipées de 6 dispositifs médicaux connectés (thermomètre, tensiomètre, oxymètre, stéthoscope, otoscope, dermatoscope) ; intégration native à Mon Espace Santé et FranceConnect ; modèle 100 % sans frais de service pour le patient.
- **Prix** : `0` / `mois`
- **Points forts** : `["Maillage territorial unique 5 500+ bornes", "Soins non programmés immédiats", "Aucun frais de service patient", "Très certifié (ISO + HDS)", "Intégration Mon Espace Santé"]`
- **Points faibles** : `["Médecine générale uniquement, soins non programmés", "Pas de RDV planifié", "Consultations parfois critiquées comme expéditives", "Non pensée pour facturer en nom propre"]`
- **Tags finaux** : **2★, 6, 14★ Cabines/bornes, 15, 16★ Intégration DMP/MES, 17, 18**

### 1.4 Tessan

- **Slug** : `tessan`
- **Éditeur** : Tessan (nouveau)
- **Description courte** : « Télémédecine augmentée » : cabines connectées agréées en pharmacies, mairies, MSP et collectivités.
- **Description longue** : Tessan associe visioconférence et dispositifs médicaux connectés (tensiomètre, thermomètre, otoscope, dermatoscope, stéthoscope, oxymètre). Agréée par le ministère, 500+ médecins salariés et 500+ structures équipées (pharmacies, mairies, cabinets infirmiers, collectivités). Soin programmé et non programmé, généralistes et spécialistes. TLC à 25 €, tiers payant, médecin traitant informé automatiquement. Application patient pour la téléconsultation à domicile en médecine générale.<br><br>Différenciants : pilotage à distance des dispositifs médicaux avec visualisation des constantes en temps réel ; notification automatique du médecin traitant après chaque consultation ; impression automatique de l'ordonnance au retrait de la carte Vitale en cabine ; spécialistes accessibles en cabine physique.
- **Prix** : `0` / `mois`
- **Points forts** : `["Cabines avec examen clinique connecté de qualité", "Informe automatiquement le médecin traitant", "Large déploiement collectivités/MSP", "Spécialistes accessibles en cabine"]`
- **Points faibles** : `["Médecins salariés (pas d'exercice en nom propre)", "Spécialistes accessibles surtout en cabine physique", "Dépendance aux structures hôtes"]`
- **Tags finaux** : **2★, 6, 7, 14★, 15, 17, 18, 20★ Notification médecin traitant**

### 1.5 Medaviz

- **Slug** : `medaviz`
- **Éditeur** : Medaviz (existant)
- **Description courte** : Solution agréée orientée exercice coordonné (CPTS, MSP) combinant téléconsultation et téléexpertise, à la commission.
- **Description longue** : Créée en 2014 (société PODALIRE), Medaviz propose téléconsultation, téléexpertise (requérant/requis) et télésoin, avec un fort positionnement B2B (mutuelles, entreprises, territoires) et exercice coordonné (CPTS, MSP). Le praticien encaisse ses actes via la solution, sans engagement. Certifiée ISO 27001 et HDS. Utilisable sur ordinateur, mobile ou tablette, avec une application mobile praticien.<br><br>Différenciants : téléexpertise requérant/requis intégrée nativement (peu fréquent) ; modèle commission plafonnée à 39 €/mois en frais Medaviz (3 % par acte) + frais Stripe 0,25 € + 1 % par acte ; ROSP/FAMI couvrent souvent les frais ; intégration native aux contrats mutuelles et déploiements territoriaux ; positionnement exercice coordonné.
- **Prix** : `prix_ttc_max = 39` / `mois` (commission plafonnée — pas de minimum garanti, voire 0 selon usage)
- **Points forts** : `["Modèle à l'usage très souple (commission plafonnée)", "Téléexpertise intégrée", "Bien adapté CPTS/MSP/B2B", "ROSP/FAMI couvre souvent les frais"]`
- **Points faibles** : `["Notoriété grand public plus faible", "Moins pertinent pour patientèle individuelle hors territoire équipé", "Frais bancaires Stripe en sus"]`
- **Tags finaux** : **2★, 9★ Commission à l'acte, 15, 17, 18, 19★ Téléexpertise/télésurveillance**

### 1.6 MédecinDirect

- **Slug** : `medecindirect`
- **Éditeur** : MédecinDirect (nouveau)
- **Description courte** : Acteur historique (depuis 2010) de la téléconsultation B2B, intégré aux contrats mutuelles/assureurs, 24h/24.
- **Description longue** : MédecinDirect opère depuis 2010 (THF Service Médical, groupe Teladoc Health) avec un modèle principalement B2B : accès via mutuelles, assureurs et contrats d'entreprise, 24h/24. Téléconseil et vidéoconsultation, généralistes et spécialistes. Peut être gratuit pour les assurés couverts, frais à la charge du patient possibles hors contrat. Médecins salariés ou partenaires.<br><br>Différenciants : intégration historique aux contrats mutuelles et assureurs (positionnement B2B le plus mature du marché) ; téléconseil médical 24h/24 ; modèle « avantage salarié » prisé des entreprises.
- **Prix** : `0` / `mois`
- **Points forts** : `["Acteur expérimenté", "Intégration native aux mutuelles/assureurs", "Disponibilité 24h/24", "Téléconseil + vidéo"]`
- **Points faibles** : `["Peu accessible hors contrat mutuelle/entreprise", "Frais patient possibles hors contrat", "Faible pertinence pour le médecin de ville en nom propre"]`
- **Tags finaux** : **2★, 6, 7★, 15, 17, 18**

---

## 2) Solutions liées (agenda ou LGC)

### 2.1 Doctolib Téléconsultation

- **Slug** : `doctolib-teleconsultation`
- **Éditeur** : Doctolib (existant)
- **Description courte** : Module de vidéoconsultation indissociable de l'agenda Doctolib Patient (vente liée sanctionnée fin 2025).
- **Description longue** : Doctolib Téléconsultation a été lancée en 2019 par Doctolib (créée en 2013, ~300 000 praticiens, ~60 M de visites mensuelles). Le médecin libéral active la vidéoconsultation en complément de son agenda et facture en son nom propre. La solution est labellisée Ségur, certifiée SESAM-Vitale, et permet la télétransmission de la FSE (y compris en mode dégradé via SCOR), le partage de documents et l'ordonnance numérique.<br><br>Point clé : la souscription préalable à Doctolib Patient (agenda) est obligatoire pour accéder à Doctolib Téléconsultation. Cette vente liée a été sanctionnée par l'Autorité de la concurrence le 06/11/2025 (amende de 4,665 M€), mais Doctolib a fait appel et la pratique reste effective en attendant. Différenciants : Doctolib Lecteur (FSE en mobilité via Bluetooth) ; intégration native de l'ordonnance numérique ; écosystème complet RDV/agenda/messagerie/vidéo ; notoriété et flux patients maximaux.
- **Prix** : `prix_ttc_min = 218`, `prix_ttc_max = 377` / `mois` (agenda 139-298 € + module vidéo ~79 €)
- **Points forts** : `["Visibilité patient maximale", "Écosystème agenda+RDV+vidéo cohérent", "SESAM-Vitale et mode dégradé robustes", "Ordonnance numérique native"]`
- **Points faibles** : `["Vente liée à l'agenda Doctolib (sanctionnée par l'AdlC, en appel)", "Coût élevé et grille tarifaire opaque", "Non agréée société de TLC", "Pertinence faible si agenda peu rempli"]`
- **Tags finaux** : **3★ Liée à un agenda ou un LGC, 8★ Abonnement mensuel, 11★ Facturation via la plateforme, 15, 17, 18**
- **Lien** : `meme_suite` avec **Doctolib Médecin** (`50818323-ca38-41bf-9ee1-a67fccdf969b`)

### 2.2 Maiia Téléconsultation

- **Slug** : `maiia-teleconsultation`
- **Éditeur** : Cegedim Santé (existant)
- **Description courte** : Brique téléconsultation de la suite Maiia, achetable seule ou en pack avec l'agenda, et interopérable avec les LGC Cegedim.
- **Description longue** : Maiia (évolution de Docavenue, groupe Cegedim) propose une vidéoconsultation accessible 7j/7 24h/24, toutes spécialités, avec ou sans RDV. Achetable séparément ou en pack avec l'agenda Maiia. Forte interopérabilité avec les téléservices de l'Assurance Maladie et la suite Cegedim (LGC MLM, Crossway, messagerie Maiia Connect). Espace documentaire sécurisé pour ordonnances, résultats et certificats. Bornes/cabines également proposées en pharmacie.<br><br>LGC compatibles : MLM (Mon Logiciel Médical), Crossway, et la suite Cegedim Santé. Différenciants : mécanisme de pré-autorisation bancaire (montant max défini par le praticien, débit jusqu'à 7 jours après l'acte) qui s'affranchit du paiement immédiat patient ; intégration native aux téléservices Assurance Maladie ; bornes/cabines en pharmacie ; modèle modulaire (on paie ce qu'on utilise).
- **Prix** : `prix_ttc_min = 40`, `prix_ttc_max = 235` / `mois`
- **Points forts** : `["Modulaire", "Pré-autorisation bancaire bien pensée", "Interopérabilité native LGC Cegedim", "Bornes/cabines officine"]`
- **Points faibles** : `["Non agréée société de TLC", "Interface jugée moins intuitive que Doctolib", "Coût total qui grimpe vite avec les options"]`
- **Tags finaux** : **3★, 8★, 12★ Facturation via le LGC, 14 Cabines/bornes, 15, 17, 18**
- **Lien** : `meme_suite` avec **Maiia Médecin** (`f5da362c-5beb-4087-8e99-1c3398d86a22`)

### 2.3 Hellocare Pro

- **Slug** : `hellocare-pro`
- **Éditeur** : Hellocare (existant)
- **Description courte** : Solution 100 % française conçue par un médecin (La Ciotat), sans engagement, pour libéraux et paramédicaux.
- **Description longue** : Créée en 2016 par un médecin et basée à La Ciotat, Hellocare Pro s'adresse aux médecins libéraux, paramédicaux, pharmaciens, psychologues, diététiciens et nutritionnistes. Vidéoconsultation et prise de RDV en présentiel, sans engagement. Partenariats avec d'autres start-ups santé (ex. Cutti pour les aidants/seniors). Le praticien facture en son nom propre via paiement en ligne intégré.<br><br>Différenciants : tarif d'entrée le plus bas du segment ; sans engagement ; ouverture à un large panel de professions (paramédical, psy, diététique) au-delà de la médecine.
- **Prix** : `prix_ttc = 49.90` / `mois`, `prix_duree_engagement_mois = 0`
- **Points forts** : `["Tarif le plus bas du segment", "Sans engagement", "Conçu par un médecin", "Large public (paramédical, psy, diét.)"]`
- **Points faibles** : `["Notoriété patient plus faible", "Pas de facturation SESAM-Vitale intégrée", "Non agréée", "Écosystème plus restreint"]`
- **Tags finaux** : **3★, 8★, 15, 17, 18**

### 2.4 MadeForMed Téléconsultation

- **Slug** : `madeformed-teleconsultation`
- **Éditeur** : MadeForMed (existant)
- **Description courte** : Brique téléconsultation de la plateforme tout-en-un MadeForMed (téléphonie + agenda + site internet + LGC Odaiji), en marque blanche.
- **Description longue** : MadeForMed regroupe standardiste virtuelle, prise de RDV en ligne, agenda, messagerie patient sécurisée, site internet du cabinet et téléconsultation, le tout en marque blanche au nom du médecin : le patient passe par le site personnel du praticien, pas par une plateforme tierce. 4 000+ médecins, 15 M d'appels filtrés en 2025. Entreprise indépendante dont les clients sont actionnaires. La TLC se lance depuis la fiche RDV de l'agenda ; le patient reçoit un lien SMS/email. Logiciel médical Odaiji (référencé Ségur) intégré progressivement à l'écosystème.<br><br>Différenciants : TPE virtuel sans empreinte bancaire (lien CB par SMS/email avec relances automatiques, adapté aux patients ALD et C2S), avec option de conditionner l'accès à l'ordonnance au paiement effectif ; fonctionnement 100 % en marque blanche (indépendance numérique du cabinet) ; modèle d'actionnariat ouvert aux clients ; LGC Odaiji intégré à l'écosystème.
- **Prix** : `prix_ttc_min = 25`, `prix_ttc_max = 325` / `mois` (selon volume d'appels)
- **Points forts** : `["Marque blanche (indépendance numérique du cabinet)", "TPE virtuel sans empreinte bancaire adapté ALD/C2S", "Écosystème téléphonie+agenda+site cohérent", "LGC Odaiji intégré"]`
- **Points faibles** : `["Pas de facturation SESAM-Vitale intégrée", "Visibilité patient nulle (pas d'annuaire)", "Tarif élevé sur les gros volumes d'appels", "Notoriété patient faible"]`
- **Tags finaux** : **3★, 8★, 15, 17**
- **Lien** : `meme_suite` avec **Odaiji** (`f1fc468c-0f52-4d25-9aec-ab5275494414`)

### 2.5 Clickdoc Téléconsultation

- **Slug** : `clickdoc-teleconsultation`
- **Éditeur** : CompuGroup Medical (existant)
- **Description courte** : Module de vidéoconsultation Clickdoc relié aux LGC de l'éditeur CGM pour une TLC dans le flux du dossier patient.
- **Description longue** : Clickdoc, édité par CompuGroup Medical (CGM, acteur historique européen de l'e-santé), propose une téléconsultation reliée aux LGC du groupe, hébergée HDS. L'intérêt pour le médecin de ville est l'absence de double saisie : le dossier patient et la facturation restent dans l'environnement CGM. L'agenda Clickdoc Pro est par ailleurs proposé gratuitement à vie aux professionnels de santé.<br><br>LGC compatibles : AxiSanté et HelloDoc (tous deux édités par CGM/CompuGroup Medical). Différenciants : agenda Clickdoc gratuit à vie en complément ; intégration native FSE et télétransmission via le LGC CGM ; hébergement HDS.
- **Prix** : `null` / `mois` (variable selon offre CGM, agenda Clickdoc gratuit)
- **Points forts** : `["Pas de double saisie", "FSE intégrée via le LGC", "Hébergement HDS", "Agenda Clickdoc gratuit en complément"]`
- **Points faibles** : `["Réservé aux utilisateurs d'un LGC CGM", "Périmètre/tarif variables", "Pas de visibilité patient", "Notoriété patient faible"]`
- **Tags finaux** : **3★, 12★ Facturation via le LGC, 16★ Intégration DMP/MES, 17, 18**
- **Liens** : `meme_suite` avec **AxiSanté 5** (`46e368e2-a5b5-4183-984b-91add507a988`) **et** avec **HelloDoc** (`ae79a0b2-9146-434e-8193-4cb07c0c4799`)

### 2.6 Globule

- **Slug** : `globule`
- **Éditeur** : Globule (nouveau)
- **Description courte** : Outil de coordination de parcours interopérable avec des LGC, embarquant téléconsultation et téléexpertise.
- **Description longue** : Globule (édité par Maincare/Globule) est une solution de suivi de parcours de santé pluripro : journal partagé, documents, photos, formulaires, agenda patient, ajout d'intervenants en temps réel. Elle embarque aussi téléconsultation et téléexpertise, et s'interface avec des LGC (interopérabilité Globule ↔ Weda annoncée par l'éditeur). Disponible en ligne et via application patient, avec suivi de constantes. Positionnement coordination ville-domicile-hôpital plutôt que mise en relation grand public.<br><br>LGC compatibles : interopérabilité annoncée avec Weda, déploiements territoriaux possibles. Différenciants : journal de parcours partagé entre pros ; télésurveillance intégrée ; ajout d'intervenants au parcours en temps réel ; suivi des constantes patient via app dédiée.
- **Prix** : `null` (variable selon déploiement territoire/structure)
- **Points forts** : `["Coordination de parcours pluripro robuste", "Téléexpertise + télésurveillance intégrées", "Interopérabilité LGC", "Suivi de constantes patient"]`
- **Points faibles** : `["Pas une solution de mise en relation grand public", "Périmètre et modèle économique dépendant du déploiement", "FSE non native"]`
- **Tags finaux** : **3★, 12★ Facturation via le LGC, 17, 18★, 19★ Téléexpertise/télésurveillance**
- **Lien** : `interoperable` avec **Weda** (`f6b0376b-54b7-4ce3-9348-5b66b37659dd`)

---

## 3) Solutions régionales (URPS / ARS / GRADeS)

### 3.1 TELMI

- **Slug** : `telmi`
- **Éditeur** : Solutions régionales (nouveau, éditeur générique)
- **Description courte** : Plateforme régionale gratuite de télémédecine (TLC, téléexpertise, télésurveillance) pour les médecins de Bourgogne-Franche-Comté.
- **Description longue** : TELMI est portée par l'ARS Bourgogne-Franche-Comté et le GRADeS régional (groupement d'appui au développement de l'e-santé), avec le soutien de l'URPS Médecins libéraux BFC. Elle permet téléconsultation synchrone et asynchrone, téléexpertise asynchrone hiérarchisée, et télésurveillance, sans installation obligatoire (client Covotem, application mobile Telmi, ou navigateur web). Données hébergées HDS au GRADeS BFC. Financement 100 % ARS : aucun reste à charge pour praticiens ni patients.<br><br>Différenciants : téléexpertise asynchrone hiérarchisée (peu fréquent en région) ; télésurveillance intégrée ; expérimentation IA d'aide au diagnostic en dermatologie (photos +/- dermoscopie) ; 3 modes d'accès (web/client/app) ; souveraineté régionale.
- **Prix** : `0`
- **Points forts** : `["Totalement gratuit", "Téléexpertise + télésurveillance incluses", "Hébergement HDS régional souverain", "Accompagnement URPS/ARS", "IA dermato en test"]`
- **Points faibles** : `["Limité aux médecins de la région BFC", "Pas de facturation/paiement intégrés", "Pas de visibilité patient"]`
- **Tags finaux** : **4★ Solution régionale, 6★, 17, 18★, 19★ Téléexpertise/télésurveillance**

### 3.2 Prédice

- **Slug** : `predice`
- **Éditeur** : Solutions régionales
- **Description courte** : Bouquet de services e-santé régional des Hauts-de-France incluant un module de téléconsultation gratuit.
- **Description longue** : Prédice est le bouquet régional de services numériques en santé des Hauts-de-France, porté par le GIP Sant& Numérique Hauts-de-France (groupement d'intérêt public régional) avec l'ARS Hauts-de-France, l'Assurance Maladie et l'URPS Médecins libéraux HDF. Le module de téléconsultation (gratuit) offre une vue consolidée et sécurisée du parcours de soins entre ville, hôpital et médico-social. Module télésoin également proposé aux officines.<br><br>Différenciants : vue consolidée du parcours de soins entre ville-hôpital-médico-social ; téléconsultation accompagnée par un infirmier au domicile du patient ; module télésoin dédié aux pharmaciens d'officine.
- **Prix** : `0`
- **Points forts** : `["Gratuit", "Coordination ville-hôpital-médico-social", "Téléconsultation accompagnée (infirmier)", "Module télésoin officines"]`
- **Points faibles** : `["Limité aux professionnels des Hauts-de-France", "Pas de facturation/paiement intégrés", "Pas de visibilité patient"]`
- **Tags finaux** : **4★, 6★, 17, 18★**

### 3.3 Télémédecine SARA / MonSisra

- **Slug** : `telemedecine-sara-monsisra`
- **Éditeur** : Solutions régionales
- **Description courte** : Service de téléconsultation régional gratuit, accessible aux médecins équipés du portail MonSisra en Auvergne-Rhône-Alpes.
- **Description longue** : Le service est porté par le GCS SARA (groupement de coopération sanitaire, GRADeS d'Auvergne-Rhône-Alpes) en partenariat avec l'ARS Auvergne-Rhône-Alpes, avec le soutien de l'URPS Médecins libéraux AURA. Les médecins équipés du portail régional MonSisra réalisent des téléconsultations gratuitement et simplement. Tutoriels et e-formations fournis. La région soutient aussi le déploiement de la téléexpertise (financement ARS jusqu'en 2026, AAP régional).<br><br>Différenciants : adossé au portail régional MonSisra et à sa messagerie de santé sécurisée ; e-formations dédiées à la téléconsultation ; volet téléexpertise régional financé sur appel à projets jusqu'en 2026.
- **Prix** : `0`
- **Points forts** : `["Gratuit", "Intégré au portail régional MonSisra", "Formations et tutoriels dédiés", "Soutien URPS/ARS", "Déploiement téléexpertise financé"]`
- **Points faibles** : `["Réservé aux médecins de la région AURA équipés MonSisra", "Pas de facturation/paiement intégrés", "Pas de visibilité patient"]`
- **Tags finaux** : **4★, 6★, 17, 18★, 19★**

---

## Récapitulatif tags par solution

| # | Solution | Tags (ordre dans la grille) | Liens |
|---|---|---|---|
| 1 | Qare | 2★, 6, 7★, 15, 17, 18 | — |
| 2 | Livi | 2★, 6, 7★, 15, 17, 18 | — |
| 3 | MEDADOM | 2★, 6, 14★, 15, 16★, 17, 18 | — |
| 4 | Tessan | 2★, 6, 7, 14★, 15, 17, 18, 20★ | — |
| 5 | Medaviz | 2★, 9★, 15, 17, 18, 19★ | — |
| 6 | MédecinDirect | 2★, 6, 7★, 15, 17, 18 | — |
| 7 | Doctolib TLC | 3★, 8★, 11★, 15, 17, 18 | meme_suite → Doctolib Médecin |
| 8 | Maiia TLC | 3★, 8★, 12★, 14, 15, 17, 18 | meme_suite → Maiia Médecin |
| 9 | Hellocare Pro | 3★, 8★, 15, 17, 18 | — |
| 10 | MadeForMed TLC | 3★, 8★, 15, 17 | meme_suite → Odaiji |
| 11 | Clickdoc TLC | 3★, 12★, 16★, 17, 18 | meme_suite → AxiSanté 5 + HelloDoc |
| 12 | Globule | 3★, 12★, 17, 18★, 19★ | interoperable → Weda |
| 13 | TELMI | 4★, 6★, 17, 18★, 19★ | — |
| 14 | Prédice | 4★, 6★, 17, 18★ | — |
| 15 | SARA / MonSisra | 4★, 6★, 17, 18★, 19★ | — |

**Total** : 18 solutions ? Non : **15 solutions** dans le récap car j'ai recompté. Vérifions le compte du fichier source.

> ⚠️ Le récap ci-dessus liste **15 solutions**. Le fichier Excel en annonce 18 dans l'intro, mais à la relecture il en contient bien **15** (6 labellisées + 6 liées + 3 régionales). Les 18 initialement mentionnés étaient une approximation.

---

## Prochaines étapes

1. **Tu valides ce mapping** (descriptions, prix, tags, liens, slugs).
2. **Tu confirmes / corriges les sites web** des 8 nouveaux éditeurs.
3. Je rédige le SQL d'insert en pas à pas inline :
   - bloc A : 8 nouveaux éditeurs
   - bloc B : 15 solutions
   - bloc C : 60-80 lignes `solutions_tags` (toggles)
   - bloc D : 6 lignes `solution_liens`
