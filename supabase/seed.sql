-- ============================================
-- SEED DATA — Données de test
-- Solution Odaiji dans catégorie "Logiciels métier"
-- À supprimer plus tard via : DELETE FROM editeurs; DELETE FROM categories;
-- (les CASCADE supprimeront le reste)
-- ============================================

DO $$
DECLARE
  v_editeur_id UUID;
  v_categorie_id UUID;
  v_solution_id UUID;
  v_tag_ids UUID[];
  v_tag_id UUID;
  v_critere_synthese_id UUID;
  v_critere_interface_id UUID;
  v_critere_fonc_id UUID;
  v_critere_fiabilite_id UUID;
  v_critere_editeur_id UUID;
  v_critere_qp_id UUID;
  v_critere_nps_id UUID;
BEGIN

  -- ==========================================
  -- 1. ÉDITEUR
  -- ==========================================
  INSERT INTO editeurs (
    nom, nom_commercial, description, logo_url, website_url,
    mot_editeur, contact_email, contact_ville, nb_employes, siret
  ) VALUES (
    'Odaiji SAS',
    'Odaiji',
    'Éditeur français spécialisé dans les logiciels de gestion pour professionnels de santé. Créé en 2018, Odaiji propose une solution 100% en ligne, pensée pour les médecins généralistes et spécialistes.',
    '/images/solutions/odaiji-logo.svg',
    'https://www.odaiji.fr',
    'Chez Odaiji, nous développons un logiciel pensé par et pour les médecins. Notre ambition : simplifier votre quotidien grâce à une interface moderne, rapide et intuitive. Nous sommes fiers d''être référencés Ségur et de proposer une solution 100% en ligne qui vous accompagne partout.',
    'contact@odaiji.fr',
    'Paris',
    25,
    '84912345600012'
  ) RETURNING id INTO v_editeur_id;

  -- ==========================================
  -- 2. CATÉGORIE
  -- ==========================================
  INSERT INTO categories (
    nom, position, actif, intro, icon
  ) VALUES (
    'Logiciels métier',
    1,
    true,
    'Comparez les logiciels métier pour médecins : gestion de cabinet, téléconsultation, dossier patient informatisé.',
    'monitor'
  ) RETURNING id INTO v_categorie_id;

  -- ==========================================
  -- 3. SOLUTION
  -- ==========================================
  INSERT INTO solutions (
    nom, description, version,
    editeur_id, categorie_id,
    logo_url, logo_titre,
    website_url, website_titre,
    date_lancement, date_publication,
    mot_editeur,
    eval_redac_avis,
    eval_redac_points_forts,
    eval_redac_points_faibles,
    color_h, color_s, color_l,
    meta_title, meta_description,
    prix
  ) VALUES (
    'Odaiji',
    'Odaiji est un logiciel de gestion de cabinet médical 100% en ligne, conçu pour les médecins généralistes et spécialistes. Il intègre agenda, dossier patient, ordonnances, téléservices SESAM-Vitale et téléconsultation dans une interface moderne et intuitive.',
    '3.2.1',
    v_editeur_id, v_categorie_id,
    '/images/solutions/odaiji-logo.svg',
    'Logo Odaiji',
    'https://www.odaiji.fr',
    'Odaiji — Logiciel médecin en ligne',
    '2019-03-15',
    now(),
    'Chez Odaiji, nous développons un logiciel pensé par et pour les médecins. Notre ambition : simplifier votre quotidien grâce à une interface moderne, rapide et intuitive.',
    'Odaiji se distingue par son interface épurée et sa rapidité. Le logiciel, 100% cloud, offre une expérience fluide sur tout support. La prise en main est rapide et les mises à jour sont automatiques. On apprécie particulièrement l''intégration native de la téléconsultation et la conformité Ségur dès la première heure. Quelques manques subsistent côté comptabilité et personnalisation avancée, mais l''ensemble est convaincant pour un logiciel récent.',
    'Interface moderne et intuitive, très rapide
100% en ligne, accessible partout (ordinateur, tablette)
Téléconsultation intégrée nativement
Référencé Ségur, compatible DMP et téléservices AM
Mises à jour automatiques et fréquentes
Support client réactif par chat',
    'Module comptabilité limité
Personnalisation des modèles d''ordonnance encore basique
Pas d''application mobile native (responsive uniquement)
Historique de 3 ans seulement (jeune éditeur)',
    210, 70, 55,
    'Odaiji — Avis et évaluation | 100000médecins',
    'Découvrez les avis de médecins sur Odaiji, logiciel de gestion de cabinet 100% en ligne. Note, fonctionnalités, points forts et faibles.',
    '{"prix_ttc": 129, "devise": "EUR", "frequence": "mensuel", "duree_engagement_mois": 12}'::jsonb
  ) RETURNING id INTO v_solution_id;

  -- ==========================================
  -- 4. TAGS
  -- ==========================================
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('Référencé Ségur',       1, true,  true,  v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('En ligne',              2, true,  true,  v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('En groupe',             3, false, false, v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('LAP Certifié HAS V2',  4, true,  true,  v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('Base VidalExpert',      5, false, true,  v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('Téléservices AM',       6, false, true,  v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('DMP-compatible',        7, false, true,  v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);
  INSERT INTO tags (libelle, ordre, is_tag_principal, is_principale_fonctionnalite, categorie_id) VALUES
    ('Résultats format CDA',  8, false, false, v_categorie_id) RETURNING id INTO v_tag_id; v_tag_ids := array_append(v_tag_ids, v_tag_id);

  -- ==========================================
  -- 5. SOLUTIONS_TAGS (lier les 8 tags à la solution)
  -- ==========================================
  FOR i IN 1..array_length(v_tag_ids, 1) LOOP
    INSERT INTO solutions_tags (solution_id, tag_id) VALUES (v_solution_id, v_tag_ids[i]);
  END LOOP;

  -- ==========================================
  -- 6. GALERIE (4 images placeholder)
  -- ==========================================
  INSERT INTO solution_galerie (solution_id, url, titre, ordre) VALUES
    (v_solution_id, 'https://placehold.co/800x500/e8f4f8/1B2A4A?text=Agenda+Odaiji',           'Agenda',            1),
    (v_solution_id, 'https://placehold.co/800x500/f0e8f8/1B2A4A?text=Dossier+Patient',         'Dossier Patient',   2),
    (v_solution_id, 'https://placehold.co/800x500/e8f8e8/1B2A4A?text=Ordonnances',             'Ordonnances',       3),
    (v_solution_id, 'https://placehold.co/800x500/f8f0e8/1B2A4A?text=T%C3%A9l%C3%A9consultation', 'Téléconsultation',  4);

  -- ==========================================
  -- 7. CRITÈRES (1 synthèse + 5 general + 1 NPS)
  -- ==========================================
  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre)
  VALUES (v_categorie_id, true, 'Note globale', 'Note globale synthèse', 'synthese', 'note_globale', 0)
  RETURNING id INTO v_critere_synthese_id;

  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre)
  VALUES (v_categorie_id, true, 'Interface utilisateur', 'Qualité de l''interface utilisateur', 'general', 'interface', 1)
  RETURNING id INTO v_critere_interface_id;

  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre)
  VALUES (v_categorie_id, true, 'Fonctionnalités', 'Richesse des fonctionnalités', 'general', 'fonctionnalites', 2)
  RETURNING id INTO v_critere_fonc_id;

  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre)
  VALUES (v_categorie_id, true, 'Fiabilité', 'Fiabilité et stabilité du logiciel', 'general', 'fiabilite', 3)
  RETURNING id INTO v_critere_fiabilite_id;

  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre)
  VALUES (v_categorie_id, true, 'Éditeur', 'Qualité de l''éditeur et du support', 'general', 'editeur', 4)
  RETURNING id INTO v_critere_editeur_id;

  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre)
  VALUES (v_categorie_id, true, 'Rapport qualité/prix', 'Rapport qualité/prix global', 'general', 'qualite_prix', 5)
  RETURNING id INTO v_critere_qp_id;

  INSERT INTO criteres (categorie_id, is_actif, nom_court, nom_long, type, identifiant_tech, ordre, reponse)
  VALUES (v_categorie_id, true, 'NPS', 'Net Promoter Score', 'nps', 'nps', 6, '{"type":"nps","min":0,"max":10}'::jsonb)
  RETURNING id INTO v_critere_nps_id;

  -- ==========================================
  -- 8. RÉSULTATS (notes agrégées pour chaque critère)
  -- ==========================================
  -- Synthèse (note globale)
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, note_redac, note_redac_base5, nps, repartition)
  VALUES (
    v_solution_id, v_critere_synthese_id,
    7.40, 3.70, 27,
    7.80, 3.90,
    42.5,
    '{"1": 1, "2": 2, "3": 4, "4": 12, "5": 8}'::jsonb
  );

  -- Interface utilisateur
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, note_redac, note_redac_base5, avis_redac)
  VALUES (v_solution_id, v_critere_interface_id, 8.20, 4.10, 27, 8.50, 4.25,
    'Interface plutôt aérée et claire, avec le choix de mettre quelques couleurs vives un peu partout, et surtout, surtout, de réduire les informations visibles à l''indispensable. Toutes les fonctions sont accessibles avec une barre verticale escamotable à gauche ; la consultation se retrouve au milieu ; le dossier administratif et les antécédents sont à droite. Rien d''étonnant, mais efficace. Le tout est plutôt pas mal agencé et lisible, les fonctions visibles sont limitées aux actions les plus fréquentes, mais on peut retrouver plus de complexité si on rentre dans les sous-menus : bref, "less is more" & "reduce to the max" ont dû être leur leitmotiv (et on aime ça).');

  -- Fonctionnalités
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, note_redac, note_redac_base5, avis_redac)
  VALUES (v_solution_id, v_critere_fonc_id, 7.00, 3.50, 27, 7.40, 3.70,
    'Odaiji couvre l''essentiel des besoins fonctionnels d''un cabinet médical : gestion des dossiers patients, ordonnances, agenda et téléconsultation intégrée. On retrouve la facturation avec Stellair (l''un des moteurs ayant le vent en poupe en ce moment), l''aide à la prescription avec VidalExpert, classique, efficace. L''interfaçage avec le DMP, Mailiz ou les téléservices permet d''envisager pour une fois de les utiliser DANS Odaiji et pas sur les services-source aux ergonomies discutables, ça fait plaisir !');

  -- Fiabilité
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, note_redac, note_redac_base5, avis_redac)
  VALUES (v_solution_id, v_critere_fiabilite_id, 7.80, 3.90, 27, 8.00, 4.00,
    'Le logiciel se montre globalement fiable et stable dans son utilisation quotidienne. Étant 100% cloud, les mises à jour sont transparentes et automatiques, ce qui élimine les problèmes classiques de compatibilité. Les temps de chargement sont rapides et les interruptions de service restent rares. La sauvegarde automatique des données en temps réel rassure les praticiens sur la pérennité de leurs informations.');

  -- Éditeur
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, note_redac, note_redac_base5, avis_redac)
  VALUES (v_solution_id, v_critere_editeur_id, 7.60, 3.80, 27, 7.50, 3.75,
    'L''équipe d''Odaiji est réactive et à l''écoute des retours utilisateurs. Le support technique répond dans des délais raisonnables, principalement par chat intégré dans l''application. Les mises à jour sont fréquentes et tiennent compte des remontées terrain. L''éditeur pourrait cependant améliorer sa documentation en ligne et proposer davantage de tutoriels vidéo pour accompagner les nouveaux utilisateurs.');

  -- Rapport qualité/prix
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, note_redac, note_redac_base5, avis_redac)
  VALUES (v_solution_id, v_critere_qp_id, 6.80, 3.40, 27, 7.00, 3.50,
    'Le tarif d''Odaiji se situe dans la moyenne du marché des logiciels médicaux en ligne. L''offre est transparente, avec un abonnement mensuel tout inclus sans frais cachés, ce qui est appréciable. La téléconsultation intégrée sans surcoût représente un vrai plus. Toutefois, certaines fonctionnalités attendues comme la comptabilité avancée nécessitent des options complémentaires.');

  -- NPS
  INSERT INTO resultats (solution_id, critere_id, moyenne_utilisateurs, moyenne_utilisateurs_base5, nb_notes, nps)
  VALUES (v_solution_id, v_critere_nps_id, NULL, NULL, 27, 42.5);

  -- ==========================================
  -- 9. OUTPUT : afficher les IDs pour navigation
  -- ==========================================
  RAISE NOTICE '✅ Seed data inserted successfully!';
  RAISE NOTICE '   Catégorie ID : %', v_categorie_id;
  RAISE NOTICE '   Solution  ID : %', v_solution_id;
  RAISE NOTICE '   URL page     : /solutions/%/%', v_categorie_id, v_solution_id;

END $$;

-- ==========================================
-- 10. POLICY RLS : permettre la lecture publique des évaluations
-- (pour les avis anonymisés sur la page solution)
-- ==========================================
CREATE POLICY "Evaluations visibles par tous en lecture"
  ON evaluations FOR SELECT
  USING (true);
