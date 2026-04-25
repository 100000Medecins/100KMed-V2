# CHANGELOG — 100 000 Médecins

> Plateforme de comparaison de logiciels médicaux pour médecins libéraux français.
> Stack : Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, SendGrid, Pro Santé Connect (OIDC).

---

## [2026-04-25] — Nettoyage code excuse, fix inscription, backup BDD, TODO

### Fix — Inscription avec email déjà existant
- `AuthProvider.tsx` : ajout d'un contrôle `data.user?.identities?.length === 0` après `supabase.auth.signUp()` — Supabase ne retourne pas d'erreur pour un email existant en mode "confirm email", mais l'utilisateur retourné a un tableau `identities` vide. L'utilisateur voit désormais un message explicite au lieu de "Compte créé !".

### Nettoyage — Code email d'excuse (post-envoi)
- Suppression des routes API : `send-excuse-relance`, `programmer-excuse-relance`, `envoyer-excuse-programmee`
- Suppression de `excuseTemplate.ts`
- Retrait de l'entrée cron `envoyer-excuse-programmee` dans `vercel.json`
- Le bloc UI était déjà absent de `AdminEmailsClient.tsx`

### Infrastructure — Script backup Supabase automatisé
- Script PowerShell `C:\Users\david\scripts\backup-supabase\backup-supabase.ps1` créé
- Connexion via Session Pooler (`aws-1-eu-west-1.pooler.supabase.com:5432`)
- Format : dump custom compressé (`-Fc`), schéma `public` uniquement
- Rotation automatique : conservation des 8 derniers dumps
- Planification via Windows Task Scheduler (hebdomadaire, dimanche 3h)

### Fix — Imports excuseTemplate orphelins (build Vercel cassé)
- Cause : `excuseTemplate.ts` supprimé mais deux imports restants cassaient le build Vercel
- `AdminEmailsClient.tsx` : suppression import `buildExcuseEmail`, prévisualisation remplacée par contenu brut
- `admin/emails/page.tsx` : suppression imports `EXCUSE_DEFAULT_SUJET` / `EXCUSE_DEFAULT_BODY`, valeurs inlinées
- Correction connexe : virgule traînante dans `vercel.json` rendait le JSON invalide

### Nettoyage — Suppression fichiers Office du repo Git
- 5 fichiers binaires supprimés : `2025-12 Critères de notation IA Scribes v1.2 - test.docx`, `2026 Listing agendas médicaux.xlsx`, `2026-02 - Critères de notation #2.xlsx`, `comparatif_ia_documentaires_2026.xlsx`, `comparatif_ia_scribes_2026.xlsx`
- Ces fichiers n'ont pas leur place dans un repo Git (binaires non versionnables)
- À archiver sur le NAS Synology si besoin de conservation

### TODO — Mises à jour
- Marqué terminé : email d'excuse envoyé + code supprimé, Easter egg Konami, PSC BAS → prod
- Ajout : tableau de bord emails (vue calendrier), notifications études par spécialité, accès éditeur pour toutes les solutions, menu burger mobile, bundle selon méthode Ben, migration dev hors Synology

---

## [2026-04-24] — Audit base de données, intégrité PSC, admin études cliniques

### Admin — Création d'études cliniques
- Nouvelle action serveur `createEtudeCliniqueAdmin()` dans `etudes-cliniques.ts`, sans garde de rôle DMH
- Bouton "Ajouter" + formulaire de création (`EtudeForm`) dans l'onglet Études cliniques de l'admin
- Fix : `EtudeForm` importé en statique (plus de `dynamic()`) pour éviter un `ChunkLoadError` sur les imports dynamiques imbriqués

### Intégrité base de données — Audit complet du schéma
- Audit complet des 30+ tables du schéma public Supabase (colonnes, FK, cohérence)
- **Backfill `solutions_utilisees`** : les anciennes évaluations (pré-migration) n'avaient pas de ligne dans `solutions_utilisees`, rendant les solutions notées invisibles sur `/mes-evaluations`. SQL exécuté pour rétablir la cohérence.
- **FK ajoutée** : `evaluations(user_id, solution_id) → solutions_utilisees(user_id, solution_id) ON DELETE CASCADE` — garantit qu'une évaluation ne peut exister sans ligne lifecycle correspondante. Les évaluations anonymes (`user_id = NULL`) ne sont pas impactées (PostgreSQL ignore les FK avec colonnes NULL).
- **Tables backup identifiées** à supprimer lors d'une prochaine maintenance : `criteres_backup`, `evaluations_backup`, `resultats_backup`
- **FKs manquantes identifiées** (dette technique) : `solutions_criteres_actifs.id_critere → criteres.id` et `solutions_utilisees.solution_precedente_id → solutions.id`

### Fix PSC — Comptes doublons par normalisation RPPS
- **Cause** : PSC production renvoie le format `idNat_PS` = `"8"` + RPPS 11 chiffres (12 chiffres total), alors que PSC BAS renvoyait le RPPS brut (11 chiffres). 5 médecins avaient deux comptes distincts.
- **Fix** : nouvelle fonction `normaliseRpps()` dans `psc.ts` — si l'identifiant fait 12 chiffres et commence par `"8"`, on retire le préfixe pour obtenir le RPPS standard 11 chiffres.
- **Fusion des doublons** : SQL exécuté pour transférer évaluations et solutions utilisées des nouveaux comptes vers les anciens, puis suppression des 5 comptes en doublon.

### Restriction PSC — Médecins uniquement
- Nouvelle fonction `extractCodeProfession()` dans `psc.ts` — lit `SubjectRefPro.exercices[0].codeProfession` du token PSC
- Callback PSC bloque les connexions dont le code profession est explicitement différent de `"10"` (Médecin) avec redirection vers `/connexion?error=psc_non_medecin`
- Page `/connexion` : messages d'erreur spécifiques pour chaque code d'erreur PSC (`psc_non_medecin`, `psc_auth_error`, `psc_no_identity`, `psc_create_error`, `psc_session_error`)

---

## [2026-04-23] — Sécurité crons, sync email PSC, outil test relance

### Kill-switch emails routiniers (Admin → Emails)
- Nouveau toggle ON/OFF en haut de la page Admin > Emails
- Désactive tous les crons routiniers (relances évaluations, PSC, incomplets, newsletter) sans affecter les emails transactionnels
- Valeur stockée dans `site_config` (clé `crons_routiniers_actifs`), OFF par défaut jusqu'au déploiement final
- Nouvelle action serveur `siteConfig.ts` (`getSiteConfig` / `setSiteConfig`)

### Guard VERCEL_ENV sur les 7 crons
- Tous les crons retournent `{ skipped: true }` si `VERCEL_ENV !== 'production'`
- Empêche les déploiements de preview/dev de déclencher de vrais envois d'emails
- Suite à l'incident : 300+ utilisateurs avaient reçu des relances depuis `dev.100000medecins.org`

### Double vérification kill-switch dans chaque cron
- Après le guard VERCEL_ENV, chaque cron consulte `site_config.crons_routiniers_actifs`
- Si désactivé par l'admin → skip silencieux (HTTP 200, pas d'erreur Vercel)

### Fix sync email PSC → public.users
- Le callback PSC mettait à jour nom/prénom/spécialité mais pas l'email lors des reconnexions
- Si `public.users.email` est fictif (`@psc.sante.fr`) ou null ET que PSC fournit un vrai email → mise à jour automatique au prochain login
- SQL de migration one-shot pour corriger les comptes existants :
  ```sql
  UPDATE public.users u SET email = a.email FROM auth.users a
  WHERE u.id = a.id
    AND (u.email IS NULL OR u.email LIKE '%@psc.sante.fr' OR u.email != a.email)
    AND a.email IS NOT NULL AND a.email NOT LIKE '%@psc.sante.fr';
  ```

### Outil de test email relance (Admin → Emails)
- Bouton "Envoyer test" dans l'onglet Emails de l'admin
- Champ email optionnel pour cibler un compte précis (recherche dans `auth.users` si absent de `public.users`)
- Le lien 1-clic généré pointe vers l'origine de la requête (dev ou www selon le déploiement)
- Email de test envoyé à `contact@100000medecins.org` avec préfixe `[TEST]`
- Route : `POST /api/admin/test-relance-email`

### Logo Jeunes Médecins
- Nouveau fichier SVG `public/logos/logo-jeunes-medecins.svg`

---

## [2026-04-22] — PSC relay : test connexion prod sur dev.100000medecins.org

> **Fonctionnalité critique — authentification Pro Santé Connect**
> Cette section documente en détail le mécanisme de relay OAuth mis en place pour tester
> la connexion PSC production depuis le nouveau site (dev.100000medecins.org) sans
> modifier la configuration PSC ni impacter les utilisateurs du site actuel.
> En cas de problème, voir la section **Rollback** ci-dessous.

### Contexte et contrainte

Pro Santé Connect (ANS) n'autorise qu'**une seule `redirect_uri` par application**.
L'application PSC `100000medecins` a comme redirect_uri enregistrée :
```
https://www.100000medecins.org/connexionPsc
```

Le nouveau site est servi sur `dev.100000medecins.org` (Next.js).
Il ne peut pas recevoir directement le callback PSC sans changer cette URI.

### Architecture en place (avant ce changement)

```
Ancien site (www — Vue.js SPA statique sur Apache/Gandi)
  ↓ bouton "Se connecter avec PSC"
PSC prod → redirect vers https://www.100000medecins.org/connexionPsc?code=XXX
  ↓ (route Vue Router côté client)
Firebase Cloud Function connectPSC (échange code → token)
  ↓
Session dans sessionStorage
```

### Solution implémentée : relay OAuth via Apache

**Principe** : l'ancien site Apache peut intercepter les requêtes entrantes au niveau
serveur (`.htaccess`) AVANT que le JavaScript Vue.js ne charge. On détecte si le
`state` OAuth commence par `dev_` et on redirige vers le nouveau site.

