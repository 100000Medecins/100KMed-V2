-- Migration 006 — Nettoyage des colonnes obsolètes de la table `solutions`
--
-- Ces colonnes proviennent de la migration Firebase mais ne sont plus
-- exploitées par le front (aucune référence dans src/components/solutions/
-- hors le composant legacy déjà supprimé). L'admin UI affichait encore
-- ces champs : retirés en parallèle de cette migration.
--
-- Contexte :
-- - `version` : seul consommateur était SolutionDetail.legacy.tsx (supprimé)
-- - `segments`, `nb_utilisateurs`, `duree_engagement` : 0 référence front
-- - `solutions.prix` (JSONB) avait déjà été supprimé précédemment
--   (remplacé par prix_ttc/prix_devise/prix_frequence/prix_duree_engagement_mois)

ALTER TABLE solutions DROP COLUMN IF EXISTS version;
ALTER TABLE solutions DROP COLUMN IF EXISTS segments;
ALTER TABLE solutions DROP COLUMN IF EXISTS nb_utilisateurs;
ALTER TABLE solutions DROP COLUMN IF EXISTS duree_engagement;
