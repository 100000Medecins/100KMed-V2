-- ============================================================
-- Migration 005 : trigger update_evaluation_redac_note
-- Idempotente : safe à rejouer si les objets existent déjà
-- ============================================================
-- Ce trigger maintient solutions.evaluation_redac_note à jour
-- automatiquement après chaque INSERT/UPDATE/DELETE sur resultats.
-- Il calcule la moyenne des note_redac_base5 pour les critères
-- dont nom_capital est renseigné (les 5 critères majeurs affichés).
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_evaluation_redac_note()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE
  v_solution_id UUID;
  v_moyenne NUMERIC;
BEGIN
  v_solution_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.solution_id ELSE NEW.solution_id END;

  IF v_solution_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ROUND(AVG(r.note_redac_base5)::NUMERIC, 1)
  INTO v_moyenne
  FROM resultats r
  JOIN criteres c ON c.id = r.critere_id
  WHERE r.solution_id = v_solution_id
    AND r.note_redac_base5 IS NOT NULL
    AND c.nom_capital IS NOT NULL;

  UPDATE solutions
  SET evaluation_redac_note = v_moyenne
  WHERE id = v_solution_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_evaluation_redac_note ON public.resultats;
CREATE TRIGGER trigger_update_evaluation_redac_note
  AFTER INSERT OR DELETE OR UPDATE ON public.resultats
  FOR EACH ROW EXECUTE FUNCTION update_evaluation_redac_note();
