# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### IMPORTANT

#### ~~Vérifier tous les comportements utilisateurs (tests end-to-end)~~ [OK] Fait 2026-05-12
- Connexion email/mot de passe, inscription, reset password
- Changement d'email et de mot de passe depuis le profil
- Connexion PSC, fusion PSC (compte existant), banner PSC post-fusion
- Suppression de compte (avec et sans suppression des avis)
- Suppression admin d'un utilisateur

#### Vérifier le comportement d'un inscrit en tant qu'éditeur
- Inscription via le parcours éditeur (revendication d'une fiche solution)
- Connexion éditeur, accès aux fiches revendiquées
- Édition des champs autorisés, modération éventuelle
- Cas limites : éditeur qui revendique une fiche déjà claim, suppression de compte éditeur

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

#### ~~Importer les utilisateurs Firebase tardifs~~ [OK] Fait 2026-05-12
- Fenêtre élargie à 2026-01-01 (au lieu du seul post-migration) : 1029 users scannés
- 55 users créés + 18 évaluations importées + 10 solutions recalculées, 0 erreur
- Détails dans CHANGELOG. Script conservé : `scripts/import-firebase-late-users.ts`

**Restant à faire avant suppression de `firebase-admin` et `evaluations_firebase_backup`** :
- Attendre période de stabilité (cf. item "Supprimer `evaluations_firebase_backup`" prévu 2026-06-26)

### Bugs à corriger

#### ~~Fusion PSC sur compte email/MDP existant — doublon de compte~~ [OK] Fait 2026-05-15
- **Scénario** : compte email/MDP créé, déconnexion, connexion PSC fraîche → **2e compte `public.users` créé** au lieu de fusionner
- **Root cause confirmé** (données BDD 2026-05-14) : PSC a renvoyé rpps + nom + prénom mais **PAS d'email** dans `userInfo`. Preuve : le compte PSC a l'email synthétique `psc-RPPS@psc.sante.fr` (généré uniquement quand `userInfo.email` est null). Du coup le callback n'a **aucune clé partagée** : lookup par `rpps` échoue (le compte email/MDP n'en a pas), lookup par `email` sauté (`email` est null) → création d'un compte séparé
- **Pas une régression migration** — `psc-callback/route.ts` non touché par Next 16. C'est un trou de logique/UX pré-existant : sans identifiant partagé, le callback ne peut pas relier les 2 comptes
- **Contrainte produit** : évaluer sans PSC reste possible → pas de parcours forcé "connecte-toi d'abord"
- **Direction proposée** :
  - *Solution A (fix principal)* : capturer l'email manquant via `/completer-profil` (déjà dans le parcours PSC) — champ email requis si email synthétique → à la soumission, lookup compte existant → si match, déclencher le flux `/fusionner-compte` existant. Bonus : élimine les emails synthétiques
  - *Solution B (filet)* : détection a posteriori d'un compte jumeau (même `email`/`contact_email`) → bandeau proposant la fusion
- Logique délicate (historique `fix(merge)`/`fix(psc)`) → comprendre l'infra de fusion existante avant de coder

#### Affichage avatar cassé sur une page solution
- Bug d'affichage d'un avatar sur une page solution (constaté pendant les tests Next 16)
- Confirmé **pré-existant** : présent aussi sur `dev.100000medecins.org` en Next 14 → pas une régression migration
- Identifier la page concernée et la cause (URL portrait dénormalisée invalide ?)

### UX / UI

#### Point rouge admin sur catégories parent (sidebar)
- Afficher un point rouge sur la catégorie parent dans la colonne de gauche de l'admin si :
  - Nouvelle étude & thèse à valider
  - Nouvelle vidéo à valider
  - Nouvel éditeur à valider (demande en attente dans `editeur_claims`)
- Objectif : voir d'un coup d'œil ce qui demande modération

#### Afficher la date de dernière connexion des utilisateurs en admin
- La donnée existe déjà : `auth.users.last_sign_in_at` (natif Supabase, maj à chaque connexion email/MDP **et** PSC)
- Aucune migration nécessaire — lire via `supabase.auth.admin.getUserById()` / `listUsers()`
- Usage : colonne "Dernière connexion" dans `/admin/utilisateurs`, repérer les comptes inactifs

#### Permettre à un utilisateur inscrit de proposer une nouvelle vidéo (stories & tutos)
- Ajouter un parcours côté front pour qu'un utilisateur connecté soumette une proposition de vidéo
- Modération admin avant publication (à intégrer avec le point rouge admin ci-dessus)



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

### ROR sur le site
- Intégrer le ROR (Répertoire Opérationnel des Ressources) sur le site
- À cadrer : périmètre, source de données, modalités d'affichage et de filtrage

### La météo de l'e-santé
- Concept d'indicateur synthétique de l'état du secteur e-santé (logiciels médicaux, adoption, satisfaction)
- À cadrer : indicateurs retenus, mode de calcul, fréquence de mise à jour, format d'affichage
