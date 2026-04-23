# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### Partenariats contenu

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Médiia** — association pour les vidéos/stories
- **La rhumatologue** (à identifier) — contenu tutos/articles/vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

### Déploiement final

#### Kill-switch emails routiniers — à activer au déploiement final
- Dans Admin → Emails, activer le toggle "Emails routiniers" avant de mettre le site en production
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- Ne pas oublier : sans ce switch, aucune relance évaluation / PSC / newsletter ne partira

### Bugs à corriger

#### Page solution — cadre note de droite hors du cadre titre
- Remettre le bloc note (droite) à l'intérieur du cadre du titre sur la page solution

#### Fil d'Ariane — contraste insuffisant
- Le breadcrumb n'est pas lisible (contraste texte/fond trop faible)
- Augmenter le contraste ou changer la couleur du texte

#### Login PSC en dev — lien email cassé pour un nouvel utilisateur
- Quand un nouvel utilisateur reçoit un email après tentative de connexion PSC, le lien ne fonctionne pas en environnement dev
- Diagnostiquer le redirect URI / callback URL en dev

#### Création de compte — email déjà existant en DB
- Vérifier si un chargement infini se produit quand on tente de créer un compte avec un email déjà enregistré
- Ajouter un message d'erreur explicite plutôt qu'un spinner bloquant

#### Note globale évaluations — incohérence avec la moyenne des sous-critères
- Sur les pages solutions, la note globale affichée ne correspond pas à la moyenne des notes des sous-critères saisis par l'utilisateur
- Vérifier le calcul côté DB ou côté affichage et corriger la formule

#### Menu éditeur — page admin utilisateurs incomplète
- Toutes les solutions ne s'affichent pas dans le menu éditeur sur la page admin utilisateur
- Pour une solution sans page éditeur existante : créer la page éditeur associée, la rendre visible dans l'admin mais invisible publiquement par défaut

### UX / UI

#### Fond des pages solutions + DA générale
- Revoir le fond des pages solutions (couleur, texture, gradient…)
- Occasion de revoir la direction artistique globale du site

### Blog

#### Planification de la publication d'un article généré
- Pouvoir définir une date/heure de publication future pour un article déjà généré par l'IA
- L'article reste en statut "brouillon" jusqu'à l'heure planifiée, puis passe automatiquement en "publié"

### Performance

#### Efficience du code (rapport Ben)
- Revoir les points remontés dans la capture de Ben
- À prioriser selon criticité (perf, bundle size, requêtes redondantes…)

---

### Backups base de données Supabase
- Mettre en place un export régulier (mensuel minimum) de la base Supabase via `pg_dump`
- Le code (git) ne sauvegarde pas les données : utilisateurs, avis, articles, études, évaluations sont uniquement dans Supabase
- Options : script bash automatisé via cron local ou Windows Task Scheduler, export vers le NAS

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Nouvelles catégories de solutions
- Créer les catégories : Télétransmission, Téléconsultation, Téléexpertise

### Avatars
- Changer les avatars utilisateurs

### Obsolescence des notes (pondération temporelle)
- Les avis anciens devraient peser moins que les récents dans le calcul des notes globales
- Piste 1 — decay côté SQL : score pondéré = note × exp(-λ × ancienneté_en_jours), λ réglable (ex. 0.001 → demi-vie ~700 jours)
- Piste 2 — fenêtre glissante : ne compter que les avis des N derniers mois (ex. 24 mois), afficher l'avertissement « basé sur X avis récents »
- Piste 3 — badge "note ancienne" : si la dernière évaluation date de plus de 18 mois, afficher un indicateur visuel sur la fiche solution
- À décider : seuil de decay, affichage ou non du détail dans l'UI, impact sur le classement de la page comparatif

### Easter egg — Konami code + mini-jeu arcade
- Détecter la séquence Konami (↑↑↓↓←→←→BA) globalement sur le site
- Ouvrir une modal/overlay avec un petit jeu d'arcade rétro dans le navigateur
- Dans l'esprit du site : thème médical / pixel art

### PSC prod sur dev.100000medecins.org (test temporaire)
- Configurer une redirect URI `https://dev.100000medecins.org/api/auth/psc-callback` dans l'application PSC production ANS
- Permet de tester le flux PSC prod sans basculer le DNS principal
- À retirer une fois la mise en prod complète effectuée

### PSC production + DNS mise en prod *(à faire ensemble)*
- Migrer ProSanté Connect de l'environnement BAS vers la production ANS (checklist dans `memory/project_psc_prod_deployment.md`)
- `@ A` : remplacer `217.70.184.55` par `76.76.21.21` (IP Vercel apex)
- `www` : remplacer CNAME `webacc8.sd6.ghst.net` par `cname.vercel-dns.com.`
- Supprimer les 4 CNAME SSL sectigo/comodoca (certificats ancien hébergeur)
- Vérifier que le wildcard `* CNAME webredir.vip.gandi.net.` n'interfère pas

---

## Fait récemment
- Index mobile — cartes : HTML brut dans descriptions questionnaires (stripHtml) + dépassement étoiles/badge corrigé ✅
- Index — filtre « par 100KMed » neutralisé via colonne `has_note_redac` en base (plus de slugs hardcodés) ✅
- Navbar mobile — logo principal (3 lignes) sous 1150px, burger déplacé à droite d'Évaluer ✅
- Partenaires hero — logos non cliquables, fond plus clair (bg-white/75) ✅
- Questionnaires/études expirés — filtrés côté requête Supabase (date_fin >= aujourd'hui) ✅
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
