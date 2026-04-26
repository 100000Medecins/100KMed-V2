# Méthodologie de notation — 100 000 Médecins

> Document de référence sur le fonctionnement complet du système de notation.
> Mis à jour : 2026-04-26
> À consulter avant toute intervention sur les évaluations, les notes ou les calculs associés.

---

## Vue d'ensemble

Un médecin évalue un logiciel en deux étapes :
1. **Étape 1** : notes sur 5 critères majeurs (0-5 étoiles)
2. **Étape 2** : notes optionnelles sur des sous-critères (0-5 étoiles)

Ces notes sont stockées dans `evaluations.scores` (JSONB), agrégées dans `resultats`, et affichées sur le site.

---

## Les critères

### 5 critères majeurs (`criteres` avec `parent_id IS NULL`)

| identifiant_tech   | Libellé affiché         |
|--------------------|------------------------|
| `interface`        | Interface utilisateur   |
| `fonctionnalites`  | Fonctionnalités         |
| `fiabilite`        | Fiabilité               |
| `editeur`          | Éditeur                 |
| `qualite_prix`     | Rapport qualité/prix    |

### Sous-critères (`criteres` avec `parent_id` renseigné)

54 sous-critères au format `detail_*` (ex. `detail_connexion`, `detail_agenda`, `detail_stabilite`...), regroupés par critère majeur via `DETAIL_CRITERE_MAP` dans `src/lib/db/evaluations.ts`.

---

## Flux de soumission d'un avis

```
Utilisateur → /solution/noter/[...slug]
    │
    ├─ Étape 1 : 5 notes principales (0-5)
    │
    └─ Étape 2 : sous-critères optionnels (0-5, par groupe)
              │
              ▼
    buildRefinedCritereScores()          [src/app/solution/noter/[...slug]/page.tsx]
      Pour chaque critère majeur :
        Si > 50% des sous-critères répondus
          → note principale = moyenne des sous-critères
        Sinon
          → note principale = note saisie à l'étape 1
              │
              ▼
    buildMoyenne()
      → moyenne des 5 notes raffinées
      → stocké dans evaluations.moyenne_utilisateur
              │
              ▼
    buildFinalScores()
      → { ...notes_étape1, ...detail_*, ...notes_raffinées, commentaire }
      → stocké dans evaluations.scores (JSONB)
              │
              ▼
    updateResultat()                     [côté serveur, par critère]
      → met à jour resultats.moyenne_utilisateurs_base5 pour chaque critère majeur
      → calcul incrémental : (ancienne_moyenne × (n-1) + nouvelle_note) / n
```

---

## Structure de `evaluations.scores` (JSONB)

Toutes les évaluations sont désormais au format unifié 0-5 (migration Firebase→Supabase complétée le 2026-04-12) :

```json
{
  "interface": 4.0,
  "fonctionnalites": 3.5,
  "fiabilite": 4.5,
  "editeur": 3.0,
  "qualite_prix": 4.0,
  "detail_connexion": 5.0,
  "detail_agenda": 3.0,
  "detail_stabilite": 4.5,
  "commentaire": "Bon logiciel mais..."
}
```

**Règles** :
- Les 5 clés principales sont **toujours présentes** et sont la source de vérité
- Les clés `detail_*` sont **optionnelles** (présentes si l'utilisateur a répondu à l'étape 2)
- Si `detail_*` présents et > 50% répondus → la clé principale = moyenne des sous-critères (appliqué par `buildRefinedCritereScores`)
- Échelle : toujours 0-5 (les anciennes données Firebase 0-10 ont été divisées par 2 lors de la migration)

---

## Tables de stockage

```
evaluations
  id, user_id, solution_id
  scores (JSONB)              ← notes brutes + détail
  moyenne_utilisateur         ← moyenne globale de l'avis (0-5), précalculée
  statut                      ← 'publiee' | 'en_attente_psc'
  last_date_note              ← date de finalisation

resultats
  id, solution_id, critere_id
  moyenne_utilisateurs_base5  ← moyenne de tous les avis pour ce critère
  note_redac_base5            ← note éditoriale pour ce critère
  avis_redac                  ← texte éditorial pour ce critère
  nb_notes                    ← nombre d'avis comptabilisés

solutions
  evaluation_redac_note       ← moyenne globale de toutes les note_redac_base5
                                 recalculée automatiquement par le trigger
                                 trigger_update_evaluation_redac_note sur resultats
```

