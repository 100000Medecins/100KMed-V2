# Questionnaire d'évaluation — Catégorie Téléexpertise

> Proposé et validé le **2026-06-21** — **implémenté en BDD le même jour** (3 sections / 17 questions vérifiées).
> Modèle : calqué sur `docs/2026-05-17-teletransmission-questionnaire.md` (livré 2026-05-17) et `docs/2026-06-09-teleconsultation-questionnaire.md`.

## Statut : implémenté ✅

- `questionnaire_sections` : 3 lignes pour `categorie_slug = 'teleexpertise'`
- `questionnaire_questions` : 17 lignes rattachées (préfixe `tle_*`)

**Vérifier / éditer dans l'admin** : `/admin/questionnaires?slug=teleexpertise`. Catégorie encore `actif=false` → testable via l'URL directe `/solution/noter/teleexpertise/[slug]`.

---

## Rappel architecture (lecture rapide)

Le système d'évaluation a 2 niveaux, communs à toutes les catégories :

1. **5 critères majeurs fixes** (hardcodés dans `src/app/solution/noter/[...slug]/page.tsx`) :
   `interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`. Le médecin les note en étape 1.

2. **Questions détaillées en BDD** (`questionnaire_sections` + `questionnaire_questions`), chaque question taggée avec un des 5 critères majeurs. En étape 2, la moyenne des sous-questions d'un critère **remplace** la note de niveau 1 si la majorité reçoit une note.

**Convention de `key`** : préfixe `tle_*` pour cette catégorie (téléexpertise), distinct de `tlc_*` (téléconsultation) et `tt_*` (télétransmission). Le `key` est stocké dans `evaluations.scores` JSONB → **immuable une fois publié**.

---

## Spécificités de la catégorie à respecter

Le catalogue Téléexpertise regroupe **10 solutions** (cf [docs/2026-06-04-teleexpertise-import.md](2026-06-04-teleexpertise-import.md)) très hétérogènes : plateformes nationales (Omnidoc, Rofim), territoriales/régionales (Medaviz, MonSisra, plateformes GRADeS), intégrées au LGC (Doctolib/Siilo), et thématiques dermatologie (DermatoExpert, Tessan, Avisdoc).

La téléexpertise est un **avis asynchrone entre médecins** (requérant → expert/requis), pas une consultation patient. Les questions portent donc sur : solliciter/atteindre le bon expert, transmettre un dossier documenté, le compte rendu d'avis, la cotation de l'acte, l'e-RCP, et la relation éditeur. Pas de question « téléconsultation » (couverte par sa propre catégorie) ni « facturation FSE patient ».

---

## Contenu validé — 17 questions / 3 sections

### Section 1 — Demander un avis & transmettre le dossier
*Introduction : « Sur le cœur de la téléexpertise : déclencher une demande d'avis et transmettre un dossier complet : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tle_solliciter_simplicite` | Créer une demande d'avis est-il simple et rapide (parcours requérant clair, peu de clics) ? | `interface` |
| `tle_trouver_expert` | Trouver le bon expert est-il facile (annuaire, recherche par spécialité/territoire, réseaux d'experts nationaux ou régionaux), y compris sans confrère habituel ? | `fonctionnalites` |
| `tle_dossier_documents` | La constitution du dossier est-elle riche et pratique (joindre photos, imagerie, documents, antécédents, contexte patient) ? | `fonctionnalites` |
| `tle_suivi_demande` | Le suivi des demandes est-il fiable (notifications, relances, état d'avancement, délais de réponse tenus) ? | `fiabilite` |

### Section 2 — Compte rendu, facturation & administratif
*Introduction : « Sur l'avis rendu, son intégration au dossier et la facturation de l'acte : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tle_compte_rendu` | Le compte rendu d'avis est-il généré automatiquement, clair et réutilisable ? | `fonctionnalites` |
| `tle_integration_dossier` | Le CR et les échanges s'intègrent-ils bien à votre dossier patient / LGC (versement automatique, pas de double saisie, partage MSSanté) ? | `interface` |
| `tle_facturation_acte` | La facturation de l'acte (cotation requérant/requis, traçabilité, export comptable) est-elle simple et fiable ? | `fonctionnalites` |
| `tle_charge_administrative` | La charge administrative résiduelle (justificatifs, déclarations, paperasse) est-elle réduite au minimum ? | `interface` |
| `tle_modele_transparent` | Le modèle économique est-il transparent et clair dès le départ (gratuit en individuel, options structure/premium, commission) sans frais cachés ? | `qualite_prix` |
| `tle_rapport_qualite_prix` | Le rapport qualité-prix global est-il satisfaisant (valeur apportée vs coût pour vous ou votre structure) ? | `qualite_prix` |

### Section 3 — e-RCP, fiabilité, conformité & éditeur
*Introduction : « Sur les fonctions collaboratives avancées, la robustesse, la sécurité des données et la qualité de l'éditeur : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tle_e_rcp` | Si vous utilisez les RCP en ligne (e-RCP), l'organisation et le déroulé (planification, partage de dossiers, traçabilité des décisions) sont-ils satisfaisants ? | `fonctionnalites` |
| `tle_mobilite` | L'usage en mobilité (app mobile, tablette) est-il satisfaisant et non dégradé par rapport au desktop ? | `fonctionnalites` |
| `tle_stabilite` | La solution est-elle stable et performante au quotidien (peu de pannes, bonne disponibilité du service) ? | `fiabilite` |
| `tle_securite_conformite` | Les garanties de sécurité et de conformité sont-elles claires et tenues (HDS, PSC/CPS, RGPD, hébergement UE) ? | `fiabilite` |
| `tle_support` | Le support technique est-il réactif, disponible et de qualité ? | `editeur` |
| `tle_accompagnement` | L'accompagnement (onboarding, formation, conseil sur la cotation / le parcours de soin) est-il à la hauteur ? | `editeur` |
| `tle_evolutions` | L'éditeur communique-t-il clairement sur les évolutions, les changements réglementaires, et écoute-t-il les retours utilisateurs ? | `editeur` |

---

## Répartition des 17 questions par critère majeur

| Critère majeur | Nb questions | Lesquelles |
|---|---|---|
| `interface` | 3 | solliciter_simplicite, integration_dossier, charge_administrative |
| `fonctionnalites` | 6 | trouver_expert, dossier_documents, compte_rendu, facturation_acte, e_rcp, mobilite |
| `fiabilite` | 3 | suivi_demande, stabilite, securite_conformite |
| `editeur` | 3 | support, accompagnement, evolutions |
| `qualite_prix` | 2 | modele_transparent, rapport_qualite_prix |
| **Total** | **17** | |

Décision 2026-06-21 : `tle_imagerie` retirée (redite avec `tle_dossier_documents` qui couvre déjà l'ajout de pièces, dont l'imagerie). `tle_e_rcp` conservée (skippable pour qui n'en fait pas).

---

## Implémentation BDD

Le questionnaire est servi automatiquement par `getSectionsForSlug('teleexpertise')` sur `/solution/noter/teleexpertise/[idSolution]` une fois les lignes insérées. Aucune modif de code nécessaire.

Le SQL d'insertion (3 sections + 17 questions) a été passé dans le SQL Editor Supabase le 2026-06-21 (retour `3 / 17` vérifié).

La catégorie restera `actif=false` (invisible en navigation publique) ; le parcours est testable via l'URL directe ci-dessus.
