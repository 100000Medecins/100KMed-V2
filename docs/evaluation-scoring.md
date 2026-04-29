# Méthodologie de notation — 100 000 Médecins

> Document de référence sur le fonctionnement complet du système de notation.
> Mis à jour : 2026-04-30
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

54 sous-critères au format `detail_*` (ex. `detail_connexion`, `detail_agenda`, `detail_stabilite`...) pour la catégorie logiciels-métier. Les autres catégories utilisent d'autres préfixes de clés (voir §Système de questionnaires multi-catégories).

**Important** : `DETAIL_CRITERE_MAP` dans `src/lib/db/evaluations.ts` mappe les clés `detail_*` vers leur critère majeur. Cette map n'est utilisée que dans `src/app/solutions/comparer/page.tsx` (vue détaillée du comparateur), **jamais dans le calcul de score**. Les catégories non-logiciels-métier n'ont pas leurs clés dans cette map → la vue détaillée du comparateur ne s'affiche pas pour elles (comportement attendu).

---

## Système de questionnaires multi-catégories

### Architecture

Le questionnaire de l'étape 2 est **piloté par la base de données** pour toutes les catégories. Les questions sont stockées dans deux tables :

```
questionnaire_sections
  id, categorie_slug, titre, introduction, ordre

questionnaire_questions
  id, section_id, key, question, critere_majeur, ordre
```

Chaque question a un champ `critere_majeur` (valeurs : `interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`) qui indique à quel critère majeur elle contribue. C'est ce champ qui assure la correspondance sous-critère → critère principal au moment du calcul.

### API

**Route** : `GET /api/questionnaire/[slug]` → `src/app/api/questionnaire/[slug]/route.ts`  
**Fonction** : `getSectionsForSlug(slug)` dans `src/lib/actions/questionnaires.ts`

- Charge les sections + questions depuis la DB pour le slug de catégorie
- Si aucune section trouvée → fallback sur le questionnaire `default`
- Gérable via l'interface admin → `/admin/questionnaires`

### Priorité des sources (dans le formulaire de notation)

```
src/app/solution/noter/[...slug]/page.tsx (ligne ~600)

const sectionsDetail = sectionsDB.length > 0
  ? sectionsDB                          // ← DB en priorité (si données présentes)
  : getSectionsForCategorie(slug)       // ← fallback hardcodé
```

`getSectionsForCategorie` retourne `SECTIONS_PAR_CATEGORIE[slug] || SECTIONS_DETAILLEES` — le hardcodé ne s'active que si la DB est vide pour ce slug.

### Préfixes de clés par catégorie

| Catégorie | Préfixe des clés | Source actuelle |
|---|---|---|
| Logiciels-métier | `detail_*` | Hardcodé (`SECTIONS_DETAILLEES`) + DB si configuré |
| Agenda médical | `agenda_*` | Hardcodé (`SECTIONS_PAR_CATEGORIE`) + DB si configuré |
| IA documentaires | `docai_*` | DB (`questionnaire_sections.categorie_slug = 'ia-documentaires'`) |
| IA scribes | `ias_*` | DB (`questionnaire_sections.categorie_slug = 'intelligence-artificielle-medecine'`) |

Les préfixes reflètent la configuration DB et peuvent évoluer si un admin modifie les clés des questions. La correspondance avec les critères majeurs est portée par le champ `critere_majeur`, pas par le préfixe.

### Libellés par catégorie (SLUGS_UTILITE)

Pour les catégories IA, le critère `fonctionnalites` est affiché avec le libellé **"Utilité"** au lieu de "Fonctionnalités" (plus pertinent pour des outils IA). Ce changement est purement cosmétique — il n'affecte pas les clés en base, le calcul, ni le stockage.

```typescript
// src/lib/constants/criteres.ts
const SLUGS_UTILITE = ['intelligence-artificielle-medecine', 'ia-documentaires']
// getCritereLabel('fonctionnalites', slug) → 'Utilité' pour ces slugs
```

Si une nouvelle catégorie IA est ajoutée, ajouter son slug dans `SLUGS_UTILITE`.

---

## Flux de soumission d'un avis

