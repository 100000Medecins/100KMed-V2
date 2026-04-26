# Structure de la base — Système de notation

> Fichier de référence pour comprendre comment les notes sont stockées, calculées et affichées.
> Mis à jour : 2026-04-27

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

## État des données (vérifié 2026-04-27)

- Migration Firebase 0-10 → 0-5 : **terminée le 2026-04-12**. Les 679 évaluations sont en 0-5.
- `evaluations_firebase_backup` créé le 2026-04-26 : instantané de la BDD déjà convertie. À supprimer le 2026-06-26.
- `criteres_backup`, `evaluations_backup`, `resultats_backup` : sauvegardes d'AVANT la migration du 12 avril, supprimées le 2026-04-26.
- **Ne jamais relancer la migration** : diviserait toutes les notes par 2 une seconde fois.

> Pour l'historique complet de l'audit de confusion du 2026-04-26, voir `docs/nettoyageBDD.md`.

## Incohérences code (état 2026-04-27)

| # | Problème | Impact | Priorité |
|---|----------|--------|----------|
| 1 | `getNotesUtilisateursGlobales()` lit tous les `resultats` sans filtre `parent_id IS NULL` | Homepage + listing affichent une note gonflée (sous-critères inclus) | 🔴 Corrigé 2026-04-27 |
| 2 | `getAverageNoteUtilisateurs()` lit `evaluations.moyenne_utilisateur` au lieu de `resultats` | Page détail diverge du listing | 🔴 Corrigé 2026-04-27 |
| 3 | Comparatif `/comparer` : requête `resultats` sans filtre | Affiche les lignes sous-critères dans le tableau | 🟡 Corrigé 2026-04-27 |
| 4 | `solutions.evaluation_redac_note` écrasé à NULL au save admin | Notes rédaction disparaissent du listing | 🟡 À corriger |
| 5 | Listing : affiche `note_redac` en mode alpha, `note_utilisateurs` en mode tri | Confusion | 🟡 À corriger |
| 6 | Trigger `trigger_update_evaluation_redac_note` absent des migrations SQL | Perte si projet recréé | 🟡 À ajouter |

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

## Plan d'action Phase 2 — Code uniquement

La migration SQL est terminée depuis le 2026-04-12. Il ne reste que des corrections de code.

### Corrigé le 2026-04-27

- `getNotesUtilisateursGlobales()` : filtre ajouté `critere:criteres!inner(parent_id)` + `parent_id IS NULL`
- `getAverageNoteUtilisateurs()` : source du `note` basculée vers `resultats` (la distribution reste depuis `evaluations`)
- Page comparatif `/comparer` : filtre ajouté sur `resultats` pour n'afficher que les critères majeurs

### Reste à faire (Phase 2 suite)

- Listing : ne pas afficher de note en mode alphabétique (`tri === 'nom'` → note = null)
- Page catégorie : tri par défaut = `note_utilisateurs` au lieu de `nom`
- Admin `extractSolutionFromFormData` : supprimer la ligne qui écrit `evaluation_redac_note = null`
- Ajouter le DDL du trigger `trigger_update_evaluation_redac_note` dans une migration SQL
- Supprimer `evaluations_firebase_backup` le 2026-06-26
