# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### Tooltips acronymes — détection automatique sur toutes les pages
- Quand un acronyme de la table est repéré dans le texte d'une page, afficher sa définition au survol (infobulle)
- **Approche recommandée** : composant client global `AcronymHighlighter` dans le layout, qui après montage parcourt les nœuds texte (TreeWalker API) et enveloppe les correspondances dans un `<abbr>` avec tooltip
- Acronymes chargés une fois via `/api/acronymes` et mis en cache (SWR ou fetch avec `cache`)
- Détection par mot entier uniquement (regex `\b`) pour éviter les faux positifs
- Zones exclues : `<input>`, `<button>`, `<code>`, `<pre>`, `<a>`, titres `<h1>`
- **Complexité** : risque de conflit avec l'hydratation React, performance à surveiller si table volumineuse, tester soigneusement avant de déployer

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

---

## Fait récemment
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
