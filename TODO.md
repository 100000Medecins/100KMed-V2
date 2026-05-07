# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### IMPORTANT

#### Consolidation base de données — héritage Firebase

> ✅ **Phase 1 SQL terminée** (2026-04-12) : 595 évaluations Firebase converties 0-10→0-5, sous-critères `detail_*` ajoutés, `resultats` recalculés. Backup `evaluations_firebase_backup` créé le 2026-04-26. Voir `docs/database-notes.md` et `docs/nettoyageBDD.md` pour le détail.

#### ~~Traiter les remarques de Ben (rapport efficience du code)~~ [OK] Fait 2026-05-06
- ~~Revoir tous les points remontés dans la capture de Ben~~
- ~~À prioriser selon criticité : perf, bundle size, requêtes redondantes, bonnes pratiques~~
- ~~Prévoir une session dédiée avec Claude pour passer point par point~~

#### Alléger les pages du site (bundle / code inspection)
- Beaucoup de code visible à l'inspection navigateur — analyser le bundle size selon la méthode Ben
- Identifier les composants ou librairies à lazy-loader, tree-shaker ou remplacer

#### ~~Faire le mapping sous-critères → critères principaux (DETAIL_CRITERE_MAP) pour IA et agendas~~ [OK] Fait 2026-05-07
- ~~`DETAIL_CRITERE_MAP` dans `src/lib/constants/criteres.ts` ne couvre que les logiciels-métier (`detail_*`)~~
- ~~Les catégories agenda (`agenda_*`) et IA (`docai_*`, `ias_*`) n'ont pas de mapping sous-critère → critère majeur~~
- ~~Sans ce mapping, la vue détaillée du comparateur est incomplète pour ces catégories~~

#### ~~Réparer — questionnaires de notation entièrement hardcodés côté client~~ [OK] Fait 2026-05-07
- ~~`SECTIONS_DETAILLEES` (logiciels-métier) et `SECTIONS_PAR_CATEGORIE` (agenda) sont des constantes JS dans `src/app/solution/noter/[...slug]/page.tsx` (lignes 77–264)~~
- ~~La BDD a pourtant des tables `questionnaire_sections` + `questionnaire_questions` — mais elles ne servent qu'à l'admin~~
- ~~La page publique de notation les ignore complètement et lit les constantes hardcodées~~
- ~~À corriger : faire lire la page de notation depuis la BDD (avec fallback hardcodé si BDD vide)~~

### ~~URGENT — À faire dès que le MCP Supabase est réparé~~

#### ~~Vérifier les occurrences de l'ancien slug `agenda-medical` en BDD~~ [OK] Fait 2026-05-07
- ~~Suite au renommage `agenda-medical` → `agendas-medicaux` (2026-05-07), vérifier qu'aucune table ne contient encore l'ancien slug~~
- ~~Tables à inspecter : `questionnaire_sections` (déjà migré via SQL), `criteres`, `solutions`, `evaluations`, `resultats`, toute table avec colonne `categorie_slug` ou `slug`~~
- ~~Vérification MCP : `categories.slug` = `agendas-medicaux`, `questionnaire_sections.categorie_slug` = `agendas-medicaux` ✅~~

### Outillage

#### ~~Configurer le MCP Supabase en lecture seule dans Claude Code~~ [OK] Fait 2026-05-07
- ~~Permet à Claude d'interroger directement la DB sans allers-retours CSV~~
- ~~Configurer en lecture seule uniquement — les écritures restent via SQL présenté dans le chat~~
- ~~Voir doc officielle Supabase MCP~~

### Sécurité

#### Passer DMARC de `quarantine 10%` à `quarantine 100%` puis `reject`
- ✅ `p=none` → `p=quarantine pct=10` fait le 2026-05-03
- **Prochaine étape (2026-05-17 à 2026-05-31)** : passer à `p=quarantine pct=100` — surveiller les rapports DMARC (`rua=`) pour vérifier que SendGrid et Supabase passent bien SPF/DKIM
- Étape finale (après quelques semaines à 100%) : passer à `p=reject`
- Modifier l'enregistrement DNS `_dmarc.100000medecins.org` chez le registrar

### Communication

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

### Nettoyage

#### Supprimer les anciens dossiers Frontend-V2-main *(dans 1–2 semaines de stabilité confirmée)*
- Sur le **desktop** : supprimer `Frontend-V2-main` dans la zone Synology (actuellement conservé en filet de sécurité)
- Sur le **laptop** : supprimer uniquement le sous-dossier `Claude IA\Frontend-V2-main` de la tâche de synchro Synology "100000Medecins", sans toucher au reste du dossier "100 000 Médecins"
- Ne pas supprimer avant d'avoir confirmé que le nouveau setup Git/GitHub tourne sans problème

#### *(2026-06-26)* Supprimer `evaluations_firebase_backup`
- 2 mois après la migration Firebase (étape 1 ci-dessus)
- Vérifier qu'aucun problème de régression n'a été constaté, puis `DROP TABLE evaluations_firebase_backup`

### Bugs à corriger

#### ~~Changement d'email non fonctionnel (page mon-compte/profil)~~ [OK] Fait 2026-05-07
- ~~Sur la page profil, cliquer "Changer email" affiche un champ, mais valider ne fait rien — l'email ne change pas~~
- ~~Probablement une régression sur l'appel Supabase Auth (updateUser) suite à une modif récente~~

