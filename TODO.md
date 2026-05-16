# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### IMPORTANT

#### ~~Vérifier le comportement d'un inscrit en tant qu'éditeur~~ ✅ Fait 2026-05-15
- ~~Inscription via le parcours éditeur (revendication d'une fiche solution)~~
- ~~Connexion éditeur, accès aux fiches revendiquées~~
- ~~Édition des champs autorisés, modération éventuelle~~
- ~~Cas limites : éditeur qui revendique une fiche déjà claim, suppression de compte éditeur~~

### Sécurité

#### Passer DMARC de `quarantine 50%` à `quarantine 100%` puis `reject`
- ✅ `p=none` → `p=quarantine pct=10` fait le 2026-05-03
- ✅ `pct=10` → `pct=50` fait le 2026-05-15 (rapports clean : 24 mails sur 3 semaines, 100 % DKIM/SPF aligné sur Gandi + SendGrid, 0 source inconnue)
- **Prochaine étape (~2026-05-29 à 2026-06-05)** : passer à `pct=100` après 2 semaines de stabilité à 50 % et idéalement un envoi groupé légitime entre-temps
- Étape finale (après 2-3 semaines à `pct=100` clean) : passer à `p=reject`
- Modifier l'enregistrement DNS `_dmarc.100000medecins.org` chez le registrar

### Communication

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

#### Favoriser l'entraide entre utilisateurs (« trucs et astuces »)
- Compléter le support éditeur officiel par un canal communautaire où les médecins partagent leurs astuces concrètes sur chaque solution
- Pistes à explorer :
  - Espace « trucs et astuces » par solution (commentaires courts, vote utile/pas utile)
  - Lien vers groupe WhatsApp ou Telegram dédié à la catégorie / solution
  - Forum léger (Discourse / Discord) intégré au site
- À cadrer : modération, prévention spam, articulation avec les avis existants

### Nettoyage

#### ~~Supprimer les anciens dossiers Frontend-V2-main~~ ✅ Laptop + desktop faits 2026-05-15/16
- ~~Sur le **laptop** : supprimer uniquement le sous-dossier `Claude IA\Frontend-V2-main`~~ — fait via `robocopy /MIR` (contournement path-too-long Windows)
- ~~**À confirmer côté desktop / NAS**~~ — confirmé par David

#### *(~2 mois après la mise en prod du site)* Couper définitivement le cordon Firebase — tout d'un coup
- `DROP TABLE evaluations_firebase_backup` (Supabase)
- Désinstaller `firebase-admin` du `package.json`
- Supprimer les scripts `scripts/*firebase*.ts` qui ne servent plus
- Vérifier qu'aucun import résiduel de `firebase-admin` ne traîne dans `src/`
- Exporter une dernière fois les collections clés (`users`, `evaluations`, `criteres`, `categories`) en JSON local au cas où (archive longue durée)
- **Résilier le projet Firebase** côté console Google
- Révoquer le service-account `medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json`

### Bugs à corriger

#### ~~Affichage avatar cassé sur une page solution~~ ✅ Fait 2026-05-16
- ~~Bug d'affichage d'un avatar sur une page solution (constaté pendant les tests Next 16)~~
- ~~Cause : 60 utilisateurs avaient `portrait = 'Avatars/avatar-XX.png'` (vestige Firebase) au lieu de `/images/portraits/avatar-XX.png`~~
- ~~Fix data-only : `UPDATE users SET portrait = REPLACE(portrait, 'Avatars/', '/images/portraits/') WHERE portrait LIKE 'Avatars/%'` → 60 lignes corrigées~~

### UX / UI

#### ~~Point rouge admin sur catégories parent (sidebar)~~ ✅ Fait 2026-05-14, étendu vidéos 2026-05-16
- ~~Implémenté dans `src/lib/db/admin-badges.ts` (`getAdminBadges()`) + `src/components/admin/AdminSidebar.tsx` : badges pour `editeur_claims`, `etudes_cliniques` + `questionnaires_these` en attente, `emails_campagnes` à envoyer~~
- ~~À enrichir avec « videos en attente » quand on ajoutera le parcours "Proposer une vidéo"~~ → fait avec Plan B "Proposer une vidéo"

#### ~~Afficher la date de dernière connexion des utilisateurs en admin~~ ✅ Fait 2026-05-16
- ~~Niveau 1 : colonne « Dernière connexion » triable dans `/admin/utilisateurs` (relatif "il y a Xj/sem./mois", titre = date complète)~~
- ~~Niveau 2 : 3 cards Actifs 7/30/90 jours + LineChart "Dernière connexion par mois" (12 mois) + BarChart "Distribution de l'inactivité" (7 buckets) dans `/admin/statistiques`~~
- ~~Source : `auth.users.last_sign_in_at` lu via `supabase.auth.admin.listUsers` paginé~~
- Limite documentée : Supabase ne stocke que la **dernière** connexion → pas un vrai MAU. Pour avoir un MAU réel, il faudrait un cron quotidien snapshottant `last_sign_in_at` dans `user_login_history`. À planifier seulement si besoin avéré.

#### ~~Permettre à un utilisateur inscrit de proposer (idée / correction / vidéo)~~ ✅ Fait 2026-05-16
- ~~Espace `/mon-compte/proposer` avec 3 onglets : Idée → Correction → Vidéo~~
- ~~Idée + Correction : nouvelle table `propositions_utilisateurs` (type `idee`/`correction`, statut `en_attente`/`traite`/`refuse`, RLS + GRANTs explicites). Champ `url_concernee` pré-rempli auto avec `document.referrer` same-origin (correction surtout)~~
- ~~Vidéo : utilise la table `videos` étendue (cf. ci-dessous), formulaire spécifique (URL YouTube + preview embed)~~
- ~~Email de notification admin envoyé à `contact@100000medecins.org` à chaque nouvelle proposition (best-effort, ne bloque pas si SendGrid down)~~
- ~~Admin `/admin/propositions` (idée + correction) avec filtres statut/type, actions Traiter / Refuser / Remettre en attente / Supprimer. Badge sidebar admin `propositions`~~
- ~~Admin `/admin/videos` : panel "Propositions à modérer" déjà en place (Plan B initial)~~
- ~~Sidebar `/mon-compte` : item "Proposer" avec icône Sparkles, actif sur tout le sous-arbre `/proposer/*`~~



#### Créer un design system pour le site
- Définir les tokens de design (couleurs, typographie, espacement, ombres, border-radius) dans un fichier de référence
- Documenter les composants UI existants (Button, Card, Badge, StarRating, Breadcrumb…) avec leurs variantes
- Identifier les incohérences visuelles entre pages et les normaliser
- Objectif : base solide pour toute nouvelle feature et pour les éventuels contributeurs

### Performance

_(rien à faire pour l'instant)_

### Mises à jour techniques

#### Passer en main avec Next.js 16
- ✅ Migration Next 16 en cours sur `dev`, site de test live, comportement OK partout
- **Restant** : merger `dev` → `main` (la branche `main` est encore en Next 14.2.35)
- Avant merge : vérifier la liste des changements depuis dernier push `main` (`git log main..dev`), faire une preview Vercel finale sur main avant déploiement prod
- Voir `docs/migration-nextjs-16.md` pour le détail des points migrés

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

### Refaire le système d'affichage des prix
- **État actuel (2026-05-15)** : édition côté éditeur en place dans `/mon-compte/mon-espace-editeur`
  - Soit **prix unique** : `prix_ttc`
  - Soit **plage de prix** : `prix_ttc_min` + `prix_ttc_max`
  - Plus `prix_devise`, `prix_frequence`, `prix_duree_engagement_mois`
  - Badge « Bientôt affiché sur le site » dans le formulaire éditeur
- **Restant à décider / faire** :
  - **Logique de classement** : quelle valeur retenir pour trier une solution en plage de prix ? (min, max, moyenne, médiane ?) → trancher
  - **Indicateur visuel** : 1 à 4 euros jaunes calculés vs. médiane de la catégorie (ou autre)
  - **Bouton classement par prix** dans la page comparatif (`/solutions/[idCategorie]`)
  - **Toggle admin** « Afficher le prix sur le front » (OFF par défaut) pour switcher quand prêt
  - Affichage côté front (page solution + listing comparatif) une fois la logique tranchée

### ROR sur le site
- Intégrer le ROR (Répertoire Opérationnel des Ressources) sur le site
- À cadrer : périmètre, source de données, modalités d'affichage et de filtrage

### La météo de l'e-santé
- Concept d'indicateur synthétique de l'état du secteur e-santé (logiciels médicaux, adoption, satisfaction)
- À cadrer : indicateurs retenus, mode de calcul, fréquence de mise à jour, format d'affichage
