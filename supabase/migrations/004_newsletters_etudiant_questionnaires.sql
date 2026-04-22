-- ============================================================
-- Migration 004 : newsletters + is_etudiant + questionnaires_these + etudes_cliniques
-- Idempotente : safe à rejouer si les objets existent déjà
-- ============================================================

-- ============================================================
-- TABLE newsletters
-- Stocke les brouillons et newsletters envoyées chaque mois
-- ============================================================
CREATE TABLE IF NOT EXISTS newsletters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mois         TEXT NOT NULL,                  -- ex: "2026-04"
  sujet        TEXT,
  contenu_html TEXT,
  contenu_json JSONB,
  status       TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'sent'
  created_at   TIMESTAMPTZ DEFAULT now(),
  sent_at      TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  recipient_count INTEGER,
  notified_at  TIMESTAMPTZ,
  reminded_at  TIMESTAMPTZ
);

-- RLS newsletters : lecture/écriture réservée aux admins (service role uniquement côté app)
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role accès newsletters" ON newsletters;
CREATE POLICY "Service role accès newsletters" ON newsletters
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TABLE questionnaires_these
-- Questionnaires de thèse déposés par les étudiants
-- ============================================================
CREATE TABLE IF NOT EXISTS questionnaires_these (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre      TEXT NOT NULL,
  description TEXT,
  lien       TEXT NOT NULL,
  image_url  TEXT,
  date_fin   DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  statut     TEXT NOT NULL DEFAULT 'en_attente', -- 'en_attente' | 'publie' | 'refuse'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ajout de date_fin si la table existait déjà sans cette colonne
ALTER TABLE questionnaires_these ADD COLUMN IF NOT EXISTS date_fin DATE;

-- Trigger updated_at
CREATE OR REPLACE TRIGGER update_questionnaires_these_updated_at
  BEFORE UPDATE ON questionnaires_these
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS questionnaires_these
ALTER TABLE questionnaires_these ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Questionnaires publiés visibles par tous" ON questionnaires_these;
CREATE POLICY "Questionnaires publiés visibles par tous" ON questionnaires_these
  FOR SELECT USING (statut = 'publie');

DROP POLICY IF EXISTS "Etudiant voit ses questionnaires" ON questionnaires_these;
CREATE POLICY "Etudiant voit ses questionnaires" ON questionnaires_these
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Etudiant dépose un questionnaire" ON questionnaires_these;
CREATE POLICY "Etudiant dépose un questionnaire" ON questionnaires_these
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Etudiant supprime en_attente" ON questionnaires_these;
CREATE POLICY "Etudiant supprime en_attente" ON questionnaires_these
  FOR DELETE USING (auth.uid() = created_by AND statut = 'en_attente');

-- ============================================================
-- TABLE etudes_cliniques
-- Études cliniques gérées par les utilisateurs digital_medical_hub
-- ============================================================
CREATE TABLE IF NOT EXISTS etudes_cliniques (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre       TEXT NOT NULL,
  description TEXT,
  lien        TEXT,
  images      TEXT[] DEFAULT '{}',
  date_debut  DATE,
  date_fin    DATE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER update_etudes_cliniques_updated_at
  BEFORE UPDATE ON etudes_cliniques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS etudes_cliniques
ALTER TABLE etudes_cliniques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Etudes cliniques visibles par tous" ON etudes_cliniques;
CREATE POLICY "Etudes cliniques visibles par tous" ON etudes_cliniques
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "DMH gère ses études INSERT" ON etudes_cliniques;
CREATE POLICY "DMH gère ses études INSERT" ON etudes_cliniques
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "DMH gère ses études UPDATE" ON etudes_cliniques;
CREATE POLICY "DMH gère ses études UPDATE" ON etudes_cliniques
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "DMH gère ses études DELETE" ON etudes_cliniques;
CREATE POLICY "DMH gère ses études DELETE" ON etudes_cliniques
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================================
-- TABLE users : ajout is_etudiant
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_etudiant BOOLEAN DEFAULT false;

-- ============================================================
-- TABLE users_notification_preferences
-- Colonnes etudes_cliniques + questionnaires_these si pas encore présentes
-- (la table devrait déjà exister — ajout idempotent des colonnes)
-- ============================================================
ALTER TABLE users_notification_preferences
  ADD COLUMN IF NOT EXISTS etudes_cliniques BOOLEAN DEFAULT false;

ALTER TABLE users_notification_preferences
  ADD COLUMN IF NOT EXISTS questionnaires_these BOOLEAN DEFAULT false;
