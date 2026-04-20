-- Fonctions de recherche avec pg_trgm (similarité floue)
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Index trigramme sur les colonnes searchées (à faire une fois)
CREATE INDEX IF NOT EXISTS idx_solutions_nom_trgm ON solutions USING gin (nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_solutions_description_trgm ON solutions USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_titre_trgm ON articles USING gin (titre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categories_nom_trgm ON categories USING gin (nom gin_trgm_ops);

-- 2. Recherche solutions
CREATE OR REPLACE FUNCTION search_solutions(query text, max_results int DEFAULT 6)
RETURNS TABLE (
  id uuid,
  nom text,
  slug text,
  logo_url text,
  categorie_nom text,
  categorie_slug text,
  similarity_score float
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id,
    s.nom,
    s.slug,
    s.logo_url,
    c.nom AS categorie_nom,
    c.slug AS categorie_slug,
    GREATEST(
      similarity(s.nom, query),
      similarity(s.description, query) * 0.6
    ) AS similarity_score
  FROM solutions s
  LEFT JOIN categories c ON c.id = s.id_categorie
  WHERE
    s.actif = true
    AND (
      s.nom ILIKE '%' || query || '%'
      OR s.description ILIKE '%' || query || '%'
      OR similarity(s.nom, query) > 0.15
    )
  ORDER BY similarity_score DESC, s.nom
  LIMIT max_results;
$$;

-- 3. Recherche articles
CREATE OR REPLACE FUNCTION search_articles(query text, max_results int DEFAULT 4)
RETURNS TABLE (
  id uuid,
  titre text,
  slug text,
  extrait text,
  image_couverture text,
  similarity_score float
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.id,
    a.titre,
    a.slug,
    a.extrait,
    a.image_couverture,
    GREATEST(
      similarity(a.titre, query),
      similarity(COALESCE(a.extrait, ''), query) * 0.5
    ) AS similarity_score
  FROM articles a
  WHERE
    a.statut = 'publié'
    AND (
      a.titre ILIKE '%' || query || '%'
      OR a.extrait ILIKE '%' || query || '%'
      OR similarity(a.titre, query) > 0.15
    )
  ORDER BY similarity_score DESC, a.date_publication DESC
  LIMIT max_results;
$$;

-- 4. Recherche catégories
CREATE OR REPLACE FUNCTION search_categories(query text, max_results int DEFAULT 3)
RETURNS TABLE (
  id uuid,
  nom text,
  slug text,
  icon text,
  similarity_score float
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.nom,
    c.slug,
    c.icon,
    similarity(c.nom, query) AS similarity_score
  FROM categories c
  WHERE
    c.actif = true
    AND (
      c.nom ILIKE '%' || query || '%'
      OR similarity(c.nom, query) > 0.2
    )
  ORDER BY similarity_score DESC, c.nom
  LIMIT max_results;
$$;
