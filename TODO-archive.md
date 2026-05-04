# TODO Archive — 100 000 Médecins

Historique des items terminés du projet.
Les items sont organisés par date (du plus récent au plus ancien).

---

**2026-05-05**
- [OK] 2026-05-05 : Espace éditeur — accès limité aux éditeurs existants (Bugs à corriger)
  - Toutes les solutions peuvent désormais activer un espace éditeur, pas uniquement celles ayant un compte éditeur existant

**2026-05-03**
- [OK] 2026-05-03 : Sécuriser le mot de passe Supabase dans le script de backup (Sécurité)
  - Variable d'environnement `SUPABASE_DB_PASSWORD` définie au niveau "User" sur le desktop
- [OK] 2026-05-03 : Planifier le backup automatique dans Windows Task Scheduler (Infrastructure)
  - Tâche hebdomadaire dimanche 3h, pwsh.exe, desktop uniquement (allumé 24/7)
- [OK] 2026-05-03 : Synchroniser le script de backup sur le desktop (Infrastructure)
- [OK] 2026-05-03 : Planning éditorial — vue calendrier /admin/planning (Emails)
  - 3 mois côte à côte (grille CSS), dots articles/newsletters, section en retard rouge, EventRow
- [OK] 2026-05-03 : Articles blog — planification publication, heure de Paris (Blog)
  - Colonne scheduled_at, picker date+heure Paris, cron horaire Vercel, conversion Paris→UTC
- [OK] 2026-05-03 : Planification de la publication d'un article généré et relu (Blog)

**2026-05-02**
- [OK] 2026-05-02 : Footer des emails — lien de désabonnement cassé (Bugs)
  - Lien tokenisé HMAC /api/se-desabonner → connexion directe sur /mon-compte/mes-notifications
- [OK] 2026-05-02 : Uniformité des templates email (Emails)
  - Tous les fichiers migrés vers buildEmail()
- [OK] 2026-05-02 : MAJ templates Supabase natifs — cohérence visuelle (Emails)
  - Confirm signup, Change email address, Reset password mis à jour dans Supabase Dashboard
- [OK] 2026-05-02 : Médiia — association pour les vidéos/stories (Partenariats contenu)
- [OK] 2026-05-02 : La rhumatologue — contenu tutos/articles/vidéos (Partenariats contenu)

**2026-05-01**
- [OK] 2026-05-01 : Bug scores en_attente_psc inclus dans les moyennes publiques (Bugs)
  - recalcResultatsPourSolution() depuis evaluations WHERE statut='publiee' ; submitEvaluation() + PSC callback mis à jour
- [OK] 2026-05-01 : Audit données dynamiques vs. hardcodées — points résiduels (IMPORTANT)
  - SLUGS_UTILITE migré → colonne label_fonctionnalites en BDD ; criteres.ts + 4 call sites mis à jour
- [OK] 2026-05-01 : account.ts — email suppression compte migré vers buildEmail() (IMPORTANT)

**2026-04-30**
- [OK] 2026-04-30 : Documenter le flux de création utilisateur — dualité auth.users / public.users (IMPORTANT)
  - docs/user-creation-flow.md : flux email/mdp + PSC, cas limites, schéma ASCII
- [OK] 2026-04-30 : Documenter le système questionnaire / scoring (IMPORTANT)
  - evaluation-scoring.md mis à jour — questionnaires multi-catégories, DETAIL_CRITERE_MAP, SLUGS_UTILITE
- [OK] 2026-04-30 : Activer le 2FA GitHub (IMPORTANT)
- [OK] 2026-04-30 : Mobile — cartes homepage : labels abrégés Util./Réd. + badge avant étoiles (Fait récemment)
- [OK] 2026-04-30 : Audit TODO — DETAIL_CRITERE_MAP, dev local, templates email inventoriés (Fait récemment)

**2026-04-29**
- [OK] 2026-04-29 : Améliorer le menu burger en mode mobile (UX/UI)
  - Redesign gradient + accordion Comparatifs/Communauté
