# Nettoyage BDD — Héritage Firebase

> Session du 2026-04-26. Trace de l'audit et des décisions prises.

---

## Contexte

Le site 100 000 Médecins a été migré de Firebase vers Supabase. Le nouveau site
(dev.100000medecins.org) est en test restreint — pas encore déployé publiquement.
L'ancien site (www.100000medecins.org) tourne toujours sur Firebase.

---

## Ce qu'on a découvert

### Deux formats coexistent dans `evaluations.scores`

**Format Firebase (0-10)**
```json
{ "interface": 8, "fonctionnalites": 7, "fiabilite": 9, "editeur": 6, "qualite_prix": 8 }
```

**Format Supabase (0-5)**
```json
{
  "interface": 4,          ← note principale raffinée
  "fonctionnalites": 3,
  "detail_connexion": 5,   ← sous-critères optionnels
  "detail_agenda": 3,
  ...
}
```

La détection du format se fait par présence de clés `detail_*` dans le JSONB.

### Règle de raffinement (nouveau questionnaire)
Pour chaque critère majeur : si l'utilisateur a répondu à >50% des sous-critères →
la note principale = moyenne des sous-critères. Sinon, garde la note saisie à l'étape 1.

---

## Résultats de l'audit Phase 1 (2026-04-26)

### Évaluations Firebase dans Supabase : 49 (requête incorrecte — voir Phase 2)
Requête utilisée :
```sql
SELECT COUNT(*) FROM evaluations
WHERE scores IS NOT NULL
AND NOT (scores::text LIKE '%"detail_%');
```
→ 49 avis sans clé `detail_*` dans Supabase.
→ **Cette requête était incorrecte** : elle a raté les évaluations Firebase avec sous-critères.

### Solutions avec les deux formats (mixtes) : 16 solutions
```
solution_id                              nb_nouveau  nb_firebase
dac276ef-f030-46f0-81f6-ad5a74de60f3    69          10
f6b0376b-54b7-4ce3-9348-5b66b37659dd    105         6
46e368e2-a5b5-4183-984b-91add507a988    57          2
d407daac-1bbf-467b-afbb-53f26c6694d4    86          5
fbbe90e3-6957-4160-acfa-33f634ca6538    38          6
f1fc468c-0f52-4d25-9aec-ab5275494414    30          2
ae79a0b2-9146-434e-8193-4cb07c0c4799    54          1
9bdfe361-692c-4eaf-a6bd-83cfb69f04c3    31          2
d27bb718-7808-4c66-bbd3-ce52c13e64cc    54          3
f8baebbf-5a8c-445d-9a68-a6540eda2df8    35          1
06cdb927-a6e5-4af5-986a-84d429075860    22          2
ca144bb1-a1f1-48a5-bf50-1db45ca6ebe6    9           1
9987f3f8-103a-42cc-a15b-b98cc9aa96e5    6           1
0d4ed2fd-ea3b-436e-bcb9-cb446d0d8c03    7           1
46fd0bad-2991-4894-aceb-417cafd7ece7    2           1
d8515910-35da-4256-9225-81d4d14c3801    2           1
```

### `evaluation_redac_note` sur solutions
- 68 solutions sans note rédaction (pas de revue éditoriale = normal)
- 24 solutions avec note rédaction

### Triggers Supabase
- `trigger_update_evaluation_...` sur `resultats` → AFTER INSERT / UPDATE / DELETE
- Fonction `update_evaluation_redac_note` présente
- **Ce trigger existe dans Supabase Dashboard mais pas dans les migrations du repo** → à ajouter

---

## Incohérences identifiées dans le code

| # | Problème | Impact | Statut |
|---|----------|--------|--------|
| 1 | `evaluations.scores` : mix 0-10 (Firebase) et 0-5 (nouveau) | `resultats` corrompu pour solutions mixtes | 🔴 |
| 2 | `computeEvalGroupAvg` : détection fragile du format | Bug si nouveau avis sans `detail_*` | 🔴 |
| 3 | `solutions.evaluation_redac_note` : ligne morte dans le code admin | Pas un vrai bug (trigger corrige) | 🟡 |
| 4 | `getAverageNoteUtilisateurs()` : recalcule depuis scores au lieu de `moyenne_utilisateur` | Note légèrement différente | 🟡 |
| 5 | Listing : affiche `note_redac` en alpha, `note_utilisateurs` en tri | Confusion | 🟡 |
| 6 | Trigger `update_evaluation_redac_note` absent des migrations SQL | Perte si projet recréé | 🟡 |