#### ~~Questionnaires de notation repliés par défaut — risque de sections non remplies~~ [OK] Fait 2026-05-07
- ~~Les sections sont repliées à l'ouverture, l'utilisateur peut cliquer "Suivant" sans répondre à toutes les questions~~
- ~~Dérouler toutes les sections par défaut, ou bloquer "Suivant" si des questions obligatoires sont sans réponse~~

#### ~~Évaluation agenda — mauvais questionnaire affiché (logiciel métier au lieu d'agenda)~~ [OK] Fait 2026-05-07
- ~~Sur la page de notation d'un agenda, c'est le questionnaire "logiciel métier" qui s'affiche~~
- ~~Vérifier le mapping catégorie → questionnaire dans la page de notation~~

#### Architecture email PSC — email synthétique vs réel *(à discuter)*
- `auth.users.email` reste l'email synthétique `psc-RPPS@psc.sante.fr` ; le vrai email est dans `public.users.contact_email`
- Option possible : mettre à jour `auth.users.email` via admin API quand PSC fournit un vrai email (éviterait le `getUserById` avant `generateLink`)
- Risque si l'email réel est déjà pris par un autre compte (nécessiterait un flow de fusion dédié)
- **Décision** : ne rien changer tant que le fix actuel (`getUserById` avant `generateLink`) couvre tous les cas

### UX / UI

#### Créer un design system pour le site
- Définir les tokens de design (couleurs, typographie, espacement, ombres, border-radius) dans un fichier de référence
- Documenter les composants UI existants (Button, Card, Badge, StarRating, Breadcrumb…) avec leurs variantes
- Identifier les incohérences visuelles entre pages et les normaliser
- Objectif : base solide pour toute nouvelle feature et pour les éventuels contributeurs

### Emails — tableau de bord

#### ~~Programmer l'envoi des questionnaires de thèse~~ [OK] Fait 2026-05-05
- ~~La table `questionnaires_these` n'a que `date_fin` — pas de date d'envoi programmée~~
- ~~**À faire** : ajouter une colonne `date_envoi` (ou `scheduled_at`) à `questionnaires_these` + UI dans le formulaire admin + cron qui déclenche l'envoi~~
- ~~Prérequis du calendrier ci-dessus pour inclure les questionnaires~~

### Notifications

#### ~~Préférences de notification — études cliniques par spécialité~~ [OK] Fait 2026-05-05
- ~~Notifier un utilisateur uniquement quand une nouvelle étude clinique correspond à sa spécialité~~
- ~~Si une étude ne correspond pas à sa spécialité : l'afficher en grisé dans la liste, avec un message explicatif ("Cette étude ne concerne pas votre spécialité") — mais rester cliquable~~
- ~~À prévoir : champ `specialites_cibles` sur les études (ou tag spécialité) + logique de matching côté notification~~

### Performance

#### Efficience du code (rapport Ben)
- Revoir les points remontés dans la capture de Ben
- À prioriser selon criticité (perf, bundle size, requêtes redondantes…)

### Mises à jour techniques

#### Mettre à jour Next.js
- Actuellement en version `14.2.35` — versions récentes disponibles
- **Ne pas faire pendant un coup de stress** : prévoir une session dédiée (peut casser App Router, configs Tailwind, etc.)
- Tester sur `dev`, valider en preview Vercel avant de merger sur `main`

#### Régler les vulnérabilités npm (`npm audit`)
- 26 vulnérabilités : 2 low, 13 moderate, 10 high, 1 critical
- Procéder paquet par paquet : `npm audit` pour identifier, tester après chaque correctif
- ⚠️ **NE PAS utiliser `npm audit fix --force`** — peut introduire des breaking changes silencieux

### Déploiement final

#### Kill-switch emails routiniers — à activer au déploiement final *(pas urgent, juste avant la mise en prod)*
- Dans Admin → Emails, activer le toggle "Emails routiniers" avant de mettre le site en production
- Le switch est actuellement OFF (sécurité par défaut suite à l'incident cron dev)
- Ne pas oublier : sans ce switch, aucune relance évaluation / PSC / newsletter ne partira

#### Checklist technique passage en prod (www)
- **Vercel** → `NEXT_PUBLIC_SITE_URL` (Production) : changer `https://dev.100000medecins.org` → `https://www.100000medecins.org`
- **Supabase** → Authentication → URL Configuration → **Site URL** : changer vers `https://www.100000medecins.org`
- **Supabase** → Redirect URLs : vérifier que `https://www.100000medecins.org/reinitialiser-mot-de-passe` est dans la liste
- **PSC** : aucune action — le relay `/connexionPsc` gère automatiquement le basculement dev→www (déjà en place)

---

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

### Simplifier l'indicateur de prix (à peupler plus tard automatiquement)
- Remplacer le champ JSON `nb_utilisateurs` et la section tarification complexe par :
  - Un champ `prix_moyen` (numérique, en €/mois)
  - Un indicateur visuel 1 à 4 euros jaunes, calculé en comparant `prix_moyen` à la médiane de la catégorie
- Ajouter un **toggle admin** "Afficher le prix sur le front" (OFF par défaut — ne rien afficher pour l'instant)
- Les données seront peuplées ultérieurement via recherche automatique
- Ne pas modifier l'affichage front avant que le toggle soit activé

### DNS — mise en prod *(jour J uniquement)*
- `@ A` : remplacer `217.70.184.55` par `76.76.21.21` (IP Vercel apex)
- `www` : remplacer CNAME `webacc8.sd6.ghst.net` par `cname.vercel-dns.com.`
- Supprimer les 4 CNAME SSL sectigo/comodoca (certificats ancien hébergeur)
- Vérifier que le wildcard `* CNAME webredir.vip.gandi.net.` n'interfère pas