- [OK] 2026-04-29 : Fond des pages solutions + DA générale (UX/UI)
  - Fond global #D8E6F8 + motif dots dans globals.css
- [OK] 2026-04-29 : Migrer les scripts PowerShell vers PowerShell 7 (Infrastructure)
  - Task Scheduler configuré avec pwsh.exe

**2026-04-28**
- [OK] 2026-04-28 : Auth — centralisation navigation post-auth (Fait récemment)
  - window.location partout, middleware /connexion + /inscription, docs/auth-navigation.md
- [OK] 2026-04-28 : PSC session bloquée — router.replace → window.location.replace (Fait récemment)
- [OK] 2026-04-28 : Profil — bouton Enregistrer désactivé si aucun changement + étoiles champs obligatoires (Fait récemment)
- [OK] 2026-04-28 : Inscription — bouton "Se connecter" bloqué (email existant) corrigé (Fait récemment)

**2026-04-27**
- [OK] 2026-04-27 : Page solution — cadre note de droite hors du cadre titre (Bugs)
- [OK] 2026-04-27 : Fil d'Ariane — contraste insuffisant (Bugs)
  - Bande horizontale blanche translucide sous la navbar, variante dark
- [OK] 2026-04-27 : Visualiser les templates email depuis l'admin (Emails)
  - Sélecteur de template + prévisualisation + lien d'édition direct
- [OK] 2026-04-27 : Email — Master layout centralisé : buildEmail() unique, 8 routes migrées (Fait récemment)
- [OK] 2026-04-27 : UI mobile — Navbar accordion groupes, SolutionList/Filters/SortBar (Fait récemment)

**2026-04-26**
- [OK] 2026-04-26 : Étape 2 — Simplifier computeEvalGroupAvg (Consolidation BDD)
- [OK] 2026-04-26 : Étape 3 — Unifier la source de note partout (Consolidation BDD)
- [OK] 2026-04-26 : Étape 4 — Corriger solutions.evaluation_redac_note (Consolidation BDD)
- [OK] 2026-04-26 : Étape 5 — Admin solutions : supprimer section "Dates et publication" (Consolidation BDD)
- [OK] 2026-04-26 : Étape 6 — Listing catégorie : tri et affichage cohérents (Consolidation BDD)
- [OK] 2026-04-26 : Étape 7 — Ajouter le trigger aux migrations SQL (Consolidation BDD)
- [OK] 2026-04-26 : Note globale évaluations — incohérence (Bugs)
- [OK] 2026-04-26 : Phase 2 système de notation : unification sources de notes, simplification computeEvalGroupAvg (Fait récemment)

