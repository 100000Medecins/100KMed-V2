# TODO Archive — 100 000 Médecins

Historique des items terminés du projet.
Les items sont organisés par date (du plus récent au plus ancien).

---

**2026-05-25**
- [OK] 2026-05-25 : Checklist technique passage en prod (www) (Déploiement final)
  - Vercel `NEXT_PUBLIC_SITE_URL` → `https://www.100000medecins.org` (Production redéployée).
  - Supabase Site URL + Redirect URLs mis à jour.
- [OK] 2026-05-25 : DNS — mise en prod (Déploiement final)
  - Apex et www basculés sur Vercel (avec les nouvelles IPs `216.198.79.1` + CNAME `c7aae8f426bf52ce.vercel-dns-017.com.` recommandées par Vercel).
  - 4 CNAME SSL sectigo/comodoca supprimés.
  - `_dmarc` restauré au passage (était vide).
  - Ancien site déplacé sur `archive.100000medecins.org` avec noindex + canonical.
  - Wildcard `* CNAME webredir.vip.gandi.net.` conservé (n'interfère pas, on l'avait laissé).

**2026-05-24**
- [OK] 2026-05-24 : Email de lancement par syndicat — finaliser le wording (Communication)
  - Base livrée le 2026-05-21 (template + admin + rendus versionnés). Wording finalisé le 2026-05-24.
- [OK] 2026-05-24 : Vider la table `evaluations_vides_supprimees` — DROP fait (Nettoyage)
  - 48 évaluations vides supprimées le 2026-05-23, backup `evaluations_vides_supprimees` droppé le 2026-05-24 (pas de rétention utile, données vides par définition).

**2026-05-23**
- [OK] 2026-05-23 : Clés Cloudflare Turnstile posées en production (Déploiement final)
  - `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` créées côté Cloudflare et renseignées dans Vercel (env Production). Clés au format `0x4A...` (préfixe Cloudflare standard) également présentes dans `.env.local` pour dev.
  - Conséquence : le captcha Turnstile est maintenant **actif en production**, plus en mode no-op. Le formulaire `/inscription` vérifie réellement les soumissions humaines.

