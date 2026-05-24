# CHANGELOG — 100 000 Médecins

> Plateforme de comparaison de logiciels médicaux pour médecins libéraux français.
> Stack : Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Storage), Tailwind CSS, SendGrid, Pro Santé Connect (OIDC).

---

## [2026-05-24] — Refonte du mail de lancement par syndicat + WYSIWYG override + nouveau logo Jeunes Médecins

### Email — Refonte complète du wording « lancement syndicat »

Réécriture complète de l'email envoyé par chaque syndicat membre à sa base de sympathisants pour annoncer la nouvelle version du site. Style et structure totalement revus : intro « depuis 2019 », 6 bullets historique (premier site d'éval LGC, représentation ANS/DNS/CNAM, think-tank, journées e-santé, congrès, co-portage FEIMA/DNS sur la portabilité des logiciels métiers), encart bleu clair « Aujourd'hui » agrandi (titre 22px) avec 5 bullets nouveautés, 2 boutons centrés (« Découvrir la nouvelle version » + « Évaluer un logiciel »), citation finale « Notre avenir passe par le numérique. Mobilisons-nous pour guider sa transformation. ».

- Tailles de police remontées de 2px (corps 14→16, titre 24→26, etc.) pour lisibilité Gmail Android.
- En-tête refait : **logo 100K Médecins ♥ logo syndicat** côte à côte, avec cœur orange centré.
- Encart « Le mot du Président » : label adapté automatiquement selon le titre du syndicat (« Le mot du Président », « de la Présidente », « des Présidents », « de l'ex-Président »).
- Convention de nommage : `100 000 Médecins` (espaces insécables) pour l'association, `100000Medecins.org` pour le site.
- Article syndicat (« la CSMF », « le SML », « Avenir Spé », « Le Bloc », etc.) géré via nouveau champ `article` dans `pages_statiques.metadata[i]`.

### Email — Personnalisation par syndicat (override WYSIWYG inline)

Nouvelle fonctionnalité dans `/admin/emails` → onglet « Lancement syndicats » : si un syndicat demande une modif spécifique, on peut créer une version dédiée pour lui sans toucher au template général.

- Nouvelle carte orange sous l'éditeur principal : « Personnalisation pour {syndicat} ».
- Bouton **Personnaliser pour {syndicat}** → ouvre un textarea pré-rempli avec le template général ; bouton **Enregistrer pour {syndicat}** ; bouton **Réinitialiser** (avec confirmation) qui supprime l'override.
- Pictogramme ✨ Sparkles dans le sélecteur de syndicat quand l'override est actif.
- Server actions `saveSyndicatOverride` + `clearSyndicatOverride` (`src/lib/actions/syndicatOverride.ts`) qui écrivent dans `pages_statiques.metadata[i].contenu_html_override`.
- Le générateur de fichiers HTML (`scripts/generate-lancement-syndicats.mjs`) utilise l'override si présent.

### Email — Personnalisation visuelle des logos par syndicat

Chaque logo syndicat dans l'en-tête email peut maintenant être personnalisé sans toucher au PNG : nouveau placeholder `{{logo_syndicat_cell}}` qui factorise toute la cellule, alimenté par 2 nouveaux champs metadata.

- `logo_height` (px, défaut 48) — permet d'agrandir ou réduire individuellement par syndicat.
- `logo_bg` (couleur hex ou null) — si défini, ajoute un cartouche coloré à coins arrondis derrière le logo, avec **padding proportionnel automatique** à la hauteur (`Math.round(height × 0.17)` × `Math.round(height × 0.25)`).
- Valeurs initiales : CSMF 55px, SML 60px, FMF 38px avec cartouche blanc, Avenir Spé 48px avec cartouche blanc, SNJMG 48px avec cartouche blanc, Jeunes Médecins 48px avec cartouche blanc. Le Bloc reste sur les défauts.
- Logo Jeunes Médecins **remplacé** : ancien PNG → nouveau (les 4 cercles dégradés bleu marine + texte « JEUNES MÉDECINS »), converti depuis `public/logos/logo-jeunes-medecins.svg` via `sharp` (768×280 PNG), uploadé dans `storage/images/syndicats/jeunes-medecins.png`.

### Scripts — Découverte de vidéos YouTube

Nouveau script `scripts/discover-videos-youtube.mjs` — interroge l'API YouTube Data v3 pour découvrir des vidéos pertinentes pour les solutions du site, les insère dans `videos` (statut `en_attente`) + `video_solutions`. La validation finale se fait via `VideosPendingPanel` côté admin.

### TODO — Mises à jour
- Ajout : « Vidéos par solution — découverte YouTube + affichage front » (plomberie SQL + script de découverte livrés ; reste clé YOUTUBE_API_KEY, smoke test Doctolib, affichage carousel sur fiche solution).

---

## [2026-05-23] — Correction des notes globales Firebase legacy + ciblage spécialités PSC

### Fix — Notes globales Firebase : restauration des valeurs d'origine + mode incrémental

Cause signalée par un utilisateur : Premiocare affichait 4.8 sur le nouveau site contre 4.3 sur l'ancien. Investigation Firebase + Supabase : la divergence ne venait ni d'une perte de données ni d'un bug isolé, mais d'un **changement silencieux de définition** entre les deux sites.

Origine — Firebase calculait les notes de critères majeurs à partir des notes directes saisies par les médecins (`scores.interface = 4` ou `5`). Le nouveau site applique `buildRefinedCritereScores` qui **remplace** la note brute par la moyenne des sous-critères dès que > 50 % sont remplis ; valeurs typiquement plus hautes (4.5-5.0). Cumulé au recalcul du 2026-05-07 (qui a propagé ces moyennes raffinées dans `resultats`), les notes affichées dérivaient sans qu'aucune nouvelle évaluation ne soit arrivée. Impact mesuré : 6 solutions avec écart > 0.3 (TAMM +0.79, éO Médecin +0.47, Premiocare +0.45, Shaman +0.39 ; Medimust −0.49, MedicaWin −0.48, Mediclick −0.36).

Décision produit (avec David) — figer les notes Firebase historiques pour la continuité avec les éditeurs partenaires qui surveillent leur note publique. Les nouvelles évaluations sur le nouveau site continuent d'utiliser la logique de raffinement par sous-critères, mais glissent doucement la moyenne via un calcul incrémental ancré sur la valeur Firebase.

Schéma — Trois migrations SQL :
- `solutions.is_firebase_legacy` (boolean) marque les 24 solutions importées de Firebase.
- `resultats.firebase_moyenne_base5` + `firebase_nb_notes` figent la valeur Firebase comme ancrage immuable. Calcul incrémental : `(firebase_moy × firebase_nb + Σ notes_post_lancement) / (firebase_nb + nb_post)`.
- `evaluations_vides_supprimees` (RLS service_role only) — backup des 48 évaluations vides supprimées au passage.

Restauration — Script ponctuel (non versionné) interrogeant Firestore via `firebase-admin` :
- 24 solutions marquées `is_firebase_legacy = true` (matchées par nom + 1 alias manuel `MLM → monlogicielmedical`).
- 144 lignes `resultats` (5 critères × 24 solutions + ligne `type='moyenne'` × 24) restaurées aux valeurs Firebase (`moyenneUtilisateurs / 2`).
- Ancrage Firebase rempli dans les 2 nouvelles colonnes immédiatement après restauration.

Code — `recalcResultatsPourSolution` (`src/lib/actions/evaluation.ts`) refactorisée :
- Lit `solutions.is_firebase_legacy`. Si `true` → mode incrémental sur évaluations `created_at >= 2026-04-12`, agrégées par-dessus l'ancrage Firebase. Si `false` → full recalc comme avant.
- Gère explicitement la ligne `criteres.type='moyenne'` (jamais touchée jusqu'ici car `identifiant_tech` IS NULL) : recalcule sa valeur à partir des `evaluations.moyenne_utilisateur` agrégées sur l'ancrage Firebase.
- Crée la ligne `type='moyenne'` automatiquement pour une solution non-legacy qui n'en a pas encore (1ère évaluation).

Affichage — `getNotesUtilisateursGlobales` (`src/lib/db/solutions.ts`) et `getAverageNoteUtilisateurs` (`src/lib/db/evaluations.ts`) :
- Lecture prioritaire de la ligne `criteres.type='moyenne'` (= source de vérité unique).
- Fallback automatique sur la moyenne des 5 critères majeurs pour les solutions sans ligne `moyenne` (solutions ajoutées post-migration sans encore d'agrégation).

Vérification — Premiocare repasse à 4.3 (= 4.34 base5). Simulation : une nouvelle évaluation à 4.8 ferait passer Premiocare à 4.4, pas un saut vers 4.8.

### Nettoyage — Suppression des 48 évaluations vides

Diagnostic en passant : sur 699 évaluations en base, 48 ont `scores` complètement vide ou tous les critères principaux à `undefined`. Probablement des brouillons publiés (clic « Soumettre » sans rien remplir, ou évaluations cassées importées de Firebase). Toutes supprimées de `evaluations` ; backup intégral dans `evaluations_vides_supprimees` (RLS bloque tout sauf service_role). Impact : `nb_notes` reflète désormais le nombre réel d'évaluations utilisables (Premiocare : 6 au lieu de 7).

### Nettoyage — Conversion des 16 évaluations Firebase encore en ancien format

Diagnostic complémentaire : 16 évaluations stockaient leurs scores sous l'ancien format Firebase (clés `"1"`-`"5"` au lieu de `interface`, `fonctionnalites`..., et valeurs en 0-10 au lieu de 0-5). Le code actuel ne savait pas les lire → invisibles dans la carte « avis des confrères ». Solutions concernées : Doctolib Médecin (4), Medistory (2), Crossway (2), Alma Pro (2), Odaiji (2), MLM, TAMM, Follow, AxiSanté 5.

Script ponctuel (non versionné) : mapping `"1"→interface`, `"2"→fonctionnalites`, `"3"→fiabilite`, `"4"→editeur`, `"5"→qualite_prix`, valeurs divisées par 2, `moyenne_utilisateur` recalculée en base 5. Anciennes clés numériques supprimées. **Pas de recalcul `resultats`** nécessaire : ces évaluations concernent des solutions Firebase legacy ancrées sur la valeur Firebase d'origine, qui les incluait déjà dans son calcul agrégé.

### Feat — Ciblage par spécialité aligné PSC vs admin

Les libellés de spécialité utilisés côté PSC et côté liste admin diffèrent (ex. « Cardiologie et Maladies vasculaires » en PSC vs « Cardiologie » en liste admin). Conséquence : un filtre SQL `.in('specialite', specialites_cibles)` ratait systématiquement les utilisateurs authentifiés via PSC.

- Liste `SPECIALITES` (`src/lib/constants/profil.ts`) enrichie (Allergologie, Anatomie/Cytologie, Biologie médicale, Médecine interne, Médecine légale, Neurochirurgie, Santé publique, Stomatologie) et triée alphabétiquement.
- Nouveau mapping `PSC_TO_SPECIALITE` + helper `specialiteConcernee()` : rapproche un libellé PSC d'un ou plusieurs libellés de la liste admin. Valeurs PSC absentes du mapping → rattachées à « Autre » par défaut.
- Bascule du filtrage côté code dans `send-etude`, `send-questionnaire`, `envoyer-campagnes-email` (le `.in()` SQL ne suffit plus). UI `mon-compte/etudes-cliniques` et `questionnaires-these` alignée sur la même comparaison.

### Chore — `npm audit fix` (sans `--force`)

Avant la mise en prod : passage de 15 vulnérabilités à 12. Trois deps résolues (`ws`, `protobufjs`, et 1 transitive), aucun breaking change — seul `package-lock.json` modifié. Build complet vérifié OK (`tsc --noEmit` et `next build`).

Restantes :
- **11 moderate** : chaîne `uuid` / `@google-cloud/*` / `firebase-admin`. Disparaîtra avec la suppression de `firebase-admin` (cf. TODO « Couper le cordon Firebase », prévu ~2 mois post-prod).
- **1 high** : `xlsx` (Prototype Pollution + ReDoS), no fix npm. Utilisé uniquement dans 3 scripts de seed admin (`import-agendas`, `import-ia-documentaires`, `import-ia-scribes`), pas dans le code du site. Migration vers `exceljs` prévue après l'import des 2 catégories en attente.

### Déploiement — Clés Cloudflare Turnstile actives en production

Création des clés Turnstile côté Cloudflare et pose dans Vercel (env Production) : `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (préfixe `0x4A...`). Également renseignées en `.env.local` pour dev. Le captcha sur `/inscription` n'est plus en mode no-op : les soumissions sont effectivement vérifiées. Item correspondant retiré de la section « Déploiement final » du TODO.

### TODO — Mises à jour
- Ajout : « Vider la table `evaluations_vides_supprimees` après ~90 jours sans regret » (rétention de backup).
- Mise à jour : item « Régler les vulnérabilités npm » → « Vulnérabilités npm restantes » avec le détail xlsx (3 scripts seed) et plan de migration vers exceljs.
- Retiré : « Clés Cloudflare Turnstile en production » (fait le 2026-05-23, archivé).

---

## [2026-05-22] — Emails de lancement par syndicat + captcha Turnstile à l'inscription

### Email — Mail de lancement « clé en main » diffusable par chaque syndicat membre
- Objectif : un email annonçant le nouveau site, envoyé par chaque syndicat membre à sa propre base de sympathisants. Modèle « clé en main » — un fichier HTML par syndicat, envoyé depuis l'outil d'emailing du syndicat (pas d'envoi via notre SendGrid).
- Nouveau template `lancement_syndicat` dans `email_templates` (source de vérité, éditable en admin) : reprend formellement le `master_layout` (logo officiel en-tête + pied, carte blanche, barre accent). Placeholders par syndicat : `{{nom_syndicat}}`, `{{logo_syndicat}}`, `{{citation}}`, `{{president_nom}}`, `{{president_fonction}}`, `{{utm_source}}`.
- Le « mot du président » est repris des métadonnées de la page « Qui sommes-nous » (`pages_statiques`, slug `qui-sommes-nous`). Logos servis depuis le storage Supabase — le domaine du site renvoyait un 404 HTML sur `/images/syndicats/*.png`.
- Admin : nouvel onglet « Lancement syndicats » dans `/admin/emails` (`LancementSyndicatsManager`) — sélecteur de syndicat émetteur, aperçu iframe, édition du wording, téléchargement du HTML par syndicat (ou les 7 d'un coup) + copie. MG France exclu (`actif=false`).
- Scripts : `save-lancement-syndicat-template.mjs` initialise le template en base ; `generate-lancement-syndicats.mjs` (refondu — lit le template en BDD) génère les 7 rendus versionnés dans `docs/lancement-syndicats/` + un `_index.html` d'aperçu.

### Sécurité — Captcha Cloudflare Turnstile sur le formulaire d'inscription
- Intégration de Turnstile (invisible) sur `/inscription` : widget `TurnstileWidget`, vérification serveur `verifyTurnstileToken` (`src/lib/turnstile.ts`) appelée dans `registerWithEmail`.
- Dégradation gracieuse : sans `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, widget et vérification sont no-op (dev local, déploiement avant pose des clés).
- Token à usage unique : réarmé (`turnstileRef.reset()`) en cas d'erreur de soumission.

### Refacto — Renvoi de l'email de confirmation d'inscription
- Extraction de `sendConfirmationEmail`, partagée par `registerWithEmail` et le nouveau `resendConfirmationEmail`.
- Le bouton « Renvoyer » de l'écran de succès utilise désormais le lien HMAC idempotent maison au lieu de `supabase.auth.resend()` — cohérent avec l'abandon des tokens OTP Supabase. Réponse silencieuse si l'email est inconnu.

### TODO — Mises à jour
- Marqué terminé : « captcha anti-bots Cloudflare Turnstile sur l'inscription ».
- Ajout : « Email de lancement par syndicat — finaliser le wording » (base livrée, reste le texte de l'annonce).

---

## [2026-05-21] — Next 16 en production + template email fusion + manager Communautés + refacto questionnaires + reset mdp HMAC

### Fix — Reset mot de passe : lien HMAC idempotent
- **Problème** : le lien de reset mdp reposait encore sur un token OTP Supabase à usage unique (`admin.generateLink({ type: 'recovery' })`) → même bug de pré-scan que la confirmation d'inscription : les clients mail / antivirus consomment le token avant le clic réel de l'utilisateur, qui tombe alors sur un lien mort.
- **Fix** : abandon du token Supabase, remplacé par un lien HMAC maison **idempotent** (rejouable).
  - `src/lib/email/reset-token.ts` (nouveau) — HMAC `sha256(EMAIL_SECRET, "reset:uid:iat")`, TTL 1 heure.
  - `sendPasswordReset` (`user.ts`) réécrit : résout l'uid depuis la table `users`, génère un lien `/reinitialiser-mot-de-passe?uid&iat&token`, envoie via SendGrid (template `reinitialisation_mot_de_passe`). Silencieux si l'email est inconnu (ne révèle pas l'existence d'un compte).
  - Nouvelle action `resetPasswordWithToken(uid, iat, token, newPassword)` : re-vérifie le HMAC côté serveur (jamais confiance au client) puis `admin.updateUserById`.
  - Page `/reinitialiser-mot-de-passe` réécrite en **Server Component** : vérifie le HMAC au rendu, n'affiche le formulaire que si le token est valide. Supprime tout le bricolage session / `access_token` / `sessionStorage` / bypass-lock de l'ancienne version (253 lignes → ~66). Le formulaire de saisie est isolé dans un client component `ResetPasswordForm.tsx`.
  - Idempotence : le GET du lien n'affiche que le formulaire, c'est le POST (`resetPasswordWithToken`) qui agit → le pré-scan ne consomme rien. Validé en test (idempotence OK).
- `PasswordInput` : ajout de `suppressHydrationWarning` (les gestionnaires de mots de passe des extensions navigateur injectent des attributs après le rendu SSR → mismatch d'hydratation inoffensif).

### Fix — Templates email : double logo sur `confirmation_inscription`
- Le template `confirmation_inscription` avait été créé sans accès au `master_layout` (MCP Supabase cassé) → il embarquait ses propres `<img>` logo (+ tables TipTap imbriquées), alors que le `master_layout` injecte déjà un logo. Une fois encapsulé : triple logo.
- Refait en fragment `<tr><td>` propre calqué sur `fusion_comptes` : suréglet « Bienvenue », titre, texte, bouton `{{lien_confirmation}}`, mention validité 7 jours + lien en clair, mention « si vous n'êtes pas à l'origine ». Plus aucun logo embarqué.
- `reinitialisation_mot_de_passe` : c'était un document HTML complet auto-suffisant (donc non encapsulé, pas de double logo immédiat) mais qui embarquait ses propres logos → bug latent et incohérent avec les autres templates. Repassé en fragment `<tr><td>` sans logo. Texte corrigé : « valable 24 heures » → « 1 heure » (TTL réel du nouveau lien HMAC).
- Couleurs thème appliquées : navy `#1B2A4A`, accent-blue `#4A90D9`, texte `#374151`.
- UPDATE en BDD via service role + test d'envoi OK (MCP Supabase de nouveau cassé — erreur interne `-32603`).

### Infrastructure — Migration Next 16 mergée en production
- `dev` → `main` mergé (merge commit `e0cbd38`, `--no-ff`) : `main` passe de Next 14.2.35 à Next 16, build de la production Vercel déclenché. Le domaine `dev.100000medecins.org` a été rebasculé sur la branche `main` côté Vercel.

### Admin — Template email `fusion_comptes` branché dans /admin/emails
- Le template `fusion_comptes` (créé en base le 2026-05-20) n'apparaissait pas dans l'interface (liste codée en dur). Ajout dans « Notifications système » + variable `lien_fusion` dans les variables fictives de l'aperçu et de l'envoi de test.
- Fix rendu : le contenu était en `<h1>/<p>` nus → éjecté hors de la carte blanche du `master_layout` (qui injecte `{{contenu}}` dans un `<table>`). Reformaté en fragment `<tr><td>` calqué sur `reinitialisation_mot_de_passe`.

### Feature — Manager admin des communautés par solution
- Nouveau bloc `SolutionCommunautesManager` dans `/admin/solutions/[id]/modifier` : ajout direct (statut `approuve`), édition, suppression — sans passer par la file de modération. Lien vers `/admin/communautes` pour les propositions en attente.
- 3 server actions dans `solution-communautes.ts` : `listCommunautesBySolution`, `createCommunauteAdmin`, `updateCommunaute` (gardées par `assertAdmin()`).
- Carte publique `SolutionCommunautesCard` : état rempli aligné sur la typo de « Contacts utiles » (titre `text-lg`, contenu aéré). État vide (barre compacte) inchangé.

### Sécurité — Durcissement de la server action `generateAcronyme`
- `generateAcronymeInfo` était exportée sans contrôle d'accès → appelable par n'importe qui (consommation possible du budget API Tavily + Anthropic). Ajout de `assertAdmin()`. Identifié par la revue de sécurité du 2026-05-20.

### Refacto — Questionnaires d'évaluation : sortie du fallback ambigu `default`
- **Contexte** : le slug `default` jouait 2 rôles incompatibles — questionnaire réel de « Logiciels métier » + filet de secours pour toute catégorie sans questionnaire (qui affichait alors le questionnaire Logiciels métier au lieu d'un message adapté).
- **Étape 1** : questionnaire renommé `default` → `logiciels-metiers` (`UPDATE questionnaire_sections`, 10 sections). La catégorie ayant déjà ce slug, un simple renommage a suffi. `slugLabels` ajusté.
- **Étape 2** : `getSectionsForSlug` ne retombe plus sur `default` → renvoie `[]`. La page `/solution/noter/[...slug]` affiche « Questionnaire en cours d'élaboration » si la catégorie n'a pas de questionnaire ; le fallback hardcodé n'est plus utilisé.
- **Étape 3** : suppression de ~190 lignes de code mort (`SECTIONS_DETAILLEES`, `SECTIONS_PAR_CATEGORIE`, `getSectionsForCategorie`, `getTotalQuestions`).

### Fix — Confirmation d'inscription : lien HMAC idempotent (anti pré-scan)
- **Symptôme** (retour bêta testeur éditeur) : « Une erreur est survenue lors de la connexion » après clic sur le lien de confirmation, alors que le compte était bel et bien validé (connexion possible ensuite).
- **Cause** : le token OTP natif de Supabase est à usage unique. Les clients mail / antivirus pré-scannent les liens → ils « consomment » le token avant le clic réel de l'utilisateur. Le compte est confirmé (par le scanner) mais l'utilisateur tombe sur un token mort.
- **Fix** : abandon du token Supabase pour la confirmation d'inscription, remplacé par un lien HMAC maison **idempotent** (rejouable), sur le modèle du lien de désabonnement.
  - `src/lib/email/confirm-token.ts` — HMAC `sha256(EMAIL_SECRET, "confirm:uid:iat")`, TTL 7 jours.
  - Server action `registerWithEmail` (`user.ts`) : crée le compte via `admin.createUser({ email_confirm: false })` (donc **aucun email natif Supabase**), crée le profil `public.users`, envoie notre email via SendGrid (template `confirmation_inscription`).
  - Route `/auth/confirm-email` : vérifie le HMAC → `updateUserById({ email_confirm: true })` (idempotent) → auto-login best-effort via magiclink frais généré/consommé côté serveur → `/completer-profil`. Dégradé gracieux si l'auto-login échoue (`/connexion?confirmed=1`).
  - `AuthProvider.signUpWithEmail` branché sur `registerWithEmail` (plus de `supabase.auth.signUp`).
  - Le `?type=editeur` est préservé (transite par le lien de confirmation → `/completer-profil?type=editeur`).
- **Garde-fou anti-bot** : contrôle temporel dans `registerWithEmail` (soumission < 2,5 s = bot, faux succès silencieux). Un honeypot avait d'abord été posé puis retiré — les password managers le remplissaient à tort.
- **Template email** : nouveau `confirmation_inscription` en BDD, structure calquée sur `reinitialisation_mot_de_passe`.
- `/connexion` : messages explicites pour `?error=confirm_invalid` / `confirm_expired` et succès `?confirmed=1`.
- Le flux PSC n'est pas touché.

### UX / UI — Badge « acronymes » dans le hero d'accueil
- 6e badge flottant dans l'illustration animée du hero : nombre d'acronymes du glossaire. `getSiteStats` compte désormais la table `acronymes`.

### Feature — Enrichissement éditorial : listes, liens, éditeur riche du mot éditeur
- `sanitizeHtml` étendu : autorise les listes (`ul/ol/li`) et les liens (`<a href>` sécurisés — schémas `http(s)`/`mailto` uniquement, `target`/`rel` forcés). Filet : un contenu en texte brut voit ses retours à la ligne convertis en `<br>`.
- `RichTextEditor` : nouveau mode `minimal` (toolbar gras/italique/souligné/listes/lien) — branché sur les 2 champs « mot de l'éditeur » de l'espace éditeur (auparavant de simples textareas).
- Sécurité : le « mot de l'éditeur » (page éditeur + page solution via `PublisherWord`) est désormais rendu via `sanitizeHtml` → ferme le risque XSS (champs éditables par les éditeurs).
- Fix affichage : les modales étude clinique / questionnaire-thèse utilisaient `prose prose-sm` (classes inexistantes — plugin Typography non installé) → paragraphes collés. Remplacé par la classe maison `.prose-custom`.
- Images des études : cadrage `object-top` (évite de rogner le haut du visuel).

### TODO — Mises à jour
- Marqué terminé : « Passer en main avec Next.js 16 », « Refacto questionnaires d'évaluation », « Durcir generateAcronyme », questionnaire d'évaluation télétransmission (déjà livré le 2026-05-17).
- Actualisé : « Régler les vulnérabilités npm » (15 vulnérabilités, plus 26).
- Supprimé : « Pistes futures génération avatar perso depuis photo ».
- Ajout : « Captcha anti-bots Cloudflare Turnstile sur l'inscription » (le garde-fou actuel est temporel).
- Ajout : « Reset mot de passe — passer au lien HMAC idempotent » (même bug de pré-scan latent que la confirmation d'inscription).
- Archivage `/todo-clean` : 10 items terminés déplacés vers `TODO-archive.md`.

---

## [2026-05-20] — Correctif sécurité : prise de contrôle de compte via la fusion + ajustements acronymes/admin

### Sécurité — Faille de prise de contrôle de compte dans la fusion de comptes (`completeProfile`)
- **Contexte** : revue de sécurité de la branche `dev` (en amont d'un test d'intrusion white hat). Une vulnérabilité critique a été identifiée dans le parcours de fusion de comptes.
- **Faille** : `completeProfile` détectait qu'un `contact_email` saisi appartenait déjà à un autre compte et renvoyait directement au navigateur un jeton de fusion HMAC valide — sans jamais vérifier que l'appelant possède cette boîte mail. Un attaquant authentifié pouvait saisir l'email d'un confrère, obtenir le jeton, choisir le compte de la victime comme compte conservé dans `mergeAccounts`, et récupérer une session authentifiée sur ce compte. = prise de contrôle complète + destruction du compte victime.
- **Fix** : le jeton de fusion n'est plus jamais renvoyé au client. En cas de conflit, `completeProfile` envoie le lien `/fusionner-compte?token=...` **par email** à l'adresse saisie et retourne `{ status: 'FUSION_EMAIL_SENT' }`. Recevoir le lien prouve la possession de la boîte. La page `/completer-profil` affiche un écran « Vérifiez votre boîte mail » au lieu de rediriger.
- **Migration BDD** : nouveau template email `fusion_comptes` inséré dans `email_templates` (contenu encapsulé dans le `master_layout`, variable `{{lien_fusion}}`, éditable depuis `/admin/emails`).
- `merge.ts` et le callback PSC : inchangés — le chemin PSC reste sûr car la fusion y est déclenchée après un match RPPS (identité vérifiée par l'État).
- **Second point du rapport écarté** : la server action `generateAcronyme` sans `assertAdmin()` — impact limité à de la consommation d'API externe, hors périmètre vulnérabilité. Durcissement recommandé mais non bloquant (ajouté à la TODO).

### Fix — Détection des acronymes : regex plus robuste
- `buildRegex` (`acronymesCache.ts`) : tri des sigles par longueur décroissante (les expressions longues priment sur les courtes, ex. « Téléservices CNAM de base » avant « CNAM ») + frontières par lookaround `(?<!\w)…(?!\w)` au lieu de `\b` (qui cassait quand un sigle commence/finit par un caractère non-mot, ex. un guillemet).

### Admin — Filtre catégories de la page solutions
- `admin/solutions/page.tsx` : `getCategories()` → `getAllCategoriesAdmin()` pour le filtre par catégorie (inclut les catégories non visibles côté public, ex. catégories inactives).

### TODO — Mises à jour
- Ajout : durcir `generateAcronyme` avec `assertAdmin()` (recommandation revue sécurité, non bloquant).

---

## [2026-05-19] — Module Communautés autour des solutions + bouton retour en haut + claim éditeur enrichi + fixes UI mobile

### Feature — Module « Communautés autour des solutions »
- **Migration SQL** : table `solution_communautes(id, solution_id, type, nom, url, description, statut, proposed_by, proposer_email, note_admin, created_at, approved_at)` avec CHECK sur `type` (whatsapp/telegram/discord/facebook/forum/autre) et `statut`. FK ON DELETE CASCADE sur solutions, FK ON DELETE SET NULL sur `auth.users`. GRANTs explicites (anticipation 2026-10-30), RLS lecture publique pour les `approuve` uniquement.
- **UI publique** : composant `SolutionCommunautesCard` en bas de la fiche solution (colonne gauche, après `SupportSection`). Version compacte : barre fine d'une ligne quand vide, liste dense avec icônes colorées par type quand des liens existent. Modal `ProposeCommunauteModal` (sélecteur type + nom facultatif + URL + description + email pour anonymes).
- **Soumission** : ouverte aux connectés ET anonymes (avec email facultatif pour notification). Seule l'URL est obligatoire — si nom non fourni, fallback automatique sur le hostname de l'URL (ex. `chat.whatsapp.com`).
- **Server actions** : `src/lib/actions/solution-communautes.ts` (`submitSolutionCommunaute`, `listSolutionCommunautesAdmin`, `setStatutCommunaute`, `deleteSolutionCommunaute`).
- **Notif email** : best-effort à `contact@100000medecins.org` à chaque nouvelle proposition. Notif au proposeur (si email fourni) lors du passage à `approuve` avec lien direct vers la fiche solution.
- **Admin** : page `/admin/communautes` + `CommunautesAdminClient` (filtres statut/type, actions Approuver/Refuser/Remettre en attente/Supprimer). Nouvel item sidebar admin « Communautés » avec icône `MessageCircle` et badge en attente. Extension `getAdminBadges()` avec champ `communautes`.

### Feature — Bouton « Retour en haut » contextuel
- Nouveau composant `ScrollToTopButton` intégré dans `Footer.tsx` (présent sur toutes les pages publiques, absent du back-office admin).
- Visible uniquement quand (a) on a scrollé d'au moins 1 viewport (page assez longue) ET (b) il reste moins de 800px avant le bas. Sur pages courtes ne s'affiche jamais.
- Bouton flottant rond accent-blue bottom-right, smooth scroll au clic.

### Feature — Claim éditeur : champ « Précisez votre rôle / fonction » facultatif
- `completer-profil/page.tsx` + `mon-compte/profil/page.tsx` : nouveau state `roleMessage` + textarea redimensionnable (`resize-y`, min-h 72px ≈ 3 lignes) qui s'affiche quand un éditeur/solution est sélectionné dans le dropdown (et pas en mode « Autre »). Stocké dans la colonne existante `editeur_claims.libre_texte` (pas de migration).
- `AdminEditeurClaims.tsx` : libellé « Texte libre » remplacé par « Message du demandeur » (cohérent avec les 2 sémantiques : rôle/fonction quand éditeur sélectionné, nom de solution proposée sinon). Ajout `whitespace-pre-wrap` pour respecter les retours à la ligne du textarea.

### UX / UI — Plusieurs fixes mobile sur la fiche solution + catégorie + glossaire
- **Fiche solution mobile** : carte `MainFeatures` (sidebar) masquée en `< lg` (cheveu sur la soupe quand la sidebar passe en dessous du contenu, et les données métier perdent leur contexte d'analyse).
- **Hero catégorie mobile** : icône avant le titre masquée en `< md` (doublon avec l'illustration de droite). Suppression du `mb-2` mobile sur le `h1` pour aligner verticalement le titre avec l'image (le `mb-6` desktop est conservé pour espacer de l'intro).
- **Glossaire** : fix espace manquant entre le nombre et le mot « acronymes » dans le sous-titre (« 65acronymes » → « 65 acronymes »). Cause : trimming JSX entre expression `{}` et texte par Next 16 Turbopack. Fix : template literal pour forcer l'espace dans la chaîne.

### Infrastructure — Types Supabase régénérés
- `src/types/database.ts` régénéré pour inclure `solution_communautes`. Nettoyage manuel de l'artefact plugin `<claude-code-hint>` (réinjecté à chaque génération — récurrent) et du message d'update CLI à la fin du fichier (mélange stdout/stderr lors de la redirection).

### TODO — Mises à jour
- Item « Favoriser l'entraide entre utilisateurs (« trucs et astuces ») » partiellement traité par le module Communautés (la piste « lien vers groupe WhatsApp/Telegram/forum » est livrée).

---

## [2026-05-18] — Solutions liées + admin avatars catalogue + bascule génération perso text2image + acronymes disambiguation

### Feature — Solutions liées (table `solution_liens` + UI sidebar + admin + seed initial)
- Migration SQL : table `solution_liens(id, solution_a_id, solution_b_id, type, created_at)`, lien non-dirigé (CHECK `a_id < b_id` + UNIQUE sur `(a_id, b_id, type)`), FK ON DELETE CASCADE, GRANTs explicites (anticipation Supabase 2026-10-30), RLS lecture publique.
- Types autorisés : `meme_suite`, `interoperable`, `embedded`, `partenariat`.
- **UI publique** : composant `SolutionLiensCard` (sidebar de la fiche solution) — vignettes logo + nom + catégorie + libellé du type. Click → fiche de l'autre solution dans sa catégorie.
- **Admin** : `SolutionLiensManager` dans le formulaire d'édition d'une solution (recherche + sélecteur type).
- **Server actions** : `src/lib/actions/solution-liens.ts` (`createLien`, `deleteLien`).
- **DB queries** : `src/lib/db/solution-liens.ts` (lecture publique des liens d'une solution avec jointure sur l'autre fiche).
- **Seed initial — 22 liens créés via SQL Editor** :
  - 11 liens Télétransmission↔LGC d'origine (`meme_suite`) — Doctolib Tt↔Médecin, VitalZen↔Weda, MLM Tt↔MLM, Crossway Tt↔Crossway, AxiSanté Tt↔AxiSanté 5, HelloDoc Tt↔HelloDoc, Libellia Tt↔Libellia, Hypermed Tt↔HyperMed, Desmos Médecins Tt↔Desmos Médecin, Odaiji Tt↔Odaiji, Acteur.fr Tt↔Acteur.fr
  - 1 lien `embedded` : Stellair Intégral↔Odaiji Tt
  - 2 liens `interoperable` : Simply Vitale↔MLM, Simply Vitale↔Crossway
  - 3 liens `meme_suite` cross-éditeurs : HelloDoc Edition SESAM↔HelloDoc, ExpressVitale↔Medistory, AxiAM↔AxiSanté 5 (historique CGM)
  - 5 liens suite Doctolib (`meme_suite`) : Médecin↔Agenda↔Tt + Doctolib Assistant relié aux 3 autres

### Admin — Manager du catalogue d'avatars (`/admin/utilisateurs/avatars`)
- CRUD complet du catalogue d'avatars (67 fiches) avec drag & drop pour l'ordre (`@dnd-kit/sortable`).
- Création / suppression / réordonnement / upload de nouveaux PNG vers le bucket Storage `avatars/`.
- Server actions dédiées (`src/lib/actions/admin-avatars.ts`).
- Nouveau layout `src/app/admin/utilisateurs/layout.tsx` qui rassemble les sous-pages (gestion users + avatars).

### Module — Bascule génération avatar perso : img2img → text2image
- **Contexte** : la pipeline img2img Retro Diffusion (photo user → pixel art) livrée le 2026-05-17 ne donnait pas un rendu satisfaisant — fidélité à la photo trop élevée pour donner un vrai look catalogue (les essais ressemblaient à des photos pixelisées plutôt qu'à des avatars de style cohérent).
- **Décision** : abandon img2img, bascule vers **text-to-image** avec description fournie par l'user (champ texte, 10-300 caractères). Prompt master appliqué côté serveur : `pixel art portrait, ${desc}, frontal bust, chunky pixels, 8-bit retro, transparent bg, friendly face`. Résolution native 64×64 puis upscale nearest ×4 → 256×256 via `sharp`.
- **Style aligné** sur le catalogue low_res 64 (sans le mot "Bullfrog" qui faisait littéralement apparaître des grenouilles quand RD filtrait les IP).
- **UX** (`<RequestCustomAvatar>` réécrit) : textarea + bouton Générer + display résultat + boutons "Choisir" / "Re-générer". Quota inchangé (3 par 24h, exemptions par env var).
- **Cleanup auto désactivé** : `cleanupAbandonedPersonalAvatars` n'est plus appelé à chaque génération / sélection d'avatar — l'user veut pouvoir conserver tous ses avatars perso (anciens choix + essais) dans la grille "Mes avatars personnels" et les supprimer manuellement via ✕ rouge.

### Feature — Acronymes : champ `disambiguation` + génération auto IA + intégration tags
- **Champ `disambiguation`** : nouvelle colonne TEXT NULL sur `acronymes`, pour préciser entre plusieurs significations possibles d'un même sigle. Champ texte optionnel dans le form CRUD admin.
- **Suppression du `.toUpperCase()` automatique** : certains sigles ont une casse mixte intentionnelle (ex. `ADRi`, `DMTi` — le `i` en minuscule signifie "intégré").
- **Génération auto IA** (`src/lib/actions/generateAcronyme.ts`) : nouvelle server action qui, à partir d'un sigle, génère définition + description courte via l'API Anthropic. Bouton "Générer avec IA" dans le form admin — permet de pré-remplir rapidement les champs à valider / ajuster.
- **Intégration sur les libellés de tags** : `<AcronymText>` désormais appliqué dans `SolutionFilters.tsx` — les sigles dans les filtres deviennent survolables avec tooltip définition (notamment les 7 téléservices CNAM `ADRi`, `AATi`, `ALDi`, `DMTi`, `IMTi`, `HRi`, `INSi`). Idem dans `GlossaireClient` et la page `/glossaire`.
- **Cache** (`acronymesCache.ts`) : adaptation pour le nouveau champ disambiguation.

### Fix — Hint FK explicite sur les jointures avatars
- **Symptôme** : depuis la migration `users.portrait` `text` → `uuid` + FK (livrée 2026-05-17), certaines requêtes Supabase utilisant `avatar:avatars(url)` étaient ambigües côté PostgREST.
- **Fix** : explicitation du nom de la contrainte FK dans les selects → `avatar:avatars!users_portrait_fkey(url)` dans `src/lib/db/users.ts` (`getUserById`) et `src/lib/db/evaluations.ts` (`getAvisUtilisateurs`, `getLastAvisUtilisateurs`, `getAvisUtilisateursPaginated`).

### Docs — Refonte du brouillon questionnaire téletransmission
- `docs/teletransmission-questionnaire.md` retravaillé en prévision du chantier "Questionnaire d'évaluation pour la catégorie Télétransmission" (TODO en attente).

### Fix — Typing `Awaited<Props['searchParams']>` dans `/gerer-notifications` (Next.js 16)
- Petit ajustement : `searchParams` est une Promise en Next 16, le helper `renderContent` doit le recevoir `Awaited` pour éviter l'erreur TypeScript.

### TODO — Mises à jour
- Marqué terminé : "Solutions liées (interopérabilités, suites produits)" — table + UI + seed initial 22 liens livrés.

---

## [2026-05-17] — Migration complète des avatars (catalogue + perso + bannière)

### Module — Renouvellement du catalogue d'avatars (67 nouveaux)
- 60 médicaux générés via API Retro Diffusion (RD Plus + Classic + prompt master Bullfrog v1) + 17 décalés "geek" (jedi, wookie, yoda, robot, sorcier, chevalier, pirate, ninja, samouraï, cowboy, vampire, astronaute, steampunk, princesse, viking, détective, boxer, sorcière, cyborg, savant fou) — archétypes génériques, pas de personnages identifiables nommément (choix IP).
- Pipeline scripté de bout en bout : `scripts/generate-avatars.ts` (batch 80 prompts × 2 variantes = 160 PNG), `scripts/finalize-avatars.ts` (tri → renommage `avatar-1..67.png` + upscale x2 nearest neighbor 256×256), `scripts/upload-avatars-to-supabase.ts` (bucket Storage public + génération SQL d'insert).
- Coût final : ~10 USD pour 160 images (estim initiale 30 USD largement surévaluée).
- Doc complète du style + prompts + workflow dans `docs/avatars-prompts-theme-hospital.md` (historique des décisions plans A/B/C tracé).

### Module — Migration BDD avatars (URL → UUID + FK)
- `users.portrait` : type `text` → `uuid`, FK `users_portrait_fkey` vers `avatars(id)` avec `ON DELETE SET NULL`.
- `avatars` : ajout colonnes `display_order INTEGER` (catalogue : 1-50 médicaux puis 51-67 décalés) et `user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE` (catalogue : NULL ; perso : user_id).
- Nouvelle table `avatar_generations` (id, user_id, created_at) pour le tracking du quota + RLS (self read).
- Reset complet : `UPDATE users SET portrait = NULL` (révoque migration random de la veille qui assignait un avatar arbitraire à 5 908 utilisateurs sans considération de genre/ethnie) + `DELETE FROM avatars` (49 anciens supprimés).
- GRANTs explicites sur `avatar_generations` (anticipation Supabase 2026-10-30).
- Types TS régénérés.

### Feature — Génération d'avatar personnel à partir d'une photo (img2img Retro Diffusion)
- Server action `generatePersonalAvatar(formData)` : appel API RD avec `input_image` base64 + `prompt_style: rd_plus__classic` + `strength: 0.65` (équilibre fidélité photo / stylisation pixel art). PNG résultat uploadé dans `avatars/personal/<user_id>/<ts>.png` + ligne `avatars` avec `user_id` non-NULL.
- Quota : 3 générations / 24h par user (table `avatar_generations` + helper `getRemainingAvatarGenerations`). Exemption via env var `AVATAR_QUOTA_UNLIMITED_EMAILS` (séparés par virgules) — affiche le décompte mais autorise au-delà de 0.
- **RGPD** : la photo source n'est jamais stockée, juste envoyée à l'API RD. Seul le PNG résultat (stylisé pixel art) est conservé.
- Cleanup automatique : à chaque génération / sélection / suppression d'avatar, les essais perso non choisis sont supprimés (BDD + fichier Storage) via `cleanupAbandonedPersonalAvatars()`. Au plus 1 avatar perso stocké à la fois par user (son portrait actuel).
- Script de garbage collection des orphelins Storage : `scripts/cleanup-avatar-storage.ts` (compare fichiers `avatars/personal/**/*.png` vs lignes BDD, supprime les fichiers non référencés). À lancer ponctuellement.

### UX / UI — Page profil + bannière
- **Bannière `<NouveauxAvatarsBanner>`** : insérée dans `/mon-compte/layout.tsx`, affichée si `users.portrait IS NULL` ET cookie `avatars_banner_dismissed` pas set. Mode accordéon : ligne compacte avec icône Sparkles + 5 avatars chevauchés en illustration + chevron, déploie la grille complète + lien mailto "Aucun ne me ressemble — envoyer une photo" + lien "Ne plus jamais m'afficher". Cookie 1 an.
- **Page profil `Mon avatar`** : 2 sections distinctes "Mes avatars personnels" (au-dessus si l'user en a) puis "Catalogue", médaillons ronds avec fond pastel `bg-surface-light` (PNG transparents préservés), grille 4 cols mobile / 8 sm / 10 md, bouton Supprimer à côté de Changer en mode compact, ✕ rouge en hover sur chaque avatar perso (avec confirmation).
- Composant `<RequestCustomAvatar>` (replié par défaut, visible uniquement quand la grille de sélection est ouverte) : upload photo (max 5 Mo), preview, bouton Générer avec loader 5-15s, affichage du résultat + bouton "Le choisir comme avatar" + "Re-générer (utilise un crédit)", display du quota restant + mention "illimité pour ton compte" pour les exemptés.

### Décisions assumées (choix éditoriaux / techniques)
- Style final : compromis "pixel art cartoon moderne 16-bit propre" entre Bullfrog et Stardew Valley. Le Bullfrog Theme Hospital pur n'était pas reproductible de façon homogène avec RD Plus (biais "jeune femme → anime" trop fort, même bombardé d'anti-anime). Le rendu retenu privilégie la cohérence du set sur la pureté du style cible.
- Pas de portraits voilés dans le set médical (choix éditorial assumé — la diversité passe par âges, ethnies, coupes de cheveux, tenues).
- Archétypes geek génériques uniquement (pas de Yoda/Pikachu/Link nommément) pour éviter tout risque IP.
- Fond transparent dans les PNG ; les "médaillons" pastels sont reproduits via `bg-surface-light` côté CSS (flexible, modifiable sans toucher aux images).

### TODO — Mises à jour
- Marqué terminé : "Remplacer les avatars utilisateurs" (entrée Avatars de la TODO).
- À venir : page admin `/admin/avatars` (CRUD via Supabase Storage, drag & drop pour l'ordre, ~2-3h de dev, non bloquant).

---

## [2026-05-16] — Stats activité utilisateurs + parcours "Proposer une vidéo"

### Feature — Colonne « Dernière connexion » dans `/admin/utilisateurs`
- Source : `auth.users.last_sign_in_at` (natif Supabase, MAJ à chaque login email/MDP **et** PSC).
- Lu côté serveur via `supabase.auth.admin.listUsers` paginé (1000/page) puis mergé par id avec les profils publics. Coût : ~6 appels paginés sur ~5 916 users → page un peu plus lente au premier hit (admin only, force-dynamic, acceptable).
- UI : nouvelle colonne triable, format relatif (« il y a 3j », « il y a 2 mois », etc.), tooltip avec date+heure complète au survol. Affichage italique gris pour les comptes jamais connectés.

### Feature — Stats d'activité dans `/admin/statistiques`
- 3 nouvelles cards KPI : **Actifs 7 jours / 30 jours / 90 jours** (avec % du total).
- LineChart « Dernière connexion par mois (12 derniers mois) » — note d'avertissement explicite sous le graphe : Supabase ne stocke que la dernière connexion → ce n'est pas un vrai MAU mais un proxy d'activité historique. Pour un vrai MAU, il faudrait un cron qui snapshotte quotidiennement.
- BarChart horizontal « Distribution de l'inactivité » — 7 buckets exclusifs : <7j / 7-30j / 30-90j / 90-180j / 180-365j / >1 an / Jamais connecté. Utile pour identifier la cohorte fantôme à recibler.
- Réutilise les composants `LineChart`, `BarChartHorizontal`, `KpiCard` et `Panel` déjà existants.

### Feature — Parcours utilisateur « Proposer » (Idée / Correction / Vidéo) + modération admin
- **Sidebar `/mon-compte`** : nouvel item "Proposer" (icône Sparkles), actif sur tout le sous-arbre `/proposer/*`, caché pour les éditeurs.
- **Espace `/mon-compte/proposer`** avec 3 onglets dans cet ordre : **Idée** (par défaut) → **Correction** → **Vidéo**. Layout client avec tab nav (border-bottom, pas de page reload entre onglets).
- **Migration SQL** : nouvelle table `propositions_utilisateurs` (id, user_id FK auth.users ON DELETE SET NULL, type CHECK('idee','correction'), titre, description, url_concernee, statut CHECK('en_attente','traite','refuse'), admin_notes, created_at, updated_at). GRANTs explicites (anticipation 2026-10-30) + RLS (utilisateur ne voit/crée que ses propres propositions). Index sur statut, user_id, type.
- **Migration SQL videos** (déjà appliquée plus haut dans la journée) : `ALTER TABLE videos ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL` + `CREATE INDEX idx_videos_statut`. Statuts videos étendus : `publie`, `brouillon`, `en_attente`, `refuse`.
- **Composant partagé** `src/components/mon-compte/PropositionForm.tsx` pour Idée et Correction (mêmes champs, copy distincte par type). Champ URL pré-rempli automatiquement avec `document.referrer` same-origin sauf si on vient déjà du sous-arbre `/proposer/` (évite que les changements d'onglet écrasent l'URL).
- **Server actions** (`src/lib/actions/propositions.ts`) : `submitProposition({type, titre, description, urlConcernee})` (utilisateur connecté → INSERT statut='en_attente' + envoi email best-effort), `setPropositionStatut(id, statut)`, `deleteProposition(id)`. Garde `assertAdmin` pour les 2 dernières.
- **Server actions vidéos** (`src/lib/actions/videos.ts`) : inchangées — `submitVideoProposal`, `approveVideoProposal`, `rejectVideoProposal`.
- **Notification admin email** : à chaque nouvelle proposition (idée ou correction), envoi SendGrid à `contact@100000medecins.org` avec proposeur, titre, URL concernée, description, lien vers `/admin/propositions`. Best-effort : si SendGrid down ou clé absente, l'INSERT a déjà eu lieu — l'utilisateur ne voit pas l'erreur.
- **Admin `/admin/propositions`** : page de modération avec filtres (statut : En attente / Toutes / Traitées / Refusées + type : Tous / Idée / Correction). Pour chaque proposition : icône+couleur par type, titre, description (whitespace-pre-wrap), proposeur (lien mailto si email), URL concernée (résolue en absolute pour `/...` paths), boutons Traiter / Refuser / Remettre en attente / Supprimer.
- **Admin `/admin/videos`** : panel "Propositions à modérer" déjà en place depuis ce matin (mêmes patterns, table `videos`).
- **Badges** : `getAdminBadges()` étend la signature avec `propositions: number` (en plus de `videos: number`). Sidebar admin : badge ajouté aux items "Vidéos & Tutos" et "Propositions" (nouvel item après Vidéos).
- **VideoForm** : sélecteur de statut élargi (`publie`, `brouillon`, `en_attente`, `refuse`).
- **Sécurité publique** : les requêtes `getHomepageVideos`, `getVideos`, `getStoriesTutos` filtrent déjà sur `statut='publie'` → propositions en attente et refus invisibles côté front. Les propositions idée/correction ne sont jamais exposées en public.
- **Restructure UI** : la page provisoire `/mon-compte/proposer-video` créée plus tôt dans la journée a été supprimée (remplacée par `/mon-compte/proposer/video`).

### Fix — `assertAdmin()` des nouvelles actions admin propositions / vidéos

- **Symptôme** : « Non autorisé » au clic sur Traiter / Refuser / Supprimer dans `/admin/propositions`, et idem sur Publier / Refuser dans le panel pending de `/admin/videos`.
- **Cause** : `assertAdmin()` (dupliqué dans `propositions.ts` et `videos.ts`) cherchait un user Supabase avec `role='admin'`. Or l'admin du site est cookie-based HMAC (`admin_token` dérivé de `ADMIN_PASSWORD`), pas Supabase Auth — l'admin n'a donc pas de session Supabase avec ce rôle.
- **Fix** : alignement sur le pattern déjà dupliqué dans `admin.ts`, `groupes.ts`, `questionnaires.ts` — `generateToken()` + vérif cookie `admin_token`. `submitProposition` et `submitVideoProposal` (côté utilisateur connecté) restent inchangées.

### Fix — Vidéo approuvée invisible dans `/admin/videos` jusqu'au reload

- **Symptôme** : après acceptation d'une proposition vidéo, la vidéo passait bien à `statut='publie'` en base mais n'apparaissait pas dans la liste principale sans F5.
- **Cause** : `VideosAdminList` est un client component qui initialise son state via `useState(() => buildItems(initialVideos, rubriques))` — appelé une seule fois au mount. `revalidatePath('/admin/videos')` côté serveur n'a aucun effet visible tant que le client ne refetch pas ses props.
- **Fix** : `router.refresh()` ajouté dans `VideosPendingPanel.tsx` après approve/reject réussi (force le refetch). `useEffect` ajouté dans `VideosAdminList.tsx` qui re-synchronise `items` quand l'ensemble des IDs côté serveur change. Clef stable basée sur les IDs uniquement (séparateur `'|'` entre vidéos et rubriques) → un drag & drop local en cours n'est pas écrasé tant qu'aucun ajout/suppression n'arrive en parallèle.

---

## [2026-05-16] — Fix avatars : format legacy `Avatars/` + uniformisation avatar-28 (bug source Firebase)

### Fix #1 — `users.portrait` au format relatif `Avatars/avatar-XX.png`
- **Symptôme** : sur la page solution `/solutions/.../weda`, l'avatar de l'utilisateur "Ahc" (CESAR ANCELLE-HANSEN) s'affichait cassé (icône image brisée).
- **Cause** : `users.portrait` contenait `Avatars/avatar-28.png` (chemin relatif sans `/` initial). Le navigateur tentait de résoudre depuis l'URL courante → 404. Format attendu côté code : `/images/portraits/avatar-XX.png` (servi depuis `public/images/portraits/`).
- **Périmètre** : 60 utilisateurs sur 5 916 (le reste avait déjà le bon format).
- **Fix** : `UPDATE users SET portrait = REPLACE(portrait, 'Avatars/', '/images/portraits/') WHERE portrait LIKE 'Avatars/%'` → 60 lignes corrigées.

### Investigation — distribution anormale `avatar-28` partagée par 99,8 % des comptes
- **Constat post-fix #1** : 5 898 / 5 916 utilisateurs (99,8 %) avaient `/images/portraits/avatar-28.png`. Pas un effet du fix #1 (5 838 l'avaient déjà avant), mais le fix l'a rendu visuellement plus flagrant sur la page Weda.
- **Vérifications côté code Supabase** : DEFAULT de la colonne `portrait` = NULL (confirmé par test d'insertion). Aucun INSERT applicatif ne force avatar-28 (parcours `/completer-profil` initialise `selectedAvatar = null`, scripts d'inscription `createUserProfile`, callbacks PSC, `auth/confirm`, `evaluation.ts` — tous laissent `portrait` absent ou recopient la valeur source).
- **Vraie cause — bug natif Firebase (ancien site)** : query sur Firestore production via `firebase-admin` (JSON conservé sur le laptop) → sur 6 437 docs `users`, **6 421 avaient `Avatars/avatar-28.png`** (99,8 %), 7 avaient un avatar personnalisé, 1 NULL, 8 sans champ portrait. L'ancien site forçait `avatar-28` comme valeur par défaut. Le script de migration `migrate-firebase-to-supabase.ts` (ligne 429) a fidèlement recopié via `portrait: d.portrait || null` — pas de bug de migration, pas de bug Supabase, **uniquement Firebase amont**.
- **Conséquence** : pas de patch code à faire — les nouvelles inscriptions web ne récidivent pas (vérifié : sur les inscriptions récentes avec heure précise, Julienne 2026-05-15 → avatar-3, Joris 2026-04-25 → avatar-41).

### Fix #2 — Redistribution aléatoire des `avatar-28` sur les 48 avatars du catalogue
- `UPDATE users SET portrait = '/images/portraits/avatar-' || (floor(random() * 48) + 1)::int || '.png' WHERE portrait = '/images/portraits/avatar-28.png'` → 5 898 lignes redistribuées.
- Vérif : top 10 entre 132 et 148 par avatar, attendu ~123 (variance conforme à un tirage uniforme sur 48 valeurs).
- **Effet de bord négligeable** : statistiquement 1 utilisateur sur 5 898 avait peut-être réellement choisi `avatar-28` — il sera re-randomisé. Tolérable.
- 9 utilisateurs au portrait NULL laissés intacts.

### Reste à faire (non bloquant)
- La vraie migration vers UUID décrite dans `docs/avatars_migration_plan.md` permettrait de changer les images sans `UPDATE` massif. Non urgent — l'avatar du site est maintenant cohérent.

---

## [2026-05-15] — DMARC `pct=10` → `pct=50` + nettoyage legacy

### Ops — DMARC `pct=10` → `pct=50` sur `100000medecins.org`
- Analyse des 4 rapports DMARC reçus depuis le passage à `pct=10` (2026-05-03) : 1 rapport Outlook (2026-04-25, encore en `p=none`) + 3 rapports Google (2026-05-10, 11, 13).
- 24 mails observés au total, 2 sources identifiées et 100 % alignées :
  - **Gandi** (217.70.183.x, IPv6 `2001:4b98:dc4:8::`) — DKIM selector `gm1`, SPF `100000medecins.org` — 5 mails.
  - **SendGrid** (149.72.x, 159.183.x) — DKIM selector `s1` + `sendgrid.info/smtpapi`, SPF `em1895.100000medecins.org` — 19 mails.
- 0 record en échec, 0 source inconnue, 0 disposition quarantine appliquée. Volume faible (essentiellement des tests pré-launch vers Gmail/Outlook) mais signal propre.
- Record DNS `_dmarc.100000medecins.org` mis à jour : `v=DMARC1; p=quarantine; pct=50; rua=mailto:david.azerad@100000medecins.org` (les tags `sp`, `adkim`, `aspf`, `np`, `fo` omis reprennent les défauts qui matchent la config précédente).
- Prochaine étape prévue ~2026-05-29 à 2026-06-05 : passage à `pct=100` après 2 semaines de stabilité et idéalement un envoi groupé légitime entre-temps. Puis `p=reject` 2-3 semaines plus tard si tout reste clean.

### Chore — Suppression des anciens dossiers `Frontend-V2-main` (post-migration Synology)
- Laptop : `C:\Users\david\Documents\100 000 Médecins\Claude IA\Frontend-V2-main` supprimé. Le `node_modules` résiduel (10 paquets) plantait l'Explorer Windows à cause de la limite 260 chars sur les chemins profonds — contourné via `robocopy /MIR` depuis un dossier vide temporaire.
- Desktop : commande équivalente fournie à exécuter via Synology Drive ou en local. À confirmer si la synchro Synology bidirectionnelle a déjà propagé la suppression côté NAS.
- Item TODO "Supprimer les anciens dossiers Frontend-V2-main" barré côté laptop (date 2026-05-15). Repo migré hors Synology depuis le 2026-04-25 → 3 semaines de stabilité, largement au-delà du délai prévu de 1-2 semaines.

---

## [2026-05-14] — Refonte pseudo (vide par défaut) + fix build database.ts

### Fix — Ligne artefact de plugin dans `src/types/database.ts` (cassait le build)
- `database.ts` contenait une ligne `<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />`, committée dans `a9937de` — artefact du plugin Claude Code `supabase`.
- Ce n'est pas du TypeScript valide → `npm run build` / `tsc` échouent → le déploiement Vercel aurait échoué.
- Ligne retirée. À surveiller côté config du plugin pour éviter que ça se reproduise.

### Refactor — Pseudo vide par défaut, fallback "Prénom N." calculé à l'affichage
- **Constat** : le texte d'aide promettait "si non rempli → prénom + initiale", mais ce fallback n'était implémenté nulle part. Les composants d'avis faisaient `pseudo || 'Anonyme'`. Un auto-remplissage du pseudo avec la partie locale de l'email (`createUserProfile`, `updateProfile`, `evaluation.ts`) masquait le trou — on voyait la partie email au lieu de 'Anonyme'.
- **A — Arrêt de l'auto-remplissage** : `createUserProfile` n'insère plus de pseudo, `completeProfile` fait `pseudo?.trim() || null`, `updateProfile` ne re-remplit plus si vide, `evaluation.ts` n'insère plus de pseudo. La page profil envoie désormais `null` (et non `undefined`) pour qu'un pseudo vidé soit réellement effacé en base.
- **B — Vrai fallback à l'affichage** : nouveau helper `src/lib/displayName.ts` → `getDisplayName({ pseudo, prenom, nom })` retourne `pseudo` sinon `"Prénom N."` sinon `"Anonyme"` (dernier cas : users sans prénom, ex. évaluations anonymes). Les requêtes `getAvisUtilisateurs` / `getLastAvisUtilisateurs` / `getAvisUtilisateursPaginated` (`evaluations.ts`) et `getUserById` (`users.ts`) chargent maintenant `nom, prenom`. Types alignés (`models.ts` + types inline des composants). Helper utilisé dans `AvisUtilisateurs`, `UserReviewsSidebar`, `ConfrereTestimonials`.
- **C — Texte d'aide profil** : "Si laissé vide, vos avis publiés afficheront votre prénom suivi de l'initiale de votre nom."
- **Existant non touché** : les pseudos déjà en base (partie email ou "Prénom N." selon le parcours d'origine) sont laissés tels quels — seules les sauvegardes futures sont propres.

---

## [2026-05-14] — Footer désabonnement : 3 senders + 3 templates transactionnels + doc

### Fix — Footer "Gérer mes notifications" retiré des 3 templates transactionnels
- **Constat (mea culpa)** : j'avais incorrectement supposé hier que les mails de reset mdp étaient des mails Supabase natifs. Vérification faite, le template `reinitialisation_mot_de_passe` est bien envoyé par notre code (`sendPasswordReset` → `admin.generateLink` pour générer le lien + `buildEmail` + SendGrid). Le bug "lien mort" rapporté par un utilisateur le 13/05 venait donc bien d'un mail à nous.
- **Mais** : pour les mails transactionnels/sécurité (`reinitialisation_mot_de_passe`, `verification_psc`, `suppression_compte`), le footer "Gérer mes préférences" n'a pas de sens — l'utilisateur ne peut pas opter-out (la page elle-même affiche "Les emails de compte ne peuvent pas être désactivés"). Donc plutôt que de "réparer" le lien avec la nouvelle archi HMAC, on retire le footer entièrement de ces 3 templates.
- **Mise à jour BDD** : 3 templates UPDATE'd via `scripts/clean-transactional-email-templates.mjs` (dry-run par défaut, --apply pour écrire). Le bloc `<p>...{{lien_desabonnement}}...</p>` retiré, le logo et la séparation conservés. ~220 chars retirés par template. Idempotent.
- **Tooling créé** : `scripts/dump-email-templates.mjs` (dump des templates choisis vers `tmp/email-templates/{id}.html` pour inspection/backup).

### Fix — 3 routes d'envoi ne passaient pas par `generateUnsubscribeLink()`
- `src/app/api/admin/send-newsletter/route.ts`, `send-infos-mensuels/route.ts` et `test-email/route.ts` hardcodaient `${siteUrl}/mon-compte/mes-notifications` au lieu d'appeler `generateUnsubscribeLink()`. Leurs mails contenaient donc un lien qui exigeait une session loggée → perd l'intérêt du HMAC-only mis en place la veille.
- Patch : import + appel de `generateUnsubscribeLink(user.id, siteUrl)` dans les 3 routes.
- `test-email` : lookup du destinataire en base via son email pour générer un vrai lien HMAC fonctionnel en preview (fallback sur l'URL loggée si destinataire absent de la base) → l'aperçu admin reflète désormais ce que recevront les vrais utilisateurs.

### Docs — Architecture emails : section footer HMAC ajoutée
- `docs/email-architecture.md` : nouvelle section "Footer Gérer mes préférences (lien HMAC-only)" — explique l'architecture (URL idempotente, HMAC `sha256(EMAIL_SECRET, "notif:uid:iat")`, TTL 1 an, résistance aux scanners Outlook/Gmail), la génération via single source of truth (`generateUnsubscribeLink`), et la contrainte d'inclure `{{lien_desabonnement}}` dans le HTML du template (le `master_layout` ne l'injecte pas automatiquement).
- Checklist d'ajout d'un nouvel email étendue : placeholder à inclure dans le template + appel de `generateUnsubscribeLink` côté code + test du lien après envoi.

### Docs — Drift PSC corrigée dans user-creation-flow + cross-refs entre docs
- `docs/user-creation-flow.md` §Flux 2 disait "Vérifie OTP côté serveur" alors que le code vérifie l'OTP **côté client** dans `/auth/psc-session` via `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`. Le callback se contente de générer un magiclink et de rediriger. Découpage du Flux 2 en 2 étapes distinctes : "Callback PSC" (serveur, prépare le magiclink) et "Création de session" (client, consomme le magiclink).
- Ajout d'un encart "Voir aussi" en tête de chaque doc (`auth-navigation.md` et `user-creation-flow.md`) pointant vers l'autre, avec la séparation explicite des angles : navigation vs données. Pas de fusion — chaque doc reste consultable seul selon le bug qu'on chasse.

### Chore — `.gitignore`
- Ajout de `tmp/` pour éviter de commiter les dumps DB transitoires générés par les scripts d'inspection.

### Refactor — N éditeurs par éditeur + chaîne complète d'édition côté éditeur
- DB : DROP des colonnes `editeurs.culture` et `editeurs.gouvernance` (jamais lues côté code). DROP `editeurs.user_id` : le lien bidirectionnel disparaît au profit de `users.editeur_id` seul, ce qui permet N utilisateurs de partager le même éditeur (employés d'une même boîte). FK `users.editeur_id` passée en `ON DELETE SET NULL` pour éviter les orphelins.
- Backend : `approuverEditeurClaim` simplifié (un seul UPDATE sur users), `assignEditeurToUser` ne touche plus à `editeurs.user_id`, helper `assertEditeurAccessToSolution` factorise la vérif de sécurité, split des actions en `updateEditeurByUser` (champs partagés table editeurs) et `updateSolutionByEditeur` (champs spécifiques solution).
- Page `/mon-compte/mon-espace-editeur` restructurée en 2 blocs : "Mon entreprise" unique (nom_commercial, logo entreprise + titre, website, mot éditeur, contact email/tel/adresse complète) et 1 carte par solution (logo solution, image principale, tarification complète prix_ttc/devise/frequence/duree, galerie). Message clair "demande en cours de validation" si claim pas encore approuvée.
- Côté admin (`/admin/utilisateurs`) : utilise `users.editeur_id` comme source de vérité ; le ✗ "déjà revendiqué" disparaît puisque N users par éditeur est désormais autorisé.

### Feature — Audit log des modifications éditeur + page admin de consultation
- Nouvelle table `editeurs_edit_log` (user_id, table_cible, id_cible, champ, ancienne_valeur, nouvelle_valeur, created_at) avec GRANTs explicites (anticipation Supabase 2026-10-30) + RLS (éditeur ne voit que ses propres logs).
- `updateEditeurByUser` et `updateSolutionByEditeur` lisent les anciennes valeurs avant l'UPDATE, calculent le diff champ par champ, n'enregistrent que les vrais changements.
- Page `/admin/editeurs-log` : tableau triable par date (200 dernières modifications), colonnes date / éditeur / table / champ / avant / après.

### Feature — Point rouge admin (badges modération sur sidebar)
- `getAdminBadges()` (`src/lib/db/admin-badges.ts`) fetch en parallèle les compteurs : `editeur_claims` en_attente, `etudes_cliniques` + `questionnaires_these` en_attente, `emails_campagnes` pending dont `scheduled_at <= now()`.
- Layout admin fetche les badges côté serveur et les passe à la sidebar.
- `AdminSidebar.tsx` : badge (cercle rouge + compteur, "99+" max) à droite du label. Le parent "Solutions" agrège automatiquement les badges de ses sous-items.
- Architecture extensible : pour brancher Blog, Vidéos, Planning plus tard, ajouter une clé dans `AdminBadges` et la requête correspondante.

### Style — Ajustements UI mineurs
- Paddings verticaux réduits sur AboutMission, BlogPreview, RecommendedSoftware (homepage)
- Boutons "Évaluer" et "Site internet" du hero solution rapetissés sur mobile
- "Lire cet article" → "Lire l'article" sur les MissionCard

---

## [2026-05-13] — Refonte désabonnement (HMAC-only) + 2 fixes UI

### Feat — Désabonnement HMAC-only, résistant aux scanners email
- **Symptôme remonté** : utilisateur clique sur "Gérer mes préférences de notification" en bas d'un mail → page d'erreur. Causes côté code écartées au diagnostic (le flow marche en navigation propre).
- **Cause probable** : les scanners anti-phishing (Outlook Safe Links, Gmail) pré-fetchent les URLs sortantes et consomment le magiclink Supabase **single-use** avant que l'utilisateur ne clique → lien mort à l'arrivée.
- **Ancien flow** : `/api/se-desabonner?uid&token` → vérif HMAC → génération magiclink Supabase → redirect `/auth/psc-session` → `verifyOtp` (consomme l'OTP) → session créée → `/mon-compte/mes-notifications`. Faille = la consommation de l'OTP est exposée en GET.
- **Nouveau flow** : `/gerer-notifications?uid&iat&token` rendue par un Server Component, page idempotente (GET ne modifie aucun état). HMAC vérifié côté serveur à chaque toggle (POST avec token rejoué via server action). Aucun magiclink, aucune session créée — le scanner peut pré-fetcher à l'infini, rien ne se consomme.
- **HMAC** : `sha256(EMAIL_SECRET, "notif:<userId>:<iat>")` — `iat` en query param, TTL 1 an. Écran "Lien expiré" gracieux au-delà, avec CTA `/connexion`. Vérif via `timingSafeEqual` pour éviter les attaques timing.
- **Détection de session existante** : si l'utilisateur est déjà loggué dans le navigateur (cookie Supabase présent), un lien "Aller à mon compte" s'affiche en bas de la page publique.
- **Propagation auto** : tous les emails (campagnes, relances, newsletter, lancement, questionnaires, études) suivent automatiquement via `generateUnsubscribeLink()` mis à jour — aucune modif côté cron/templates.
- **Domaine-agnostique** : URL relative, l'origin est dérivé de `req.url` ou `NEXT_PUBLIC_SITE_URL` → zéro changement de code lors du futur switch `dev.100000medecins.org` → `www.100000medecins.org`.
- **Fichiers créés** : `src/lib/email/notif-token.ts`, `src/lib/actions/notifications-public.ts`, `src/app/gerer-notifications/{page,GererNotificationsClient}.tsx`.
- **Fichier supprimé** : `src/app/api/se-desabonner/route.ts` — sinistralité nulle car pré-launch (anciens liens en inbox non communiqués hors test interne).
- **Script de test** : `scripts/preview-unsub-link.mjs` génère un vrai lien pour un user donné (résolution uid|email via Supabase), supporte `--local` et `--target=https://...`.

### Fix — Bannière PSC masquée pour les éditeurs sur /mon-compte/profil
- La bannière "Vérifiez votre identité médicale" (CTA Pro Santé Connect) s'affichait pour tout utilisateur sans RPPS, **y compris** ceux inscrits comme éditeur.
- Or PSC n'a aucun sens pour un éditeur (il représente un logiciel, n'évalue pas) — condition étendue avec `!isEditeur` (calculé via `modeExercice === 'Éditeur'`, donc actif dès l'inscription, avant validation admin), cohérent avec la logique mise en place hier sur Navbar/layout.

### Fix — Contraste des étapes inactives sur le questionnaire d'évaluation
- Remontée utilisateurs : sur les pages `/solution/noter/[...]`, les étapes non actives (cercle + label) étaient quasi-invisibles selon les écrans (`bg-gray-200` + `text-gray-400` sur fond bleuté).
- Cercle inactif cliquable : `bg-gray-400` + `text-white` (au lieu de `bg-gray-200/text-gray-500`).
- Cercle inactif non-cliquable : `bg-gray-300` + `text-gray-600`.
- Label : `text-gray-400` → `text-gray-600` (et `text-gray-300` → `text-gray-500` pour non-cliquable).
- Hiérarchie préservée : étape active toujours en `text-navy` + cercle `bg-accent-blue`.

---

## [2026-05-13] — Fix chaîne d'inscription / approbation / UI éditeur

### Fix — Lien bidirectionnel manquant après approbation
- `approuverEditeurClaim` ne remplissait que `users.editeur_id` et `users.role = 'editeur'`, sans toucher à `editeurs.user_id`
- Conséquence : `/mon-compte/mon-espace-editeur` cherche via `editeurs.user_id` → affichait "Aucun éditeur associé" même après validation admin
- Fix : ajout d'un `UPDATE editeurs SET user_id = ... WHERE id = ...` dans le flux d'approbation + revalidation des paths côté éditeur

### Fix — Sélecteur d'éditeur non verrouillé sur /mon-compte/profil
- L'utilisateur pouvait re-soumettre des claims successifs, le sélecteur restait ouvert
- Fix : chargement du dernier claim (`editeur_claims` ordre desc), affichage verrouillé avec badge selon statut (`en_attente` orange, `approuve` vert avec ✓)
- Si statut `rejete` : sélecteur réouvert avec affichage de la note admin
- Validation du formulaire ajustée : ne réclame plus `claimFilled` quand un claim verrouillé existe

### Fix — UI épurée dès l'inscription éditeur (avant validation admin)
- Avant : l'UI éditeur (masquage "Évaluer un logiciel", onglets "Mes évaluations" / "Études cliniques" / "Questionnaires de thèse", 3 notifs) ne s'appliquait qu'après que l'admin ait défini `users.role = 'editeur'`
- Fix : nouveau flag `isEditeur` dans `AuthProvider`, true si `mode_exercice === 'Éditeur'` OU `role === 'editeur'`. L'UI filtrée s'applique dès le premier login post-inscription
- 3 composants utilisant le flag : `Navbar.tsx`, `app/mon-compte/layout.tsx`, `mes-notifications/page.tsx`

### TODO — Mises à jour
- Marqué terminé : Vérifier tous les comportements utilisateurs (tests end-to-end) ✅
- Ajouté (IMPORTANT) : Vérifier le comportement d'un inscrit en tant qu'éditeur
- Ajouté (UX/UI) : Point rouge admin sur catégories parent si modération en attente
- Ajouté (UX/UI) : Parcours utilisateur pour proposer une vidéo stories & tutos

---

## [2026-05-12] — Nettoyage colonnes obsolètes table `solutions`

### Refactor — Suppression colonnes Firebase résiduelles sans usage front
- Champs admin retirés de `SolutionForm.tsx` (section "Tarification et segments"
  + input "Version") : ils s'affichaient encore alors qu'ils n'avaient plus
  aucune traduction côté site
- Colonnes DROP : `solutions.version`, `solutions.segments`,
  `solutions.nb_utilisateurs`, `solutions.duree_engagement`
  (migration `006_cleanup_solutions_obsolete_columns.sql`)
- Server action `extractSolutionFromFormData` (`src/lib/actions/admin.ts`) :
  retrait des 4 propriétés correspondantes du payload
- Composant `SolutionDetail.legacy.tsx` supprimé (mort, plus importé nulle part,
  seul consommateur du champ `version`)
- Type `Prix` retiré de `src/types/models.ts` (faisait référence à `solutions.prix`
  déjà supprimé précédemment, jamais importé ailleurs)
- Champ `logo_titre` conservé : utilisé comme `alt` d'image sur `SolutionList`,
  `SolutionHero`, page éditeur, admin éditeurs (SEO + accessibilité)
- Migration SQL appliquée + `database.ts` régénéré au cours de la session

---

## [2026-05-12] — Import users Firebase tardifs

### Migration — 55 users Firebase post-2026-01-01 importés dans Supabase
- Contexte : la migration initiale Firebase→Supabase du 12 avril 2026 a omis des
  comptes créés entre janvier et avril (raison probable : timing du snapshot).
  Plan défini la veille, exécuté ce jour.
- Périmètre scanné : 1029 users Firestore avec `creation >= 2026-01-01`
  - 492 déjà présents dans Supabase via RPPS (skip)
  - 482 sans email exploitable côté Firebase (skip — comportement identique
    au flow PSC actuel : à leur prochaine connexion PSC, ils seront redirigés
    sur `/completer-profil` exactement comme un nouveau)
  - 55 candidats nets importés (auth + table `users` + évaluations Firebase
    remappées avec `critereId → identifiantTech`)
  - 0 conflit email, 0 doublon interne Firebase
- Cas spéciaux gérés :
  - `dr.azerad@gmail.com` (David, RPPS 10100394740) : déjà migré, ses 5 évals
    Firebase = tests perso → skippées
  - `eva.de.peretti@gmail.com` : déjà migrée, éval `Crossway` commune (on garde
    la version Supabase 2023-01-20), éval `Odaiji` (2026-04-07) absente côté
    Supabase → importée
- Bilan : **55 users créés, 18 évaluations importées, 10 solutions recalculées,
  0 erreur**. Comptes créés sans email de notification (option B : ces users
  pourront faire "mot de passe oublié" s'ils reviennent).
- Script : `scripts/import-firebase-late-users.ts` (idempotent, dry-run par
  défaut, `--execute` requis pour écrire). Conservé pour archive et au cas
  où d'autres users tardifs apparaîtraient.

### UX / UI — Page completer-profil sans navigation cliquable
- Remplacement de la `Navbar` cliquable par un header minimal sur `/completer-profil`
  (logo non cliquable + lien "Se déconnecter" en haut à droite, `Footer` supprimé)
- Raison : tout utilisateur PSC sans `is_complete=true` est de toute façon
  re-redirigé ici à chaque login → éviter l'errance dans le site sans mot de passe
- Escape hatch conservée : déconnexion explicite pour éviter la session active qui
  re-piège l'utilisateur à chaque visite

### UX / UI — Hero illustration plus vivant
- Amplitude des animations flottantes ~1.8x plus large (translation 18-22px vs 9px,
  rotation ~1.5-2° vs ~1°) sur `HeroIllustration`
- Durées ~30% plus courtes (2.7-4s vs 3.9-6s) → mouvement plus perceptible

---

## [2026-05-11] — Fix : statut éval rattachée respecte la validation PSC

### Fix — Rattachement éval anonyme ne doit pas publier sans RPPS
- Symptôme : éval anonyme → inscription email/mdp (sans PSC) → l'éval était publiée
  sur la page solution alors que l'utilisateur n'avait pas validé son identité médicale
- Cause : `auth/callback`, `rattacherEvalsAnonymes()` et `merge.ts` passaient
  systématiquement `statut: 'publiee'` au rattachement, ignorant la règle métier
- Fix : avant rattachement, lecture de `users.rpps` du compte cible
  - RPPS présent → `publiee` + recalc
  - RPPS absent → `en_attente_psc` (éval rattachée mais pas publiée, l'utilisateur
    voit la bannière "Validez via PSC" dans `/mon-compte/mes-evaluations`,
    publication automatique au moment de la validation PSC via `psc-callback`)

---

## [2026-05-10] — Rattachement évals anonymes + audit recalc résultats + mobile

### Fix — solutions_utilisees manquante après rattachement éval anonyme
- Symptôme : éval anonyme rattachée à un compte (signup, login ou fusion) → la note
  apparaît sur la page solution mais l'évaluation n'apparaît pas dans
  `/mon-compte/mes-evaluations`
- Cause : `submitEvaluationAnonyme` ne crée pas de `solutions_utilisees` (normal),
  mais le rattachement ultérieur n'en crée pas non plus alors que la page
  `mes-evaluations` itère sur cette table
- Fix : nouveau helper `ensureSolutionUtilisee(userId, solutionId)` (idempotent)
  appelé à chaque rattachement — `auth/callback` (signup), `rattacherEvalsAnonymes`
  (login), `psc-callback` (3 chemins), `merge.ts` (après migration)

### Fix — Rattachement évals anonymes à un compte
- Cas "nouveau compte avec même email" : `api/auth/callback` rattache les évals
  `en_attente_psc` correspondant à l'email après confirmation d'inscription (`type=signup`)
- Cas "compte existant + login email/mdp" : nouvelle action `rattacherEvalsAnonymes()`
  appelée au chargement de `/mon-compte/profil`
- Fix `merge.ts` : recalc des résultats manquant après fusion de comptes — cause du
  bug "éval visible dans mes-évaluations mais note absente sur la page solution"

### Fix — Audit complet des appels recalcResultatsPourSolution
- `account.ts` : recalc déclenché même quand `supprimerAvis: false` (anonymisation) —
  le bug silencieux laissait les scores de l'ancien `user_id` dans `resultats.notes`
- Suppression de `finalizeEvaluation` (dead code, jamais appelée, bug recalc manquant)
- Suppression de `deleteAccount()` dans `user.ts` (doublon orphelin sans recalc)

### Admin — Boutons recalc résultats
- Nouvel endpoint `POST /api/admin/recalc-solution` : supporte `solutionId` ou `all:true`
- Bouton "Recalculer les résultats" sur la page modifier d'une solution
- Bouton "Recalcul global" sur la liste des solutions (avec confirmation)

### UX / UI — Mobile évaluation
- Page `/solution/noter` : clic sur une catégorie collapse les autres tuiles sur mobile
  et scrolle automatiquement vers la barre de recherche
- Page notation `[...slug]` : boutons "Soumettre / Retour" en colonne sur mobile (full width)

### UX / UI — Refonte mobile pages comparatifs + fix gradient hero
- Page `/comparatifs` : tuiles en layout centré (titre haut + illustration centrée), suppression du bouton "Explorer" (la tuile entière reste cliquable), sizing per-slug des illustrations sur mobile (`agendas-medicaux` 60px, `logiciels-metier` 79px, autres 69px)
- Page `/solutions/[idCategorie]` : layout passé en grid CSS — "Trier par" au-dessus des filtres sur mobile, "Fonctionnalités" alignée avec la 1ère ligne de tuiles sur desktop. Hero `text-xl` → `text-lg` mobile pour titres longs ("IA Documentaires"). Padding section réduit
- `SolutionFilters.tsx` : `text-left` sur les boutons de groupe — corrige le centrage hérité de `<button>` sur les longs titres ("LOGICIEL D'AIDE À LA PRESCRIPTION", "STRUCTURE D'EXERCICE CIBLÉE"). Masquage du titre "Fonctionnalités" sur mobile
- `SolutionSortBar.tsx` : "Note globale" rendu sous le bouton de tri actif (au lieu d'être centré indépendamment). `mb-6` mobile → 0
- Hero homepage : gradient de sortie aligné sur `#C6D5EE` (= `bg-surface-muted`) — supprime la barre claire visible au raccord avec la section suivante
- Section "Les logiciels les mieux notés" : `py-20 md:py-28` → `pt-8 pb-20 md:pt-14 md:pb-28`
- Cleanup `solution/noter/page.tsx` : suppression du `useRef` + `scrollIntoView` mobile inutilisés

### TODO — Mises à jour
- Aucun item terminé cette session

---

## [2026-05-09] — Fix note rédaction homepage + bundle + sécurité deps

### Fix — Note rédaction affichée 0.1 sur la homepage
- `getNotesRedacGlobales` calculait une moyenne brute de tous les `note_redac_base5` dans `resultats`, y compris les critères N/A stockés à `-0.50`
- Résultat : Premiocare affichait 0.1 en homepage, 4.2 sur sa fiche et en listing
- Fix : lit `solutions.evaluation_redac_note` (colonne stockée, maintenue par trigger), aligné sur `getNotesGlobalesRedac` utilisé en listing

### Perf — Analyse bundle + suppression framer-motion
- `@next/bundle-analyzer` installé pour cartographier les chunks JS (client/serveur/middleware)
- Diagnostic : framer-motion (250 modules, chunk ~8342.js) chargé pour les animations Hero uniquement
- Remplacement par animations CSS pures (`@keyframes hero-float` + CSS custom properties inline)
- `HeroIllustration.tsx` devient Server Component (suppression `'use client'`)
- `framer-motion` désinstallé ; autres findings classés sans action requise
- Doc : `docs/optimisation-bundlecode-05-2026.md`

### Sécurité — npm audit fix (27 → 15 vulnérabilités)
- 1 critical résolue : protobufjs (arbitrary code execution)
- 7 high résolues : axios, flatted, fast-xml-parser, node-forge, picomatch, minimatch…
- 4 moderate résolues
- Restants sans action : firebase chain (scripts only), next/eslint (session Next.js dédiée), xlsx (no fix disponible)

### TODO — Mises à jour
- Marqué terminé : Note rédaction fausse homepage ✅
- Marqué terminé : Alléger les pages du site — bundle / code inspection ✅
- Ajouté : Import ~10 utilisateurs Firebase post-migration

### Fix — Overflow horizontal mobile sur pages solution

- Cause racine : items CSS Grid sans `min-w-0` → la pagination des témoignages
  (flex nowrap, jusqu'à 12 boutons sur Weda) forçait la grille à 620px sur mobile
- Fix : `min-w-0` sur les deux colonnes du grid dans `SolutionDetailPage.tsx`
- Fix : pagination condensée sur mobile (`← X/Y →`) dans `ConfrereTestimonials.tsx`
  au lieu des boutons numérotés en flex-nowrap
- Fix : scroll automatique vers le début des avis au changement de page

### UX / UI — Navbar mobile + boutons d'ancre page solution

- Navbar mobile : padding asymétrique `pl-5 pr-0` pour mieux ancrer les boutons
  (loupe, Évaluer, burger) vers le bord droit
- Boutons d'ancre (page solution) : `text-[11px]` + `px-2.5` + `gap-1` sur mobile
  pour tenir en 2 lignes au lieu de 3

---

## [2026-05-08] — Fix auth email change + fusion PSC + suppressions de compte

### Fix — Template email "Change email address" (Supabase dashboard)
- Template utilisait `{{ .ConfirmationURL }}` → routait vers Supabase auth server, pas vers notre callback, session SSR jamais établie
- Fix : tous les templates (change email, confirm signup, reset password) passés au format `token_hash` : `{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=...`

### Fix — Synchronisation email après changement (api/auth/callback/route.ts)
- Callback ne mettait pas à jour `public.users.email` ni `contact_email` après confirmation
- Fix : ajout d'un `update({ email, contact_email })` pour `type === 'email_change'`

### Fix — Banner PSC affiché à tort (mon-compte/profil/page.tsx)
- `isFromPsc` se basait sur `user_metadata.provider === 'psc'` → vrai même après fusion (la métadonnée du compte supprimé restait)
- Fix : `isFromPsc = !!data.rpps` uniquement (présence du RPPS = compte PSC)

### Fix — Fusion PSC : mauvais compte conservé (merge.ts)
- Magic link généré avec `public.users.email` → pouvait créer un utilisateur fantôme si l'email PSC synthétique (`psc-RPPS@psc.sante.fr`) différait de `auth.users.email`
- Fix : `auth.admin.getUserById(keepId)` pour récupérer le vrai email auth avant `generateLink`

### Fix — Fusion PSC : contraintes FK bloquant la suppression (merge.ts)
- Suppressions échouaient silencieusement sur plusieurs contraintes FK sans CASCADE : `users_notification_preferences`, `solutions_favorites`, `users_preferences`, `editeur_claims`, `questionnaires_these` (migré vers `keepId` avant suppression)
- Ajout d'error handling explicite sur la suppression `public.users` + `auth.admin.deleteUser`

### Fix — Suppression de compte (account.ts + admin-users.ts)
- `deleteAccount` : crash Server Components après suppression → ajout `authClient.auth.signOut()` avant le `return`
- Même contraintes FK manquantes que la fusion : ajout de `solutions_favorites`, `users_preferences`, `editeur_claims`, `questionnaires_these` (→ `created_by = null`)
- `deleteAccount` (supprimerAvis=true) et `deleteUser` (admin) : `resultats` non recalculés après suppression des évaluations → ajout de `recalcResultatsPourSolution` pour chaque solution affectée

### TODO — Mises à jour
- Marqué terminé : Changement d'email non fonctionnel (sync public.users) ✅
- Marqué terminé : Fusion PSC mauvais compte conservé ✅
- Marqué terminé : Suppression compte — crash Server Components ✅

### Fix — Crash sanitizeHtml(null) sur pages IA / Agenda
- `sanitizeHtml()` appelé avec `null` sur certaines fiches (champs éditoriaux vides)
- Fix : guard `|| ''` avant chaque appel dans les composants concernés

### BDD — Audit complet (3 passes) + corrections
- Policy `etudes_cliniques` INSERT restreinte à `role='digital_medical_hub'` (tout authentifié pouvait soumettre)
- Trigger `update_editeurs_updated_at` ajouté (colonne `updated_at` créée sans trigger)
- Colonnes supprimées : `users.age` (doublon inutilisé), `solutions.date_fondation` (TEXT inutilisé)
- `solutions.updated_at` + trigger ajoutés ; policy publique `email_templates` supprimée
- FK + index sur `solutions_utilisees.solution_precedente_id`
- `database.ts` régénéré post-migrations ; `CLAUDE.md` note stale corrigée (editeurs.updated_at)
- Docs : `audit_bdd_05_2026.md` (v4 final), `schema_bdd_05_2026.md`, `avatars_migration_plan.md`

### Nettoyage — Code aligné sur les colonnes BDD supprimées
- `solutions.ts` : suppression branche `meilleure_note` (référençait `date_publication` supprimée)
- `admin-solutions.ts`, `SolutionForm.tsx`, `SolutionWithSearch.tsx` : suppression `date_lancement`
- `users.ts` : `getTrancheAge` — `parseInt(annee_naissance)` → accès direct INTEGER

### Perf — Listing catégorie : appel getNotesGlobalesRedac conditionnel
- En mode alphabétique (`tri === 'nom'`), la requête était appelée inutilement
- Fix : `needsRedacNotes = tri !== 'nom'` dans `[idCategorie]/page.tsx`

### TODO — Mises à jour (session 2)
- Archivé : Audit BDD complet ✅
- Archivé : Architecture email PSC (décision validée) ✅
- Ajouté : Plan migration avatars (`docs/avatars_migration_plan.md`)

---

## [2026-05-07] — Fix système de notation + comparateur détaillé toutes catégories

### Fix — recalcResultatsPourSolution (bug silencieux depuis la mise en ligne)
- Cause : `criteres.identifiant_tech` des 5 critères principaux contenait des valeurs numériques héritage Firebase (`'1'`-`'5'`) au lieu de `'interface'`, `'fonctionnalites'`, `'fiabilite'`, `'editeur'`, `'qualite_prix'`
- Conséquence : `recalcResultatsPourSolution` cherchait `scores['1']`, `scores['2']`... ne trouvait rien, et ne mettait jamais à jour `resultats` lors des nouvelles évaluations
- Fix BDD : UPDATE des 5 lignes `criteres` pour aligner `identifiant_tech` sur les clés texte de `evaluations.scores`
- Fix code : suppression du filtre `.is('parent_id', null)` dans `evaluation.ts` — la fonction agrège maintenant tous les critères (principaux + sous-critères)
- Recalcul SQL ponctuel : `resultats` remis à jour pour les 27 solutions concernées
- Bonus : 4 évaluations encore sur échelle 0-10 corrigées (division par 2 + recalcul `moyenne_utilisateur`)

### Fix — Comparateur vue détaillée : toutes catégories (agenda, IA)
- Cause 1 : `getDetailedComparisonData` filtrait `identifiant_tech.startsWith('detail_')` → excluait mécaniquement `agenda_*`, `docai_*`, `scribe_*`
- Cause 2 : `DETAIL_CRITERE_MAP` (hardcodé) ne couvrait que les sous-critères `detail_*`
- Fix code (`comparison.ts`) : suppression du filtre prefix + remplacement de `DETAIL_CRITERE_MAP` par un lookup dynamique via `critere.parent_id` depuis la DB
- Fix BDD : insertion de 65 sous-critères dans `criteres` (25 agenda, 18 IA documentaires, 22 IA scribes) avec `parent_id` pointant vers le critère majeur correct

### TODO — Mises à jour
- Marqué terminé : Faire le mapping sous-critères → critères principaux pour IA et agendas ✅

### Fix — Page profil (mon-compte/profil)
- Changement email et mot de passe : remplacement des `<form>` par des `<div>` + `onClick` explicite sur les boutons
- Corrige la régression où "Confirmer" ne déclenchait rien (submit intercepté par un formulaire parent)
- Ajout prop `type` sur le composant `Button` (défaut `"submit"`) pour contrôle explicite

### Fix — Admin : slug catégorie non modifiable après création
- Champ slug en `readOnly` sur le formulaire d'édition de catégorie
- Visuel désactivé + label "non modifiable après création"

### Fix — Notation agenda : mauvais questionnaire + sections repliées
- Clé `agenda-medical` → `agendas-medicaux` dans `SECTIONS_PAR_CATEGORIE` (page de notation)
- `defaultOpen={true}` sur toutes les sections détaillées (plus seulement la première)

### Fix — Slug `agenda-medical` → `agendas-medicaux` (propagation complète)
- `src/lib/data.ts` (nav), scripts email (`bake-logo`, `regenerate-seo`, `save-lancement`, `seed-questionnaires`, `send-test-email`), page admin questionnaires
- Vérification BDD via MCP Supabase : `categories` et `questionnaire_sections` à jour

### Outillage — MCP Supabase opérationnel
- Connexion MCP Supabase en lecture seule configurée dans `.claude/settings.local.json`

### TODO — Mises à jour (session 2)
- Marqué terminé : Configurer le MCP Supabase ✅
- Marqué terminé : Changement d'email non fonctionnel ✅
- Marqué terminé : Questionnaires de notation repliés par défaut ✅
- Marqué terminé : Évaluation agenda — mauvais questionnaire affiché ✅
- Marqué terminé : URGENT — Vérifier les occurrences de l'ancien slug agenda-medical en BDD ✅

---

## [2026-05-05] — Automatisation emails études & thèses + validation admin

### Feature — Campagnes email (études cliniques & questionnaires de thèse)
- Nouvelle table `emails_campagnes` : type, statut (pending/sent/cancelled), spécialités cibles, lien, texte promoteur, scheduled_at
- `PublishEmailModal` : modale de publication avec lien, spécialités cibles, texte promoteur (éditeur riche), mode d'envoi "Maintenant" ou "Programmer"
- Bouton "Générer avec IA" (Anthropic claude-haiku) : génère 2-3 phrases HTML incitant à participer, basé sur le titre et la description
- `sendCampagneNow` : envoi immédiat → filtre les users ayant la préf active + spécialité ciblée, envoie via SendGrid, logue en `sent`
- `scheduleCampagne` : insertion en `pending` avec `scheduled_at`
- Cron `/api/cron/envoyer-campagnes-email` (horaire Vercel) : déclenche les campagnes différées arrivées à échéance, respecte le kill-switch `crons_routiniers_actifs`
- Section "Études & Thèses" dans `/admin/emails` : deux accordions séparés (études / thèses), historique sent/cancelled, badge amber pour les pending avec bouton Annuler

### Feature — Études cliniques : flux validation admin (ex DMH)
- Ajout colonne `statut` (`en_attente` | `publie` | `refuse`) sur `etudes_cliniques`
- Les études créées par DigitalMedicalHub (DMH) passent désormais en `en_attente` (comme les questionnaires de thèse)
- `AdminEtudesThesesClient` refonte : 4 onglets (en attente / actives / archives / refusées), badges statut, "Publier" ouvre `PublishEmailModal`
- Page DMH `/mon-compte/etudes-cliniques` : badges statut (amber/vert/rouge)
- Planning `/admin/planning` : campagnes email `pending` visibles dans le calendrier (types `email_etude` et `email_questionnaire`)

### TODO — Mises à jour
- Marqué terminé : Programmer l'envoi des questionnaires de thèse ✅
- Marqué terminé : Préférences de notification — études cliniques par spécialité ✅

---

## [2026-05-03] — Planning éditorial + planification articles blog

### Feature — Planning éditorial /admin/planning
- Nouvelle page `/admin/planning` : calendrier 3 mois (grille CSS, lun-dim, français)
- Dots colorés par type : bleu = article, orange = newsletter
- Section "⚠ En attente de publication (heure passée)" en rouge pour les brouillons dont la date est dépassée
- Liste chronologique avec heure et badge type, lien direct vers l'éditeur
- Lien ajouté dans la sidebar admin (`CalendarDays`)

### Feature — Planification de publication d'article
- Colonne `scheduled_at timestamptz` ajoutée sur la table `articles` (migration SQL)
- Picker `datetime-local` dans `ArticleForm` — visible uniquement en mode brouillon, avec bouton Annuler
- Badge "Programmé · JJ MMM HH:MM" en orange dans la liste `/admin/blog`
- Cron `/api/cron/publier-articles-programmes` (toutes les heures via Vercel) : publie les articles dont `scheduled_at <= now()`, revalide les slugs et `/blog`
- Types Supabase régénérés après migration

### Feature — Espace éditeur (inscription + validation admin)
- Bouton "Créer un espace éditeur" ajouté dans `EditorCTA` (CTA homepage/solutions)
- Inscription `/inscription?type=editeur` → `/completer-profil` pré-sélectionné sur "Éditeur"
- Mode exercice "Éditeur" : masque spécialité, affiche dropdown éditeurs + solutions sans éditeur (ordre alphabétique)
- Option "Je ne trouve pas dans la liste" → champ texte libre
- Server action `createEditeurClaim` : crée une demande en attente dans `editeur_claims`
- Migration SQL : table `editeur_claims` (FK `editeur_id text` + `solution_id uuid`)
- Onglet "Demandes" dans `/admin/editeurs` avec badge compteur + approbation/rejet
- Badge "Demande éditeur" dans `/admin/utilisateurs` pour les comptes avec claim en attente
- Types Supabase régénérés après migration

### Fix — Callback confirmation email
- Cause : `/api/auth/callback` ne gérait que le param `code` (PKCE/OAuth), pas `token_hash`+`type=signup` (confirmation email)
- Résultat : clic sur le lien de confirmation → page erreur, malgré le compte bien créé
- Fix : branche `else if (token_hash && type)` avec `verifyOtp({ token_hash, type })`

### TODO — Mises à jour
- Marqué terminé : Planning éditorial — vue calendrier ✅
- Marqué terminé : Blog — Planification publication article ✅
- Marqué terminé : Espace éditeur — accès limité aux éditeurs existants ✅

---

## [2026-05-01] — Scoring évaluations, SLUGS_UTILITE → BDD, email account

### Fix — Bug silencieux : résultats agrégés non peuplés pour agenda/IA
- Cause 1 : `submitEvaluation()` ne peuplait jamais `resultats` — toutes les nouvelles évaluations (agenda, IA) étaient ignorées ; les 1200 lignes logiciels-métier venaient exclusivement de la migration Firebase
- Cause 2 : `updateResultat()` ignorait `statut` → scores `en_attente_psc` (PSC non confirmé) gonflaient les moyennes publiques
- Fix : nouvelle fonction `recalcResultatsPourSolution()` dans `src/lib/actions/evaluation.ts` — recalcul complet depuis `evaluations WHERE statut='publiee'` uniquement (Option B)
- `submitEvaluation()` appelle désormais `recalcResultatsPourSolution()` si `statut='publiee'`
- PSC callback (`src/app/api/auth/psc-callback/route.ts`) : appel aux 3 endroits de publication `en_attente_psc → publiee` (association PSC, compte email/mdp existant, évaluations anonymes liées par token)
- `updateResultat()` marqué `@deprecated` (conservé pour `submitScores()` devenu code mort)

### Refactor — SLUGS_UTILITE migré vers colonne BDD `label_fonctionnalites`
- SQL : `ALTER TABLE categories ADD COLUMN label_fonctionnalites text` + `UPDATE` pour les 2 catégories IA
- `SLUGS_UTILITE` et `CRITERE_LABELS_IA` supprimés de `src/lib/constants/criteres.ts`
- Signatures `getCritereLabels/getCritereLabel` : `categorieSlug?: string` → `labelFonctionnalites?: string | null`
- 4 call sites mis à jour : `ConfrereTestimonials.tsx`, `SolutionDetailPage.tsx`, `noter/[...slug]/page.tsx`
- `src/types/database.ts` restauré manuellement après corruption par `npx supabase` (CLI non installé localement) → `supabase@2.98.0` ajouté en devDependency pour éviter le problème à l'avenir

### Email — account.ts migré vers buildEmail()
- `deleteAccount()` : suppression de la substitution manuelle inline, utilise désormais `buildEmail('suppression_compte', { nom, prenom }, siteUrl)`

### TODO — Mises à jour
- Marqué terminé : bug statut évaluations ✅, SLUGS_UTILITE → BDD ✅, vérif `nom_capital` toutes catégories ✅, vérif `resultats` toutes catégories ✅, `account.ts` templates email ✅

---

## [2026-04-30] — Documentation scoring + flux auth + fix mobile cartes

### Docs — evaluation-scoring.md : couverture complète multi-catégories
- Nouvelle section "Système de questionnaires multi-catégories" : tables DB (`questionnaire_sections` + `questionnaire_questions`), champ `critere_majeur` par question, API `/api/questionnaire/[slug]` → `getSectionsForSlug()`
- Priorité DB > hardcodé documentée : `sectionsDB.length > 0 ? sectionsDB : getSectionsForCategorie()` (noter/page.tsx ~l.600)
- Table des préfixes de clés par catégorie (`detail_*`, `agenda_*`, `docai_*`, `ias_*`)
- Clarification `DETAIL_CRITERE_MAP` : utilisé **uniquement** dans `comparer/page.tsx` (vue détaillée comparateur), **jamais** dans le calcul de score
- Clarification `SLUGS_UTILITE` : cosmétique uniquement ("Fonctionnalités" → "Utilité" pour catégories IA)
- Commentaires ajoutés dans `criteres.ts` et `evaluations.ts` pour guider les contributeurs

### Docs — user-creation-flow.md : flux auth documenté
- Tables impliquées (`auth.users` vs `public.users`), responsabilités, lien entre les deux
- Flux 1 (email/mdp) et Flux 2 (PSC) : étapes, fonctions, fichiers, cas limites
- Schéma ASCII du parcours complet

### Fix — Mobile : cartes RecommendedSoftware (homepage)
- Cause : label "UTILISATEURS" (~72px) + étoiles + badge dépassent la largeur des cartes 2-colonnes (~131px utile) — badge débordait à droite
- Labels abrégés sur mobile (`sm:hidden`) : "Util." / "Réd.", texte complet sur sm+
- `RatingBadge` placé avant `StarRating` (badge = info critique, toujours visible) + `overflow-hidden min-w-0` sur conteneur droit

### TODO — Mises à jour
- Marqué terminé : "Documenter le flux de création utilisateur" ✅
- Marqué terminé : "Documenter le système questionnaire / scoring" (intégré dans `evaluation-scoring.md`) ✅

---

## [2026-04-29] — Auth email/mdp : confirmation, completer-profil, correction PSC

### Fix — /completer-profil : comportement PSC vs email/mdp unifié
- Champ mot de passe masqué pour les utilisateurs email/mdp (déjà défini à l'inscription)
- Email de contact en lecture seule pour les non-PSC (déjà confirmé via Supabase), texte "Adresse confirmée"
- `isValid` : password non requis pour `isFromPsc = false`
- `handleSubmit` : `password: isFromPsc ? password : undefined`, re-auth `signInWithPassword` conditionnelle PSC uniquement (évite un crash pour les email/mdp dont le password est vide à ce stade)

### Fix — /completer-profil : router.push → window.location après signInWithPassword
- Cause : `router.push` après une op auth échoue silencieusement — middleware voyait encore les vieux cookies PSC invalidés par `updateUserById`, profil PSC apparaissait vide à l'arrivée sur Mon compte
- Fix : `window.location.href`, suppression de `useRouter` devenu inutile

### Feature — Inscription : gestion email non confirmé
- `AuthProvider.signInWithEmail` : message explicite "Votre email n'est pas encore confirmé" quand Supabase retourne "Email not confirmed"
- Page `/inscription` : bouton "Renvoyer" affiché après inscription réussie avec confirmation requise — appelle `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`

### Supabase Dashboard (hors code)
- Redirect URLs : ajout de `http://localhost:3000/api/auth/callback` et `https://*.100000medecins.org/api/auth/callback` (nécessaires pour que Supabase accepte l'`emailRedirectTo` du signup)
- "Confirm email" activé (ON) — confirmation email obligatoire avant accès au site
- SMTP SendGrid confirmé déjà configuré (`smtp.sendgrid.net`, expéditeur `contact@100000medecins.org / 100 000 Médecins`)

### TODO — Mises à jour
- Rappel existant : MAJ templates Supabase natifs (confirm signup, change email) — priorité montée maintenant que "Confirm email" est activé

---

## [2026-04-28] — Assainissement architecture auth + corrections UX profil/inscription

### Fix — Navigation post-auth : window.location partout (règle architecturale)
- Cause racine identifiée : `router.push/replace` Next.js 14 App Router échoue silencieusement depuis les callbacks async post-auth — session établie, navigation ratée, page bloquée ou utilisateur redirigé vers `/`
- Fix systémique : toutes navigations post-auth migrent vers `window.location.href` / `window.location.replace` (navigation native navigateur, rechargement complet garanti)
- Suppression des `useEffect([user, loading])` dans `/connexion` et `/inscription` qui créaient des doubles navigations (useEffect + handler se déclenchant simultanément)
- Middleware (`middleware.ts` + `lib/supabase/middleware.ts`) : `/connexion` et `/inscription` ajoutés au matcher ; si déjà connecté → redirect serveur `/mon-compte/profil` (remplace proprement les useEffects supprimés)
- `docs/auth-navigation.md` créé : documentation des 7 flux d'auth, règle fondamentale, anti-patterns à ne jamais reproduire

### Fix PSC — /auth/psc-session encore bloquée malgré le timeout
- `router.replace` → `window.location.replace` dans `psc-session/page.tsx`
- Ajout de console.logs de diagnostic (token reçu, résultat verifyOtp, destination)
- Suppression de `useRouter` (plus nécessaire)

### Fix Inscription — Bouton "Se connecter" restait grisé après email existant
- `router.push` → `window.location.href` après `signInWithEmail` réussi
- L'erreur "Un compte existe déjà" n'est plus effacée avant l'await (évite le flip d'intitulé visible pendant le chargement)

### Feature Profil — Bouton "Enregistrer" désactivé si aucune modification
- `initialValuesRef` : snapshot des valeurs chargées depuis la BDD
- `isDirty` : comparaison en temps réel (nom, prénom, spécialité, mode d'exercice, avatar)
- Bouton grisé au chargement et immédiatement après chaque sauvegarde réussie
- Étoiles rouges `*` sur les 4 champs obligatoires (prénom, nom, spécialité, mode d'exercice)

---

## [2026-04-27] — Unification des notes + refonte visuelle (fond, hero, cartes)

### Fix — Unification source de notes (listing = page solution = hero)
- `getNotesUtilisateursGlobales` : filtre critères corrigé — requête 2 étapes via `nom_capital IS NOT NULL` au lieu de `parent_id IS NULL` (qui incluait nps/synthèse)
- `getAverageNoteUtilisateurs` : aligné sur le même filtre ; note lue depuis `resultats.moyenne_utilisateurs_base5` (cohérente avec listing et homepage)
- Page comparatif (`comparer/page.tsx`) : même filtre appliqué côté client
- Suppression du cache `.next/cache` nécessaire pour voir l'effet (ISR stale)

### Docs — Doctrine du système de notes établie
- `docs/evaluation-scoring.md` : tables "état actuel / état cible", règle fondamentale (note globale = moyenne des 5 critères affichés), statuts des corrections
- `docs/database-notes.md` : nettoyé, état des données confirmé (migration Firebase 0→5 terminée le 2026-04-12), plan d'action Phase 2

### UX / UI — Refonte visuelle pages solutions et index

#### SolutionHero — cartes de notes dans le cadre principal
- Les deux cartes (utilisateurs + rédaction) déplacées à l'intérieur du cadre blanc, à droite du logo/titre/description (plus de sidebar extérieure)
- Breadcrumb déplacé dans une fine bande blanche translucide sous la navbar (variante "default" lisible sur fond clair — bug contraste corrigé)
- Suppression de la constante `SVG_GRADIENT_BG` inutilisée (SolutionHero + SolutionDetailPage)

#### Index — section "Les logiciels les mieux notés" simplifiée
- Suppression du toggle "par vos collègues / par 100 000 Médecins"
- Chaque carte affiche désormais les deux notes (utilisateurs + rédaction)
- Tri par note utilisateurs par défaut (rédaction en fallback)

#### Fond de page bleuté + trame de points
- Fond body : `#D8E6F8` + points `rgba(59, 110, 195, 0.07)` à 28px
- `surface-light` → `#D8E6F8`, `surface-muted` → `#C6D5EE` (Tailwind)
- Classe utilitaire `bg-dots` créée et appliquée sur `RecommendedSoftware` et `BlogPreview`
- Gradient SVG opaque de `SolutionDetailPage` supprimé (fond dots visible)
- Hero : fondu bas corrigé (transparent coloré `rgba(15,30,56,0)` → pas de bande lumineuse grise)

### Email — Master layout centralisé + refonte système d'envoi
- `buildEmail(templateId, vars, siteUrl)` ajouté dans `emailTemplates.ts` : charge template + master_layout en parallèle, détecte `isFullDocument` pour la rétro-compatibilité, injecte `{{contenu}}`, remplace toutes les variables dans HTML et sujet
- 8 routes d'envoi migrées : `send-etude`, `send-lancement`, `send-questionnaire`, `test-relance-email`, `relance-evaluations`, `relance-incomplets`, `relance-psc`, `sendPasswordReset` dans `user.ts`
- Nouvelle route `/api/admin/test-email` : envoie n'importe quel template avec données fictives, destinataire par défaut `david.azerad@100000medecins.org`
- Admin → Emails : nouvel onglet "Template email" pour éditer/prévisualiser le `master_layout` ; bandeau excuse 23/04 supprimé
- `EmailTemplateEditor` : aperçu rendu final (layout + contenu composés), guard `isFullDocument` côté client, envoi de test avec destinataire modifiable
- Logo email réduit à 276px (85%) dans `baseTemplate.ts` et `newsletter-template.ts`
- `docs/email-architecture.md` mis à jour : table des 10 templates, section master layout, guide migration progressive, checklist ajout email

### UX / UI — Améliorations mobile listing et navbar
- Navbar mobile : accordion par groupe de catégories (premier groupe ouvert par défaut)
- `SolutionSortBar` : options mobile dédiées (Note utilisateurs en premier), refs simplifiées
- `SolutionList` : padding mobile réduit (`p-4 sm:p-6`), badge + étoiles plus petits
- `SolutionFilters` : alignement titre groupe corrigé (flex-wrap, items-start)
- Questionnaires thèses : bouton "Proposer" masqué en header mobile, pleine largeur en bas
- Listing : `SLUGS_SANS_NOTES_REDAC` hardcodé remplacé par le flag `has_note_redac` BDD

### TODO — Mises à jour
- Marqué terminé : "Fil d'Ariane — contraste insuffisant", "Cadre note de droite dans le cadre titre"
- Marqué terminé : "Visualiser les templates email depuis l'admin" (onglet Template email + éditeurs)
- Ajout : "Créer un design system pour le site" (UX / UI)
- Ajout : "MAJ templates Supabase natifs — cohérence visuelle avec le master layout"

---

## [2026-04-26] — Phase 2 corrections système de notation + identité RPPS PSC complète

### Fix TypeScript — Correction des erreurs de types (0 erreur npx tsc)
- 25+ fichiers : casts `(supabase as any)` pour les tables absentes du type auto-généré (`acronymes`, `actualites`, `solutions_favorites`, `etudes_cliniques`…)
- `startTransition` : wrapping `async () => { await fn() }` pour respecter la signature `void` attendue par React
- `mes-favoris/page.tsx`, `mes-preferences/page.tsx` : `.then(({ data }: { data: any })` pour éviter le `any` implicite sur les PromiseLike Supabase
- `profil/page.tsx` : réécriture de l'`useEffect` en `async/await` (`.catch()` inexistant sur `PromiseLike`)
- `client.ts` : `fn: () => Promise<any>` pour `LockFunc` (générique non assignable sinon)
- `KonamiGame.tsx` : cast `(gs.phase as Phase)` pour contourner le narrowing TypeScript

### Feature PSC — Règles de connexion et identité RPPS clarifiées

#### Dogme identité
- Un compte = un RPPS. Le RPPS est l'identifiant médical unique, défini lors de la première connexion PSC réussie.
- Avant connexion PSC : toutes les évaluations soumises par un compte email/mdp ont `statut = 'en_attente_psc'` → non visibles publiquement.
- Après connexion PSC : le RPPS est lié au compte, toutes les évals en attente passent à `statut = 'publiee'` → visibles.

#### 4 cas de figure couverts
1. **Connexion PSC classique** (nouveau compte ou reconnexion) : flow inchangé — lookup par RPPS puis email, création si absent.
2. **Compte email/mdp sans PSC** : banner bleu dans `/mon-compte/profil` expliquant l'impact sur la visibilité des évaluations, bouton "Connexion via PSC" passant le `userId` dans le state.
3. **Compte email/mdp + PSC (même RPPS)** : mode association — `psc-callback` reçoit `currentUserId` dans le state, associe le RPPS, publie les évals en attente, rafraîchit la session. Redirige vers `/mon-compte/profil?psc=associe`.
4. **Compte email/mdp + PSC (RPPS déjà sur un autre compte)** : détection conflit dans `psc-callback`, génération d'un token HMAC signé, redirection vers `/fusionner-compte?token=...`. L'utilisateur choisit l'email à conserver. Toutes les données (évals, favoris, solutions_utilisees) sont migrées vers le compte conservé, l'autre est supprimé.

#### Fichiers créés
- `src/lib/auth/fusionToken.ts` : `generateFusionToken` / `verifyFusionToken` — HMAC-SHA256, expiry 15 min, encodé en base64url pour passer en URL
- `src/lib/actions/merge.ts` : `getFusionDetails` (charge les 2 comptes pour l'UI) + `mergeAccounts` (migration, suppression compte source, magic link pour compte conservé)
- `src/app/fusionner-compte/page.tsx` : page de fusion avec sélecteur d'email, confirmation, redirection automatique via `/auth/psc-session`

#### Fichiers modifiés
- `src/lib/auth/psc.ts` : `connectWithPsc(options?)` — state 3-part `stateUuid|userId|verificationToken` (compatibilité descendante avec l'ancien format 2-part `stateUuid|token` de `psc-initier`)
- `src/app/api/auth/psc-callback/route.ts` : parsing state 3-part, branche "mode association" avant la recherche standard, publie les évals `en_attente_psc` du compte courant après association
- `src/lib/actions/evaluation.ts` : `finalizeEvaluation` et `submitEvaluation` vérifient `users.rpps` → `statut = 'publiee'` si RPPS présent, `'en_attente_psc'` sinon. Le lookup utilise le service role pour bypasser le RLS.
- `src/app/mon-compte/mes-evaluations/page.tsx` : banner orange + bouton PSC si l'utilisateur a des évals `en_attente_psc` et aucun RPPS (chargé en parallèle dans le `Promise.all`)
- `src/app/mon-compte/profil/page.tsx` : banner bleu si `!isFromPsc`, messages de succès `?psc=associe` et `?fusion=ok` lus depuis les searchParams

### Fix — Unification des sources de notes utilisateurs
- `computeEvalGroupAvg` : suppression de la détection Firebase/Supabase par présence de clés `detail_*` — les 47 évaluations sans sous-critères n'étaient plus divisées par 2 par erreur
- `getAverageNoteUtilisateurs` : remplace le recalcul depuis `evaluations.scores` (JSONB brut, buggé) par une lecture de `evaluations.moyenne_utilisateur` (valeur pré-calculée, cohérente avec listing et homepage)
- `computeAggregatedResultats` : même simplification pour le fallback (table `resultats` vide)
- Tri par défaut du listing catégorie : `'nom'` → `'note_utilisateurs'`
- Mode alpha : note masquée dans `SolutionList` (ne plus afficher la note rédaction quand tri = alphabétique)
- Admin : suppression de la ligne `evaluation_redac_note = null` dans `extractSolutionFromFormData` — le trigger Supabase gère ce champ, l'écraser à null à chaque save était un bug silencieux

### Nettoyage — Section "Dates et publication" supprimée de l'admin
- `SolutionForm.tsx` : suppression de la section "Dates et publication" (5 champs : date_publication, date_lancement, date_maj, date_debut, date_fin)
- `extractSolutionFromFormData` : retrait des 5 champs correspondants — ces dates ne sont pas utilisées sur le front public

### Infrastructure — Trigger SQL ajouté aux migrations
- `supabase/migrations/005_trigger_evaluation_redac_note.sql` : DDL du trigger `update_evaluation_redac_note` ajouté au repo pour reproductibilité (existait dans le Dashboard Supabase mais pas dans les fichiers)

### TODO — Mises à jour
- Marqués terminés : items Phase 2 dans "Consolidation BDD"
- Ajout : "Affichage des notes — vérifier comportement par statut" (tester en prod que `statut = null` = publié, `en_attente_psc` = masqué)

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