```
Utilisateur → /solution/noter/[...slug]
    │
    ├─ Étape 1 : 5 notes principales (0-5)
    │
    └─ Étape 2 : sous-critères optionnels (0-5, par groupe)
              │    Sections chargées depuis la DB via /api/questionnaire/[slug]
              │    Chaque question a un champ critereMajeur → correspondance avec les 5 critères
              │
              ▼
    buildRefinedCritereScores()          [src/app/solution/noter/[...slug]/page.tsx]
      Pour chaque critère majeur :
        Regroupe les sous-questions ayant critereMajeur = ce critère
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

## Sources de notes par page

### État actuel (avant corrections Phase 2)

| Emplacement | Fonction | Source réelle | Valeur Doctolib ex. |
|---|---|---|---|
| Page d'accueil | `getNotesUtilisateursGlobales` | `resultats` — tous critères, sans filtre | 4.0 ❌ |
| Listing catégorie | `getNotesUtilisateursGlobales` | idem | 4.0 ❌ |
| Page détail — hero | `getAverageNoteUtilisateurs` | `evaluations.moyenne_utilisateur` | 3.4 |
| Page détail — carte confrères | `getAverageNoteUtilisateurs` | idem | 3.4 |
| Page comparatif `/comparer` | requête directe `resultats` | `resultats` — tous critères, sans filtre | (par critère) |

### État cible (après corrections Phase 2)

| Emplacement | Note utilisateur | Note rédaction |
|---|---|---|
| Page d'accueil | `resultats.moyenne_utilisateurs_base5` — 5 critères majeurs uniquement | — |
| Listing catégorie (tri par note) | `resultats.moyenne_utilisateurs_base5` — 5 critères majeurs uniquement | `solutions.evaluation_redac_note` |
| Listing catégorie (mode alpha) | **aucune note affichée** | — |
| Page détail — hero | `resultats.moyenne_utilisateurs_base5` — 5 critères majeurs uniquement | — |
| Page détail — carte confrères (global) | `resultats.moyenne_utilisateurs_base5` — 5 critères majeurs uniquement | — |
| Page détail — carte confrères (par critère) | `resultats.moyenne_utilisateurs_base5` — par ligne critère majeur | `resultats.note_redac_base5` |
| Page comparatif `/comparer` | `resultats.moyenne_utilisateurs_base5` — par ligne critère majeur | `resultats.note_redac_base5` |

**Règle fondamentale** : la note globale affichée = exactement la moyenne des 5 notes par critère
affichées dans la carte "L'avis de vos confrères". Zéro surprise, zéro divergence possible.

La distribution par étoile (1★ → 5★) dans la carte confrères est calculée séparément
depuis `evaluations.moyenne_utilisateur` — elle ne participe pas au calcul de la note globale.

---

## Problèmes identifiés (Phase 2)

Ces problèmes sont **uniquement dans le code**, pas dans les données.
Les items 🔴 causent la divergence de notes visible sur le site.

| # | Fichier | Problème | Priorité | Statut |
|---|---------|---------|----------|--------|
| 1 | `src/lib/db/solutions.ts` | `getNotesUtilisateursGlobales()` : lit tous les `resultats` sans filtre `parent_id IS NULL` → inclut les sous-critères → note gonflée (4.0 vs 3.4 pour Doctolib) | 🔴 | Corrigé 2026-04-27 |
| 2 | `src/lib/db/evaluations.ts` | `getAverageNoteUtilisateurs()` : calcule la note depuis `evaluations.moyenne_utilisateur` alors que la cible est `resultats` (sources différentes → notes divergentes) | 🔴 | Corrigé 2026-04-27 |
| 3 | `src/app/solutions/comparer/page.tsx` | Requête `resultats` sans filtre → affiche les lignes sous-critères dans le tableau comparatif | 🟡 | Corrigé 2026-04-27 |
| 4 | `src/lib/db/solutions.ts` | `getNotesGlobalesRedac()` : affiche la note rédaction en mode tri alphabétique (mauvaise source) | 🟡 | À corriger |
| 5 | `src/lib/actions/admin.ts` | `extractSolutionFromFormData` : écrit `evaluation_redac_note = null` à chaque save admin | 🟡 | À corriger |
| 6 | `src/app/solutions/[idCategorie]/page.tsx` | Tri par défaut = `'nom'` au lieu de `'note_utilisateurs'` | 🟡 | À corriger |
| 7 | Migrations SQL | Trigger `trigger_update_evaluation_redac_note` absent des fichiers de migration du repo | 🟡 | À ajouter |

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
