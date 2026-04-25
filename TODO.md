# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### ~~URGENT — Relance cassée 23/04/2026~~ ✅ Traité 2026-04-25
- Email d'excuse envoyé aux ~300 utilisateurs ✅
- `last_relance_sent_at` réinitialisé ✅
- Code excuse supprimé (API routes, excuseTemplate, vercel.json, AdminEmailsClient) ✅
- Clés `excuse_*` dans `site_config` Supabase — **à nettoyer manuellement via Supabase**

### IMPORTANT

#### Traiter les remarques de Ben (rapport efficience du code)
- Revoir tous les points remontés dans la capture de Ben
- À prioriser selon criticité : perf, bundle size, requêtes redondantes, bonnes pratiques
- Prévoir une session dédiée avec Claude pour passer point par point

### Partenariats contenu

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Médiia** — association pour les vidéos/stories
- **La rhumatologue** (à identifier) — contenu tutos/articles/vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

### Déploiement final

#### Kill-switch emails routiniers — à activer au déploiement final *(pas urgent, juste avant la mise en prod)*
- Dans Admin → Emails, activer le toggle "Emails routiniers" avant de mettre le site en production
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- Ne pas oublier : sans ce switch, aucune relance évaluation / PSC / newsletter ne partira

### Bugs à corriger

#### Page /difficileDeChanger — images manquantes à réintégrer
- Les images de l'article original ne sont pas dans la base (`pages_statiques.contenu` ne contient aucune balise `<img>`)
- **À faire** : ouvrir la page live dans le navigateur → télécharger chaque image (clic droit → Enregistrer) → uploader dans Supabase Storage → demander à Claude d'injecter les `<img>` avec les URLs Storage dans le contenu HTML
- Le texte mojibake a été corrigé (SQL fourni en session 2026-04-24) — à confirmer que le SQL a bien été exécuté

#### Page solution — cadre note de droite hors du cadre titre
- Remettre le bloc note (droite) à l'intérieur du cadre du titre sur la page solution

#### Fil d'Ariane — contraste insuffisant
- Le breadcrumb n'est pas lisible (contraste texte/fond trop faible)
- Augmenter le contraste ou changer la couleur du texte

#### Création de compte — email déjà existant en DB
- Bug confirmé : Supabase en mode "confirm email" ne retourne pas d'erreur pour un email existant (il envoie un mail silencieusement) → l'utilisateur voit "Compte créé !" à tort
- Fix : vérifier `data.user?.identities?.length === 0` après `supabase.auth.signUp()` dans `AuthProvider.tsx` et retourner un message explicite

#### Note globale évaluations — incohérence
- Dans les **commentaires utilisateurs** : la note globale affichée ne correspond pas à la moyenne des notes des sous-critères saisis
- Vérifier aussi la **note globale** sur les pages solutions (calcul côté DB ou affichage)

#### Espace éditeur — accès limité aux éditeurs existants
- Actuellement seules les solutions ayant un éditeur associé apparaissent dans la liste
- C'est normal : le menu ne montre que les éditeurs enregistrés
- **À faire** : permettre à n'importe quelle solution d'activer un espace éditeur (pas uniquement celles qui ont déjà un compte éditeur). Transformer la feature "éditeurs" en feature disponible pour toutes les solutions

### UX / UI

#### Alléger les pages du site (bundle / code inspection)
- Beaucoup de code visible à l'inspection navigateur — analyser le bundle size selon la méthode Ben
- Identifier les composants ou librairies à lazy-loader, tree-shaker ou remplacer

#### Améliorer le menu burger en mode mobile
- En mode ouvert : mal visible, trop grand — revoir l'ergonomie et le design

#### Fond des pages solutions + DA générale
- Revoir le fond des pages solutions (couleur, texture, gradient…)
- Occasion de revoir la direction artistique globale du site

### Emails — tableau de bord

#### Tableau de bord des envois de mails — vue calendrier
- Créer une vue plus visuelle dans Admin → Emails : calendrier des envois passés et programmés
- Afficher : type d'email, nombre de destinataires, statut (envoyé / programmé / échoué), date
- Vue calendrier mensuelle + liste chronologique en dessous

### Notifications

#### Préférences de notification — études cliniques par spécialité
- Notifier un utilisateur uniquement quand une nouvelle étude clinique correspond à sa spécialité
- Si une étude ne correspond pas à sa spécialité : l'afficher en grisé dans la liste, avec un message explicatif ("Cette étude ne concerne pas votre spécialité") — mais rester cliquable
- À prévoir : champ `specialites_cibles` sur les études (ou tag spécialité) + logique de matching côté notification

### Blog

#### Planification de la publication d'un article généré et relu
- Pouvoir définir une date/heure de publication future pour un article déjà généré par l'IA et relu/validé manuellement
- L'article reste en statut "brouillon" jusqu'à l'heure planifiée, puis passe automatiquement en "publié"

### Performance

#### Efficience du code (rapport Ben)
- Revoir les points remontés dans la capture de Ben
- À prioriser selon criticité (perf, bundle size, requêtes redondantes…)

---

### Migrer le développement en local — hors Synology (des deux côtés)
- Actuellement le projet tourne sur le Synology (NAS) pour le dev
- Migrer l'environnement de développement **Frontend** et **Backend** sur les machines locales (portable/fixe), hors NAS
- Avantage : meilleure vitesse, pas dépendant du réseau local/VPN, plus simple à déboguer
- Vérifier les variables d'environnement, les ports, les certificats SSL locaux si nécessaire

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

### ~~Easter egg — Konami code + mini-jeu arcade~~ ✅ Fait 2026-04-25

### ~~PSC prod sur dev.100000medecins.org (test temporaire)~~ ✅ Fait 2026-04-23
- Redirect URI `https://dev.100000medecins.org/api/auth/psc-callback` configurée dans l'application PSC production ANS

### ~~PSC BAS → production ANS~~ ✅ Effectif au lancement
- Le relay `/connexionPsc` est déjà en place — aucune action PSC le jour J
- Le jour J = juste le changement DNS (voir ci-dessous)
- Nettoyage optionnel post-lancement : supprimer `NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI`, demander à PSC de changer la redirect URI

### DNS — mise en prod *(jour J uniquement)*
- `@ A` : remplacer `217.70.184.55` par `76.76.21.21` (IP Vercel apex)
- `www` : remplacer CNAME `webacc8.sd6.ghst.net` par `cname.vercel-dns.com.`
- Supprimer les 4 CNAME SSL sectigo/comodoca (certificats ancien hébergeur)
- Vérifier que le wildcard `* CNAME webredir.vip.gandi.net.` n'interfère pas

---

## Fait récemment
- PSC — fix session cookies (verifyOtp client-side via /auth/psc-session) ✅
- PSC — fix utilisateur orphelin psc_create_error (generateLink recovery) ✅
- PSC — fix blocage "Enregistrement..." sur completer-profil (mot de passe via admin API) ✅
- PSC — fix domaine emails (headers() au lieu de NEXT_PUBLIC_SITE_URL dans server actions) ✅
- Admin utilisateurs — icône poubelle visible + scroll horizontal tableau ✅
- Admin emails — encart excuse éditable + prévisualisation, fix domaine affiché, fix destinataire test ✅
- Emails — liens 1-clic pointent vers le bon domaine (new URL(req.url).origin) ✅
- Page /avis-confirme publique après validation 1-clic ✅
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