---

## Sources de notes par page (état cible après corrections Phase 2)

| Emplacement | Note utilisateur | Note rédaction |
|---|---|---|
| Page d'accueil | `resultats.moyenne_utilisateurs_base5` (agrégé) | — |
| Listing catégorie (tri par note) | `resultats.moyenne_utilisateurs_base5` | `solutions.evaluation_redac_note` |
| Listing catégorie (mode alpha) | **aucune note affichée** | — |
| Page détail solution | `resultats.moyenne_utilisateurs_base5` | `resultats.note_redac_base5` par critère |
| Comparatif | `resultats.moyenne_utilisateurs_base5` | `resultats.note_redac_base5` |

---

## Problèmes actuels (à corriger — Phase 2)

Ces problèmes sont **uniquement dans le code**, pas dans les données :

| # | Fichier | Problème | Fix |
|---|---------|---------|-----|
| 1 | `src/lib/db/evaluations.ts` | `computeEvalGroupAvg` : détection de format Firebase/Supabase devenue inutile | Simplifier : lire les 5 clés principales directement |
| 2 | `src/lib/db/evaluations.ts` | `getAverageNoteUtilisateurs()` : recalcule depuis `scores` au lieu d'utiliser `moyenne_utilisateur` | Lire `resultats.moyenne_utilisateurs_base5` |
| 3 | `src/lib/db/solutions.ts` | `getNotesGlobalesRedac()` : affiche la note rédaction en mode alpha (mauvaise source) | Ne pas afficher de note en mode alpha |
| 4 | `src/lib/actions/admin.ts` | `extractSolutionFromFormData` : écrit `evaluation_redac_note = null` à chaque save | Supprimer cette ligne (le trigger recalcule) |
| 5 | `src/app/solutions/[idCategorie]/page.tsx` ligne 44 | Tri par défaut = `'nom'` au lieu de `'note_utilisateurs'` | Changer le défaut |
| 6 | Migrations SQL | Trigger `trigger_update_evaluation_redac_note` absent du repo | Ajouter le DDL dans une migration |

---

## Le trigger `trigger_update_evaluation_redac_note`

Existe dans le Dashboard Supabase (Database → Triggers) mais **pas dans les fichiers de migration du repo**.

**Ce qu'il fait** : après chaque INSERT/UPDATE/DELETE sur `resultats`, recalcule automatiquement `solutions.evaluation_redac_note` comme moyenne de toutes les `note_redac_base5` de cette solution.

**Risque** : si le projet Supabase est recréé depuis les migrations, ce trigger sera perdu. À ajouter dans une migration SQL.

---

## Calcul de la note globale d'une solution

```
Note globale utilisateur (affiché partout)
  = moyenne de resultats.moyenne_utilisateurs_base5 pour les 5 critères majeurs

Note globale rédaction
  = solutions.evaluation_redac_note
  = moyenne de resultats.note_redac_base5 pour les 5 critères majeurs
    (recalculée par trigger à chaque save admin)
```

---

## Historique des formats (contexte migration)

| Période | Format | Échelle | Source |
|---|---|---|---|
| Avant 2026-04-12 | 5 clés principales uniquement | 0-10 | Import Firebase |
| 2026-04-12 | Migration SQL : 595 évaluations converties | 0-10 → 0-5, + clés `detail_*` ajoutées | Session de migration |
| Après 2026-04-12 | 5 clés principales + `detail_*` optionnels | 0-5 | Nouveau site Supabase |

La migration du 2026-04-12 a également corrigé le bug du trigger (clause WHERE `uuid = text` → `uuid = uuid`) et recalculé `moyenne_utilisateur` sur base 5 pour les 620 évaluations concernées.

---

## Piste future — Obsolescence des notes

*(Voir TODO.md → "Obsolescence des notes")*

Les avis anciens pourraient peser moins dans le calcul. Trois approches envisagées :
- **Decay exponentiel** : `note × exp(-λ × ancienneté_jours)`, λ ≈ 0.001 (demi-vie ~700 jours)
- **Fenêtre glissante** : ne compter que les N derniers mois
- **Badge "note ancienne"** : indicateur visuel si dernier avis > 18 mois

Ce mécanisme nécessitera de modifier `updateResultat()` et potentiellement le trigger Supabase.