Le nouveau site (dev) initie le flux PSC en :
1. Utilisant `https://www.100000medecins.org/connexionPsc` comme `redirect_uri`
   (l'URI enregistrée chez PSC — inchangée)
2. Préfixant le `state` OAuth avec `dev_` pour être identifiable au retour
3. Utilisant le `client_id` et `client_secret` PSC production

```
Nouveau site (dev.100000medecins.org — Next.js)
  ↓ bouton "Se connecter avec PSC"
  ↓ redirect_uri = https://www.100000medecins.org/connexionPsc
  ↓ state = "dev_<uuid>"
PSC prod → redirect vers https://www.100000medecins.org/connexionPsc?code=XXX&state=dev_YYY
  ↓ Apache .htaccess détecte state=dev_* (AVANT que Vue.js charge)
  ↓ 302 vers https://dev.100000medecins.org/api/auth/psc-callback?code=XXX&state=dev_YYY
Nouveau site reçoit le callback
  ↓ échange code → token avec PSC (redirect_uri = https://www.100000medecins.org/connexionPsc)
  ↓ session Supabase créée
Utilisateur connecté sur dev ✓
```

**Pourquoi le site actuel (www) n'est pas affecté :**
L'ancien site Vue.js n'envoie AUCUN paramètre `state` dans ses requêtes PSC
(visible dans le code compilé `407.80b8b265.js`). La règle `.htaccess` ne se
déclenche donc jamais pour les vrais utilisateurs sur www.

### Variable d'environnement à ajouter

```
NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI=https://www.100000medecins.org/connexionPsc
```

Cette variable active le mode relay. Quand elle est absente, le comportement
est identique à l'état précédent (redirect_uri = origine courante + /api/auth/psc-callback).

**À définir :** dans le dashboard Vercel du projet `dev.100000medecins.org`,
ou dans `.env.local` pour les tests en local.

**Après basculement DNS (www → Next.js)** : cette variable peut rester définie
(elle pointe vers le même domaine, le relay devient un simple pass-through),
ou être supprimée (le comportement direct reprend). Dans les deux cas, aucune
modification de la configuration PSC n'est nécessaire.

### Fichiers modifiés

#### `htdocs/.htaccess` (site V1 — à uploader sur Gandi)
Ajout de 2 lignes avant les règles SPA existantes :
```apache
RewriteCond %{QUERY_STRING} (?:^|&)state=dev_
RewriteRule ^connexionPsc$ https://dev.100000medecins.org/api/auth/psc-callback [R=302,L,QSA]
```
- `RewriteCond` : vérifie que le query string contient `state=dev_` (en début ou après `&`)
- `RewriteRule` : redirige `/connexionPsc` vers le callback du nouveau site
- `QSA` (Query String Append) : transmet tous les paramètres (`code`, `state`, `session_state`…)
- `L` : stop processing (ne pas appliquer les règles suivantes)
- Le flag `R=302` (temporaire) est intentionnel — ne pas mettre 301 (mis en cache par le navigateur)

#### `src/lib/auth/psc.ts`

**`connectWithPsc()`** (flux client — bouton PSC dans la navbar) :
- Si `NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI` défini → `redirect_uri` = cette valeur, `state` = `dev_<uuid>`
- Sinon → comportement antérieur (`redirect_uri` = `origin/api/auth/psc-callback`, `state` = `<uuid>`)
- Note : le cookie `psc_state` stocke toujours le `stateUuid` nu (sans préfixe `dev_`),
  ce qui est cohérent avec la vérification future éventuelle

**`exchangePscCode(code, redirectUri)`** (signature modifiée) :
- Ancienne signature : `(code: string, origin: string)` → construisait `${origin}/api/auth/psc-callback`
- Nouvelle signature : `(code: string, redirectUri: string)` → utilise la valeur telle quelle
- CRITIQUE : PSC vérifie que le `redirect_uri` de l'échange token est identique à celui
  de la demande d'autorisation initiale. En mode relay, les deux doivent être
  `https://www.100000medecins.org/connexionPsc`.

#### `src/app/api/auth/psc-initier/route.ts`

Flux serveur (lien email vers évaluation anonyme PSC). Même logique que `connectWithPsc()` :
- Si relay → `redirect_uri` = relay URI, state = `dev_<stateUuid>[|token]`
- Sinon → comportement antérieur

#### `src/app/api/auth/psc-callback/route.ts`

- Parsing du `state` : strip du préfixe `dev_` avant d'extraire le `verificationToken` (après `|`)
- Calcul du `callbackRedirectUri` : relay URI si définie, sinon `origin/api/auth/psc-callback`
- Ce `callbackRedirectUri` est passé à `exchangePscCode` (voir ci-dessus)

#### `src/app/connexionPsc/route.ts` (nouveau fichier)

Route Next.js à `/connexionPsc`. Double rôle :

**Phase de test (DNS encore sur Gandi)** : jamais appelée sur dev car le `.htaccess`
redirige directement vers `/api/auth/psc-callback`. Présente pour complétude.

**Après basculement DNS (www → Next.js)** : PSC redirige vers
`https://www.100000medecins.org/connexionPsc` qui arrive maintenant sur ce serveur.
Cette route redirige en 302 vers `/api/auth/psc-callback` en préservant tous les
query params. **Aucune modification de la config PSC requise.**

### Rollback

**Rollback immédiat (si le test plante)** :
1. Ouvrir le `.htaccess` téléchargé localement
2. Supprimer les 2 lignes du bloc PSC RELAY (le `RewriteCond` et le `RewriteRule`)
3. Re-uploader sur Gandi via FTP
4. Le site www reprend son comportement normal en quelques secondes

**Rollback côté dev** :
- Supprimer `NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI` du dashboard Vercel → redéployer
- Les connexions PSC sur dev échoueront (attendu : PSC refusera le redirect_uri)
- Aucun impact sur les utilisateurs de www

### Migration DNS (quand www bascule vers Next.js)

Quand les DNS de `www.100000medecins.org` pointeront vers Vercel/Next.js :
1. Le `.htaccess` Gandi devient inactif (plus de trafic vers Gandi)
2. `src/app/connexionPsc/route.ts` prend le relais automatiquement
3. `NEXT_PUBLIC_PSC_RELAY_REDIRECT_URI` peut être gardée ou supprimée — indifférent
4. **Zéro retouche de la configuration PSC** (l'URI enregistrée reste valide)

### Notes pour un développeur externe

- Le flux PSC est entièrement implémenté en mode manuel (sans lib OIDC tierce)
- Les endpoints PSC prod sont dans `src/lib/auth/psc.ts` → `PSC_ENVS.production`
- Le `client_secret` PSC ne doit jamais être exposé côté client (var sans `NEXT_PUBLIC_`)
- Les codes OAuth PSC sont à usage unique — si le callback échoue, l'utilisateur doit relancer
- L'ancien site (Firebase Function `connectPSC`) et le nouveau site (Next.js) utilisent
  le même `client_id` (`100000medecins`) mais des `client_secret` différents potentiellement
- Le `state` OAuth n'est pas vérifié contre le cookie en callback (dette technique préexistante,
  hors scope de cette PR)

---

## [2026-04-22] — Glossaire : suppression catégories · Ancres inter-acronymes · Recherche navbar

### Nouvelles fonctionnalités
- **Ancres inter-acronymes** : dans le glossaire public, chaque sigle détecté dans une définition ou description est rendu cliquable et pointe directement vers l'entrée correspondante (`#SIGLE`) — sans TreeWalker, via regex JSX côté client sur les données déjà chargées
- **Recherche navbar — Glossaire** : les acronymes apparaissent désormais dans l'overlay de recherche global (section "Glossaire"), avec navigation directe vers `/glossaire#SIGLE`

### Suppressions / simplifications
- **Catégories d'acronymes supprimées** : champ retiré du formulaire admin, du groupement public, des actions CRUD (`createAcronyme`, `updateAcronyme`, `approveSuggestion`) et des types TypeScript — affichage alphabétique simple dans l'admin et le glossaire public

### SQL requis (Supabase)
```sql
-- Nouveaux acronymes à insérer (voir session 2026-04-22)
-- La colonne `categorie` reste en base (données existantes), seul le code l'ignore désormais
```

### Fichiers modifiés
- `src/components/GlossaireClient.tsx` — ancres `id={sigle}`, `linkifyText()`, suppression groupement catégories
- `src/components/admin/AcronymesAdminClient.tsx` — suppression champ catégorie, liste plate
- `src/app/glossaire/page.tsx` — suppression `categorie` du select SQL et du type
- `src/lib/actions/admin.ts` — suppression `categorie` des 3 actions acronymes
- `src/app/api/search/route.ts` — ajout requête `acronymes` (ilike sigle + définition, max 5)
- `src/components/search/SearchOverlay.tsx` — section "Glossaire" dans l'overlay

---

## [2026-04-21] — Tooltips acronymes · Navbar CTA · Améliorations UI

### Nouvelles fonctionnalités
- **Tooltips acronymes** : détection automatique des acronymes de la table `acronymes` dans les zones de texte importantes — tooltip natif `<abbr title="...">` au survol
  - Route `/api/acronymes` (cache `revalidate = 3600`)
  - `AcronymText` pour le texte brut, `AcronymHtml` pour le contenu HTML (injection HTML-safe sur les nœuds texte uniquement)
  - Cache module-level partagé (1 seul fetch par session)
  - Zones couvertes : description solution, avis rédaction, points forts/faibles, mot de l'éditeur, extrait et corps des articles de blog

### Améliorations UI
- **Navbar — bouton "Évaluer un logiciel"** : fond navy + contour blanc `border-2` (desktop), contour blanc léger `border white/40` (mobile burger), pour le différencier du bouton "Mon compte"
- **Button** : nouvelle variante `cta` disponible (fond accent-yellow)

---

## [2026-04-21] — Glossaire e-Santé · Propositions d'acronymes · Améliorations UI

### Nouvelles fonctionnalités
- **Glossaire public `/glossaire`** : page hero + barre de recherche + ancres alphabétiques + groupes par catégorie, `revalidate = 3600`
- **Admin `/admin/acronymes`** : CRUD inline avec groupement par catégorie, autocomplete catégorie, recherche — déplacé en sous-item de "Page d'accueil" dans la sidebar
- **Propositions d'acronymes** : formulaire public en bas du glossaire (sigle + définition + email optionnel) → table `suggestions_acronymes` ; onglet "Propositions" dans l'admin avec approbation inline (éditable avant publication) ou rejet
- **Pré-remplissage email** : si l'utilisateur est connecté, son email est pré-rempli et remplacé par une checkbox "Me notifier lors de la publication"
- **Bouton "Ajouter un acronyme"** : placé à côté de la barre de recherche, scrolle vers le formulaire et l'ouvre avec focus automatique sur le champ Sigle (via `#proposer` + `hashchange`)
- **Liens officiels** : 20 acronymes enrichis avec leur URL officielle (sesam-vitale.fr, cnda.ameli.fr, esante.gouv.fr, has-sante.fr…)
- **Navbar** : lien Glossaire ajouté dans le dropdown Communauté (desktop + mobile)

### Cartes solutions (comparatifs & noter)
- Fond dégradé harmonisé avec le hero (`#148080 → #7c35c0 → #1e4da0`) sur `/comparatifs` et `/solution/noter`
- Illustrations centrées verticalement, taille réduite

### SQL requis (Supabase)
```sql
CREATE TABLE suggestions_acronymes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigle text NOT NULL, definition text NOT NULL,
  description text, email text, created_at timestamptz DEFAULT now()
);
ALTER TABLE suggestions_acronymes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert public" ON suggestions_acronymes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "read admin only" ON suggestions_acronymes FOR SELECT USING (false);
ALTER TABLE acronymes ADD COLUMN IF NOT EXISTS categorie text;
```

### Nouveaux fichiers
- `src/app/glossaire/page.tsx` — page publique glossaire
- `src/components/GlossaireClient.tsx` — client recherche + ancres alphabétiques
- `src/components/GlossaireSuggestForm.tsx` — formulaire de proposition
- `src/app/admin/acronymes/page.tsx` — page admin acronymes
- `src/components/admin/AcronymesAdminClient.tsx` — CRUD + onglet propositions

---

## [2026-04-20] — Recherche navbar · Vidéos accueil admin · Améliorations UI mobile · Corrections

### Nouvelles fonctionnalités
- **Recherche navbar** : loupe → overlay de recherche debounced, 3 sections (Solutions / Articles / Catégories) via `pg_trgm` + RPC Supabase, page `/recherche?q=...` pour résultats complets
- **Vidéos page d'accueil** : sélection de 4 vidéos depuis `/admin/videos` avec drag & drop des pills, expiration 30 jours, email de rappel (cron lundi 8h), fallback auto sur les 4 dernières publiées ; SQL requis : `ALTER TABLE videos ADD COLUMN homepage_pinned_at timestamptz, ADD COLUMN homepage_ordre int, ADD COLUMN created_at timestamptz DEFAULT now()`
- **Session admin** : durée étendue à 7 jours + renouvellement automatique du cookie à chaque action (corrige les déconnexions intempestives lors des toggles de fonctionnalités)

### Améliorations UI mobile
- **Navbar mobile** : loupe + Évaluer justifiés à droite, burger à gauche, breakpoint custom `min-[1150px]`
- **Comparatifs mobile** : 2 cartes par ligne, textes catégories plus lisibles
- **Hero catégorie mobile** : illustration visible, filtres fonctionnalités sur 2 colonnes, boutons taille réduite
- **Stories & Tutos** : 2 colonnes mobile (orphelin masqué), 4 colonnes desktop dans `max-w-4xl lg:mx-auto`
- **SolutionSortBar** : tri sur une ligne, justifié à droite
- **SolutionFilters** : intertitres et fonctionnalités sur 2 colonnes, taille boutons réduite

### Footer & layout
- Footer recentré (colonne unique), liens en haut, logo en bas (100px)
- EditorCTA : padding réduit (`pt-10 pb-6`)
- StoriesSection : `max-w-4xl` + `gap-8` desktop, max 4 vidéos

### Corrections
- **Mon compte** : correction race condition auth (profil & évaluations restaient en loading)
- **SEO auto** : prompt corrigé (n'utilisait plus toujours "logiciel métier")
- **Canonical vide** : supprimé des pages solution
- **`setHomepageVideos`** : correction `update()` sans filtre (rejeté par Supabase JS v2)
- **`getHomepageVideos`** : mode auto trie par `ordre` (évite le tri sur `created_at` NULL)

### Nouveaux fichiers
- `src/app/api/search/route.ts` — endpoint de recherche
- `src/components/search/SearchOverlay.tsx` — overlay de recherche
- `src/app/recherche/page.tsx` — page résultats complets
- `src/app/api/cron/rappel-accueil-videos/route.ts` — cron rappel expiration sélection vidéos
- `scripts/regenerate-seo-non-lgc.mjs` — régénération masse SEO hors LGC
- `scripts/search-functions.sql` — fonctions RPC + index pg_trgm (à exécuter dans Supabase)

---

## [2026-04-19] — Navigation Communauté + sections page d'accueil + corrections

### Navbar — menu Communauté
- Nouveau dropdown "Communauté" regroupant : Blog, Vidéos & tutoriels (`/stories-tutos`), Irritants de l'e-santé (toggle), Études cliniques (toggle), Questionnaires de thèse (toggle)
- Les anciens liens top-level Blog et Irritants sont supprimés du header
- Ordre : Comparatifs → Communauté → Qui sommes-nous ?
- Menu mobile : section "Communauté" avec les mêmes liens et toggles

### Page d'accueil — nouvelles sections
- **BlogPreview** : 3 derniers articles publiés en grille 3 colonnes, titre "Ce qu'on décrypte pour vous", lien "Voir tous les articles →", photo sans texte incrusté, extrait dans la zone blanche
- **CommunautePreview** : 2 études cliniques + 2 questionnaires de thèse en grille 4 colonnes, compacte, cachée si aucun contenu ou toggle off — descriptions HTML strippées
- Espacement des sections réduit (py-20/28 → py-12/16) sur AboutMission, BlogPreview, StoriesSection, CommunautePreview

### Admin — toggles navigation & accueil
- Accordéon "Navigation & sections" : 3 nouveaux toggles (`nav_etudes_visible`, `nav_questionnaires_visible`, `section_communaute_visible`)
- API `/api/nav-categories` mise à jour avec les 3 nouvelles clés `site_config`

### Corrections
- `ScrollRestoration` : désactive la restauration de scroll du navigateur au refresh (évitait le saut visible vers le milieu de la page)
- Supabase Auth Rate Limits ajustés dans le dashboard : emails 30→100/h, sign-ups 30→60/h

---

## [2026-04-18] — Newsletter mensuelle : lien navigateur + page web + corrections template

### Newsletter — lien "Voir dans le navigateur"
- **Template** (`newsletter-template.ts`) : ajout du placeholder `{{lien_navigateur}}` en haut de chaque email
- **Routes d'envoi** (`send-newsletter`, `envoyer-newsletter-programmee`) : substitution `{{lien_navigateur}}` → `/nl/{id}`
- **Page publique** `/nl/[id]` (route handler) : affiche le HTML brut de la newsletter avec variables génériques — accessible dès la création du brouillon, conservée indéfiniment
- **Admin** (`NewslettersClient`) : bouton "Voir en ligne" sur chaque newsletter envoyée + icône `ExternalLink`

### Newsletter — corrections template
- **Logos** : migration vers Supabase Storage (`images/logos/`) — URL stables en local, preview et prod (le domaine principal n'est pas encore relié aux DNS Vercel)
  * Header : `logo-secondaire-couleur-trimmed.png` (153×37px)
  * Footer : `logo-principal-couleur-trimmed.png` (120px centré)
- Suppression "Infos du mois · moisLabel" dans le header (redondant avec la carte)
- Suppression `contact@100000medecins.org` dans le footer
- Lien "Voir dans le navigateur" et désabonnement : `rgba(255,255,255,0.45)` pour meilleure lisibilité

### Migration base de données
- **`004_newsletters_etudiant_questionnaires.sql`** : migration idempotente — tables `newsletters`, `questionnaires_these`, `etudes_cliniques`, colonne `is_etudiant` sur `users`, colonnes `etudes_cliniques` + `questionnaires_these` sur `users_notification_preferences`
- **`scripts/run-migration-004.mjs`** : tente `supabase db push`, sinon affiche le SQL à coller dans le dashboard
- **`scripts/send-test-newsletter.mjs`** : envoie la newsletter du mois à l'adresse de test avec variables substituées

### Newsletter — mise en forme finale des cartes
- Toutes les cartes (blog, études, questionnaires, nouveautés) normalisées : titre 15px gras, description 13px, padding 20×24px, icône 36px
- Intertitres de section : 13px, `rgba(255,255,255,0.85)`, `padding-top:20px` pour aérer entre sections
- Logo header : `padding:10px 0 16px` (cohérent avec les autres templates)
- Suppression accroche italique sur les cartes articles (redondant avec le titre)
- Bouton "Lire l'article" en bleu `#4A90D9` (cohérent avec la barre de couleur de la carte)

### Navbar
- Logo réduit de 38px → 32px (×0.85)

---

## [2026-04-18] — Refonte logos emails alignement + site navbar/footer + PSC logo officiel

### Emails transactionnels — refonte design logos (11 templates)
- **Fix alignement logo** : remplacement de `<td align="center">` par `<table align="center">` sur le wrapper 580px — évite la cascade `text-align:center` de Gmail sur tous les descendants
- **Logos PNG rognés** (`trim-all-logos.mjs`) : tous les SVG convertis en PNG 500px via `sharp.trim({ threshold:10 })` pour supprimer le blanc transparent équilibré qui centraient visuellement les logos malgré les styles d'alignement
  * `logo-principal-nb-trimmed.png`, `logo-principal-couleur-trimmed.png`
  * `logo-secondaire-nb-trimmed.png`, `logo-secondaire-couleur-trimmed.png`
- **Logo header** : `logo-secondaire-couleur-trimmed.png` à 325px, anchor `display:block`, td `padding:10px 0 16px`
- **Logo footer** : `logo-principal-couleur-trimmed.png` à 120px, centré, lien désabonnement en `rgba(255,255,255,0.7)`
- **Fond gradient** : bleu clair positionné à `52% 6%` (bord droit du logo header) pour faire ressortir le logo
- **Illustration logiciels** (relance_1an, relance_3mois) : 120px en haut à droite de la carte via layout 2 colonnes
- **Logo PSC officiel** dans templates `verification_psc` et `relance_psc` : `ProSanteConnect_sidentifier_COULEURS.png` (260px) en remplacement du bouton texte
- **Salutation** : "Bonjour Dr {{nom}}," restaurée sur tous les templates avec salutation
- `scripts/save-relance1an.mjs` : template canonique de référence pour relance_1an
- `scripts/bake-logo-in-templates.mjs` : refonte complète appliquant le design sur les 11 templates Supabase

### Site web — logos navbar et footer
- **Navbar** : logo `logo-secondaire-couleur-trimmed.png` (PNG rogné, 38px de hauteur) — visuellement équivalent à l'ancienne version SVG 80px avec transparence
- **Footer** : `logo-principal-couleur.svg` sans filtre CSS — l'ancien `logo-principal-nb.svg + brightness-0 invert` affichait des blocs blancs opaques sur fond sombre
- **Page connexion** : bouton PSC remplacé par logo officiel `ProSanteConnect_sidentifier_COULEURS.svg` (h-14)

---

## [2026-04-18] — Fix logos emails : URL absolue, restauration 11 templates

### Emails — logo via URL absolue (fix critique)
- Réécriture complète de `scripts/bake-logo-in-templates.mjs` :
  * Logo header via URL absolue `https://www.100000medecins.org/logos/logo-secondaire-couleur-500.png`
  * Suppression du base64 — bloqué par Gmail, Outlook, Apple Mail (données URI interdites)
  * Footer avec les dots originaux restaurés (plus de logo image en footer)
  * Wrapper `max-width:580px` correct sur tous les templates
  * Les 3 templates manquants recréés : `verification_psc`, `suppression_compte`, `reinitialisation_mot_de_passe`
- `scripts/send-test-logo.mjs` nettoyé : plus d'injection base64 (logo baked dans le template)
- Aperçu admin : le logo s'affiche via l'URL absolue dans l'iframe `srcDoc`

---

## [2026-04-18] — Refonte logos plateforme (navbar, footer, admin, emails)

### Nouveaux logos — plateforme
- Dossier `public/logos/` créé avec 4 variantes : `logo-principal-couleur.svg`, `logo-principal-nb.svg`, `logo-secondaire-couleur.svg`, `logo-secondaire-nb.svg`
- PNG 500px pour emails : `logo-secondaire-couleur-500.png`, `logo-secondaire-nb-500.png`
- Favicons multi-tailles : `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`
- Composant `src/components/ui/Logo.tsx` créé (variante + couleur + taille configurables)

### Navbar
- Logo secondaire NB (`logo-secondaire-nb.svg`) inline, 80px de hauteur, légèrement débordant

### Footer
- Logo principal NB (`logo-principal-nb.svg`), 140px, `brightness-0 invert` pour apparaître blanc sur fond `navy-dark`

### Admin header
- Logo secondaire couleur (`logo-secondaire-couleur.svg`), 52px + séparateur `|` + label "Admin"

### Emails transactionnels — logo injecté côté serveur
- `src/lib/email/logo.ts` : `withEmailLogo()` injecte le logo comme premier `<tr>` dans le conteneur `max-width:580px` de chaque email
- Logo **couleur** (base64 PNG) utilisé pour compatibilité maximale — CSS `filter` non supporté par Outlook/Gmail
- Tous les points d'envoi SendGrid wrappés : 6 routes API + 2 actions serveur (`user.ts`, `account.ts`)
- Aperçu admin (`EmailTemplateEditor`) : `withPreviewLogo()` inline avec URL relative `/logos/logo-secondaire-couleur-500.png`
- Anciens headers HTML (dots + nav) supprimés de tous les templates Supabase via script Node.js

---

## [2026-04-17] — Design emails hero gradient généralisé, illustrations catégories, template lancement v16

### Design email — hero gradient généralisé sur tous les emails
- Tous les templates transactionnels et marketing mis à jour via `scripts/update-email-templates.mjs` (7 templates : relance_1an, relance_3mois, relance_incomplet, relance_psc, infos_mensuels, etude_clinique, questionnaire_recherche)
- Nouveaux HTMLs fournis pour `reinitialisation_mot_de_passe`, `suppression_compte`, `verification_psc` (à insérer en mode "HTML brut" dans l'admin)
- Convention : fond `#0f1e38` + radial-gradients, logo dots en header, card blanche avec bande colorée en top-border, footer avec lien désabonnement

### Admin emails — mode "HTML brut" + aperçu iframe
- `EmailTemplateEditor` : ajout d'un mode textarea "HTML brut" bypassant TipTap (qui strippait les styles inline)
- Aperçu redessiné : `<iframe srcDoc>` isolé du CSS de l'app, variables `{{nom}}` etc. remplacées par des valeurs fictives pour l'aperçu

### Template lancement — v16 avec illustrations catégories
- Mail de lancement refondu avec illustrations Supabase Storage pour toutes les catégories (logiciels métier, agenda, IA doc, IA scribe)
- Layout card principale : texte pleine largeur + ligne boutons+image (illustration en bottom-right, sans réduire la largeur du texte)
- Cards IA doc & IA scribe : 2 colonnes (texte+bouton 58% / image bottom-right 42%), hauteurs équilibrées
- `scripts/save-lancement-template.mjs` : sauvegarde le HTML v16 en production dans `email_templates` avec variables `{{nom}}`, `{{solution_nom}}`, `{{lien_1clic}}`, `{{lien_reevaluation}}`, `{{lien_desabonnement}}`

### Illustrations catégories — redimensionnement automatique
- `scripts/upload-category-image.mjs` : resize → 600px webp 85% via sharp, upload Supabase Storage, affiche l'URL publique
- `/comparatifs` : contraintes `max-h-[155px] max-w-[40%]` pour uniformiser les tailles quelle que soit la transparence de l'image
- `/solutions/[idCategorie]` : hero image `max-h-32 lg:max-h-40` pour les nouvelles illustrations

### Emails — Dr. NOM cohérent partout
- `relance-incomplets` et `account.ts` (suppression_compte) : passage de `{{prenom}}` à `Dr. NOM` via `nomDisplay`

---

## [2026-04-17] — Système de newsletter mensuelle, refonte emails admin, Dr. NOM

### Système de newsletter mensuelle automatique
- Nouvelle table SQL `newsletters` (mois, sujet, contenu_html, status draft/sent, timestamps)
- Cron `GET /api/cron/generer-newsletter-draft` — s'exécute le 22 de chaque mois à 9h : interroge les études cliniques actives, questionnaires de thèse publiés et le CHANGELOG du mois, génère le brouillon HTML via Claude Haiku, notifie l'admin par email
- Cron `GET /api/cron/rappel-newsletter` — quotidien à 8h30 : relance l'admin par email si un brouillon est en attente depuis plus de 5 jours
- Route `POST /api/admin/send-newsletter` — envoie la newsletter validée à tous les utilisateurs `marketing_emails: true`
- Page admin `/admin/newsletters` : liste des brouillons avec prévisualisation iframe, confirmation et envoi
- `vercel.json` : ajout des deux nouveaux crons
- Sidebar admin : "Newsletters" ajouté en sous-menu d'Emails

### Admin emails — restructuration en onglets
- Page `/admin/emails` réécrite avec 3 sections : Notifications système / Études & Thèses / Infos mensuels
- Nouveau composant `AdminEmailsClient` (onglets) + `AdminEmailsAccordion` rendu générique (`masseApiRoute` dynamique)
- Route `POST /api/admin/send-infos-mensuels` créée : envoie `infos_mensuels` aux opt-in `marketing_emails`

### Emails — passage à Dr. NOM
- Tous les envois d'emails (relances cron, lancement, infos mensuels, études, questionnaires) remplacent désormais `{{prenom}}` / `{{nom}}` par `Dr. NOM` (ex : Dr. DUPONT)
- Sélection `prenom` → `nom` dans toutes les requêtes Supabase des routes d'envoi
- **SQL requis en prod** : `CREATE TABLE newsletters (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mois text NOT NULL UNIQUE, sujet text, contenu_html text, status text NOT NULL DEFAULT 'draft', notified_at timestamptz, reminded_at timestamptz, sent_at timestamptz, recipient_count integer, created_at timestamptz DEFAULT now());`

### Design email — prototype hero gradient
- Script de test `scripts/send-test-email.mjs` : envoie un aperçu du mail de lancement
- Nouveau design aux couleurs du hero (fond `#0f1e38` + radial-gradients bleu/violet/vert, cards glass `rgba(255,255,255,0.09)`, bandes colorées par section)

---

## [2026-04-16] — Correctifs UX, admin utilisateurs, filtres ET, hotfix 500

### Hotfix — erreur 500 en production
- `getVideos()` et `getVideoRubriques()` : remplacement de `throw error` par log + retour tableau vide si la table `video_rubriques` n'existe pas encore en production
- **SQL requis en prod** : `CREATE TABLE IF NOT EXISTS video_rubriques (...); ALTER TABLE videos ADD COLUMN IF NOT EXISTS rubrique_id uuid REFERENCES video_rubriques(id);`

### Admin solutions — recherche textuelle
- Nouveau composant `AdminSolutionsTable` (client) : champ de recherche en temps réel par nom, catégorie ou éditeur, avec croix effacement et compteur de résultats

### Admin utilisateurs
- Export emails CSV : bouton "Exporter emails (N)" avec BOM UTF-8 (compatible Excel), colonnes email/prénom/nom/pseudo/rôle/spécialité/RPPS/inscription
- Bannière informative (bas de page) : nombre de comptes sans email PSC + nb ayant posté des évaluations
- Pagination affichée en haut ET en bas du tableau
- Affichage compteur : "N résultats sur M" uniquement quand une recherche est active
- Suppression du scroll horizontal (colonnes Pseudo/Spécialité/RPPS masquées sur petits écrans)

### Comparatifs — filtre fonctionnalités ET au lieu de OU
- `getSolutionsByTags` : comportement corrigé de OU → ET (intersection stricte : une solution doit posséder tous les tags sélectionnés)

### Navbar — flash de liens masqués
- Liens "Blog" et "Les irritants de l'e-santé" non affichés avant le fetch de la config (`navLoaded` flag) — plus de flash au chargement

### Description solutions — rendu HTML
- `SolutionHero` : affichage via `dangerouslySetInnerHTML` + `sanitizeHtml` (les `<p>`, `<strong>` etc. s'affichent correctement)
- `SolutionList` : balises strippées avant affichage `line-clamp-2` dans les cartes

### Formulaire contact
- Labels * (obligatoire) sur Nom, Email, Message ; "(optionnel)" sur Prénom et Téléphone
- Suppression du `required` incorrect sur le champ Prénom

### Admin vidéos — rubriques séparateurs
- Rubriques affichées comme séparateurs glissables dans la liste plate
- Glisser une vidéo sur/entre rubriques met à jour son `rubrique_id` automatiquement
- Glisser une rubrique déplace toute la section (rubrique + ses vidéos)

### Navbar mobile
- Comparatifs dépliés par défaut à l'ouverture du menu mobile

---

## [2026-04-16] — SEO automatique, Stories & Tutos, performances, admin vidéos enrichi

### SEO solutions — génération automatique par IA

- Nouvelle route API `POST /api/admin/generer-seo` : appel Claude Haiku avec le contexte de la solution (nom, catégorie, éditeur, tags principaux, points forts), génère `meta.title` et `meta.description` respectant les mots-clés imposés (avis, comparatif, médecin, lgc/logiciel métier si pertinent)
- Nouvelle page admin `/admin/seo` : liste div-based (sans tableau pour éviter le scroll horizontal) de toutes les solutions avec statut SEO (vert/orange), génération en masse avec barre de progression, bouton "Arrêter", bouton "Regénérer" et "Modifier" par ligne
- Bouton "Générer le SEO" dans `SolutionForm` (édition uniquement) avec compteurs de caractères (60/155)
- Robustesse : parsing nettoyé des blocs markdown, retry automatique sur 429/5xx, délai de 3s entre les appels en bulk

### Module Stories & Tutos — v2 enrichie

- **Rubriques vidéos** : nouvelle table `video_rubriques` (id, nom, ordre) + colonne `rubrique_id` sur `videos`
  - SQL requis : `CREATE TABLE video_rubriques (...); ALTER TABLE videos ADD COLUMN rubrique_id uuid REFERENCES video_rubriques(id);`
- **Admin vidéos enrichi** (`VideosAdminList.tsx`) :
  - Drag-and-drop natif HTML5 pour réordonner les vidéos (server action `reorderVideos`)
  - Toggle on/off statut inline (server action `toggleVideoStatut`)
  - Miniature YouTube automatique via `img.youtube.com/vi/{id}/mqdefault.jpg`
  - Gestion des rubriques en bas de page (ajout/suppression)
  - `VideoForm` : remplacement du champ "thème" libre par un dropdown "Rubrique"
- **Page publique `/stories-tutos`** : groupage par rubriques avec `<h2>` de section, vidéos sans rubrique en section "Autres vidéos", grille 2/3/4/5 colonnes en aspect ratio 9/16 compact
- Section homepage `StoriesSection` remplace `EHealthVideos` (données hardcodées) — lit depuis la DB les vidéos `is_videos_principales = true` et `statut = publie`, bouton "Voir toutes les vidéos"

### Performances — ISR sur les pages solutions

- `/solutions/[idCategorie]` et `/solutions/[idCategorie]/[idSolution]` : remplacement de `force-dynamic` par `revalidate = 300` (5 min)
- Les `revalidatePath('/solutions', 'layout')` déjà présents dans les server actions invalident le cache immédiatement après chaque modification admin
- Gain estimé : TTFB divisé par 3 à 5 sur les pages les plus visitées

### Sidebar admin

- Sous-navigation pour "Solutions" : Éditeurs, Catégories, SEO, Questionnaires en retrait avec ligne verticale bleue, visibles uniquement quand on est dans la section Solutions
- "Pages statiques" en sous-item de "Page d'accueil"

---

## [2026-04-15] — Hero animé, UX mobile navbar & comparatifs

### Hero — illustration animée (Framer Motion)

- Installation de `framer-motion@11`
- Extraction du bloc illustration en `HeroIllustration.tsx` (client component)
- Flottement indépendant par élément : chaque carte/badge a sa propre amplitude, durée et délai (durées premières entre elles pour éviter toute resynchronisation)
- Ajout d'une carte "inscrits" (badge teal 👥) dans l'illustration hero : compte en temps réel depuis la table `users` via `getSiteStats` (nouveau champ `nbInscrits`)
- Repositionnement des badges "avis" et "inscrits" en superposition biais sur d'autres cartes pour plus de dynamisme

### Navbar

- **Desktop** : interversion des boutons — "Évaluer un logiciel" en premier, "Me connecter" en second
- **Mobile** : bouton "Évaluer" toujours visible dans la barre (colonne dédiée à droite du hamburger), "Me connecter" dans le menu en `variant="white"` (était `ghost`, illisible sur fond sombre)

### Logos partenaires

- Logos SML et Le Bloc augmentés (`h-6`) sur mobile uniquement, les autres partenaires conservent `h-4`

### Comparatifs — barre de tri mobile

- Bouton "Tous critères" affiché sur une deuxième ligne centrée sous le bouton de tri actif (via mesure `getBoundingClientRect`)
- `router.push` avec `{ scroll: false }` sur tous les changements de tri — la page ne remonte plus en haut

### Page solution — onglets de navigation

- Onglets (Avis rédaction, Galerie, Évaluation détaillée…) centrés sur mobile (`justify-center`), alignés à gauche sur desktop

### Comparatif détaillé par sous-critères (mobile)

- Nom du critère affiché sur sa propre ligne au-dessus des barres (layout `flex-col` sur mobile, `flex-row` sur desktop)
- Barres réduites à `w-16` sur mobile (au lieu de `w-24`) pour tenir dans l'écran

---

## [2026-04-14] — Rôle Health Data Hub, reset mot de passe, types Supabase

### Rôle Health Data Hub

- Nouveau rôle `health_data_hub` assignable depuis `/admin/utilisateurs` (badge teal)
- Page `/mon-compte/health-data-hub` : liste des utilisateurs ayant opté pour les études cliniques (`etudes_cliniques = true`), avec export CSV (UTF-8 BOM pour Excel)
- Accès conditionnel dans le layout `mon-compte` (lien "Études cliniques" visible uniquement pour ce rôle)
- Server action `getHdhOptins()` : vérifie le rôle côté serveur avant de retourner les données

### Réinitialisation du mot de passe

- Correction du blocage sur la page `/reinitialiser-mot-de-passe` : `AbortError` causée par collision entre `getSession()` et `onAuthStateChange()` dans `AuthProvider` — suppression de l'appel `getSession()` redondant (l'événement `INITIAL_SESSION` suffit)
- Contournement du lock interne `@supabase/auth-js` : `updateUser()` remplacé par un appel direct `PUT /auth/v1/user` avec le Bearer token
- Token de récupération persisté dans `sessionStorage` pour survivre aux Fast Refresh en développement
- Redirection post-succès via `window.location.href` (rechargement complet) pour éviter le freeze du client Supabase
- Header simplifié sur la page reset (sans navbar/boutons compte) pour éviter la confusion utilisateur
- `beforeunload` : déconnexion automatique si l'utilisateur quitte la page sans changer son mot de passe

### Client Supabase

- `createBrowserClient` configuré avec `lock: fn => fn()` pour désactiver `navigator.locks` (source des AbortError)
- `AuthProvider` : suppression de `getSession()` initial, `onAuthStateChange` seul gère la session initiale via `INITIAL_SESSION`

### Types Supabase

- `src/types/database.ts` régénéré — inclut désormais `articles`, `articles_categories` et toutes les tables créées depuis la dernière génération
- `createServiceRoleClientUntyped()` supprimé de `server.ts` et tous ses usages remplacés par `createServiceRoleClient()` dans `admin.ts` et les pages blog

### Callback PSC

- `psc-callback/route.ts` : nom/prénom/spécialité non écrasés si PSC renvoie `null` (protège les valeurs saisies manuellement)

---

## [2026-04-12] — Refonte page admin utilisateurs (pagination, colonnes, PSC)

### Admin — Gestion des utilisateurs (`/admin/utilisateurs`) — refonte complète

- **Pagination étendue** : boucle `.range()` côté serveur pour dépasser la limite Supabase de 1000 lignes (`getAllUsers` dans `page.tsx`)
- **Sélecteur de page directe** : champ numérique cliquable entre « Préc » et « Suiv » pour sauter directement à une page
- **Boutons première/dernière page** (« / »)
- **Lignes par page** : choix 50 / 100 / 200
- **Badge PSC** basé sur `!!user.rpps` (présence du numéro RPPS) et non plus sur l'email — fiable même si l'email n'est pas un placeholder
- **Colonne Pseudo** : affichée et modifiable inline (`EditableCell`) — sauvegardée via `updateUserField(..., 'pseudo', ...)`
- **Colonne Spécialité** : affichée en lecture seule
- **Colonne RPPS** : affiché en monospace, masqué sur petits écrans
- **Tri** par nom ou date d'inscription, avec direction toggle
- `updateUserField` : type `field` étendu à `'nom' | 'prenom' | 'email' | 'pseudo'`

---

## [2026-04-13] — Espace éditeur (rôles utilisateurs + mon compte)

### SQL requis (migration Supabase — à exécuter une seule fois)
```sql
ALTER TABLE editeurs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS editeurs_user_id_idx ON editeurs(user_id);
```

### Admin — Gestion des utilisateurs (`/admin/utilisateurs`)

- **Nouvelle page** `src/app/admin/utilisateurs/page.tsx` + composant `AdminUtilisateursClient.tsx`
- Liste paginable de tous les utilisateurs avec recherche (email, pseudo, nom)
- Chaque ligne permet de changer le **rôle** (`médecin` / `éditeur` / `admin`) via un select
- Si rôle `éditeur` : select secondaire pour associer un éditeur parmi ceux de la base
- Avertissement "(déjà assigné)" si un éditeur est lié à un autre compte
- Sauvegarde en un clic "Enregistrer" par ligne (confirmation visuelle)
- **Lien "Utilisateurs"** ajouté dans `AdminSidebar.tsx` (entre Éditeurs et Catégories)

### Auth — Exposition du rôle (`AuthProvider.tsx`)

- Ajout de `userRole: string | null` dans le contexte `AuthContext`
- Chargé depuis `public.users` après chaque connexion/changement de session
- Disponible partout via `useAuth().userRole`

### Mon compte — Espace éditeur (`/mon-compte/mon-espace-editeur`)

- **Visible uniquement** si `userRole === 'editeur'` (lien conditionnel dans le layout)
- Affiche toutes les solutions liées à l'éditeur associé au compte
- Chaque solution est un accordéon permettant de modifier :
  - **Logo éditeur** (URL + prévisualisation)
  - **Site web**
  - **Mot de l'éditeur** (texte avec support markdown `**bold**`, liens interdits)
  - **Galerie** : ajout/suppression/réordonnancement d'images et vidéos YouTube/Vimeo (même interface que l'admin)
- Lien "Voir la page solution →" vers la page publique
- Bouton "Enregistrer" par solution avec spinner + confirmation "Enregistré ✓"

### Server actions (`src/lib/actions/admin-users.ts`)

- `assignEditeurToUser(userId, role, editeurId)` — met à jour le rôle et l'association éditeur↔utilisateur
- `getEditeurDataForUser(userId)` — vérifie le rôle, retourne l'éditeur + ses solutions (avec galerie)
- `updateSolutionByEditeur(userId, solutionId, fields)` — vérifie l'appartenance avant toute écriture
- `syncGalerieByEditeur(userId, solutionId, items)` — même vérification, synchronise la galerie

### Sécurité

- Toutes les server actions vérifient côté serveur que la solution appartient bien à l'éditeur de l'utilisateur avant toute écriture (double vérification `editeur.user_id` + `solution.id_editeur`)
- La page `/mon-compte/mon-espace-editeur` vérifie `userRole === 'editeur'` côté client + `getEditeurDataForUser` vérifie le rôle côté serveur

---

## [2026-04-13] — Galerie vidéo, UX comparatif, flux évaluation, sécurité commentaires

### Sécurité

- **Fix XSS `PublisherWord.tsx`** : le champ `mot_editeur` était injecté dans `dangerouslySetInnerHTML` sans sanitisation — un script malveillant en base s'exécutait dans le navigateur. Ajout de `sanitizeHtml()` (déjà utilisée ailleurs) autour du contenu avant rendu. `<strong>` reste autorisé pour le markdown `**bold**`.
- **Blocage URLs dans les commentaires utilisateurs** :
  - Côté client (`/solution/noter/[...slug]/page.tsx`) : avertissement orange en temps réel sous le textarea dès qu'une URL (`http://`, `https://`, `www.`) est détectée — l'utilisateur est informé et peut corriger avant soumission
  - Côté serveur (`evaluation.ts`) : fonction `stripUrls()` appelée au début de `submitEvaluation` — supprime toutes les URLs du commentaire avant sauvegarde en base, même si l'avertissement client est ignoré

---

## [2026-04-13] — Galerie vidéo, UX comparatif, flux évaluation

### Comparatif (`ComparisonSection.tsx`)

- **Légende sticky** : bandeau collant au scroll affichant le nom de chaque solution au-dessus de sa colonne de barres, dans sa couleur, avec `position: sticky top-[72px]`
- **`[overflow:clip]`** sur la `<section>` (remplace `overflow-hidden`) pour autoriser les enfants sticky tout en conservant le clipping des coins arrondis
- **Barres plus grandes** : compact mode `w-16 → w-24` (longueur), `h-1 → h-2` (épaisseur)
- **Alignement** : noms de solution alignés à gauche (bord de la barre)
- **Dropdown de swap** : cliquer sur un nom de solution comparée ouvre un menu pour la remplacer par une autre (`handleSwap` — remplace en place, conserve la couleur)
- **Bouton ×** : suppression directe d'une solution depuis la légende sticky
- **Bouton +** : ajout d'une solution depuis la légende sticky (dropdown `availableSolutions`) — visible uniquement si `canAddMore`
- **Dropdown ancré à droite** (`right-0`) pour éviter le débordement hors du cadre

### Galerie solutions (`SolutionGallery.tsx`)

- **Padding** autour de l'image principale (`px-4 py-3` sur le conteneur) pour éviter que l'image lèche les bords de la card
- **Modale zoom** : clic sur l'image principale → modale plein écran `bg-black/85`, clic n'importe où → ferme ; curseur `cursor-zoom-in / cursor-zoom-out`
- **Support vidéo YouTube / Vimeo** :
  - Détection automatique par URL (`isVideoUrl`) — fonctionne même sans champ `type` renseigné
  - Helpers `getYoutubeId`, `getVimeoId`, `getVideoEmbed`
  - Vue principale : miniature YouTube avec bouton play rouge, clic → ouvre la modale
  - Vignettes : miniature + overlay play
  - Modale vidéo : `<iframe>` avec `autoplay=1` ; clic sur l'iframe ne ferme pas la modale (`stopPropagation`)

### Admin — Galerie éditeur (`SolutionForm.tsx`, `admin.ts`, `admin-solutions.ts`)

- **Bouton "Ajouter une vidéo YouTube / Vimeo"** (rouge pointillé) → crée un item `type: 'video'`
- **Rendu adaptatif** : items vidéo affichent badge "Vidéo", champ URL dédié, miniature YouTube automatique ; items image conservent le comportement upload existant
- **Titre section dynamique** : "Galerie (3 images, 1 vidéo)"
- **`syncGalerie`** (`admin.ts`) : persist le champ `type` en base
- **`getSolutionByIdAdmin`** (`admin-solutions.ts`) : inclut `type` dans le SELECT Supabase

### Flux évaluation

- **Redirection post-soumission** (`/solution/noter/[...slug]/page.tsx`) : après `submitEvaluation`, redirige vers `/mon-compte/mes-evaluations` (au lieu de la page solution)
- **Correction `getEvaluationCompletionMap`** (`solutions.ts`) : l'ancien check (comparaison exhaustive de tous les `identifiant_tech` de la catégorie) échouait systématiquement pour le nouveau format `detail_*`. Remplacé par `submitted.size > 0` — dès qu'une évaluation est soumise, le bouton affiche "Modifier mon évaluation" au lieu de "Compléter"
- **Nettoyage** : requête Supabase sur `criteres` (devenue inutile) supprimée de `getEvaluationCompletionMap` ; join `solution:solutions(categorie_id)` supprimé

---

## [2026-04-12] — Migration DB critères logiciels métier + refonte du comparatif

### Contexte
Les anciennes évaluations utilisaient un format Firebase hérité (5 critères principaux codés en dur : `interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`, échelle 0-10). Les nouvelles évaluations collectées depuis le site utilisent 54 sous-critères `detail_*` (échelle 0-5). Ces nouvelles évaluations étaient **100% ignorées** dans le calcul des notes globales — bug critique silencieux. Ce chantier élimine la dette technique et branche les nouvelles évaluations sur toute la chaîne de calcul.

### Base de données (SQL — Supabase)

- **Bloc 1** — Sauvegardes préalables : `criteres_backup`, `evaluations_backup`, `resultats_backup`
- **Bloc 2** — Ajout de la colonne `parent_id` (text) sur `criteres` + insertion de 54 sous-critères `detail_*` avec `is_enfant = true`
- **Bloc 3** — Migration de 595 évaluations : scores JSONB transformés (ancien format clés snake_case 0-10 → nouveau `detail_*` 0-5) ; toutes les valeurs divisées par 2 ; valeurs `-1` (NC) supprimées ; fusions `detail_sav` et `detail_formation`
- **Bloc 4** — Insertion de 988 lignes dans `resultats` pour les sous-critères (trigger `trigger_update_evaluation_redac_note` désactivé temporairement — bug `uuid = text` dans sa clause WHERE, à corriger)
- **Bloc 5** — 43 anciens sous-critères passent à `type = 'archived'`

### TypeScript / Frontend

**`src/lib/db/evaluations.ts`**
- **Supprimé** : `CRITERES_PRINCIPAUX` hardcodé (ignorerait toujours les nouvelles évaluations)
- **Ajouté (exporté)** : `DETAIL_CRITERE_MAP` — mapping des 53 clés `detail_*` vers leur groupe (`interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`)
- **Ajouté** : `computeEvalGroupAvg()` — détecte l'ancien/nouveau format par préfixe de clé `detail_`, calcule la note par groupe (ancien format ÷2, nouveau format tel quel)
- **Modifié** : `getAverageNoteUtilisateurs()` — utilise `computeEvalGroupAvg`, gère les deux formats d'évaluation
- **Modifié** : `computeAggregatedResultats()` — même logique, gère les deux formats ; recalcul de la synthèse depuis les groupes (sans dépendre du champ `moyenne_utilisateur` potentiellement périmé)
- **Corrigé** : `getAvisUtilisateursPaginated()` — remplacement du heuristique `v > 5` par détection par préfixe de clé pour identifier l'ancienne échelle (pour `moyenne` et `scores`)

**`src/lib/actions/comparison.ts`**
- **Supprimé** : ancienne `getDetailedComparisonData` (utilisait `identifiant_bis` inexistant) et `SubCritereItem` — causes d'erreurs de build Vercel
- **Ajouté** : interface exportée `DetailGroupItem`
- **Ajouté** : `getDetailedComparisonData(solutionId)` — fetche les sous-critères `is_enfant = true`, les groupe par critère principal via `DETAIL_CRITERE_MAP`, retourne les données pour l'accordéon

**`src/components/solutions/detail/ComparisonSection.tsx`**
- **Supprimé** : code mort lié à `identifiant_bis`, `bisToResultat`, `stepGroups`, `getCompValByBis`, props `allResultats` et `schemaEvaluation` — causes d'erreurs de build Vercel
- **Ajouté** : prop `solutionId: string`
- **Ajouté** : états `detailMain`, `detailComps`, `detailLoading` pour l'accordéon
- **Ajouté** : `handleDetailExpand()` — lazy-charge les données au premier clic (appel direct, sans `startTransition`, pour ne pas déclencher le spinner du radar)
- **Modifié** : `handleSelect()` — fetche en parallèle (`Promise.all`) les données radar et les données détaillées de la solution comparée
- **Modifié** : `handleRemove()` — nettoie aussi `detailComps`
- **Modifié** : accordéon "Comparatif détaillé" toujours visible (suppression du `{hasDetailedData && ...}`), mention explicite "(notes utilisateurs)" dans le titre, spinner de chargement, message si aucune donnée

**`src/components/solutions/SolutionDetailPage.tsx`**
- **Ajouté** : prop `solutionId={solution.id}` passée à `<ComparisonSection>`
- **Supprimé** : props `allResultats` et `schemaEvaluation` qui n'existent plus

**Bloc 6 — Reconstitution des clés majeures (620 évaluations)**
- Les évaluations avec `detail_*` mais sans clé `interface`/`fonctionnalites`/etc. (620 lignes) ont reçu leurs clés majeures recalculées par moyenne des sous-critères de chaque groupe
- `moyenne_utilisateur` recalculée sur l'échelle 0-5 pour ces évaluations
- Correction du trigger `trigger_update_evaluation_redac_note` : `v_solution_id TEXT` → `v_solution_id UUID` (résout le bug `uuid = text` dans la clause WHERE)

### Résultat final
- `evaluations.scores` est désormais uniforme : toutes les évaluations finalisées ont les 5 clés majeures + leurs `detail_*`
- `ConfrereTestimonials` affiche les barres par critère pour l'ensemble des 676 avis
- Aucun reliquat Firebase dans le code ou la base

---

## [2026-04-11] — Session UI/UX polish + correctifs admin

### Added
- **Composant `ScrollToSolution`** (`src/components/admin/ScrollToSolution.tsx`) : composant client qui lit le query param `?scroll={id}` après une redirection et fait défiler la page admin jusqu'à la ligne correspondante, avec un bref surlignage visuel.
- **Fil d'Ariane (Breadcrumb) généralisé** (`src/components/ui/Breadcrumb.tsx`) : ajout d'une prop `variant` (`"default"` | `"light"`) pour adapter les couleurs selon le fond de page. Mode `"light"` : texte blanc avec `drop-shadow` pour lisibilité sur gradients sombres.
- **Bouton "Mettre à jour et activer"** dans `SolutionForm.tsx` : affiché uniquement quand une solution est inactive, permet de mettre à jour et passer `actif: true` en un seul clic (pattern `<button name="_activer" value="true">`).

### Changed
- **Navbar** (`src/components/layout/Navbar.tsx`) :
  - Mobile : fond en dégradé sombre unifié (`linear-gradient(135deg, rgba(10,90,90,0.95)...)`) ; texte `text-white`
  - Desktop index : navbar transparente non-scrollée, fondue avec le hero
  - Mega menu : opacité augmentée (~0.97), même dégradé navy
- **Hero sections** — toutes les pages catégorie (`/solutions/[slug]`) utilisent `bg-hero-gradient` (identique à la homepage). Breadcrumb intégré directement dans le hero (suppression du bandeau gris intercalaire).
- **Espacement intro** (`/solutions/[slug]`) : paragraphes via `[&_p]:mb-3 [&_p:last-child]:mb-0` (note : `@tailwindcss/typography` n'est pas installé, `prose` n'a pas d'effet).
- **Page `/comparatifs`** : fond `#CDD5EA`, cartes `linear-gradient(135deg, #8BAFC4 → #C47A9A → #C9A06A)`, illustrations `h-[220px]`, emoji `text-[120px]`.
- **Page `/solution/noter`** : cartes catégories refaites (grille 2 col, `min-h-[140px]`, dégradé, état actif plus sombre, support illustrations).
- **Fil d'Ariane** ajouté sur toutes les pages : `/comparatifs`, `/solutions/[slug]`, `/blog`, `/blog/[slug]`, `/solution/noter`, `/qui-sommes-nous`, pages détail solution — intégré dans le hero pour les pages à fond sombre.
- **Filtres solutions mobile** (`SolutionFilters.tsx`) : accordéon par groupe de tags (séparateurs deviennent des boutons toggle), groupes avec filtres actifs ouverts par défaut, indicateur visuel (point bleu).
- **Barre de tri** (`SolutionSortBar.tsx`) : style arrondi sticky (`rounded-2xl shadow-card border`).
- **Logo partenaires** (`HeroSection.tsx`) : plus petits sur mobile (`h-5 max-w-[70px]`).
- **Admin — scroll après édition** (`src/lib/actions/admin.ts`) : `updateSolution` redirige vers `/admin/solutions?scroll={id}`.
- **Admin — IDs de ligne** (`src/app/admin/solutions/page.tsx`) : chaque `<tr>` a `id="solution-{id}"` + `<ScrollToSolution />` en `<Suspense>`.

### Fixed
- **Bug "Valide aussi" non persisté** (`src/lib/db/admin-solutions.ts`) : la colonne `parent_ids` était absente du SELECT Supabase → les cases s'affichaient toujours vides au rechargement. Ajout de `parent_ids` dans la requête.

---

## [2026-04-11] — Robustesse publication réseaux sociaux + persistance messages

### Added
- **Persistance des messages générés** (`src/components/admin/SocialPanel.tsx`) : les posts générés pour chaque article sont sauvegardés dans `localStorage` (clé `social_posts_{id}`). Ils sont rechargés automatiquement à la réouverture de la page, avec les textes modifiés et les dates choisies. "Regénérer les messages" efface le cache.

### Fixed
- **Erreur JSON sur envoi Make.com** (`src/app/api/social-publish/route.ts`, `src/components/admin/SocialPanel.tsx`) : ajout de try/catch autour du fetch Make.com et du `res.json()` côté client — les erreurs réseau ou timeouts affichent maintenant un message lisible dans le panneau au lieu de crasher la page.

---

## [2026-04-11] — Améliorations UI pages solutions

### Changed
- **Masquage "Edité par"** (`src/components/solutions/detail/SolutionHero.tsx`) : le sous-titre "Edité par" n'apparaît plus si aucun éditeur n'est associé à la solution.
- **Layout hero aligné sur le contenu** (`src/components/solutions/detail/SolutionHero.tsx`) : la carte héro utilise désormais la même grille `lg:grid-cols-[1fr_340px]` que le reste de la page — la carte principale a exactement la même largeur que les sections "Avis de la rédaction" en dessous, et les notes (utilisateurs + rédaction) s'affichent dans la sidebar droite.
- **Onglets de navigation conditionnels** (`src/components/solutions/detail/SolutionHero.tsx`, `src/components/solutions/SolutionDetailPage.tsx`) : les boutons d'ancrage n'apparaissent que si la section correspondante a du contenu :
  - "Galerie" → masqué si `galerie` est vide
  - "Evaluation détaillée" → masqué si aucune note de rédaction détaillée
  - "Mot éditeur" → masqué si `mot_editeur` non renseigné
  - "Notes utilisateurs" → toujours visible (invite à évaluer même sans avis existants)
- **Zone de commentaire redimensionnable** (`src/app/solution/noter/[...slug]/page.tsx`) : le textarea du commentaire utilisateur passe de `resize-none` à `resize-y` — l'utilisateur peut agrandir la zone verticalement pour plus de lisibilité.
- **Bouton "Modifier mon commentaire"** (`src/app/mon-compte/mes-evaluations/page.tsx`) : bouton ajouté sur chaque ligne d'évaluation, pointe vers `/solution/noter/[categorie]/[slug]#commentaire`. La page de notation scrolle automatiquement jusqu'au bloc commentaire après chargement des données (`useEffect` sur `loading`).
- **Page "Mes notifications"** (`src/app/mon-compte/mes-notifications/page.tsx`) : section "Études cliniques" enrichie avec badge "avec le Digital Medica Hub" et mention "Plus d'informations prochainement." ; même mention ajoutée sous "Questionnaires de recherche".

---

## [2026-04-09 → 2026-04-10] — Blog IA + publication réseaux sociaux via Make.com

### Added
- **Nouveau module Blog public** (`src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`) : page listing avec hero article mis en avant, grille en deux colonnes, filtres par catégorie (navigation par query param `?categorie=`). Revalidation ISR toutes les 5 minutes.
- **Gestion du blog en admin** (`src/app/admin/blog/page.tsx`, `/nouveau`, `/[id]/modifier`) : tableau de bord listant les articles avec statut (publié / brouillon), date, catégorie. Boutons Éditer et Supprimer inline.
- **Composant `ArticleForm`** avec WYSIWYG TipTap, champ titre, image de couverture (URL), chapeau, meta description SEO, catégorie, statut (brouillon/publié), date de publication planifiable. Champs en state React pour permettre la génération automatique.
- **Génération d'article par IA** (`src/app/api/generer-article/route.ts`) : endpoint POST appelant Claude (claude-sonnet-4-6) avec un system prompt incarnant le "Dr Azerty", président de l'association 100 000 Médecins. Retourne un objet JSON structuré `{ titre, chapeau, contenu_html, meta_description }`. L'article est en prose (pas de listes), 700–1000 mots, avec balises `<h2>`, `<p>`, `<strong>`, `<em>`. Ton à la 1ère personne du pluriel ("nous", "notre association").
- **Génération de posts sociaux par IA** (`src/app/api/generer-posts-sociaux/route.ts`) : endpoint POST générant simultanément trois posts (Instagram, LinkedIn, Facebook) adaptés au ton de chaque réseau, avec hashtags pour Instagram, à partir du titre + chapeau + URL de l'article.
- **Panneau "Publier sur les réseaux"** (`src/components/admin/SocialPanel.tsx`) : accessible depuis la page de modification d'article, avec toggle Immédiat / Programmer par réseau et avertissement si l'article n'est pas encore publié.
- **Recherche de visuels Unsplash** (`src/app/api/suggerer-image/route.ts`) : extrait les mots-clés pertinents du titre via Claude Haiku, lance une recherche Unsplash orientée paysage, retourne 8 suggestions avec thumbnails et crédits photographes.
- **Publication sur les réseaux sociaux via Make.com** (`src/app/api/social-publish/route.ts`) : webhook générique envoyant à Make.com un payload `{ network, text, scheduled_at, image_url, article_url }`. Supporte la publication immédiate ou planifiée pour LinkedIn, Facebook, Instagram. Buffer abandonné (tokens OIDC dépréciés côté tiers) au profit de Make.com.
- **Gestion des catégories d'articles** (`ArticleCategoriesManager`) : CRUD inline des catégories de blog avec champ nom et slug, positionnement par glisser-déposer.
- `createServiceRoleClientUntyped()` dans `server.ts` : client Supabase sans typage strict pour les tables `articles` et `articles_categories` absentes des types Supabase générés, en attendant la prochaine régénération.
- **Améliorations cosmétiques** (commit `97374f0`) : images de catégories sur les cartes de la page `/comparatifs`, corrections visuelles diverses.

### Changed
- Navigation admin étendue avec entrée "Blog" pointant vers `/admin/blog`.
- Page d'accueil admin (`/admin/index`) : ajout des clés `nav_blog_visible` et `nav_irritants_visible` dans `site_config` pour contrôler l'affichage des entrées de navigation.

---

## [2026-04-07 → 2026-04-08] — Page "Irritants e-santé" + relances mail PSC + tags agendas

### Added
- **Page `/irritants-esante`** (`src/app/irritants-esante/page.tsx`) : page statique dont le contenu est géré depuis l'admin via la table `pages_statiques` (slug `irritants-esante`). Rendu via le composant `PageStatique` avec breadcrumb.
- **Cron de relance PSC** (`src/app/api/cron/relance-psc/route.ts`) : job GET sécurisé par `CRON_SECRET`. Envoie jusqu'à 4 relances espacées de 7 jours aux évaluateurs dont l'évaluation est en statut `en_attente_psc`. Utilise le template `relance_psc` de la table `email_templates`, avec variables `{{solution_nom}}`, `{{psc_link}}`, `{{relance_num}}`, `{{max_relances}}`. Tracks `last_relance_psc_sent_at` et `relance_psc_count` sur la table `evaluations`.
- **Tags sur les agendas** (commit `3ad5d7c`) : système de tags spécifique à la catégorie "agendas médicaux", avec gestion admin.

### Changed
- Petites améliorations de l'admin (commit `fd78485`) : corrections d'affichage, navigation.

---

## [2026-04-06] — Questionnaires IA médicaux + index admin modifiable

### Added
- **Questionnaires spécialisés** (`src/app/admin/questionnaires/page.tsx`, `src/lib/actions/questionnaires.ts`) : interface admin pour éditer les questions détaillées du formulaire d'évaluation par catégorie. Quatre profils : logiciels métier (défaut), agenda médical, IA Scribes (`intelligence-artificielle-medecine`), IA Documentaires. L'éditeur de questionnaire (`QuestionnaireEditor`) sauvegarde les questions immédiatement (commit `ec879ba`).
- **Questionnaires IA Scribes** (commit `eda2130`) et **IA Documentaires** (commit `9b04202`) : sections de questions spécifiques à ces catégories ajoutées dans le formulaire d'évaluation step-by-step.
- **Index modifiable depuis l'admin** (`src/app/admin/index/page.tsx`, `AdminIndexEditor`) : l'admin peut configurer le contenu de la page d'accueil (titre hero, sous-titre, image hero, label partenaires, titre section articles, slugs d'articles mis en avant, visibilité des entrées de navigation irritants/blog). Commit `090ffde`/`efa5b78` : corrections et stabilisation.
- **Section `/comparatifs`** (`src/app/comparatifs/page.tsx`) : page publique regroupant toutes les catégories actives de solutions, organisées par groupes (`groupes_categories`) avec images.

### Fixed
- Sauvegarde immédiate des questions dans le questionnaire (commit `ec879ba`).
- Corrections diverses admin post-ajout des nouvelles catégories (commits `50b4187`, `7ebcc9d`, `090ffde`).

---

## [2026-04-05] — Recherche IA solutions + éditeurs + agendas médicaux et IA Scribes

### Added
- **Recherche IA solutions** (`src/lib/actions/searchSolution.ts`) : lors de la création/modification d'une solution en admin, bouton "Rechercher avec l'IA" qui appelle Tavily (recherche web FR + EN en parallèle) puis Claude Haiku avec function calling (`extraire_infos_logiciel`) pour générer une description ultra-concise et un avis éditorial factuel. Détecte le site officiel et récupère le logo via logo.dev.
- **Recherche IA éditeurs** (`src/lib/actions/searchEditeur.ts`) : même mécanique appliquée aux fiches éditeurs.
- **Catégorie "Agendas médicaux"** (commit `4710134`) : nouvelle catégorie avec formulaire d'import spécifique, critères de notation adaptés (prise de RDV patient, rappels SMS, interopérabilité), gestion admin complète.
- **Catégorie "IA Scribes"** (commit `eda2130`) : catégorie pour les logiciels d'aide à la rédaction médicale par IA.
- **Catégorie "IA Documentaires"** (commit `9b04202`) : catégorie pour les outils IA de gestion documentaire médicale.
- **Pages éditeurs** (`src/app/editeur/[idEditeur]/page.tsx`) : page publique de présentation d'un éditeur avec ses solutions associées.
- **Admin éditeurs** (`src/app/admin/editeurs/`, `EditeurForm`, `EditeurDiffPanel`, `EditeurWithSearch`) : CRUD complet des éditeurs avec recherche IA intégrée et panneau de diff affichant les champs avant/après modification.
- **Page "Qui sommes-nous"** (`src/components/QuiSommesNousPage.tsx`) : contenu éditorial et syndicats fondateurs avec accordéon glisser-déposer, correction d'affichage (commit `2d84398`).

### Fixed
- Fix import et gestion des catégories agendas (commits `dc73862`, `ad1b323`).
- Corrections diverses (commits `a191ac1`, `7124f61`, `5495e73`).

---

## [2026-04-04] — Emails de relance, centre de notifications, suppression de compte

### Added
- **Centre de notifications utilisateur** (`src/app/mon-compte/mes-notifications/page.tsx`) : page avec toggles pour 4 préférences : rappels de revalidation, annonces & nouveautés, études cliniques, questionnaires de recherche. Sauvegarde instantanée en base via `updateNotificationPreferences` (`src/lib/actions/notifications.ts`).
- **Cron de relance évaluations** (`src/app/api/cron/relance-evaluations/route.ts`) : job sécurisé envoyant :
  - Email `relance_1an` : 1 an après la dernière évaluation si jamais relancé.
  - Email `relance_3mois` : tous les 3 mois indéfiniment jusqu'à revalidation ou désabonnement.
  - Respecte la préférence `relance_emails` de l'utilisateur. Utilise des liens de réévaluation 1-clic signés (`src/lib/email/revalidation.ts`).
- **Cron de relance incomplets** (`src/app/api/cron/relance-incomplets/route.ts`) : relance les utilisateurs ayant commencé mais pas terminé leur profil.
- **Admin emails** (`src/app/admin/emails/page.tsx`) : interface accordion pour éditer 6 templates : lancement, relance_1an, relance_3mois, verification_psc, suppression_compte, réinitialisation_mot_de_passe. Support de l'envoi massif pour le mail de lancement via `/api/admin/send-lancement`.
- **Suppression de compte** (`src/components/mon-compte/DeleteAccountModal.tsx`, `src/lib/actions/account.ts`) : modal de confirmation double validation, suppression de toutes les données utilisateur, email de confirmation, enregistrement dans `compte_suppressions`.
- **Tableau de bord Statistiques admin** (`src/app/admin/statistiques/page.tsx`) : KPI cards (total avis, utilisateurs, solutions, note moyenne, comptes supprimés), graphiques SVG maison (line chart, bar chart horizontal, donut chart, distribution des notes), fraîcheur des avis (< 1 an vs > 1 an), top solutions par nb avis et par note, démographie utilisateurs (spécialités, mode d'exercice), inscriptions par mois.
- **Amélioration parcours nouvel utilisateur** (commit `fe51c32`) : onboarding plus fluide.

### Changed
- Page connexion : amélioration du flux de récupération de mot de passe.
- Page "Mon compte" (profil, layout) : comportement des boutons et changement d'email (commit `fa2601e`).
- Amélioration de la recherche par tags et de l'admin (commit `320233b`).

### Fixed
- Fix 1er login : correction de la redirection après authentification initiale (commit `904be4f`).
- Fix oubli de mot de passe (commit `904be4f`).
- Stabilisation des relances et de la suppression (commits `e21cb22`, `cbffea1`, `b3724a1`, `00dc231`).

---

## [2026-04-03] — Parcours de notation sans email + validation PSC stabilisée

### Added
- **Nouveau parcours de notation via URL signée** (`src/app/solution/noter/[...slug]/page.tsx`) : accès à la notation d'une solution directement via une URL signée sans être connecté. Formulaire multi-étapes : notes principales (5 critères sur 5 étoiles), questions détaillées par sections (Avant/Pendant/Après la consultation, subdivisées en sous-étapes), commentaire libre.
- **Évaluation anonyme avec vérification PSC** (`submitEvaluationAnonyme` dans `src/lib/actions/evaluation.ts`) : l'évaluateur non connecté fournit un email temporaire, reçoit un lien PSC par mail, valide son identité de professionnel de santé via Pro Santé Connect. L'évaluation reste en statut `en_attente_psc` jusqu'à validation.
- **Toggle actif/inactif sur solutions** (`src/components/admin/ToggleSolutionActif.tsx`) : interrupteur inline dans l'admin pour activer/désactiver une solution sans passer par le formulaire complet (commit `51df47a`).

### Fixed
- Nombreuses corrections de stabilité PSC et du parcours de notation (commits `344698f` → `f89881a`) : gestion des redirections, validation des tokens, états d'erreur, récupération de session.
- Fix changement d'email et comportement des boutons page "Mon compte" (commit `fa2601e`).
- Corrections antérieures liées aux modifications précédentes (commit `21f6855`).

---

## [2026-04-02] — Amélioration admin, filtres comparatif, corrections TypeScript et stabilité

### Added
- **Filtres comparatif** (`src/components/solutions/SolutionFilters.tsx`, commit `464ebbd`) : filtres latéraux pour les pages de listing solutions (catégorie, note minimale). Filtres optimisés pour les pages comparatifs (commit `06eac3e`).
- Améliorations admin (commits `53a77c4`, `c4b55e3`) : présentation des listes, navigation, formulaires.

### Fixed
- Fix Navbar : conversion en composant client (`'use client'`) pour supporter les hooks React (commit `c4b55e3`).
- Fix import nommé `TextStyle` depuis `@tiptap/extension-text-style` — était importé par défaut (commit `48e8ba0`).
- Fix erreurs TypeScript : suppression import inutilisé, ajout vérification null sur `categorie` (commit `21a5793`).
- Fix vérification null sur toutes les pages serveur pour éviter les erreurs 500 au runtime (commit `5163240`).
- Fix erreur 500 : ajout `export const dynamic = 'force-dynamic'` sur les pages solutions utilisant `searchParams` en conflit avec ISR (commit `a7c241c`).

---

## [2026-03-31 → 2026-04-01] — Ordre des catégories, header fixé, WYSIWYG amélioré

### Changed
- **Ordre des catégories** (commit `aa0c12d`) : gestion de l'ordre d'affichage des catégories en admin, avec déplacement par glisser-déposer et persistance en base.
- **Header fixé** (commit `ed7f030`) : la Navbar reste visible lors du scroll (position sticky).
- **Éditeur WYSIWYG TipTap** amélioré (commit `aa0c12d`) : ajout des contrôles couleur et taille de police dans la barre d'outils.

### Fixed
- Corrections sur les catégories après refonte de leur ordre (commit `7047725`).

---

## [2026-03-29 → 2026-03-30] — Fixes WYSIWYG, formulaire contact, récupération mot de passe

### Fixed
- Corrections successives du `RichTextEditor.tsx` (commits `0fc5e29`, `50eff59`) : stabilisation des extensions TipTap (police, couleur, image, tableau), résolution des conflits d'hydratation SSR.
- Fix formulaire de contact : l'email n'était pas envoyé via SendGrid (commit `2c44b6a`).
- Fix flux de récupération de mot de passe : le lien de réinitialisation ne fonctionnait pas correctement (commit `2c44b6a`).

### Changed
- Changement des credentials admin (commit `b988283`).

---

## [2026-03-28] — Éditeur WYSIWYG (TipTap), galerie images, migration vers Supabase Storage

### Added
- **Éditeur WYSIWYG TipTap** (`src/components/admin/RichTextEditor.tsx`, commit `3f8fff7`) pour le contenu des pages statiques et des solutions. Extensions intégrées : StarterKit, Underline, Link, Table (TableRow, TableCell, TableHeader), Image, Color, TextStyle, extension personnalisée `FontSize` (glisser sur liste de tailles prédéfinies), palette de 12 couleurs.
- **Upload d'images vers Supabase Storage** (`src/app/api/upload/route.ts`) : endpoint utilisé par le WYSIWYG et les galeries.
- **Bouton upload galeries** dans `SolutionForm` (commit `623f4f2`) : upload d'images dans la galerie d'une solution depuis l'admin.
- **Déplacement d'images dans la galerie** (commit `0fc5e29`) : réordonnancement par glisser-déposer.
- **Mise à jour `SolutionForm.tsx`** (commit `bb6c088`) : intégration du WYSIWYG et du gestionnaire de galerie.

### Changed
- Suppression des images locales migrées vers Supabase Storage (commit `6cba419`) : nettoyage du répertoire `public/` des assets déplacés en cloud.

---

## [2026-03-26] — Page Vidéos YouTube, intégration Premiocare

### Added
- **Page `/videos`** (`src/app/(static)/videos/page.tsx`, commit `d66b97d`) : grille de vidéos YouTube embed en format 9:16 (portrait), chargées depuis la table Supabase `videos`. Revalidation ISR toutes les heures. Regex de détection des IDs YouTube (watch, embed, shorts, youtu.be).
- **Bouton d'accès vidéos** depuis la homepage et mise à jour de la Navbar (commit `d66b97d`).
- **`.gitignore`** et **`README.md`** : fichiers de base du projet ajoutés (commit `d66b97d`).
- Intégration **Premiocare** (commit `8f8d5b2`) : solution partenaire ajoutée dans la base.

---

## [2026-03-24] — UI admin thème navy, spécialités PSC, tri des critères

### Changed
- **Admin UI thème navy** (`src/app/admin/layout.tsx`, `src/components/admin/AdminHeader.tsx`, commit `e303d5f`) : refonte visuelle complète de l'interface d'administration aux couleurs navy/blanc du site. Sidebar avec navigation claire par sections (Solutions, Catégories, Éditeurs, Pages, Emails, Statistiques…).
- **Mapping spécialités PSC** (`src/lib/auth/psc-specialites.ts`) : correspondance des codes de spécialités ANS (SM26, SM53, SM54 → médecine générale ; 50+ spécialités) vers leurs libellés lisibles pour les statistiques et le profil utilisateur.
- **Tri des critères** dans `SolutionForm` : les critères de notation sont organisés et triés par catégorie.
- Correction de la typo du nom du site (commit `e303d5f`).

---

## [2026-03-20] — Pages légales, formulaire de contact SendGrid, nettoyage UI

### Added
- **Page RGPD** (`src/app/(static)/rgpd/page.tsx`) : 17 articles couvrant la politique de confidentialité complète (définitions, données collectées, finalités, droits RGPD art. 15-22, cookies, sous-traitants Supabase/Vercel, transferts hors UE, mineurs). Contenu gérable depuis l'admin ou affiché en dur si absent de la DB.
- **Page CGU** (`src/app/(static)/cgu/page.tsx`) : conditions générales d'utilisation.
- **Page Transparence** (`src/app/(static)/transparence/page.tsx`) : charte de transparence sur la méthodologie de notation et l'indépendance éditoriale.
- **Formulaire de contact** (`src/app/(static)/contact/page.tsx`, `src/lib/actions/contact.ts`) : formulaire avec nom, email, sujet, message. Envoi via SendGrid vers contact@100000medecins.org.

### Changed
- Nettoyage UI général : suppression d'éléments visuels superflus, harmonisation des espacements sur les pages publiques.

---

## [2026-03-03] — Sidebar filtres, fix évaluation "plus utilisé", sanitize HTML

### Added
- **`src/lib/sanitize.ts`** : utilitaire `sanitizeHtml` filtrant les balises autorisées (`<br>`, `<u>`, `<b>`, `<strong>`, `<em>`, `<i>`, `<p>`) dans les avis utilisateurs pour prévenir les XSS.

### Changed
- **Layout sidebar filtres** : refonte du layout de la page de listing solutions avec sidebar de filtres latérale sticky (catégorie, note minimale, critères de tri) et grille solutions 3 colonnes à partir de `xl`.

### Fixed
- Fix évaluation "plus utilisé" : cocher "je n'utilise plus ce logiciel" n'enregistrait pas correctement la date de fin dans la table `evaluations`.
- Fix affichage des avis : les balises HTML (`<br>`, `<u>`, `<b>`) s'affichaient en texte brut au lieu d'être rendues.

---

## [2026-02-26] — Point de sauvegarde initial

### Context
Sauvegarde de référence documentant l'état du projet : admin blog fonctionnel (liste, création, modification d'articles avec WYSIWYG), système de pages statiques en place (CGU, RGPD, À propos, gestion depuis l'admin). Correspond à la base depuis laquelle toutes les évolutions suivantes ont été développées.

---

## Notes techniques d'architecture

### Stack et services externes

| Composant | Technologie |
|---|---|
| Framework | Next.js 14 (App Router, React Server Components + Client Components) |
| Base de données | Supabase (PostgreSQL, Row Level Security) |
| Authentification | Supabase Auth (email/password) + Pro Santé Connect (OIDC) |
| Storage | Supabase Storage (images galeries, logos) |
| Emails transactionnels | SendGrid avec templates HTML personnalisables depuis l'admin |
| Génération IA articles | Anthropic API — claude-sonnet-4-6 |
| Enrichissement IA fiches | Anthropic API — claude-haiku-4-5 (function calling) |
| Recherche web pour IA | Tavily API (recherche FR + EN, extraction contenu) |
| Publication réseaux sociaux | Make.com via webhook générique |
| Images stock blog | Unsplash API |
| Logos logiciels | logo.dev |
| Déploiement | Vercel (Edge Network) |

### Modèle de données principal (tables Supabase)

- `solutions` — logiciels comparés (nom, slug, description, logo, galerie, critères, notes)
- `categories` — catégories de solutions avec groupes, position, image
- `groupes_categories` — regroupement de catégories (ex : "Logiciels métier", "IA Médicale")
- `editeurs` — éditeurs de logiciels
- `evaluations` — avis des médecins (notes critères, commentaire, statut PSC, dates relances)
- `users` — profils médecins (spécialité PSC, mode exercice, densité pop., RPPS)
- `users_notification_preferences` — préférences email par utilisateur (relances, marketing, études, thèses)
- `pages_statiques` — contenu éditorial admin (RGPD, CGU, Transparence, Qui sommes-nous, Irritants…)
- `articles` — articles de blog (titre, slug, contenu HTML, statut, date publication, id_categorie)
- `articles_categories` — catégories du blog (nom, slug, position)
- `email_templates` — templates HTML des emails transactionnels et de relance (sujet + contenu_html avec variables `{{…}}`)
- `site_config` — configuration dynamique clé/valeur de la page d'accueil
- `videos` — vidéos YouTube embarquées
- `partenaires` — logos partenaires (position, url, image)
- `questionnaire_sections` — questions détaillées du formulaire d'évaluation par catégorie-slug
- `compte_suppressions` — log horodaté des suppressions de comptes

### Pro Santé Connect (PSC)

- Intégration OIDC manuelle : flow code → échange token côté serveur (`/api/auth/psc-initier`, `/api/auth/psc-callback`)
- Deux environnements configurables via `NEXT_PUBLIC_PSC_ENV` : `bas` (préproduction ANS, wallet.bas.psc.esante.gouv.fr) et `production` (wallet.esw.esante.gouv.fr)
- Extraction du RPPS depuis `preferred_username` ou `otherIds[{ origine: 'RPPS' }].identifiant`
- State + nonce stockés en cookies (durée 10 min) pour résister aux redirects cross-contexte

### Conventions de code

- `export const dynamic = 'force-dynamic'` obligatoire sur toutes les pages utilisant `searchParams` (conflit avec ISR Next.js 14)
- Client Supabase typé : `createServiceRoleClient()` (admin, service role) vs `createServerClient()` (pages publiques, user role)
- Crons sécurisés par header `Authorization: Bearer <CRON_SECRET>`
- Toutes les mutations sensibles passent par des Server Actions Next.js (`'use server'`)
- Tables `articles` et `articles_categories` utilisent `createServiceRoleClientUntyped()` en attendant la régénération des types TypeScript

### Migration Firebase → Supabase

Le projet a été migré depuis Firebase vers Supabase. Des colonnes héritées de Firebase peuvent être présentes dans le schéma mais inutilisées — nettoyage différé à la stabilisation du projet (voir `project_db_cleanup.md`).

Pour régénérer les types TypeScript Supabase après une migration de schéma :
```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```
