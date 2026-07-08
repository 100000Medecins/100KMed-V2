# Plan — Synchroniser `questionnaire_questions` ↔ `criteres`

**Overall Progress:** `100%`

> Code écrit, `tsc --noEmit` OK, DDL + mini-fix data appliqués, types régénérés (`nom_court` présent dans `database.ts`), **test d'intégration BDD 19/19 OK** (2026-07-08). Reste (optionnel) : smoke test UI dans `/admin/questionnaires`.

_Créé le 2026-07-08. Approche A (miroir dans les server actions)._

## TLDR

Aujourd'hui l'admin ([QuestionnaireEditor.tsx](../src/components/admin/QuestionnaireEditor.tsx) → [questionnaires.ts](../src/lib/actions/questionnaires.ts)) n'écrit que dans `questionnaire_questions` (affichage du formulaire). La table `criteres` (moyennes de sous-critères + « Comparatif détaillé par sous-critères ») doit être complétée **à la main** — fragile. But : que chaque `createQuestion` / `updateQuestion` / `deleteQuestion` maintienne automatiquement la ligne `criteres` jumelle, pour garder l'invariant **0 orphelin** sans intervention manuelle.

## Acquis (exploration 2026-07-08, ne pas re-supposer)

- **Lien** : `questionnaire_questions.key` = `criteres.identifiant_tech` (lien mou, pas de FK).
- **Parent** : les 5 majeurs sont `criteres` `type='note'`, `parent_id=null`, `identifiant_tech` = exactement les 5 `critere_majeur`. → `parent_id` du jumeau = `id` du majeur dont `identifiant_tech = critereMajeur`.
- **Catégorie** : `criteres.id_categorie` d'un enfant = `categories.id` de sa catégorie ; `questionnaire_sections.categorie_slug` = `categories.slug`. → résolution slug → `categories.id`.
- **`type` non uniforme (piège)** : `logiciel-medical` utilise `type='detail'` ; **toutes les autres catégories** utilisent `type=NULL`. ⟹ **copier `type` (et `id_categorie`) depuis un frère existant** de la même catégorie, jamais hardcoder. (Le script e-CPF a mis `'detail'` en télétransmission → 1 intrus à corriger, cf. Étape 6.)
- **Champs d'un enfant** : seuls `identifiant_tech`, `id_categorie`, `parent_id`, `type`, `is_parent=false`, `is_enfant=true`, `nom_court` sont peuplés. Le reste (`nom_long`, `nom_capital`, `question`, `information`, `reponse_*`) est NULL.
- **`nom_court`** est **user-facing** mais **absent du formulaire admin** → cf. décision tranchée ci-dessous.
- `criteres` n'a **pas** de colonne `ordre` pour les enfants → `reorderQuestions` = no-op.
- `criteres.id` est `text` (valeurs UUID) → `randomUUID()` comme dans le script e-CPF.
- **Chaîne d'affichage du comparatif détaillé (vérifiée 2026-07-08)** :
  - Libellé de chaque sous-critère = `criteres.nom_court` (repli `identifiant_tech`, puis `''`) — [comparison.ts:92](../src/lib/actions/comparison.ts#L92) → [ComparisonSection.tsx:518](../src/components/solutions/detail/ComparisonSection.tsx#L518). Donc `nom_court` null ⟹ affiche la clé technique (moche) : justifie l'Option A.
  - Titres de groupe = **codés en dur** dans `GROUP_NAMES` ([comparison.ts:23-29](../src/lib/actions/comparison.ts#L23-L29)), pas la BDD.
  - Appariement des sous-critères entre solutions = par **`criteres.id`**.
  - **La donnée passe par `resultats`** (`getAllResultats`, filtré `is_enfant=true`), pas `criteres` en direct. Le jumeau `criteres` est **nécessaire** (porte `is_enfant`/`parent_id`/`nom_court`) mais la **valeur** vient de l'agrégation des `evaluations` → **la synchro ne touche pas `resultats`**.

## Critical Decisions

- **Source du `nom_court`** — ✅ **TRANCHÉ (Option A)** : colonne `nom_court` sur `questionnaire_questions` + input « Libellé court » dans l'éditeur (source de vérité dans le form). Coût : 1 DDL + régé types + petit input + signatures `create/updateQuestion` étendues. Justifié par la chaîne d'affichage vérifiée (un `nom_court` null afficherait la clé technique dans le comparatif).
- **Résolution du jumeau** : par **copie d'un frère** de la même catégorie (hérite `type` + `id_categorie`). Fallback si catégorie sans aucun enfant : `id_categorie` via slug→`categories.id`, `type=null` (convention majoritaire).
- **Atomicité** : écritures séquentielles pragmatiques + garde-fou « check orphelins » d'abord ; durcissement RPC Postgres seulement si besoin (pas au 1er jet).
- **Périmètre inchangé** : on n'ajoute que des lignes `criteres` `is_enfant` ; aucun impact sur le scoring/affichage public existant (données déjà 100 % synchro).

## Tasks

- [x] 🟩 **Étape 0 : Exploration & audit** *(fait 2026-07-08)*
  - [x] 🟩 Audit orphelins = 0 ; schéma `criteres` + mapping catégorie/parent/type confirmés ; formulaire admin lu.

- [x] 🟩 **Étape 1 : Helper `resolveCritereTwin(sectionId, critereMajeur)`** dans [questionnaires.ts](../src/lib/actions/questionnaires.ts) *(fait)*
  - [ ] 🟥 Récupérer la `categorie_slug` de la section, puis un **frère** (`criteres` `is_enfant=true` de cette catégorie) → hérite `id_categorie` + `type`.
  - [ ] 🟥 `parent_id` = `id` du `criteres` `type='note'` où `identifiant_tech = critereMajeur`.
  - [ ] 🟥 Fallback sans frère : `id_categorie` via `categories.slug=categorie_slug`, `type=null`.
  - [ ] 🟥 Retourne `{ id_categorie, parent_id, type }` (ou une erreur claire si majeur/catégorie introuvable).

- [x] 🟩 **Étape 2 : Miroir dans `createQuestion`** *(fait — INSERT jumeau + rollback si échec)*
  - [ ] 🟥 Après l'INSERT `questionnaire_questions`, INSERT `criteres` jumeau (`id=randomUUID()`, `identifiant_tech=key`, `id_categorie`, `parent_id`, `type`, `is_parent=false`, `is_enfant=true`, `nom_court`).
  - [ ] 🟥 Idempotence : ne pas dupliquer si un `criteres.identifiant_tech=key` existe déjà (check ou upsert).

- [x] 🟩 **Étape 3 : Miroir dans `updateQuestion`** *(fait — lit l'ancienne clé, UPDATE ou auto-répare)*
  - [ ] 🟥 Lire l'**ancienne `key`** (via `id`) avant l'UPDATE pour localiser le jumeau.
  - [ ] 🟥 UPDATE `criteres` (où `identifiant_tech = ancienneKey`) : `identifiant_tech=nouvelleKey`, `parent_id=` majeur recalculé, `nom_court` (si Option A).
  - [ ] 🟥 Si aucun jumeau (donnée historique) : le créer (auto-réparation).

- [x] 🟩 **Étape 4 : Miroir dans `deleteQuestion`** *(fait)*
  - [ ] 🟥 Lire la `key` (via `id`), puis DELETE `criteres` où `identifiant_tech=key`, avant/après le DELETE de la question.

- [x] 🟩 **Étape 5 : `deleteSection` — éviter l'orphelin inverse** *(fait — aucune FK confirmée : supprime jumeaux + questions + section)*
  - [ ] 🟥 Vérifier la FK `questionnaire_questions.section_id` (cascade ?). Récupérer les `key` des questions de la section puis DELETE les jumeaux `criteres` correspondants (avant la suppression de la section).
  - [ ] 🟥 `reorderQuestions` / `reorderSections` : **no-op** documenté (pas d'`ordre` sur les enfants `criteres`).

- [x] 🟩 **Étape 6 : Corriger l'intrus e-CPF** *(fait — `tt_ecpf_remplacant.type = NULL` vérifié)*
  - [ ] 🟥 `tt_ecpf_remplacant` est `type='detail'` alors que ses 20 frères télétransmission sont `NULL` → passer à `NULL` (mini-fix data, aligne sur la convention catégorie).

- [x] 🟩 **Étape 7 : Plomberie `nom_court`** *(Option A — code + DDL + régé types faits ; `nom_court` vérifié dans `database.ts`)*
  - [ ] 🟥 DDL `ALTER TABLE questionnaire_questions ADD COLUMN nom_court text;` + régé `src/types/database.ts`.
  - [ ] 🟥 Input « Libellé court » dans [QuestionnaireEditor.tsx](../src/components/admin/QuestionnaireEditor.tsx) (create + edit).
  - [ ] 🟥 Étendre signatures/types `create/updateQuestion` + `QuestionnaireQuestion` pour porter `nom_court`.

- [x] 🟩 **Étape 8 : Garde-fou & vérif** *(fait — test d'intégration BDD 19/19 : create/update/delete + 0 orphelin ; smoke UI optionnel reste à David)*
  - [ ] 🟥 **Confirmer que le jumeau suffit** : vérifier comment l'agrégation écrit les `resultats` d'un sous-critère (`computeAggregatedResultats` / writer) — si elle résout la `key` via `criteres.identifiant_tech`, alors créer le jumeau suffit pour que la valeur remonte au fil des évaluations (la synchro ne touche pas `resultats`).
  - [ ] 🟥 Requête « orphelins » réutilisable (`questionnaire_questions.key` LEFT JOIN `criteres` + le sens inverse) → doit rester 0.
  - [ ] 🟥 Test manuel dans `/admin/questionnaires` : créer / éditer (changer clé + majeur + libellé court) / supprimer une question de test ; vérifier apparition/MAJ/suppression du jumeau + libellé dans le comparatif + relancer la requête orphelins.

## Hors scope (assumé)

- Trigger Postgres (option C) et unification en 1 table (option B) : écartés — cf. TODO. RPC atomique = durcissement ultérieur seulement si un orphelin transitoire réel est observé.
