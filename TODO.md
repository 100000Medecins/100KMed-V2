# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### Module Études & Thèses — en cours de développement
- Statut "Étudiant" dans le profil + colonne `is_etudiant` sur `users`
- Dépôt de questionnaires de thèse par les étudiants (titre, WYSIWYG, lien, image)
- Page publique `/mon-compte/questionnaires-these` pour tous les utilisateurs (cartes)
- Admin `/admin/questionnaires-these` : validation avant publication (Publier / Refuser)
- Section admin "Études & Thèses" : gestion DMH + questionnaires de thèse
- **SQL requis :**
  ```sql
  CREATE TABLE questionnaires_these (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titre text NOT NULL,
    description text,
    lien text NOT NULL,
    image_url text,
    created_by uuid REFERENCES users(id),
    statut text NOT NULL DEFAULT 'en_attente',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_etudiant boolean DEFAULT false;
  ```

### Intégration études & thèses dans la navigation
- Insérer les pages études cliniques et questionnaires de thèse sur la page d'accueil
- Ajouter dans la navbar (desktop + mobile)

### Emails — études cliniques & questionnaires de thèse
- Nouveau modèle d'email "Nouveaux questionnaires de thèse disponibles" (envoi aux utilisateurs ayant coché la case dans centre de notifications)
- Nouveau modèle d'email "Nouvelles études cliniques disponibles" (idem)
- Envoi automatique tous les 3 mois OU manuellement depuis l'admin
- Centre de notifications : ajouter les cases "Études cliniques" et "Questionnaires de thèse"

### Email mensuel d'informations
- Modèle d'email mensuel générable depuis l'admin
- Contenu dynamique : dernières solutions ajoutées (cartes), nouvelles thèses/études depuis le dernier envoi, nouveautés du site
- Envoi aux utilisateurs ayant coché la case correspondante dans leurs notifications
- Historique des anciens emails envoyés consultable dans l'admin

### Admin Emails — sous-pages
- Le nombre de modèles d'email croissant, créer des sous-pages :
  - Emails d'infos mensuels
  - Études cliniques & questionnaires de thèse
  - Notifications système (vérification email, changement mot de passe, etc.)

### Page d'accueil — remplacer "Les enjeux de l'e-santé" par les derniers articles blog
- Supprimer la section vidéos hardcodées, la remplacer par les 3 derniers articles publiés (`statut = 'publie'`, triés par `date_publication DESC`, limit 3)

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Nouvelles catégories de solutions
- Créer les catégories : Télétransmission, Téléconsultation, Téléexpertise

### PSC production
- Migrer ProSanté Connect de l'environnement BAS vers la production ANS
- Voir checklist dans `memory/project_psc_prod_deployment.md`

### Emails transactionnels
- Migrer vers Brevo (emails transactionnels + auth SMTP) pour remplacer SendGrid/Supabase SMTP

### Avatars
- Changer les avatars utilisateurs

### Recherche navbar
- Loupe dans la navbar → overlay de recherche
- Route `/api/search?q=...` avec pg_trgm sur solutions, articles, catégories
- Dropdown avec sections "Solutions" / "Articles" / "Catégories" (3-4 résultats chacun)
- Page `/recherche?q=...` pour les résultats complets

---

## Fait récemment
- Éditeur Sephira renommé en Orisha ✅
- SEO : correction prompt génération (catégorie réelle au lieu de "logiciel métier" systématique) + script régénération masse hors LGC ✅
- SEO manuel : PraxySanté, Desmos Médecin, HyperMed régénérés via admin ✅
- Module vidéos : rubriques séparateurs glissables-déposables, drag-and-drop, toggle statut, miniatures YouTube ✅
- SEO automatique par IA (Claude Haiku) + génération en masse ✅
- ISR sur pages solutions + correctif generateStaticParams (erreur 500 prod) ✅
- Admin solutions : recherche textuelle temps réel ✅
- Admin utilisateurs : export CSV emails, pagination haut+bas, fix scroll horizontal ✅
- Filtre comparatifs ET au lieu de OU ✅
- Navbar : fix flash liens Blog/Irritants avant fetch ✅
- Descriptions solutions : rendu HTML (dangerouslySetInnerHTML) ✅
- Formulaire contact : labels obligatoire/optionnel ✅
- Incrustation logo sur images réseaux sociaux ✅
- Blog IA + publication Make.com (LinkedIn ✅, Facebook ✅, Instagram ✅)
- Espace éditeur (rôles, mon-compte/mon-espace-editeur) ✅
- Admin utilisateurs : pagination >1000, badge PSC, colonnes RPPS ✅
