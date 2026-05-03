# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### IMPORTANT

#### Consolidation base de données — héritage Firebase

> ✅ **Phase 1 SQL terminée** (2026-04-12) : 595 évaluations Firebase converties 0-10→0-5, sous-critères `detail_*` ajoutés, `resultats` recalculés. Backup `evaluations_firebase_backup` créé le 2026-04-26. Voir `docs/database-notes.md` et `docs/nettoyageBDD.md` pour le détail.

#### Traiter les remarques de Ben (rapport efficience du code)
- Revoir tous les points remontés dans la capture de Ben
- À prioriser selon criticité : perf, bundle size, requêtes redondantes, bonnes pratiques
- Prévoir une session dédiée avec Claude pour passer point par point

### Sécurité

#### Passer DMARC de `none` à `quarantine` puis `reject`
- Actuellement en `p=none` (surveillance uniquement, aucun email rejeté)
- Étape 1 : passer à `p=quarantine` — les emails non conformes partent en spam
- Étape 2 (après quelques semaines de monitoring) : passer à `p=reject` — rejet total
- Vérifier d'abord les rapports DMARC (agrégats `rua=`) pour s'assurer que tous les envois légitimes (SendGrid, Supabase) passent SPF ou DKIM avant de durcir
- Modifier l'enregistrement DNS `_dmarc.100000medecins.org` chez le registrar

#### Sécuriser le mot de passe Supabase dans le script de backup
- Actuellement en clair dans `C:\Users\david\scripts\backup-supabase\backup-supabase.ps1` (dans `$DB_URL`)
- **Méthode recommandée** : variable d'environnement Windows (niveau "User")
- Étapes (à faire sur laptop ET desktop) :
  - Définir la variable : `[Environment]::SetEnvironmentVariable("SUPABASE_DB_PASSWORD", "<password>", "User")`
  - Modifier `$DB_URL` dans le script pour lire `$env:SUPABASE_DB_PASSWORD` au lieu du mot de passe en dur
  - Tester `/backup` pour valider
  - Vérifier que la tâche Task Scheduler voit bien la variable (les variables User sont disponibles dans les tâches planifiées)

### Partenariats contenu

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

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

### Nettoyage — Post-migration Synology

#### Supprimer les anciens dossiers Frontend-V2-main *(dans 1–2 semaines de stabilité confirmée)*
- Sur le **desktop** : supprimer `Frontend-V2-main` dans la zone Synology (actuellement conservé en filet de sécurité)
- Sur le **laptop** : supprimer uniquement le sous-dossier `Claude IA\Frontend-V2-main` de la tâche de synchro Synology "100000Medecins", sans toucher au reste du dossier "100 000 Médecins"
- Ne pas supprimer avant d'avoir confirmé que le nouveau setup Git/GitHub tourne sans problème

### Bugs à corriger

#### Architecture email PSC — email synthétique vs réel *(à discuter)*
- `auth.users.email` reste l'email synthétique `psc-RPPS@psc.sante.fr` ; le vrai email est dans `public.users.contact_email`
- Option possible : mettre à jour `auth.users.email` via admin API quand PSC fournit un vrai email (éviterait le `getUserById` avant `generateLink`)
- Risque si l'email réel est déjà pris par un autre compte (nécessiterait un flow de fusion dédié)
- **Décision** : ne rien changer tant que le fix actuel (`getUserById` avant `generateLink`) couvre tous les cas

#### Espace éditeur — accès limité aux éditeurs existants
- Actuellement seules les solutions ayant un éditeur associé apparaissent dans la liste
- **À faire** : permettre à n'importe quelle solution d'activer un espace éditeur (pas uniquement celles qui ont déjà un compte éditeur). Transformer la feature "éditeurs" en feature disponible pour toutes les solutions

### UX / UI

#### Créer un design system pour le site
- Définir les tokens de design (couleurs, typographie, espacement, ombres, border-radius) dans un fichier de référence
- Documenter les composants UI existants (Button, Card, Badge, StarRating, Breadcrumb…) avec leurs variantes
- Identifier les incohérences visuelles entre pages et les normaliser
- Objectif : base solide pour toute nouvelle feature et pour les éventuels contributeurs

