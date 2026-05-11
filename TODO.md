# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### IMPORTANT

#### Vérifier tous les comportements utilisateurs (tests end-to-end)
- Connexion email/mot de passe, inscription, reset password
- Changement d'email et de mot de passe depuis le profil
- Connexion PSC, fusion PSC (compte existant), banner PSC post-fusion
- Suppression de compte (avec et sans suppression des avis)
- Suppression admin d'un utilisateur

#### ~~Alléger les pages du site (bundle / code inspection)~~ [OK] Fait 2026-05-09

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

#### Importer les ~10 utilisateurs Firebase inscrits après la migration initiale (avril 2026)
- **Plan défini le 2026-05-12** — projet à lancer quand on aura le temps (durée ~1-2h)
- Script à créer : `scripts/import-firebase-late-users.ts` (firebase-admin v13.7.0 déjà dans package.json)

**Pré-requis bloquant** :
- Récupérer le service account JSON `scripts/medecins-7a4ed-firebase-adminsdk-setys-*.json` (absent du repo, gitignored)
  - Soit depuis l'autre machine où la migration initiale a tourné
  - Soit re-télécharger depuis Firebase Console → projet `medecins-7a4ed` → Paramètres → Comptes de service → Générer nouvelle clé privée

**Hypothèse à valider une fois Firebase accessible** :
- `evaluations_firebase_backup` (Supabase) date a priori de la migration initiale → les évals des 10 users tardifs ne sont PAS dedans, elles sont uniquement dans Firestore live
- Conséquence : lire profils + évaluations directement depuis Firestore, pas depuis le backup Supabase

**Plan d'exécution** :
1. Init Firebase Admin + Supabase service role
2. `auth.listUsers()` filtré sur `metadata.creationTime > '2026-04-12'`
3. Pour chaque user : lire profil Firestore (`users/{uid}`) + ses évaluations (collection à confirmer en explorant)
4. **Phase 1 — `--dry-run`** : afficher liste des users et leurs évals, rien d'autre. Le user valide.
5. **Phase 2 — exécution** :
   - Vérifier existence par email dans Supabase auth avant création (éviter doublons : compte ré-inscrit via PSC depuis)
   - Créer compte : `supabase.auth.admin.createUser({ email, email_confirm: true })`
   - Insert dans `public.users` (nom, prénom, spécialité, mode_exercice depuis Firestore)
   - Pour chaque éval Firestore : insert dans `evaluations` avec nouveau `user_id` Supabase, puis `ensureSolutionUtilisee()` + `recalcResultatsPourSolution()`
6. **Pas d'email de notification** (option B retenue : création silencieuse, ces users ne sont pas revenus depuis 1 mois, ils pourront faire "mot de passe oublié" s'ils reviennent)

**À la fin du projet** :
- Confirmer que ces users (et leurs évals) sont bien dans Supabase
- Ne supprimer `firebase-admin` de `package.json` et `evaluations_firebase_backup` qu'après ça

### Bugs à corriger

### UX / UI

#### Créer un design system pour le site
- Définir les tokens de design (couleurs, typographie, espacement, ombres, border-radius) dans un fichier de référence
- Documenter les composants UI existants (Button, Card, Badge, StarRating, Breadcrumb…) avec leurs variantes
- Identifier les incohérences visuelles entre pages et les normaliser
- Objectif : base solide pour toute nouvelle feature et pour les éventuels contributeurs

### Performance

#### ~~Efficience du code (rapport Ben)~~ [OK] Fait 2026-05-09

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

#### DNS — mise en prod *(jour J uniquement)*
- `@ A` : remplacer `217.70.184.55` par `76.76.21.21` (IP Vercel apex)
- `www` : remplacer CNAME `webacc8.sd6.ghst.net` par `cname.vercel-dns.com.`
- Supprimer les 4 CNAME SSL sectigo/comodoca (certificats ancien hébergeur)
- Vérifier que le wildcard `* CNAME webredir.vip.gandi.net.` n'interfère pas

---

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Nouvelles catégories de solutions
- Créer les catégories : Télétransmission, Téléconsultation, Téléexpertise

### Avatars
- Remplacer les avatars utilisateurs — **coupler obligatoirement avec la migration technique** (voir `docs/avatars_migration_plan.md`)
- Actuellement : `users.portrait` stocke l'URL dénormalisée (copie) → changer les images sans migration = UPDATE massif sur 5800+ utilisateurs
- Plan en 4 étapes : migrer portrait vers UUID, modifier updateAvatar, adapter les requêtes d'affichage, puis remplacer les images

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
