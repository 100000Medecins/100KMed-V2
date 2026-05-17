# Questionnaire d'évaluation — Catégorie Télétransmission

> Dernière mise à jour : **2026-05-17**
>
> Version conçue lors de la session de seeding initial de la catégorie Télétransmission (5 étapes terminées : 1 catégorie, 4 éditeurs nouveaux, 23 tags, 20 solutions, 203 liaisons). Prêt pour implémentation BDD à la prochaine session.

## Principes

- **3 sections** (compactage inspiré de la catégorie Logiciels métier)
- **Hiérarchie à 2 niveaux** : chaque section a une note parente (obligatoire) et des critères enfants (optionnels)
- **Notes 0-5** par critère
- **Pas de doublon avec les tags** : les tags fonctionnels (Pack téléservices, Compatible apCV, Mode hors connexion, etc.) disent *si* la feature existe ; le questionnaire dit *comment elle est vécue*
- **Parcours minimum** : 3 clics (3 notes parents) pour un questionnaire valide
- **Parcours maximum** : 23 notes (3 parents + 20 enfants, dont 1 conditionnel)

---

## Section 1 — Fiabilité de la télétransmission

**Question principale (obligatoire)** : « Globalement, la télétransmission est-elle fiable au quotidien ? »

| # | Critère | Ce qu'on évalue |
|---|---|---|
| 1.1 | Stabilité du moteur de télétransmission | Peu/pas de rejets FSE injustifiés, peu de plantages |
| 1.2 | Conformité réglementaire à jour | Addendum 8 disponible rapidement, mises à jour CCAM/NGAP automatiques, apCV |
| 1.3 | Qualité d'intégration des téléservices AM | ADRi/AATi/ALDi… remontent vite, sans bug, avec contexte patient pré-rempli |
| 1.4 | Compatibilité matériel | Reconnaissance fluide des lecteurs Vitale / apCV, pas de manipulation manuelle |

---

## Section 2 — Quotidien : facturation, tiers payant, comptabilité

**Question principale (obligatoire)** : « La gestion financière et la facturation vous font-elles gagner du temps ? »

| # | Critère | Ce qu'on évalue | Conditionnel |
|---|---|---|---|
| 2.1 | Vitesse de saisie d'un acte | Nombre de clics moyen, raccourcis clavier, listes d'actes personnalisables | — |
| 2.2 | Pré-remplissage automatique | Lecture Vitale → fiche patient à jour, parcours soin pré-rempli (ADRi) | — |
| 2.3 | Suggestion de cotations adaptées au contexte | Le logiciel propose la cotation correcte selon le contexte (âge, ALD, motif, parcours soin, secteur) ; détection des majorations applicables (MEG, MIC, COE…) ; alertes sur incompatibilités d'actes | — |
| 2.4 | Cohésion avec le LGC parent | FSE préparée depuis le dossier patient, pas de double saisie, navigation fluide entre dossier/prescription/facturation, partage des données | **Solutions intégrées au LGC uniquement** |
| 2.5 | Tiers payant intégral | Fluidité AMO + AMC, gestion automatique des conventions mutuelles | — |
| 2.6 | Rapprochement NOEMIE automatique | Pointage auto des retours, peu d'écarts à reprendre à la main | — |
| 2.7 | Gestion des rejets et impayés | Détection, alertes, parcours de correction simple | — |
| 2.8 | Suivi comptable | Module compta intégré ou export 2035 propre, recettes consultables | — |

---

## Section 3 — Mobilité, matériel & relation éditeur

**Question principale (obligatoire)** : « L'outil et son éditeur tiennent-ils sur la durée et hors du cabinet ? »

| # | Critère | Ce qu'on évalue |
|---|---|---|
| 3.1 | Mode hors connexion / zone blanche | Facturation possible sans réseau, synchro automatique au retour |
| 3.2 | App mobile / tablette | Disponibilité d'un client mobile fonctionnel (pas dégradé) |
| 3.3 | TPE CB intégré au flux télétransmission | Encaissement carte directement dans le flux, sans repasser sur un autre terminal |
| 3.4 | Délégation au secrétariat | Comptes secrétaire avec droits adaptés, télétransmission via la CPS du médecin |
| 3.5 | Support technique au quotidien | Réactivité (temps de réponse téléphone/email), disponibilité (5j/7, 7j/7), qualité des réponses |
| 3.6 | SAV & relation commerciale | Gestion des litiges, transparence des conditions contractuelles, facilité de sortie / d'export des données |
| 3.7 | Documentation, formation, qualité des mises à jour | Tutos vidéos, doc en ligne, formation initiale, absence de régressions, communication claire des MAJ |
| 3.8 | Rapport qualité-prix | Valeur perçue par rapport au tarif facturé, absence de surprises sur la facture |

---

## Récap chiffré

| Section | Note parente | Critères enfants | Dont conditionnels |
|---|---|---|---|
| 1. Fiabilité | 1 | 4 | 0 |
| 2. Quotidien financier | 1 | 8 | 1 (LGC uniquement) |
| 3. Mobilité, matériel, éditeur | 1 | 8 | 0 |
| **Total** | **3** | **20** | **1** |

---

## Prochaine étape : implémentation BDD

À faire dans une session dédiée :

1. **Créer les `criteres`** (table `public.criteres`) avec hiérarchie `parent_id`
   - 3 critères parents (un par section)
   - 19 critères enfants (rattachés à leur parent)
   - Conserver les IDs générés
2. **Mettre à jour `categories.schema_evaluation`** (JSONB) avec la structure attendue :
   ```json
   {
     "detail": {
       "steps": [
         {
           "titre": "Fiabilité de la télétransmission",
           "question": "Globalement, la télétransmission est-elle fiable au quotidien ?",
           "listeCriteres": [
             { "ID_PARENT_S1": [
               { "ID_1_1": false },
               { "ID_1_2": false },
               { "ID_1_3": false },
               { "ID_1_4": false }
             ]}
           ]
         },
         ...
       ]
     }
   }
   ```
3. **Mettre à jour `categories.criteres_recherche`** (JSONB array) avec les IDs des critères mis en avant dans la page comparatif (à choisir : probablement les 3 parents + 2-3 enfants clés comme NOEMIE, Mode hors connexion, Rapport qualité-prix)
4. **Tester le flow** `/solution/noter/teletransmission/[idSolution]` de bout en bout
5. **Gérer le conditionnel 2.3** (n'apparaît que pour les solutions taggées "Intégré dans le LGC") — vérifier que le composant d'évaluation supporte ce cas, sinon le rendre inconditionnel et accepter qu'il soit noté "N/A" par les utilisateurs de solutions standalone
