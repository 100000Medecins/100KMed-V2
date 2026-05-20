# Questionnaire d'évaluation — Catégorie Télétransmission

> Dernière mise à jour : **2026-05-17** — implémentation BDD terminée le même jour.

## Statut : implémenté ✅

Tables BDD peuplées le 2026-05-17 :
- `questionnaire_sections` : 3 lignes pour `categorie_slug = 'teletransmission'`
- `questionnaire_questions` : 20 lignes rattachées à ces sections

Le questionnaire est servi automatiquement par `getSectionsForSlug('teletransmission')` ([src/lib/actions/questionnaires.ts:43](src/lib/actions/questionnaires.ts#L43)) sur les pages `/solution/noter/teletransmission/[idSolution]`. Aucune modif de code n'a été nécessaire.

**Vérifier / éditer dans l'admin** : `/admin/questionnaires?slug=teletransmission`

---

## Architecture réelle (à connaître avant d'ajouter d'autres catégories)

Le système d'évaluation a **2 niveaux**, communs à toutes les catégories :

### Niveau 1 — Les 5 critères majeurs (fixes, partout)

Hardcodés dans [src/app/solution/noter/[...slug]/page.tsx:18](src/app/solution/noter/[...slug]/page.tsx#L18) :
- `interface` — Ergonomie et facilité d'utilisation
- `fonctionnalites` — Couverture fonctionnelle
- `fiabilite` — Stabilité, fiabilité technique
- `editeur` — Qualité du support et de l'accompagnement
- `qualite_prix` — Rapport qualité/prix

Le médecin note ces 5 critères en étape 1 (obligatoire), avec une question générique par critère.

### Niveau 2 — Questions détaillées par catégorie (BDD)

Stockées dans `questionnaire_sections` + `questionnaire_questions`. **Chaque question est taggée avec un des 5 critères majeurs** via la colonne `critere_majeur`. En étape 2, si une majorité des sous-questions d'un critère majeur reçoit une note, la note moyenne **remplace** la note initiale du niveau 1 (logique dans [page.tsx:619](src/app/solution/noter/[...slug]/page.tsx#L619) `buildRefinedCritereScores`).

C'est pour ça que mon design initial avec "3 notes parents + 20 enfants" ne mappait pas : les "parents" sont en fait les 5 critères majeurs fixes, et nos 20 critères sont des **détails optionnels** rattachés à un majeur.

---

## Contenu du questionnaire

### Section 1 — Fiabilité de la télétransmission
*Introduction : « À propos de la solidité technique de la solution au jour le jour : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tt_stabilite_moteur` | Le moteur de télétransmission est-il stable au quotidien (peu de rejets FSE injustifiés, peu de plantages) ? | `fiabilite` |
| `tt_conformite_reglementaire` | Les mises à jour réglementaires (Addendum, CCAM/NGAP, apCV) sont-elles disponibles rapidement et sans accroc ? | `fiabilite` |
| `tt_qualite_teleservices` | Les téléservices AM (ADRi, AATi, ALDi…) remontent-ils vite et avec le contexte patient pré-rempli ? | `fonctionnalites` |
| `tt_compatibilite_materiel` | La reconnaissance des lecteurs Vitale / apCV est-elle fluide, sans manipulation manuelle ? | `fonctionnalites` |

### Section 2 — Quotidien : facturation, tiers payant, comptabilité
*Introduction : « Concernant la facturation au fil de la consultation et la suite financière : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tt_vitesse_saisie` | La saisie d'un acte est-elle rapide (clics réduits, raccourcis, listes d'actes personnalisables) ? | `interface` |
| `tt_preremplissage_auto` | Le pré-remplissage automatique fonctionne-t-il bien (lecture Vitale, ADRi, parcours soin) ? | `fonctionnalites` |
| `tt_suggestion_cotations` | Le logiciel suggère-t-il les cotations adaptées au contexte (âge, ALD, motif, parcours soin, secteur) et détecte-t-il les majorations applicables (MEG, MIC, COE…) ? | `fonctionnalites` |
| `tt_integration_lgc` | L'intégration au LGC est-elle de qualité — qu'il soit le LGC parent (FSE depuis le dossier patient, pas de double saisie) ou un LGC tiers (API, échanges fluides) ? | `interface` |
| `tt_tiers_payant` | Le tiers payant intégral (AMO + AMC + mutuelles) est-il fluide et géré automatiquement ? | `fonctionnalites` |
| `tt_noemie` | Le rapprochement NOEMIE est-il automatique avec peu d'écarts à reprendre à la main ? | `fonctionnalites` |
| `tt_gestion_rejets` | La gestion des rejets et impayés est-elle simple (détection, alertes, parcours de correction) ? | `fonctionnalites` |
| `tt_suivi_comptable` | Le suivi comptable est-il satisfaisant (module intégré ou export 2035 propre, recettes consultables) ? | `fonctionnalites` |

### Section 3 — Mobilité, matériel & relation éditeur
*Introduction : « Sur les usages mobiles, le matériel et la qualité de l'éditeur : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tt_hors_connexion` | Le mode hors connexion (zone blanche, perte de réseau) fonctionne-t-il bien, avec synchronisation automatique au retour ? | `fonctionnalites` |
| `tt_mobile_tablette` | L'app mobile ou tablette est-elle fonctionnelle (pas une version dégradée) ? | `fonctionnalites` |
| `tt_tpe_cb` | Le TPE CB est-il intégré au flux de télétransmission (encaissement sans passer par un autre terminal) ? | `fonctionnalites` |
| `tt_delegation_secretariat` | La délégation au secrétariat est-elle bien pensée (comptes secrétaire, droits adaptés, télétransmission via la CPS du médecin) ? | `fonctionnalites` |
| `tt_support_quotidien` | Le support technique au quotidien est-il réactif, disponible (5j/7, 7j/7) et de qualité ? | `editeur` |
| `tt_sav_commercial` | Le SAV et la relation commerciale sont-ils satisfaisants (gestion des litiges, transparence, facilité de sortie/export des données) ? | `editeur` |
| `tt_doc_formation_maj` | La documentation, la formation et la qualité des mises à jour sont-elles à la hauteur (tutos, doc en ligne, absence de régressions, communication claire) ? | `editeur` |
| `tt_rapport_qualite_prix` | Le rapport qualité-prix est-il satisfaisant (valeur perçue vs tarif facturé, absence de surprises sur la facture) ? | `qualite_prix` |

---

## Répartition des 20 questions par critère majeur

| Critère majeur | Nb questions | Lesquelles |
|---|---|---|
| `interface` | 2 | vitesse_saisie, integration_lgc |
| `fonctionnalites` | 12 | qualite_teleservices, compatibilite_materiel, preremplissage_auto, suggestion_cotations, tiers_payant, noemie, gestion_rejets, suivi_comptable, hors_connexion, mobile_tablette, tpe_cb, delegation_secretariat |
| `fiabilite` | 2 | stabilite_moteur, conformite_reglementaire |
| `editeur` | 3 | support_quotidien, sav_commercial, doc_formation_maj |
| `qualite_prix` | 1 | rapport_qualite_prix |
| **Total** | **20** | |

Déséquilibre assumé : `fonctionnalites` est volumineux car la télétransmission est *fonctionnellement* dense. Pour `qualite_prix`, une seule question suffit car le sujet est uniforme.

---

## Notes pour les prochaines catégories

- Une question = un `key` unique (convention de préfixe par catégorie : `agenda_*`, `detail_*` pour Logiciels métier, `tt_*` ici). Le `key` est ce qui est stocké dans `evaluations.scores` JSONB → ne pas le renommer après publication.
- Chaque question doit avoir exactement un `critere_majeur` parmi les 5 fixes. Pas de niveau intermédiaire possible dans le modèle actuel.
- Pas besoin de toucher au code de [src/app/solution/noter/[...slug]/page.tsx](src/app/solution/noter/[...slug]/page.tsx) : il lit la BDD automatiquement.
- Le hardcode `SECTIONS_DETAILLEES` / `SECTIONS_PAR_CATEGORIE` dans `page.tsx` est aujourd'hui du code mort (jamais atteint car le slug `default` existe en BDD avec 10 sections). Suppression prévue (voir TODO "Refacto questionnaires d'évaluation").
