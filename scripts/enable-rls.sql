-- Activation de RLS sur toutes les tables publiques sans protection
-- À exécuter dans Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. solutions
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique solutions" ON public.solutions
  FOR SELECT USING (true);

-- 2. categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique categories" ON public.categories
  FOR SELECT USING (true);

-- 3. editeurs
ALTER TABLE public.editeurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique editeurs" ON public.editeurs
  FOR SELECT USING (true);

-- 4. criteres
ALTER TABLE public.criteres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique criteres" ON public.criteres
  FOR SELECT USING (true);

-- 5. tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique tags" ON public.tags
  FOR SELECT USING (true);

-- 6. solutions_galerie
ALTER TABLE public.solutions_galerie ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique solutions_galerie" ON public.solutions_galerie
  FOR SELECT USING (true);

-- 7. solutions_criteres_actifs
ALTER TABLE public.solutions_criteres_actifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique solutions_criteres_actifs" ON public.solutions_criteres_actifs
  FOR SELECT USING (true);

-- 8. solutions_tags
ALTER TABLE public.solutions_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique solutions_tags" ON public.solutions_tags
  FOR SELECT USING (true);

-- 9. preferences
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture publique preferences" ON public.preferences
  FOR SELECT USING (true);
