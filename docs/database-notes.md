# Structure de la base — Système de notation

> Fichier de référence pour comprendre comment les notes sont stockées, calculées et affichées.
> Mis à jour : 2026-04-26

---

## Les tables impliquées

```
┌─────────────────────────────────────────────────────────┐
│                       users                             │
│  id | email | pseudo | specialite | rpps | ...          │
└──────────────────────┬──────────────────────────────────┘
                       │ 1 user peut avoir
                       │ plusieurs évaluations
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    evaluations                          │
│  id | user_id | solution_id                             │
│  scores (JSONB)          ← notes brutes saisies         │
│  moyenne_utilisateur     ← moyenne globale précalculée  │
│  statut ('publiee'|null) ← null = ancienne Firebase     │
│  last_date_note          ← date de finalisation         │
└──────────────────────┬──────────────────────────────────┘
                       │ agrégé par
                       │ updateResultat()
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     resultats                           │
│  id | solution_id | critere_id                          │
│  moyenne_utilisateurs_base5  ← moyenne tous avis        │
│  note_redac_base5            ← note rédaction           │
│  avis_redac                  ← texte rédaction          │
│  nb_notes                    ← compteur                 │
└──────────────────────┬──────────────────────────────────┘
                       │ critere_id référence
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     criteres                            │
│  id | nom_court | type | parent_id                      │
│                                                         │
│  5 critères MAJEURS (parent_id = null) :                │
│    interface | fonctionnalites | fiabilite              │
│    editeur   | qualite_prix                             │
│                                                         │
│  N sous-critères (parent_id → critère majeur) :         │
│    detail_connexion → interface                         │
│    detail_agenda    → fonctionnalites                   │
│    detail_stabilite → fiabilite  ... etc.               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     solutions                           │
│  id | nom | slug | categorie_id                         │
│  evaluation_redac_note     ← note globale rédaction     │
│  evaluation_redac_avis     ← texte général rédaction    │
│  evaluation_redac_points_forts  (array)                 │
│  evaluation_redac_points_faibles (array)                │
│  prix_ttc | prix_devise | prix_frequence | ...          │
└─────────────────────────────────────────────────────────┘
```

---

## Le JSONB `evaluations.scores` — les deux formats

Un avis utilisateur est stocké dans `evaluations.scores` sous forme JSON.

### Format ancien — Firebase (à migrer)
```json
{
  "interface": 8,
  "fonctionnalites": 7,
  "fiabilite": 9,
  "editeur": 6,
  "qualite_prix": 8,
  "commentaire": "Bon logiciel mais..."
}
```
- Échelle **0-10**
- 5 clés fixes correspondant aux 5 critères majeurs

### Format nouveau — Supabase
```json
{
  "interface": 4,
  "fonctionnalites": 3,
  "fiabilite": 4,
  "editeur": 3,
  "qualite_prix": 4,
  "detail_connexion": 5,
  "detail_interface_generale": 4,
  "detail_agenda": 3,
  "commentaire": "Bon logiciel mais..."
}
```
- Échelle **0-5**
- 5 clés principales (= notes raffinées par `buildRefinedCritereScores`)
- N clés `detail_*` (= sous-critères optionnels)

> **Règle de raffinement** : pour chaque critère majeur, si l'utilisateur a répondu
> à plus de 50% des sous-critères → la clé principale est remplacée par la moyenne
> des sous-critères. Sinon, la note de l'étape 1 est conservée.

---

## Flux de données — soumission d'un avis

```
Utilisateur saisit les notes (étape 1 : 5 critères, étape 2 : sous-critères optionnels)
          │
          ▼
buildRefinedCritereScores()
  → pour chaque critère majeur :
    si > 50% sous-critères répondus → note = moyenne sous-critères
    sinon → note = note étape 1

buildMoyenne()
  → moyenne des 5 notes raffinées → stocké dans evaluations.moyenne_utilisateur

buildFinalScores()
  → { ...notes_etape1, ...detail_*, ...notes_raffinées, commentaire }
  → stocké dans evaluations.scores (JSONB)

updateResultat() [côté serveur, par critère]
  → met à jour resultats.moyenne_utilisateurs_base5 pour chaque critère majeur
  → calcul incrémental : (ancienne_moyenne × (n-1) + nouvelle_note) / n
```

---