**2026-04-25**
- [OK] 2026-04-25 : URGENT — Relance cassée 23/04/2026 (URGENT)
  - Email d'excuse envoyé aux ~300 utilisateurs, last_relance_sent_at réinitialisé, code excuse supprimé
  - Clés excuse_draft_html et excuse_draft_sujet conservées (alimentent l'éditeur Admin → Emails → Systèmes)
- [OK] 2026-04-25 : Sortir les fichiers Office du repo Git (Hygiène projet)
- [OK] 2026-04-25 : Page /difficileDeChanger — images manquantes à réintégrer (Bugs)
- [OK] 2026-04-25 : Création de compte — email déjà existant en DB (Bugs)
- [OK] 2026-04-25 : Easter egg — Konami code + mini-jeu arcade
- [OK] 2026-04-25 : Migrer le développement en local — hors Synology (Nettoyage)
  - Projet sur c:\Users\david\Documents\100000Medecins_websiteV2

**2026-04-23**
- [OK] 2026-04-23 : PSC prod sur dev.100000medecins.org — test temporaire
  - Redirect URI https://dev.100000medecins.org/api/auth/psc-callback configurée dans l'application PSC production ANS
- [OK] 2026-04-23 : PSC BAS → production ANS (Déploiement)
  - Le relay /connexionPsc est en place — aucune action PSC le jour J

**Avant 2026-04-23 (dates inconnues)**
- [OK] : PSC — fix session cookies (verifyOtp client-side via /auth/psc-session)
- [OK] : PSC — fix utilisateur orphelin psc_create_error (generateLink recovery)
- [OK] : PSC — fix blocage "Enregistrement..." sur completer-profil (mot de passe via admin API)
- [OK] : PSC — fix domaine emails (headers() au lieu de NEXT_PUBLIC_SITE_URL dans server actions)
- [OK] : Admin utilisateurs — icône poubelle visible + scroll horizontal tableau
- [OK] : Admin emails — encart excuse éditable + prévisualisation, fix domaine affiché, fix destinataire test
- [OK] : Emails — liens 1-clic pointent vers le bon domaine (new URL(req.url).origin)
- [OK] : Page /avis-confirme publique après validation 1-clic
- [OK] : Index mobile — cartes : HTML brut dans descriptions questionnaires (stripHtml) + dépassement étoiles/badge corrigé
- [OK] : Index — filtre « par 100KMed » neutralisé via colonne has_note_redac en base
- [OK] : Navbar mobile — logo principal (3 lignes) sous 1150px, burger déplacé à droite d'Évaluer
- [OK] : Partenaires hero — logos non cliquables, fond plus clair (bg-white/75)
- [OK] : Questionnaires/études expirés — filtrés côté requête Supabase (date_fin >= aujourd'hui)
- [OK] : Glossaire — ancres inter-acronymes : sigles cliquables dans définitions/descriptions
- [OK] : Glossaire — intégration dans la recherche navbar (overlay + API)
- [OK] : Glossaire — suppression du système de catégories (formulaire, CRUD, types, affichage)
- [OK] : Tooltips acronymes sur zones texte (AcronymText, AcronymHtml)
- [OK] : Glossaire e-Santé /glossaire : page publique, ancres alphabétiques, recherche, formulaire de suggestion, admin CRUD + onglet propositions
- [OK] : Recherche navbar : overlay debounced, 3 sections, page /recherche?q=..., pg_trgm
- [OK] : Module Études & Thèses complet : dépôt questionnaires, pages mon-compte, admin validation, emails dédiés, centre de notifications
- [OK] : Email mensuel (newsletter) : génération auto le 22 du mois, brouillon éditable, envoi depuis admin, historique, page web /nl/[id]
- [OK] : Admin Emails restructuré (sous-sections études, questionnaires, notifications)
- [OK] : Page d'accueil : BlogPreview (3 derniers articles) + CommunautePreview
- [OK] : Vidéos accueil admin : sélection 4 vidéos drag & drop, expiration 30 jours, cron rappel
- [OK] : Menu Communauté navbar (Blog, Vidéos, Irritants, Études, Thèses)
- [OK] : Session admin étendue à 7 jours avec renouvellement automatique
- [OK] : Éditeur Sephira renommé en Orisha
- [OK] : SEO : correction prompt génération + script régénération masse hors LGC
- [OK] : Module vidéos : rubriques séparateurs glissables-déposables, drag-and-drop, toggle statut, miniatures YouTube
- [OK] : SEO automatique par IA (Claude Haiku) + génération en masse
- [OK] : ISR sur pages solutions + correctif generateStaticParams (erreur 500 prod)
- [OK] : Admin solutions : recherche textuelle temps réel
- [OK] : Admin utilisateurs : export CSV emails, pagination haut+bas, fix scroll horizontal
- [OK] : Filtre comparatifs ET au lieu de OU
- [OK] : Descriptions solutions : rendu HTML (dangerouslySetInnerHTML)
- [OK] : Blog IA + publication Make.com (LinkedIn, Facebook, Instagram)
- [OK] : Espace éditeur (rôles, mon-compte/mon-espace-editeur)
- [OK] : Admin utilisateurs : pagination >1000, badge PSC, colonnes RPPS