**2026-05-22**
- [OK] 2026-05-22 : Captcha anti-bots Cloudflare Turnstile à l'inscription (Sécurité)
  - Cloudflare Turnstile (invisible) intégré sur `/inscription` — widget `TurnstileWidget`, vérification serveur `verifyTurnstileToken` dans `registerWithEmail`. Dégradation gracieuse sans clés (`TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
  - Garde-fou temporel (soumission < 2,5 s = bot) maintenu en complément. Honeypot abandonné (faux positifs password managers).
  - Suite : clés Cloudflare créées et renseignées dans Vercel le 2026-05-23 (entrée du jour ci-dessus).

**2026-05-21**
- [OK] 2026-05-21 : Reset mot de passe via lien HMAC idempotent (Sécurité)
  - Module `src/lib/email/reset-token.ts` (HMAC `reset:uid:iat`, TTL 1h). `sendPasswordReset` génère un lien HMAC `/reinitialiser-mot-de-passe?uid&iat&token`. Réécriture de la page `/reinitialiser-mot-de-passe` (suppression du bricolage session/`access_token`/`sessionStorage`/bypass-lock). Server action `resetPasswordWithToken(uid, iat, token, newPassword)` → `admin.updateUserById`.
  - Idempotence naturelle : le GET du lien n'affiche que le formulaire, c'est le POST qui agit → le scanner ne consomme rien. Plus de bug de pré-scan.
- [OK] 2026-05-21 : Durcir la server action `generateAcronyme` (Sécurité)
  - `assertAdmin()` ajouté en tête de `generateAcronymeInfo` — l'endpoint n'est plus appelable sans cookie admin
- [OK] 2026-05-21 : Refacto questionnaires d'évaluation — sortir du fallback ambigu `default` (Mises à jour techniques)
  - Slug `default` renommé `logiciels-metiers`, fallback silencieux supprimé dans `getSectionsForSlug`, message UX « Questionnaire en cours d'élaboration », ~190 lignes de code mort supprimées (voir CHANGELOG 2026-05-21)

**2026-05-20**
- [OK] 2026-05-20 : Passer en main avec Next.js 16 (Mises à jour techniques)
  - Migration livrée et mergée `dev` → `main` (merge commit `e0cbd38`). Détail dans `docs/migration-nextjs-16.md`

**2026-05-19**
- [OK] 2026-05-19 : Lien vers groupe WhatsApp/Telegram par solution (Communication, sous « Favoriser l'entraide »)
  - Couvert par le module Communautés livré le 2026-05-19

**2026-05-18**
- [OK] 2026-05-18 : Solutions liées — interopérabilités, suites produits (Idées)
  - Table `solution_liens` + UI sidebar `SolutionLiensCard` + admin `SolutionLiensManager` + seed initial 22 liens (voir CHANGELOG 2026-05-18)
  - Évolution future encore ouverte (conservée dans TODO.md) : permettre aux éditeurs de proposer un lien
- [OK] 2026-05-18 : Classer la catégorie Télétransmission dans la sur-catégorie « Logiciels médicaux » (Télétransmission)
- [OK] 2026-05-18 : Tooltip téléservices CNAM sur les libellés de tags (Télétransmission)
  - `<AcronymText>` appliqué sur les libellés de tags dans `SolutionFilters.tsx` ; 7 sigles ADRi/AATi/ALDi/DMTi/IMTi/HRi/INSi en BDD `acronymes`
- [OK] 2026-05-18 : Page admin `/admin/utilisateurs/avatars` — CRUD catalogue avec drag & drop (Avatars)
- [OK] 2026-05-18 : Génération d'avatar perso — bascule vers text-to-image (Avatars)
  - Génération photo→pixel art abandonnée ; remplacée par text-to-image basée sur description user (`RequestCustomAvatar` réécrit, `generatePersonalAvatar(description)`)

**2026-05-17**
- [OK] 2026-05-17 : Remplacer les avatars utilisateurs — couplé avec la migration technique (Avatars)
  - Voir `docs/avatars_migration_plan.md`
  - Migration `users.portrait` text URL → uuid avec FK vers `avatars(id)` + nouveau catalogue de 67 avatars (50 médicaux + 17 décalés geek)
  - Plan en 4 étapes réalisé : migrer portrait vers UUID, modifier updateAvatar, adapter les requêtes d'affichage, puis remplacer les images
  - Pipeline scripté : `generate-avatars.ts` + `finalize-avatars.ts` + `upload-avatars-to-supabase.ts` (~10 USD pour 160 PNG via Retro Diffusion)
  - Plus de risque de UPDATE massif sur 5800+ utilisateurs pour changer les images (le portrait est maintenant une référence par UUID, plus une URL dénormalisée)
- [OK] 2026-05-17 : Questionnaire d'évaluation Télétransmission — conception + implémentation BDD (Télétransmission)
  - 3 sections, 20 questions mappées sur les 5 critères majeurs — voir `docs/teletransmission-questionnaire.md`

**2026-05-16**
- [OK] 2026-05-16 : Affichage avatar cassé sur une page solution (Bugs à corriger)
  - Bug d'affichage d'un avatar sur une page solution (constaté pendant les tests Next 16)
  - Cause : 60 utilisateurs avaient `portrait = 'Avatars/avatar-XX.png'` (vestige Firebase) au lieu de `/images/portraits/avatar-XX.png`
  - Fix data-only : `UPDATE users SET portrait = REPLACE(portrait, 'Avatars/', '/images/portraits/') WHERE portrait LIKE 'Avatars/%'` → 60 lignes corrigées
- [OK] 2026-05-16 : Afficher la date de dernière connexion des utilisateurs en admin (UX / UI)
  - Niveau 1 : colonne « Dernière connexion » triable dans `/admin/utilisateurs` (relatif "il y a Xj/sem./mois", titre = date complète)
  - Niveau 2 : 3 cards Actifs 7/30/90 jours + LineChart "Dernière connexion par mois" (12 mois) + BarChart "Distribution de l'inactivité" (7 buckets) dans `/admin/statistiques`
  - Source : `auth.users.last_sign_in_at` lu via `supabase.auth.admin.listUsers` paginé
  - Limite documentée : Supabase ne stocke que la dernière connexion → pas un vrai MAU. Pour un MAU réel, il faudrait un cron quotidien snapshottant `last_sign_in_at` dans `user_login_history`. À planifier seulement si besoin avéré.
- [OK] 2026-05-16 : Permettre à un utilisateur inscrit de proposer (idée / correction / vidéo) (UX / UI)
  - Espace `/mon-compte/proposer` avec 3 onglets : Idée → Correction → Vidéo
  - Idée + Correction : nouvelle table `propositions_utilisateurs` (type `idee`/`correction`, statut `en_attente`/`traite`/`refuse`, RLS + GRANTs explicites). Champ `url_concernee` pré-rempli auto avec `document.referrer` same-origin (correction surtout)
  - Vidéo : utilise la table `videos` étendue, formulaire spécifique (URL YouTube + preview embed)
  - Email de notification admin envoyé à `contact@100000medecins.org` à chaque nouvelle proposition (best-effort, ne bloque pas si SendGrid down)
  - Admin `/admin/propositions` (idée + correction) avec filtres statut/type, actions Traiter / Refuser / Remettre en attente / Supprimer. Badge sidebar admin `propositions`
  - Admin `/admin/videos` : panel "Propositions à modérer" déjà en place (Plan B initial)
  - Sidebar `/mon-compte` : item "Proposer" avec icône Sparkles, actif sur tout le sous-arbre `/proposer/*`
- [OK] 2026-05-16 : Supprimer les anciens dossiers Frontend-V2-main (Nettoyage)
  - Laptop : sous-dossier `Claude IA\Frontend-V2-main` supprimé via `robocopy /MIR` (contournement path-too-long Windows) — 2026-05-15
  - Desktop / NAS : confirmé par David — 2026-05-16

**2026-05-15**
- [OK] 2026-05-15 : Vérifier le comportement d'un inscrit en tant qu'éditeur (IMPORTANT)
  - Inscription via le parcours éditeur (revendication d'une fiche solution)
  - Connexion éditeur, accès aux fiches revendiquées
  - Édition des champs autorisés, modération éventuelle
  - Cas limites : éditeur qui revendique une fiche déjà claim, suppression de compte éditeur
- [OK] 2026-05-15 : Fusion PSC sur compte email/MDP existant — doublon de compte (Bugs à corriger)
  - Scénario : compte email/MDP créé, déconnexion, connexion PSC fraîche → 2e compte `public.users` créé au lieu de fusionner
  - Root cause : PSC userInfo sans email → callback sans clé partagée (rpps absent du compte email, email PSC null) → création d'un compte séparé
  - Solution A implémentée : `/completer-profil` détecte le conflit email → déclenche le flux `/fusionner-compte` existant (token HMAC 15 min)
  - `mergeAccounts` enrichi : dedup `evaluations` sur UNIQUE(user_id, solution_id) en gardant la plus récente

**2026-05-14**
- [OK] 2026-05-14 : Point rouge admin sur catégories parent (sidebar) — étendu vidéos 2026-05-16 (UX / UI)
  - Implémenté dans `src/lib/db/admin-badges.ts` (`getAdminBadges()`) + `src/components/admin/AdminSidebar.tsx` : badges pour `editeur_claims`, `etudes_cliniques` + `questionnaires_these` en attente, `emails_campagnes` à envoyer
  - Étendu avec « videos en attente » + « propositions en attente » lors du parcours "Proposer une vidéo" (2026-05-16)

**2026-05-12**
- [OK] 2026-05-12 : Vérifier tous les comportements utilisateurs — tests end-to-end (IMPORTANT)
  - Connexion email/mot de passe, inscription, reset password
  - Changement d'email et de mot de passe depuis le profil
  - Connexion PSC, fusion PSC (compte existant), banner PSC post-fusion
  - Suppression de compte (avec et sans suppression des avis)
  - Suppression admin d'un utilisateur
- [OK] 2026-05-12 : Importer les utilisateurs Firebase tardifs (Nettoyage)
  - Fenêtre élargie à 2026-01-01 (au lieu du seul post-migration) : 1029 users scannés
  - 55 users créés + 18 évaluations importées + 10 solutions recalculées, 0 erreur
  - Détails dans CHANGELOG. Script conservé : `scripts/import-firebase-late-users.ts`

**2026-05-09**
- [OK] 2026-05-09 : Efficience du code — rapport Ben (Performance)
  - Tous les points du rapport efficience traités (voir aussi l'item "Alléger les pages du site" ci-dessous)
- [OK] 2026-05-09 : Fix — Note rédaction homepage fausse (IMPORTANT / Bugs)
  - `getNotesRedacGlobales` moyennait tous les critères `resultats` y compris les N/A à -0.50 → ~0.1 pour Premiocare
  - Fix : lit `solutions.evaluation_redac_note` (colonne stockée), aligné sur `getNotesGlobalesRedac`
- [OK] 2026-05-09 : Alléger les pages du site — bundle / code inspection (IMPORTANT)
  - Bundle size analysé selon la méthode Ben, points traités (rapport efficience du code)
  - Items à lazy-loader / tree-shaker / remplacer identifiés et traités

**2026-05-08**
- [OK] 2026-05-08 : Audit BDD complet (Nettoyage)
  - Corrections critiques et importantes appliquées (sécurité RLS, intégrité FK, index, types)
  - Rapport détaillé : `docs/audit_bdd_05_2026.md` — Schéma : `docs/schema_bdd_05_2026.md`
- [OK] 2026-05-08 : Architecture email PSC — email synthétique vs réel (Bugs à corriger)
  - Décision : ne rien changer tant que le fix `getUserById` avant `generateLink` couvre tous les cas

**2026-05-07**
- [OK] 2026-05-07 : URGENT — Vérifier les occurrences de l'ancien slug `agenda-medical` en BDD (URGENT)
  - Vérification MCP Supabase : `categories.slug` et `questionnaire_sections.categorie_slug` = `agendas-medicaux` ✅
- [OK] 2026-05-07 : Faire le mapping sous-critères → critères principaux pour IA et agendas (IMPORTANT)
  - `DETAIL_CRITERE_MAP` hardcodé remplacé par lookup dynamique via `critere.parent_id`
  - 65 sous-critères insérés en BDD (25 agenda, 18 IA documentaires, 22 IA scribes)
- [OK] 2026-05-07 : Réparer — questionnaires de notation entièrement hardcodés côté client (IMPORTANT)
  - Clé `agenda-medical` → `agendas-medicaux` dans `SECTIONS_PAR_CATEGORIE` + `defaultOpen={true}` toutes sections
- [OK] 2026-05-07 : Configurer le MCP Supabase en lecture seule dans Claude Code (Outillage)
  - Connexion MCP Supabase configurée dans `.claude/settings.local.json`
- [OK] 2026-05-07 : Changement d'email non fonctionnel (page mon-compte/profil) (Bugs à corriger)
  - Form → div + onClick explicite sur les boutons, fix submit silencieux
- [OK] 2026-05-07 : Questionnaires de notation repliés par défaut (Bugs à corriger)
  - `defaultOpen={true}` sur toutes les sections détaillées
- [OK] 2026-05-07 : Évaluation agenda — mauvais questionnaire affiché (Bugs à corriger)
  - Clé `agenda-medical` → `agendas-medicaux` dans `SECTIONS_PAR_CATEGORIE`

**2026-05-06**
- [OK] 2026-05-06 : Traiter les remarques de Ben (rapport efficience du code) (IMPORTANT)
  - Tous les points remontés dans la capture de Ben revus et traités

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