## Flux de données — affichage des notes

### Note utilisateurs — page détail solution
```
getAverageNoteUtilisateurs(solutionId)
  → lit evaluations.scores pour toutes les évaluations finalisées
  → appelle computeEvalGroupAvg(scores) sur chaque
  → moyenne des résultats
  
  ⚠️ Problème : recalcule depuis scores au lieu d'utiliser moyenne_utilisateur
     (qui est déjà correct et stocké)
```

### Note utilisateurs — page listing catégorie (tri alphabétique)
```
getNotesGlobalesRedac(solutionIds)
  → lit solutions.evaluation_redac_note directement
  
  ⚠️ C'est la NOTE RÉDACTION, pas la note utilisateurs !
     Affiché par défaut en mode alphabétique = mauvaise source
```

### Note utilisateurs — page listing catégorie (tri par note utilisateurs)
```
getNotesUtilisateursGlobales(solutionIds)
  → lit resultats.moyenne_utilisateurs_base5
  → fait la moyenne de toutes les lignes resultats pour chaque solution
  
  ⚠️ Problème : moyenne de moyennes par critère ≠ moyenne de moyennes par avis
     (ordre d'agrégation différent → valeur légèrement différente)
     + resultats peut être corrompu si mix ancien format (0-10) + nouveau (0-5)
```

### Note rédaction — page listing catégorie
```
getNotesGlobalesRedac(solutionIds)
  → lit solutions.evaluation_redac_note
  
  ⚠️ Problème : ce champ est écrasé à NULL à chaque save depuis l'admin
     (bug confirmé : le champ note_redac_base5 n'existe pas dans le formulaire admin)
```

### Note rédaction — page détail solution
```
getNotesRedac(solutionId)
  → lit resultats.note_redac_base5 par critère
  → calculée comme moyenne par la page
  
  ✅ Cette source est correcte et maintenue à jour depuis l'admin
```

---

## Incohérences actuelles (état 2026-04-26)

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1 | `evaluations.scores` contient du 0-10 (Firebase) ET du 0-5 (nouveau) | Notes mélangées dans `resultats` | 🔴 Haute |
| 2 | `computeEvalGroupAvg` ne détecte pas de façon fiable le format | Bug si un avis nouveau n'a pas de `detail_*` | 🔴 Haute |
| 3 | `solutions.evaluation_redac_note` écrasé à NULL au save admin | Notes rédaction disparaissent du listing | 🔴 Haute |
| 4 | `getAverageNoteUtilisateurs()` recalcule depuis scores au lieu de `moyenne_utilisateur` | Note légèrement différente de ce qui est stocké | 🟡 Moyenne |
| 5 | Listing : affiche `note_redac` en mode alpha, `note_utilisateurs` en mode tri | Valeurs différentes selon le mode = confusion | 🟡 Moyenne |
| 6 | Homepage et page détail montrent des notes légèrement différentes | Ordre d'agrégation différent | 🟡 Moyenne |

---

## Structure cible après corrections

### evaluations.scores (après migration)
```json
{
  "interface": 4.0,
  "fonctionnalites": 3.5,
  "fiabilite": 4.5,
  "editeur": 3.0,
  "qualite_prix": 4.0
}
```
Toujours 0-5. Optionnellement : clés `detail_*` pour les nouveaux avis détaillés.
**Les 5 clés principales sont TOUJOURS la source de vérité.**

### Calcul uniformisé
```
Note globale d'un avis   = evaluations.moyenne_utilisateur
                         = moyenne des 5 clés principales de evaluations.scores

Note par critère majeur  = resultats.moyenne_utilisateurs_base5
                         = moyenne de evaluations.moyenne_utilisateur pour ce critère
                           sur tous les avis finalisés

Note globale solution    = moyenne des resultats.moyenne_utilisateurs_base5
                         = utilisée PARTOUT (listing, homepage, détail)

Note rédaction globale   = solutions.evaluation_redac_note
                         = recalculée à chaque save admin
                           comme moyenne de resultats.note_redac_base5
```

### Une seule source par affichage
```
Listing (tous modes)     → resultats.moyenne_utilisateurs_base5 (agrégé)
Homepage                 → resultats.moyenne_utilisateurs_base5 (même source)
Page détail              → resultats.moyenne_utilisateurs_base5 (même source)
Note rédaction listing   → solutions.evaluation_redac_note (recalculée au save)
Note rédaction détail    → resultats.note_redac_base5 par critère (inchangé)
```

