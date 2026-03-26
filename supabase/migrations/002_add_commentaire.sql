-- Migration : Ajout du champ commentaire aux évaluations
-- Permet aux médecins de laisser un témoignage textuel avec leur note

ALTER TABLE evaluations ADD COLUMN commentaire TEXT;
