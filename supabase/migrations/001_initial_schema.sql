-- ============================================
-- 100000médecins — Schéma initial PostgreSQL
-- Migration Firestore (NoSQL) → PostgreSQL
-- ============================================

-- ============================================
-- EDITEURS (Publishers)
-- ============================================
CREATE TABLE editeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  nom_commercial TEXT,
  siret TEXT,
  creation DATE,
  nb_employes INTEGER,
  description TEXT,
  culture TEXT,
  gouvernance TEXT,
  mot_editeur TEXT,
  -- Contact (dénormalisé depuis l'objet nested Firestore)
  contact_email TEXT,
  contact_telephone TEXT,
  contact_adresse TEXT,
  contact_cp TEXT,
  contact_ville TEXT,
  contact_pays TEXT,
  -- Logo & Website
  logo_url TEXT,
  logo_titre TEXT,
  website_url TEXT,
  website_titre TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  intro TEXT,
  icon TEXT,
  categorie_defaut BOOLEAN DEFAULT false,
  -- Schema évaluation (JSON car structure flexible)
  schema_evaluation JSONB,
  -- Tags config (JSONB car structure variable)
  tags_liste JSONB,
  tags_groups JSONB,
  tags_favoris JSONB,
  criteres_recherche TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SOLUTIONS
-- ============================================
CREATE TABLE solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  version TEXT,
  editeur_id UUID REFERENCES editeurs(id) ON DELETE SET NULL,
  categorie_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  -- Logo & Website
  logo_url TEXT,
  logo_titre TEXT,
  website_url TEXT,
  website_titre TEXT,
  -- Dates
  date_lancement DATE,
  date_fin_vie DATE,
  date_publication TIMESTAMPTZ,
  date_maj TIMESTAMPTZ,
  date_debut DATE,
  date_fin DATE,
  -- Contenu
  mot_editeur TEXT,
  -- Prix (JSONB car structure variable)
  prix JSONB,
  duree_engagement JSONB,
  nb_utilisateurs JSONB,
  -- Évaluation rédactionnelle
  eval_redac_points_forts TEXT,
  eval_redac_points_faibles TEXT,
  eval_redac_avis TEXT,
  -- SEO Meta
  meta_title TEXT,
  meta_description TEXT,
  meta_canonical TEXT,
  -- Apparence
  color_h INTEGER,
  color_s INTEGER,
  color_l INTEGER,
  -- Critères actifs
  criteres_actifs TEXT[],
  segments JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_solutions_editeur ON solutions(editeur_id);
CREATE INDEX idx_solutions_categorie ON solutions(categorie_id);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle TEXT NOT NULL,
  ordre INTEGER DEFAULT 0,
  is_tag_principal BOOLEAN DEFAULT false,
  is_principale_fonctionnalite BOOLEAN DEFAULT false,
  categorie_id UUID REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_categorie ON tags(categorie_id);

-- ============================================
-- SOLUTIONS_TAGS (many-to-many)
-- ============================================
CREATE TABLE solutions_tags (
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (solution_id, tag_id)
);

-- ============================================
-- GALERIE (images/documents d'une solution)
-- ============================================
CREATE TABLE solution_galerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  titre TEXT,
  ordre INTEGER DEFAULT 0
);

-- ============================================
-- CRITERES (Evaluation Criteria)
-- ============================================
CREATE TABLE criteres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES criteres(id) ON DELETE CASCADE,
  is_actif BOOLEAN DEFAULT true,
  nom_capital TEXT,
  nom_court TEXT,
  nom_long TEXT,
  type TEXT, -- 'note', 'nps', 'general', 'detail', 'synthese'
  question TEXT,
  information TEXT,
  identifiant_tech TEXT,
  identifiant_bis TEXT,
  is_parent BOOLEAN DEFAULT false,
  is_enfant BOOLEAN DEFAULT false,
  -- Réponse config (JSONB car structure variable : type, min, max, choix, score)
  reponse JSONB,
  ordre INTEGER DEFAULT 0
);

CREATE INDEX idx_criteres_categorie ON criteres(categorie_id);
CREATE INDEX idx_criteres_parent ON criteres(parent_id);

-- ============================================
-- USERS (lié à Supabase Auth)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rpps TEXT UNIQUE,
  nom TEXT,
  prenom TEXT,
  pseudo TEXT,
  email TEXT,
  role TEXT DEFAULT 'medecin',
  age INTEGER,
  annee_naissance TEXT,
  date_naissance DATE,
  specialite TEXT,
  mode_exercice TEXT,
  densite_population TEXT,
  niveau_outils_numeriques TEXT,
  portrait TEXT, -- URL avatar
  is_actif BOOLEAN DEFAULT true,
  is_complete BOOLEAN DEFAULT false,
  gestion_accueil TEXT,
  -- Contact
  contact_email TEXT,
  contact_telephone TEXT,
  contact_adresse TEXT,
  contact_cp TEXT,
  contact_ville TEXT,
  contact_pays TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PREFERENCES