---

## Plan d'action

### Étape 1 — Migration Firebase (SQL, une passe)

> **Conclusions finales (audit 2026-04-26)** :
> - Les 630 évaluations avec `detail_*` sont de vraies évaluations Firebase (sous-critères déjà en format `detail_*`)
> - `statut` n'est PAS utilisable comme détecteur : DEFAULT 'publiee' s'applique à tous (674 publiee + 5 en_attente_psc, 0 NULL)
> - Quasi toutes les 679 évaluations sont Firebase → on convertit tout en bloc
> - Backup Phase 1a déjà effectué (2026-04-26)
> - Voir `docs/nettoyageBDD.md` pour l'analyse complète

```sql
-- 1a. Sauvegarde — DÉJÀ EFFECTUÉE le 2026-04-26
CREATE TABLE evaluations_firebase_backup AS SELECT * FROM evaluations;

-- 1b. Conversion de TOUTES les évaluations : scores /2
UPDATE evaluations SET
  scores = (
    SELECT jsonb_object_agg(
      key,
      CASE 
        WHEN key = 'commentaire' THEN value
        WHEN jsonb_typeof(value) = 'number' 
          THEN to_jsonb(ROUND((value::text::numeric / 2)::numeric, 1))
        ELSE value
      END
    )
    FROM jsonb_each(scores)
  ),
  moyenne_utilisateur = ROUND(moyenne_utilisateur / 2, 2)
WHERE scores IS NOT NULL;

-- 1c. Recalculer resultats.moyenne_utilisateurs_base5 pour tous les critères majeurs
-- Note : la jointure se fait sur criteres.identifiant_tech (pas nom_court qui contient les libellés)
UPDATE resultats r SET
  moyenne_utilisateurs_base5 = sub.moy,
  nb_notes = sub.nb
FROM (
  SELECT 
    e.solution_id,
    c.id AS critere_id,
    ROUND(AVG((e.scores->>(c.identifiant_tech))::numeric), 2) AS moy,
    COUNT(*) AS nb
  FROM evaluations e
  CROSS JOIN criteres c
  WHERE c.parent_id IS NULL
    AND c.identifiant_tech IS NOT NULL
    AND e.scores ? c.identifiant_tech
    AND jsonb_typeof(e.scores->c.identifiant_tech) = 'number'
    AND (e.scores->>(c.identifiant_tech))::numeric > 0
  GROUP BY e.solution_id, c.id
) sub
WHERE r.solution_id = sub.solution_id AND r.critere_id = sub.critere_id;
```

### Étape 2 — Simplifier computeEvalGroupAvg
```typescript
// Remplacer la détection de format par lecture des 5 clés principales
// qui sont TOUJOURS présentes et déjà correctes (0-5)
function computeEvalGroupAvg(scores: Record<string, unknown>): number | null {
  const CRITERES = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']
  const vals = CRITERES
    .map(k => scores[k])
    .filter((v): v is number => typeof v === 'number' && v > 0)
  return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
}
// Ou mieux : utiliser moyenne_utilisateur directement (déjà stockée)
```

### Étape 3 — Corriger solutions.evaluation_redac_note
```typescript
// Dans syncCritereComments(), après avoir mis à jour resultats :
// Recalculer la moyenne de toutes les note_redac_base5 pour cette solution
// et mettre à jour solutions.evaluation_redac_note
```
Aussi : supprimer `evaluation_redac_note` de `extractSolutionFromFormData` (ne plus l'écrire via le formulaire).

### Étape 4 — Admin : supprimer section Dates et publication
- Retirer la section "Dates et publication" de SolutionForm.tsx
- Retirer les champs correspondants de extractSolutionFromFormData (date_publication, date_lancement, date_debut, date_fin, date_maj)

### Étape 5 — Listing : ne pas afficher de note en mode alphabétique
- SolutionList.tsx : `displayNote` → null si `tri === 'nom'`
- Page catégorie : tri par défaut = `note_utilisateurs` (au lieu de `nom`)

### Étape 6 — Rappel 2 mois (2026-06-26)
- Supprimer la table `evaluations_firebase_backup` si aucun problème constaté
