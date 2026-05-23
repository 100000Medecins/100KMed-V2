# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

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

#### Email de lancement par syndicat — finaliser le wording
- **Concept** : un email de lancement du nouveau site, envoyé par chaque syndicat membre à sa propre base de sympathisants / liste de diffusion. Modèle « clé en main » : un fichier HTML par syndicat, que le syndicat envoie depuis son propre outil d'emailing.
- **Base livrée (2026-05-21)** — visuel validé, wording à finaliser plus tard :
  - Édition en ligne : **Admin → Emails → onglet « Lancement syndicats »** (sélecteur de syndicat, aperçu, édition du wording, téléchargement du HTML par syndicat). Accessible depuis n'importe quel poste, sans script.
  - Template : `lancement_syndicat` dans `email_templates` (source de vérité, éditable dans l'admin). Reprend formellement `master_layout` (logo officiel en-tête + pied, carte blanche, barre accent). Mot du président tiré de `pages_statiques` (slug `qui-sommes-nous`), logos servis depuis le storage Supabase.
  - Rendus versionnés : [docs/lancement-syndicats/_index.html](docs/lancement-syndicats/_index.html) (aperçu des 7 côte à côte) + un fichier par syndicat ([csmf](docs/lancement-syndicats/csmf.html) · [avenir-spe](docs/lancement-syndicats/avenir-spe.html) · [sml](docs/lancement-syndicats/sml.html) · [fmf](docs/lancement-syndicats/fmf.html) · [le-bloc](docs/lancement-syndicats/le-bloc.html) · [jeunes-medecins](docs/lancement-syndicats/jeunes-medecins.html) · [snjmg](docs/lancement-syndicats/snjmg.html)). Régénérables via [scripts/generate-lancement-syndicats.mjs](scripts/generate-lancement-syndicats.mjs) (`node scripts/generate-lancement-syndicats.mjs`) — à relancer après modification du wording dans l'admin.
- **Restant à faire** :
  - Finaliser le wording de l'annonce (titre + 2 paragraphes) ; trancher le « Nous avons repensé… » alors que l'expéditeur est le syndicat.

### Nettoyage

#### *(rétention 90 jours minimum)* Vider la table `evaluations_vides_supprimees`
- **État** : 48 évaluations vides (scores complètement vides, ou `moyenne_utilisateur=0` sans aucune note de critère majeur) ont été supprimées le 2026-05-23 et sauvegardées dans `evaluations_vides_supprimees` (table de backup admin only, RLS bloque tout sauf service_role).
- **Risque résiduel nul** : aucune de ces évaluations n'avait de notes utilisables ; leur suppression a aligné les `nb_notes` sur la réalité (Premiocare : 6 au lieu de 7).
- **À faire après ~90 jours sans regret** : `DROP TABLE evaluations_vides_supprimees` (si aucune fuite/rollback nécessaire entre-temps).

#### *(quand on aura un moment)* Nettoyer les ~270 erreurs ESLint préexistantes
- **État** : `npm run lint` remonte ~270 erreurs, principalement `@typescript-eslint/no-explicit-any` sur la couche Supabase (`src/lib/db/`, `src/lib/actions/`), plus quelques `react/no-unescaped-entities` et `no-img-element`.
- **Pas un sujet de fiabilité** : ces erreurs sont du style, pas du comportement. `tsc --noEmit` passe, le `next build` passe, le site tourne. La règle reste utile pour le code nouveau.
- **Cause de fond** : les types Supabase auto-générés ont divergé de la BDD (cf. CLAUDE.md sur la "schema drift" — `actualites`, `documents` absentes des types, etc.). Le `as any` est un contournement.
- **Remède durable** : régénérer `src/types/database.ts` (`npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts`) puis retirer les `as any` au fil de l'eau dans les fichiers qu'on touche. Pas de chantier dédié sauf si on veut un lint propre en CI.

#### *(~2 mois après la mise en prod du site)* Couper définitivement le cordon Firebase — tout d'un coup
- `DROP TABLE evaluations_firebase_backup` (Supabase)
- Désinstaller `firebase-admin` du `package.json`
- Supprimer les scripts `scripts/*firebase*.ts` qui ne servent plus
- Vérifier qu'aucun import résiduel de `firebase-admin` ne traîne dans `src/`
- Exporter une dernière fois les collections clés (`users`, `evaluations`, `criteres`, `categories`) en JSON local au cas où (archive longue durée)
- **Résilier le projet Firebase** côté console Google
- Révoquer le service-account `medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json`

### UX / UI

#### Créer un design system pour le site
- Définir les tokens de design (couleurs, typographie, espacement, ombres, border-radius) dans un fichier de référence
- Documenter les composants UI existants (Button, Card, Badge, StarRating, Breadcrumb…) avec leurs variantes
- Identifier les incohérences visuelles entre pages et les normaliser
- Objectif : base solide pour toute nouvelle feature et pour les éventuels contributeurs

### Performance

_(rien à faire pour l'instant)_

### Mises à jour techniques

#### Régler les vulnérabilités npm (`npm audit`)
- État 2026-05-20 (post-migration Next 16) : 15 vulnérabilités — 8 low, 5 moderate, 2 high, 0 critical
- `npm audit fix` (sans `--force`) règle `protobufjs` + `ws` sans risque ; relancer `npm run build` après
- `postcss` (moderate) : NE PAS forcer — le fix `--force` downgraderait Next 16 → 9 ; partira avec un futur patch Next
- `xlsx` / SheetJS (high) : « no fix » sur npm (l'éditeur ne publie plus sur le registre) — réinstaller depuis le CDN SheetJS si on veut le corriger
- ⚠️ **NE JAMAIS utiliser `npm audit fix --force`** — breaking changes silencieux

### Déploiement final

#### Clés Cloudflare Turnstile en production
- Créer les clés Turnstile côté Cloudflare (site widget invisible) et les renseigner dans Vercel : `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Sans les clés, le widget et la vérification serveur sont no-op (dégradation gracieuse déjà en place). À ne pas oublier le jour J — sinon le formulaire d'inscription tourne sans captcha en production.

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

#### Télétransmission — finitions après seeding initial (2026-05-17)
- Seeding fait : 1 catégorie (inactive), 4 éditeurs créés, 23 tags, 20 solutions, 203 liaisons
- **Vérifier dans l'admin** : 1-2 solutions au hasard (description, tags, prix retenus)
- **Uploader les logos** des 20 solutions via l'admin
- **Compléter les 4 nouveaux éditeurs** (Aatlantide, Olaqin, VITALONLINE, Calimed Santé) : website, description, logo
- **Activer** (`actif=true`) la catégorie quand tout le reste est OK (questionnaire prêt, logos uploadés, éditeurs complétés)

### Liens entre solutions — évolution future
- Permettre aux éditeurs de proposer un lien entre solutions depuis `/mon-compte/mon-espace-editeur` (avec validation admin). La base — table `solution_liens`, UI sidebar, manager admin — est livrée (voir archive 2026-05-18).

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

### Favoriser l'entraide entre utilisateurs (« trucs et astuces »)
- Compléter le support éditeur officiel par un canal communautaire où les médecins partagent leurs astuces concrètes sur chaque solution
- Pistes à explorer :
  - Espace « trucs et astuces » par solution (commentaires courts, vote utile/pas utile)
  - Forum léger (Discourse / Discord) intégré au site
- À cadrer : modération, prévention spam, articulation avec les avis existants
