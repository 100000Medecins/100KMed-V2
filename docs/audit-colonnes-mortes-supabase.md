# Audit des colonnes mortes — Supabase (public)

> Généré le 2026-05-28. Méthode : schéma réel (`information_schema.columns`) × remplissage
> (comptage via **service_role**, car la RLS bloque `evaluations`/`users` au rôle MCP) ×
> référencement dans `src/` (hors `src/types/database.ts` auto-généré).
> **Ne rien DROP sans validation.** Certaines colonnes vides sont réservées à un usage futur.

## Avertissement méthodo

- Le comptage de remplissage via l'outil SQL MCP est **faux pour `evaluations` et `users`**
  (RLS → renvoie 0). Les chiffres ci-dessous proviennent du service_role
  (`scripts/audit-colonnes-remplissage.ts`).
- Plusieurs noms de colonnes « suspects » testés au départ **n'existent pas** dans le schéma
  réel (ex. `acronymes_lies`, `meme_suite_de`, `tags_principaux`, `certifications`,
  `avis_redaction`, `note_redaction`, `video_url`, `est_principale`, `type_affichage`,
  `categories.image`, `users.avatar_seed`, `users.banniere_url`). Le schéma est déjà plus
  propre que supposé.

## Catégorie A — Candidates au DROP (non référencées dans `src/`)

Vérifié : **0 référence** dans `src/` (hors `database.ts` auto-généré et commentaires).

| Table | Colonne | Remplies | Réf. code | Note |
|---|---|--:|---|---|
| `categories` | `schema_evaluation` | 4 / 7 | commentaire seul | **ancien questionnaire hardcodé** ; remplacé par `questionnaire_sections`/`questionnaire_questions`. Seule trace dans `models.ts:86` = un commentaire (pas du code). |
| `categories` | `criteres_recherche` | 7 / 7 | non | ancien système de filtres Firebase. Plus lu (le front utilise `tags` + `label_filtres`). |
| `resultats` | `notes_critere` | 1084 / 2359 | non | jamais lu par le code — doublon legacy de `notes` (qui, lui, est utilisé). |
| `users` | `date_naissance` | 0 / 5941 | non | doublon vide de `annee_naissance` (957 remplies, utilisée). |

> `schema_evaluation` et `criteres_recherche` ont des lignes remplies (vestiges) mais ne sont
> plus jamais lues : ce sont les colonnes de l'**ancien questionnaire / filtres Firebase**.
> Encore écrites par `scripts/migrate-firebase-to-supabase.ts` (script historique), jamais lues
> par le site. Sûres à DROP.

## ⚠️ Correction d'un faux positif (RLS)

Le rôle MCP `claude_readonly` est **bloqué par la RLS** sur `users`/`evaluations` → il renvoyait
`count = 0`. Les vrais chiffres (service_role) montrent que ces colonnes profil sont **bien
remplies** (~958 users) et **NE SONT PAS mortes** :
`densite_population` (958), `niveau_outils_numeriques` (959), `gestion_accueil` (958),
`annee_naissance` (957). → **À GARDER** (décision David : réutilisation prévue).

## Catégorie B — Vides mais à GARDER (usage code actif OU intention produit)

| Table | Colonne | Remplies | Raison |
|---|---|--:|---|
| `evaluations` | `email_temp` | 0 | **référencée** (flux d'évaluation anonyme : `src/lib/actions/evaluation.ts`). Se remplit quand un non-inscrit évalue. |
| `evaluations` | `token_verification` | 0 | idem (vérification d'éval anonyme par email). |
| `resultats` | `nps` | 26 | NPS stocké pour quelques lignes ; le calcul à la volée existe aussi mais la colonne sert. |
| `resultats` | `repartition` | 1085 | utilisée (`src/lib/actions/evaluation.ts`). |
| `solutions` | `prix_ttc` / `prix_ttc_min` / `prix_ttc_max` / `prix_*` | ~7 | **système de prix en cours** (cf TODO « Refaire l'affichage des prix »). NE PAS toucher. |
| `solutions` | `contact_*` / `support_*` | variable | champs éditeur, remplis au fil de l'eau. |

## Catégorie C — Vivantes (pour info, gardées)

| Table | Colonne | Remplies | Usage |
|---|---|--:|---|
| `evaluations` | `temps_precedente_solution` | ~1376 | calcul durée d'utilisation (`dureeMois`). |
| `users` | `annee_naissance` | 219 | profil. |
| `users` | `is_etudiant` | 5937 | rôle/segmentation. |
| `resultats` | `firebase_moyenne_base5` / `firebase_nb_notes` | 2094+ | **ancrage figé** des notes Firebase legacy (cf calcul incrémental). Indispensable. |
| `resultats` | `moyenne_utilisateurs_base5` | — | note affichée (= ancrage tant qu'aucune éval post-lancement). |
| `solutions` | `evaluation_redac_*` | 48-130 | avis/note de la rédaction (affichés). |
| `categories` | `categorie_defaut` | 7 / 7 | lue (`src/lib/db/categories.ts`). |

## Recommandation

1. **DROP sûr** (catégorie A, 4 colonnes confirmées non lues) :
   ```sql
   ALTER TABLE categories DROP COLUMN schema_evaluation;
   ALTER TABLE categories DROP COLUMN criteres_recherche;
   ALTER TABLE resultats  DROP COLUMN notes_critere;
   ALTER TABLE users      DROP COLUMN date_naissance;
   ```
2. **Garder** B et C, et les 4 colonnes profil (densite/niveau/gestion/annee — réutilisation prévue).
3. Après DROP : `npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts` puis `next build`.