#### Alléger les pages du site (bundle / code inspection)
- Beaucoup de code visible à l'inspection navigateur — analyser le bundle size selon la méthode Ben
- Identifier les composants ou librairies à lazy-loader, tree-shaker ou remplacer

### Emails — tableau de bord

#### Programmer l'envoi des questionnaires de thèse
- La table `questionnaires_these` n'a que `date_fin` — pas de date d'envoi programmée
- **À faire** : ajouter une colonne `date_envoi` (ou `scheduled_at`) à `questionnaires_these` + UI dans le formulaire admin + cron qui déclenche l'envoi
- Prérequis du calendrier ci-dessus pour inclure les questionnaires

### Notifications

#### Préférences de notification — études cliniques par spécialité
- Notifier un utilisateur uniquement quand une nouvelle étude clinique correspond à sa spécialité
- Si une étude ne correspond pas à sa spécialité : l'afficher en grisé dans la liste, avec un message explicatif ("Cette étude ne concerne pas votre spécialité") — mais rester cliquable
- À prévoir : champ `specialites_cibles` sur les études (ou tag spécialité) + logique de matching côté notification

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

### Tarification solutions

#### Simplifier l'indicateur de prix (à peupler plus tard automatiquement)
- Remplacer le champ JSON `nb_utilisateurs` et la section tarification complexe par :
  - Un champ `prix_moyen` (numérique, en €/mois)
  - Un indicateur visuel 1 à 4 euros jaunes, calculé en comparant `prix_moyen` à la médiane de la catégorie
- Ajouter un **toggle admin** "Afficher le prix sur le front" (OFF par défaut — ne rien afficher pour l'instant)
- Les données seront peuplées ultérieurement via recherche automatique
- Ne pas modifier l'affichage front avant que le toggle soit activé

### Rappels temporels

#### *(2026-06-26)* Supprimer `evaluations_firebase_backup`
- 2 mois après la migration Firebase (étape 1 ci-dessus)
- Vérifier qu'aucun problème de régression n'a été constaté, puis `DROP TABLE evaluations_firebase_backup`

---

### Backups base de données Supabase
- Mettre en place un export régulier (mensuel minimum) de la base Supabase via `pg_dump`
- Le code (git) ne sauvegarde pas les données : utilisateurs, avis, articles, études, évaluations sont uniquement dans Supabase
- Options : script bash automatisé via cron local ou Windows Task Scheduler, export vers le NAS

#### Export à la demande depuis l'admin (bouton téléchargement)
- Créer une API route `/api/admin/export-database` qui exporte toutes les tables critiques en JSON téléchargeable
- Bouton dans l'admin pour déclencher l'export sans avoir à accéder au terminal
- Complément du pg_dump (qui reste la vraie sauvegarde complète avec schéma)

### Infrastructure

#### Planifier le backup automatique dans Windows Task Scheduler
- Fréquence : hebdomadaire, dimanche 3h du matin
- Configurer le réveil de la machine si en veille, et le rattrapage au démarrage si la machine était éteinte
- ⚠️ **Utiliser PowerShell 7 (`pwsh.exe`)** et non Windows PowerShell 5.1 (`powershell.exe`) — sinon le bug d'encodage UTF-8 recrée un dossier parasite `100 000 MÃ©decins` à chaque exécution

#### Synchroniser le script de backup sur le desktop
- Le script existe uniquement sur le laptop pour l'instant
- Sur le desktop :
  - Créer `C:\Users\david\scripts\backup-supabase\`
  - Y copier `backup-supabase.ps1` (via NAS Synology ou copie manuelle)
  - Vérifier que pg_dump est installé (`C:\Program Files\PostgreSQL\18\bin\pg_dump.exe`)
  - Configurer la variable `SUPABASE_DB_PASSWORD` (après sécurisation du point précédent)

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

### DNS — mise en prod *(jour J uniquement)*
- `@ A` : remplacer `217.70.184.55` par `76.76.21.21` (IP Vercel apex)
- `www` : remplacer CNAME `webacc8.sd6.ghst.net` par `cname.vercel-dns.com.`
- Supprimer les 4 CNAME SSL sectigo/comodoca (certificats ancien hébergeur)
- Vérifier que le wildcard `* CNAME webredir.vip.gandi.net.` n'interfère pas