---

## Audit Phase 2 — Analyse du script de migration (2026-04-26)

### Pourquoi les 630 évaluations ont des clés `detail_*`

Analyse du script `scripts/migrate-firebase-to-supabase.ts` (lignes 119-123) :
```typescript
const critereIdToTech: Record<string, string> = {}
for (const c of fbCriteres) {
  if (d.identifiantTech) critereIdToTech[c._fid] = d.identifiantTech
}
```

Le script mappe `Firebase _fid → identifiantTech`. Les sous-critères Firebase avaient DÉJÀ
un `identifiantTech` au format `detail_connexion`, `detail_agenda`, etc. — exactement le
même format que Supabase. Les 630 évaluations avec `detail_*` sont de vraies évaluations
Firebase (d'utilisateurs qui avaient répondu aux sous-critères sur l'ancien site).

### Conclusions Phase 2

- **L'import était complet** : 47 + 630 = 677 évaluations, contre ~650 attendues.
  La différence : déduplication + ~20 testeurs du site dev qui ont ré-évalué (upsert).
- **Tous les 677 ont des scores en 0-10**, y compris les `detail_*`.
- **La vraie distinction est le champ `statut`**, pas la présence de `detail_*` :
  - `statut IS NULL` → importé depuis Firebase → scores en 0-10 → besoin de ÷2
  - `statut = 'publiee'` → soumis via le nouveau site → scores en 0-5 → correct
- **Aucun re-import nécessaire** : l'import était complet.

### Vérification à faire avant conversion

```sql
-- Compter les évaluations par statut
SELECT statut, COUNT(*) FROM evaluations GROUP BY statut;
-- Attendu : ~677 NULL, ~20 'publiee'
```

---

## Décision finale révisée (2026-04-26)

### Approche retenue : conversion SQL sur place (pas de re-import)

L'import était complet. Il faut juste corriger les scores en ciblant `statut IS NULL`.

**Plan :**
1. Backup complet de Supabase (pg_dump) ou `CREATE TABLE evaluations_firebase_backup`
2. Vérifier : `SELECT statut, COUNT(*) FROM evaluations GROUP BY statut`
3. Exécuter la conversion SQL (voir ci-dessous)
4. Recalculer `resultats.moyenne_utilisateurs_base5`

### Plan de codage associé (après ré-import)
Voir `docs/database-notes.md` pour le détail technique.

---

## Plan d'action final consolidé

### Phase 1 — SQL (conversion en place)
1. `CREATE TABLE evaluations_firebase_backup AS SELECT * FROM evaluations`
2. Convertir TOUTES les évaluations : scores /2, moyenne_utilisateur /2
   (quasi toutes sont Firebase — statut 'publiee' = DEFAULT de la colonne, pas indicateur de format)
3. Recalculer `resultats.moyenne_utilisateurs_base5` pour toutes les solutions
   → requête SQL d'agrégation depuis `evaluations.scores` (voir `database-notes.md`)

### Phase 2 — Code
- 2.1 Simplifier `computeEvalGroupAvg` (plus de détection de format)
- 2.2 Unifier source note : `resultats.moyenne_utilisateurs_base5` partout
      (page détail, listing, homepage)
- 2.3 Listing : tri par défaut `note_utilisateurs`, pas de note en mode alpha
- 2.4 Admin : supprimer ligne `evaluation_redac_note` de `extractSolutionFromFormData`
- 2.5 Ajouter trigger `trigger_update_evaluation_...` aux migrations SQL
- 2.6 Admin SolutionForm : supprimer section "Dates et publication"

### Phase 3 — Rappel 2026-06-26
- `DROP TABLE evaluations_firebase_backup` si aucune régression constatée