-- ============================================
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle TEXT NOT NULL,
  ordre INTEGER DEFAULT 0,
  is_actif BOOLEAN DEFAULT true,
  is_used_creation_compte BOOLEAN DEFAULT false
);

-- ============================================
-- USERS_PREFERENCES (many-to-many)
-- ============================================
CREATE TABLE users_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preference_id UUID REFERENCES preferences(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, preference_id)
);

-- ============================================
-- EVALUATIONS
-- ============================================
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}', -- { identifiantTech: valeur }
  moyenne_utilisateur NUMERIC(3,2),
  temps_precedente_solution TEXT,
  last_date_note TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, solution_id)
);

CREATE INDEX idx_evaluations_solution ON evaluations(solution_id);
CREATE INDEX idx_evaluations_user ON evaluations(user_id);

-- ============================================
-- RESULTATS (Aggregated ratings per solution + critere)
-- ============================================
CREATE TABLE resultats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  critere_id UUID REFERENCES criteres(id) ON DELETE CASCADE,
  moyenne_utilisateurs NUMERIC(4,2),
  moyenne_utilisateurs_base5 NUMERIC(3,2),
  nb_notes INTEGER DEFAULT 0,
  note_redac NUMERIC(4,2),
  note_redac_base5 NUMERIC(3,2),
  avis_redac TEXT,
  nps NUMERIC(5,2),
  -- Détail des notes (JSONB car clés dynamiques : userId → note)
  notes JSONB DEFAULT '{}',
  notes_critere JSONB DEFAULT '{}',
  repartition JSONB DEFAULT '{}',
  UNIQUE(solution_id, critere_id)
);

CREATE INDEX idx_resultats_solution ON resultats(solution_id);

-- ============================================
-- SOLUTIONS_UTILISEES (Solutions used by users)
-- ============================================
CREATE TABLE solutions_utilisees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  statut_evaluation TEXT DEFAULT 'instanciee', -- instanciee, aCompleter, finalisee, ancienne
  date_debut DATE,
  date_fin DATE,
  solution_precedente_id UUID REFERENCES solutions(id),
  UNIQUE(user_id, solution_id)
);

-- ============================================
-- SOLUTIONS_FAVORITES
-- ============================================
CREATE TABLE solutions_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  solution_id UUID REFERENCES solutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, solution_id)
);

-- ============================================
-- AVATARS
-- ============================================
CREATE TABLE avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL
);

-- ============================================
-- VIDEOS
-- ============================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  titre TEXT,
  url TEXT,
  vignette TEXT,
  description TEXT,
  is_videos_principales BOOLEAN DEFAULT false,
  ordre INTEGER DEFAULT 0
);

-- ============================================
-- ACTUALITES (News)
-- ============================================
CREATE TABLE actualites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT,
  label TEXT,
  description TEXT,
  article TEXT,
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  titre TEXT,
  url TEXT,
  vignette TEXT,
  description TEXT,
  ordre INTEGER DEFAULT 0
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Lecture publique pour les données non-sensibles
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solutions visibles par tous" ON solutions FOR SELECT USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catégories visibles par tous" ON categories FOR SELECT USING (true);

ALTER TABLE editeurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Éditeurs visibles par tous" ON editeurs FOR SELECT USING (true);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags visibles par tous" ON tags FOR SELECT USING (true);

ALTER TABLE solutions_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solutions_tags visibles par tous" ON solutions_tags FOR SELECT USING (true);

ALTER TABLE solution_galerie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Galerie visible par tous" ON solution_galerie FOR SELECT USING (true);

ALTER TABLE criteres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Critères visibles par tous" ON criteres FOR SELECT USING (true);

ALTER TABLE resultats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Résultats visibles par tous" ON resultats FOR SELECT USING (true);

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Avatars visibles par tous" ON avatars FOR SELECT USING (true);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vidéos visibles par tous" ON videos FOR SELECT USING (true);

ALTER TABLE actualites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Actualités visibles par tous" ON actualites FOR SELECT USING (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documents visibles par tous" ON documents FOR SELECT USING (true);

ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Préférences visibles par tous" ON preferences FOR SELECT USING (true);

-- Données utilisateur : uniquement le propriétaire
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User voit ses évaluations" ON evaluations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User crée ses évaluations" ON evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User modifie ses évaluations" ON evaluations FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE solutions_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User voit ses favoris" ON solutions_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User gère ses favoris INSERT" ON solutions_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User gère ses favoris DELETE" ON solutions_favorites FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE solutions_utilisees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User voit ses solutions" ON solutions_utilisees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User crée ses solutions" ON solutions_utilisees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User modifie ses solutions" ON solutions_utilisees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "User supprime ses solutions" ON solutions_utilisees FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User voit son profil" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User modifie son profil" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE users_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User voit ses préférences" ON users_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User gère ses préférences INSERT" ON users_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User gère ses préférences DELETE" ON users_preferences FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_editeurs_updated_at BEFORE UPDATE ON editeurs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solutions_updated_at BEFORE UPDATE ON solutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
