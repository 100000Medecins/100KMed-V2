# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### Audit DNS Gandi — 100000medecins.org
- Faire le point sur tous les enregistrements DNS existants (A, CNAME, TXT, MX…)
- Identifier et supprimer les entrées obsolètes (ancien hébergeur, anciens environnements)
- Nettoyer les entrées `dev` en conflit (A + CNAME vers ancien hébergeur) avant mise en prod

### Backups base de données Supabase
- Mettre en place un export régulier (mensuel minimum) de la base Supabase via `pg_dump`
- Le code (git) ne sauvegarde pas les données : utilisateurs, avis, articles, études, évaluations sont uniquement dans Supabase
- Options : script bash automatisé via cron local ou Windows Task Scheduler, export vers le NAS

### Emails auth Supabase → SendGrid SMTP
- Configurer le SMTP custom dans Supabase dashboard (Authentication → SMTP Settings) avec les credentials SendGrid
- Zéro changement de code, 5 minutes dans le dashboard
- Supprime la limite de 3 emails/heure du plan gratuit Supabase

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Nouvelles catégories de solutions
- Créer les catégories : Télétransmission, Téléconsultation, Téléexpertise

### PSC production
- Migrer ProSanté Connect de l'environnement BAS vers la production ANS
- Voir checklist dans `memory/project_psc_prod_deployment.md`

### Avatars
- Changer les avatars utilisateurs

---

## Fait récemment
- Glossaire — ancres inter-acronymes : sigles cliquables dans définitions/descriptions → navigation directe `#SIGLE` ✅
- Glossaire — intégration dans la recherche navbar (overlay + API) ✅
- Glossaire — suppression du système de catégories (formulaire, CRUD, types, affichage) ✅
- Tooltips acronymes sur zones texte (AcronymText, AcronymHtml) ✅
- Glossaire e-Santé `/glossaire` : page publique, ancres alphabétiques, recherche, formulaire de suggestion, admin CRUD + onglet propositions ✅
- Recherche navbar : overlay debounced, 3 sections, page `/recherche?q=...`, pg_trgm ✅
- Module Études & Thèses complet : dépôt questionnaires (tous utilisateurs), pages mon-compte, admin validation, emails dédiés, centre de notifications ✅
- Email mensuel (newsletter) : génération auto le 22 du mois, brouillon éditable, envoi depuis admin, historique, page web `/nl/[id]` ✅
- Admin Emails restructuré (sous-sections études, questionnaires, notifications) ✅
- Page d'accueil : BlogPreview (3 derniers articles) + CommunautePreview ✅
- Vidéos accueil admin : sélection 4 vidéos drag & drop, expiration 30 jours, cron rappel ✅
- Menu Communauté navbar (Blog, Vidéos, Irritants, Études, Thèses) ✅
- Session admin étendue à 7 jours avec renouvellement automatique ✅
- Éditeur Sephira renommé en Orisha ✅
- SEO : correction prompt génération + script régénération masse hors LGC ✅
- Module vidéos : rubriques séparateurs glissables-déposables, drag-and-drop, toggle statut, miniatures YouTube ✅
- SEO automatique par IA (Claude Haiku) + génération en masse ✅
- ISR sur pages solutions + correctif generateStaticParams (erreur 500 prod) ✅
- Admin solutions : recherche textuelle temps réel ✅
- Admin utilisateurs : export CSV emails, pagination haut+bas, fix scroll horizontal ✅
- Filtre comparatifs ET au lieu de OU ✅
- Descriptions solutions : rendu HTML (dangerouslySetInnerHTML) ✅
- Blog IA + publication Make.com (LinkedIn ✅, Facebook ✅, Instagram ✅)
- Espace éditeur (rôles, mon-compte/mon-espace-editeur) ✅
- Admin utilisateurs : pagination >1000, badge PSC, colonnes RPPS ✅
