# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## URGENT

_(rien en cours)_

---

## En cours

### Annuaire mutualisé — tranches 1, 2a et 2b faites (éteint en prod) ; essais de David et 2b-bis en attente (posé le 2026-10-06)

**Contexte** : chantier préparé dans le dépôt messagerie (`docs/annuaire-mutualise.md`, `annuaire-surspecialites.md`, `annuaire-cgu-confidentialite.md`). Plan de la tranche 1 validé par David le 06/10 : fiche dans Mon compte, invisible des autres ; administration des intitulés proposés ; suppression de compte étendue.

**Décisions** :
- Tables : `identites_psc` (preuve PSC écrite seulement par le callback, avec `code_profession`), `fiches_annuaire`, `fiches_annuaire_portables` (portable à part, jamais lisible directement par les autres), `intitules`, `fiches_intitules` ; GRANT explicites + RLS sur chacune.
- `psc-callback` et `merge.ts` modifiés, en plus de `account.ts` et `admin-users.ts`.
- Annuaire derrière un **interrupteur** plutôt qu'une branche longue (accord du 06/10) : travail directement sur `dev`. Interrupteur `annuaire_actif` dans `app_settings`, piloté depuis l'admin (ligne absente = éteint) ; pour les essais, `ANNUAIRE_FORCER_ACTIF=true` dans `.env.local` de chaque poste (jamais chez Vercel en Production).
- Sur le site : **médecins seulement**. Les autres professions pourront plus tard remplir leur fiche par l'application, stockée chez nous, sans accès par le site → adapter le jour J les CGU et la charte, qui disent « tous les professionnels connectés par PSC ».
- Catalogue, question 1 : pas de pratiques non conventionnelles **sauf « Hypnose médicale »**. Retirés : acupuncture, homéopathie, mésothérapie, médecine manuelle-ostéopathie (à rajouter si des médecins le demandent).
- Catalogue, question 2 : la rubrique s'appelle **« Compétences »** (pas « Surspécialités »), sans case « diplôme obtenu » ; mention « déclarées par le médecin, non vérifiées ». En base : `intitules.type = 'competence'`. Le jour J, remplacer « surspécialités » par « compétences » dans les CGU et la charte préparées.
- Catalogue, question 3 : niveau de détail **tel quel** (titres officiels + pratiques courantes déjà listées) ; les spécialistes compléteront par des propositions. **Combler** les 4 spécialités chirurgicales presque vides (neurochirurgie, chirurgie plastique, vasculaire, cardiaque et thoracique) : une dizaine d'intitulés.
- Catalogue, question 4 : ordre **alphabétique**, plafond de sécurité **20** compétences par médecin, nature (FST, capacité…) **ni affichée ni stockée**. Pas de redite avec la spécialité RPPS : un intitulé équivalent à la spécialité RPPS du médecin (DES ou option de DES) lui est **masqué** (colonne `intitules.specialites_sm`) ; la recherche du confrère porte sur la spécialité **et** les compétences.
- **Compétences et pathologies fusionnées** (06/10) : une seule liste « Compétences » (techniques, domaines, pathologies), `type = 'competence'` ; les « conditions d'exercice » (domicile, téléconsultation, secteur, langues…) viendront plus tard, `type = 'condition'`. Saisie et recherche par **champ de recherche** (libellé + synonymes, sans accents), pas de liste déroulante ; champ vide → compétences de la rubrique du médecin. Catalogue de départ : les 10 pathologies d'exemple, en synonymes quand une compétence les couvre déjà.
- Catalogue, question 5 : **David valide seul** dans `/admin/intitules` — Accepter, Reformuler, Fusionner comme synonyme, Refuser (refus = proposition supprimée). Chaque proposition apparaît dans le flux Activité et le résumé hebdomadaire. Côté médecin : badge « en attente » ; refusée → la pastille disparaît ; fusionnée → devient la compétence existante.

**Fait (tranche 1, en production mais éteinte)** : 5 tables + RLS ; catalogue (212 compétences, retouches dans `/admin/intitules?onglet=catalogue`) ; interrupteur (admin › Paramètres) ; preuve PSC écrite par le callback ; page « Ma fiche annuaire » ; administration des propositions ; suppression et fusion de compte ; étanchéité vérifiée ; essai réel de David (PSC BAS). Référence : `docs/2026-10-07-annuaire-tranche-1.md`.

**Tranche 2 — décisions du 08/10** : champs déclarés ville / code postal, adresse MSSanté, téléphone du cabinet ; portable 10 / jour / lecteur ; page `/annuaire` depuis Mon compte ; lecteurs = médecins avec preuve PSC, sans réciprocité ; recherche par localisation comme dans l'application ; **une seule chaîne de données ANS** pour l'application et le site. Proposition de synchronisation : `docs/2026-10-08-annuaire-tranche-2.md` — validée le 08/10 (localisation : ville saisie ou celle de sa fiche, sinon géolocalisation proposée ; script commun dans le dépôt messagerie ; ordre 2a puis 2b). Le jour J, ajouter à la charte : la ville saisie dans la recherche est envoyée au géocodeur de l'IGN.

**Tranche 2a (08/10)** : migration en base + code faits (`/annuaire`, fiche d'un confrère, portable plafonné, carte, coordonnées déclarées, Analytics exclu, purge du journal). Fusionnée dans `main` (éteinte) le 08/10 avec `b5c7764`. **Reste : essai réel par David** (deux identités PSC pour le plafond et le journal).

**Tranche 2b (08/10)** : tables `ans_*` + `annuaire_oppositions`, premier import (199 293 médecins, extraction du 04/10), recherche et fiches sur l'ANS, marqueur au cabinet, propositions dans Ma fiche, onglet Oppositions, recherche accélérée (2b-bis, mesurée). Fusionnée dans `main` (éteinte) le 08/10 avec `6002f31`.
- [ ] **David** : essai sur dev.100000medecins.org — recherche par nom, spécialité, compétence ; « Autour de moi » et rayons ; carte (marqueurs aux cabinets) ; fiche d'un confrère sans fiche (carte ANS seule) ; Ma fiche → « Utiliser » un lieu et une MSSanté ; onglet Oppositions (ajouter puis retirer un RPPS de test).
- [ ] **Messagerie** : exclure `annuaire_oppositions` de `annuaire.db` (base de l'application) ; import mensuel côté site : `npx tsx scripts/annuaire-import-ans.ts --execute` après reconstruction de la base.

**Tranche 3 — raccordement de l'application (10/10)** : décisions de David (identification par jeton PSC vérifié par le site, fiches téléchargées à chaque connexion, modification de sa fiche dans l'application, médecins seulement). Étapes 1 à 3 faites le 10/10 (annuaire rangé par RPPS, module serveur commun, adresses `/api/annuaire/app/…`, anciennes colonnes retirées ; essais 27/27 et 14/14), en production (éteint). Doc et contrat d'échange : `docs/2026-10-10-annuaire-tranche-3.md`.
- [ ] **David** : essai sur dev — Ma fiche (enregistrer, proposer une compétence), `/annuaire` (sa fiche visible, portable), admin Annuaire.
- [ ] Premier essai avec un vrai jeton PSC dès que l'application appelle `POST /api/annuaire/app/session` (sur dev).
- [ ] **Messagerie** : session au site après chaque validation PSC, téléchargement des fiches, fiche d'un confrère (badge, contact préféré, compétences, portable), recherche par compétence, écran « Ma fiche » — selon le contrat d'échange.

**Suite (à décider avec David)** :
- **Avant l'ouverture** : sauvegardes limitées à 12 mois ; CGU et charte (item ci-dessous, avec « médecins seulement » et « compétences ») ; la preuve PSC n'est écrite qu'annuaire allumé → chaque médecin devra se reconnecter une fois par PSC (ou backfill à étudier) ; fiche masquée à 24 mois sans connexion, effacée à 36 (`identites_psc.derniere_connexion_psc` est là pour ça).

### Relire les pages légales (posé le 2026-09-30)

**Contexte** : mentions légales créées, charte de confidentialité réécrite, charte de transparence remise sur sa version à jour (Next.js, code sur GitHub), qui avait été enregistrée par erreur dans `/rgpd` le 31/03. Rédaction Claude à partir du code et de la base, **pas un avis juridique**.

**À faire (David)** : relire en ligne `/mentions-legales`, `/rgpd` (Charte de confidentialité et cookies), `/cgu` et `/transparence`, et corriger via `/admin/pages` si besoin. Points repérés au passage :
- `/transparence` : « La première version **de 2001 à 2025** » (2021 ?) ; la liste annonce 5 axes dont « Déclarations publiques d'intérêts des représentants », sans section correspondante ; « aucune société tierce n'y a eu accès » à nuancer (Supabase héberge la base) ;
- `/cgu` art. 4 : « l'authentification s'effectue via Pro Santé Connect » alors que la connexion email / mot de passe existe aussi.

### ⏰ Le 2026-10-05 — Vérifier le premier lot automatique de sujets d'articles (posé le 2026-10-01)

**Contexte** : la génération de sujets passe en sorties structurées depuis le 2026-10-01 (fin du « JSON invalide »). Le cron hebdo `proposer-sujets-articles` n'a encore jamais tourné en prod ; premier passage lundi 5/10 à 9h15. La branche « actu » (avec recherche Tavily) n'a pas été testée en réel.

**À vérifier** : un lot de 3 sujets apparaît dans `/admin/blog`, l'email de notification est arrivé à `contact@`, et les sujets « actu » ont **des sources** (elles étaient toutes vides avant le fix). En cas d'échec, les logs Vercel `[ai:propositions-sujets]` donnent `stop_reason`, tokens, début et fin de la réponse. On peut aussi tester avant lundi via « Regénérer ».

### ⏰ Le 2026-10-07 — Lire l'entonnoir `/completer-profil` (posé le 2026-09-23)

**Contexte** : ~2/3 des inscrits PSC ne laissent jamais leur email (PSC ne le fournit pas → compte en `psc-{rpps}@psc.sante.fr`, et sans email on ne peut pas les relancer). Taux de complétion : ~12 % avant la refonte du 17/06, ~55 % juste après, redescendu à ~20-35 % depuis août. Pour 97 % d'entre eux l'écran n'a **déjà qu'un seul champ** (l'email, obligatoire) → ce n'est pas un problème de formulaire trop long.

**Livré le 2026-09-23** : mesure étape par étape dans `psc_session_events` (`completer_view` → `completer_email_input` → `completer_submit` → `completer_success`/`fusion`/`error`, reliées par `correlation_id` = une visite) + les 4 choix de notifications affichés sur l'écran pour donner une raison de laisser l'email.

**À faire** : demander à Claude la requête d'entonnoir, puis décider :
- beaucoup de `view` sans `email_input` → ils partent sans rien toucher : travailler l'accroche (bénéfice), pas la contrainte ;
- des `email_input` sans `submit` → friction à la saisie ;
- des `completer_error` → bug à corriger ;
- comparer le taux de complétion avant/après l'ajout des choix de notifications, et lire les choix faits (détail de `completer_success`).

### Réseaux sociaux et accès de la community manager — opérationnel ; reste la programmation (posé le 2026-10-08)

**Contexte** : accès « contenus » à l'admin, posts réseaux en base, panneau sur les articles et les vidéos (CHANGELOG des 08 et 09/10). **Validé de bout en bout le 10/10** sur LinkedIn, Facebook et Instagram.

**À faire (David)** :
- ~~**Make, branche LinkedIn** : « Create a Company Image Post » en Upload by link~~ ✅ fait par David le 09/10 : post LinkedIn arrivé **avec sa photo** (article Pro Santé Connect, `posts_reseaux` « envoye », sans lien localhost).
- ~~**Supprimer sur LinkedIn le post d'essai du 08/10**~~ ✅ supprimé par David le 09/10.
- ~~**Facebook et Instagram** : premier envoi avec le nouveau panneau~~ ✅ « fonctionne parfaitement » (David, 10/10).
- ~~**Vercel** : variable `ADMIN_CONTENU_PASSWORD`~~ ✅ fait et testé par David le 09/10.

**Programmation des posts — désactivée (décision de David, 2026-10-09)** : pas de `pg_cron` pour l'instant (méfiance après un envoi de masse involontaire par le passé). Le panneau ne propose que « Envoyer maintenant » ; le serveur refuse toute programmation. **Pour l'activer un jour** : (1) activer `pg_cron` et `pg_net` (Database › Extensions) ; (2) SQL : `delete from vault.secrets where name = 'cron_secret'`, `vault.create_secret('<CRON_SECRET>', 'cron_secret')`, `cron.schedule('envoyer-posts-reseaux', '*/5 * * * *', …net.http_get(…/api/cron/envoyer-posts-reseaux)… where exists (posts dus))` — texte complet dans le CHANGELOG du 2026-10-08 ; la tâche ne touche que `posts_reseaux`, aucun email ; (3) variable Vercel `POSTS_PROGRAMMATION_ACTIVE=true` + redéploiement ; (4) tester un post à +15 min.

---

## En attente / Idées

### Vidéo : dépôt dans l'admin → YouTube + publication native sur les réseaux (posé le 2026-10-08)
- **Prérequis** : Supabase **Pro** (25 $/mois : fichiers > 50 Mo, 100 Go de stockage, 250 Go de bande passante, et sauvegardes quotidiennes).
- **Décidé** : vidéos publiées en **publique** sur YouTube ; la lecture sur le site reste YouTube (pas d'hébergement des vidéos sur le site : bande passante, pas de lecture adaptée au débit).
- **Principe** : dans Vidéos, déposer le MP4 + titre + description → fichier envoyé directement du navigateur au stockage Supabase (bucket privé, adresse signée) → Make (module YouTube « Upload a Video ») le publie → Make rappelle le site, qui crée la fiche vidéo (lien, vignette) → le fichier reste disponible pour une publication **native** (LinkedIn « Create a Company Video Post », Facebook « Upload a Video », Instagram en Reel), puis suppression du fichier.
- **Pourquoi Make et pas l'API YouTube depuis le site** : une vidéo envoyée par un projet Google non audité est forcée en privé. Make propose public / non répertorié / privé, mais certains signalent des vidéos « Private (locked) » : tester sur une première vidéo.
- **Contraintes** : Instagram (Reel) veut du MP4 plutôt vertical, durée et poids limités (vérifier les chiffres à jour au moment de construire).

### Annuaire mutualisé — coller les CGU et la charte le jour du passage en prod (posé le 2026-10-05)

**Contexte** : l'annuaire mutualisé (fiche annuaire de chaque médecin dans Mon compte, lecture par les confrères connectés par Pro Santé Connect, puis l'application mobile) reste hors production jusqu'à la sortie de l'application (décision de David du 05/10). Les CGU et la charte (`/rgpd`) **complètes, propositions intégrées**, sont prêtes dans le dépôt messagerie : `C:\Users\david\Documents\100000Medecins_messagerie\docs\site-textes\` (`cgu-annuaire.html`, `rgpd-annuaire.html`, mode d'emploi `LISEZMOI.md`), établies à partir des textes en base le 05/10 (`cgu` du 28/03, `rgpd` du 30/09).

**À faire le jour du passage en prod** : vérifier que le code remplit les six conditions du `LISEZMOI.md` (sauvegardes limitées à 12 mois — `scripts/backup-supabase.ps1` garde aujourd'hui une archive par mois sans fin ; suppression de compte étendue aux tables de l'annuaire ; journal des affichages de portables purgé à 12 mois ; pas de Vercel Analytics sur l'annuaire ; mention « Informations déclarées par le médecin, non vérifiées » ; source ANS affichée), puis coller les deux textes via `/admin/pages` → « </> HTML ». Si `/cgu` ou `/rgpd` ont changé depuis le 05/10 : redemander une version à Claude (dépôt messagerie). Décidé le 05/10 : un médecin ne peut pas savoir qui a affiché son portable (rien à ajouter au texte).

### Contenu des questionnaires

#### Durée d'utilisation non déclarée sur les évaluations anciennes (2026-09-02)
- Depuis le fix du 2026-09-02, la fiche solution n'affiche la durée d'utilisation que si le médecin l'a **réellement déclarée**. **665 évaluations** (Firebase d'avant l'ajout de la question) n'ont rien de déclaré → plus aucune mention sous leur nom, ce qui est honnête mais appauvrit ces témoignages.
- **À étudier** : faire reposer la question par le flux de **reconfirmation d'évaluation** (relance « votre avis est-il toujours d'actualité ? »), qui est déjà le seul moment où ces médecins repassent sur leur éval. Rien à migrer en base : la donnée n'existe nulle part, elle ne peut que venir d'eux.

### Sécurité

#### Droits d'écriture des tables exposées à l'API — 2ᵉ passage (posé le 2026-10-06)
- **Contexte** : correctif `users` / `evaluations` du 06/10 (CHANGELOG) — les droits Supabase par défaut donnent tout à `anon`/`authenticated`, et une règle « sa propre ligne » sans restriction de colonne laisse modifier des colonnes sensibles.
- **À revoir** : `questionnaires_these` (une insertion directe peut-elle poser un statut publié et contourner la modération ?), `editeur_claims` et `propositions_utilisateurs` (statut libre), `solutions_utilisees`. Méthode : relever ce que le site écrit avec les droits de l'utilisateur, retirer le reste.
- **Vérifier (Claude)** qu'une évaluation a bien été enregistrée après le SQL (après le 2026-10-06 20:25 UTC) : 0 au 07/10 à 9 h, nuit comprise (~2 évaluations/jour en moyenne). Les écritures passent par `service_role`, intact.
- ~~Fusionner dans `main` les correctifs du 06/10 et du 07/10~~ ✅ fait le 2026-10-07 (`e6a3243`), vérifié en production.
- ~~Actions serveur — revue d'accès~~ ✅ faite le 2026-10-08 (17 actions admin protégées, cf. CHANGELOG). **Fusionner dans `main`**.
- ~~DMH : limiter à ses propres études~~ ✅ fait le 2026-10-08 (décision de David).
- **Formulaires publics — anti-abus** (vu le 08/10) : l'évaluation anonyme (`submitEvaluationAnonyme`) envoie un email à l'adresse saisie sans Turnstile ; `checkEmailExists` révèle si une adresse a un compte. Ajouter Turnstile (déjà utilisé à l'inscription) et voir si `checkEmailExists` est encore utile.
- ~~Fusionner dans `main` le correctif `admin-users.ts`~~ ✅ fait le 2026-10-08 (`bb41b77`), vérifié.
- **⏰ Vers le 2026-10-22 — Connexion PSC : décider le blocage CSRF** (contrôle posé le 08/10, en mesure). Demander à Claude la répartition des `state_check` (`ok` / `absent` / `different`) dans `psc_session_events` depuis la mise en production. Si `absent` et `different` sont nuls ou isolés → poser `PSC_ETAT_STRICT=true` dans Vercel (Production et Preview) et redéployer. Si `absent` est fréquent → les retours e-CPS changent de navigateur : chercher une autre preuve avant de bloquer.
- ~~**Connexion PSC — protection CSRF absente** (vu le 07/10)~~ → contrôle posé le 08/10, cf. ci-dessus. Détail d'origine : le cookie `psc_state` est posé par `connectWithPsc` / `psc-initier` mais jamais comparé au `state` au retour. Un tiers peut faire aboutir dans le navigateur d'un médecin une connexion PSC qu'il a lui-même lancée (connexion sur le compte du tiers). Ajouter la comparaison, en vérifiant que le cookie survit bien au passage par l'application e-CPS (cf. CLAUDE.md : cookies plutôt que sessionStorage pour cette raison).

### Sauvegardes de la base

#### Supervision + archivage mensuel — livré le 2026-08-05, branché le 2026-08-19, restes mineurs
- **Contexte de l'incident** : les dumps tournaient bien (tous les 3-4 jours, tâche `Backup Supabase 100KMed` sur le desktop `MSF-MG1`), mais leur **réplication Synology vers le portable s'est arrêtée du 28 juin au 5 août** sans qu'aucun signal ne le révèle. Découvert par hasard. Rappel : Supabase est en plan **Free** → aucune sauvegarde côté serveur, le dump local est le seul filet.
- **Livré (code)** : `scripts/backup-supabase.ps1` versionné dans le repo (source de vérité unique), archive mensuelle hors rotation, route `/api/backup-ping`, cron quotidien `/api/cron/verif-backup` (alerte email si le dernier dump dépasse 8 jours).
- ✅ **Fait (2026-08-06)** : migration SQL `backup_pings` jouée (table + index, RLS active **sans policy** = inaccessible hors `service_role`, comme `activity_log`), `src/types/database.ts` régénéré, `BACKUP_PING_SECRET` posé dans Vercel.
- 🔒 **Durcissement optionnel (non urgent)** — SQL à lancer par David dans le SQL Editor : `REVOKE ALL ON public.backup_pings FROM anon, authenticated;` (droits de table inutiles, la RLS sans policy bloque déjà toute ligne).
- ✅ Copie périmée du script hors repo : **absente du laptop (AzertyPC)** au 2026-09-24. Reste à vérifier sur le desktop (MSF-MG1).

### Communication

#### Informer l'ISNAR de la question e-CPF « médecins juniors » (2026-07-20)
- Envoyer un mail à l'**ISNAR** (syndicat des internes) pour les informer que 100 000 Médecins a **ajouté une question sur la gestion de la carte e-CPF** (Carte de Professionnel en Formation) dans les questionnaires, à destination des remplaçants/internes. Cf. question livrée le 2026-07-08 (`tt_ecpf_remplacant` / `detail_ecpf_junior`).

#### Contacter les créateurs de contenu pour la section tutos / articles / vidéos
- **Whydoc** — intégration vidéos/stories
- Objectif : associer ces créateurs à la section tutos, articles et vidéos stories de la plateforme

#### Peupler les prix et coordonnées des éditeurs (2026-06-04)
- **Contexte** : nouveau module tarification livré (cf CHANGELOG 2026-06-04) mais peu de prix renseignés en BDD pour le moment. Le toggle global « Afficher les prix sur le site » est OFF tant qu'une masse critique n'est pas atteinte.
- **Coordonnées éditeurs** : le bloc « Contacts commerciaux » est désormais masqué par défaut (toggle OFF dans `/admin/parametres`) car beaucoup de coordonnées en BDD sont incorrectes ou inappropriées. À nettoyer + compléter pour pouvoir réactiver le toggle.
- **À faire** : demander à Agathe si elle veut s'en charger (collecte auprès des éditeurs des prix officiels + coordonnées commerciales + support à jour). Une fois la base à jour, activer les 2 toggles dans `/admin/parametres`.
- **MAJ 2026-07-22** : les contacts sont désormais **multiples** (plusieurs commerciaux/support par solution, cf CHANGELOG). ✅ **Toggle commercial réactivé (global, 2026-07-23)** — l'item « Contacts multiples — suites » est clos (archivé le 2026-07-26). Reste ici la **collecte** des coordonnées/prix à jour (Agathe, cf. ci-dessus).

#### Vidéos par solution — étendre la découverte YouTube
- **Acquis (2026-05-24)** : plomberie complète livrée — table `video_solutions` (M-N) avec RLS, script `scripts/discover-videos-youtube.mjs` avec filtres (lang fr, durée ≥ 60s, vues ≥ 100, date < 5 ans, blacklist termes dev, bonus mots pro-santé), galerie publique des fiches solutions affiche automatiquement les vidéos validées, admin a panneaux symétriques côté vidéo (multi-select solutions) et côté solution (chips vidéos), badges 🎬 dans le panel propositions à modérer.
- **Smoke test 2026-05-24** : 8 vidéos importées sur Doctolib agenda, validation manuelle dans `/admin/videos` (panel propositions). Quelques vidéos hors-sujet identifiées (chaîne « Mediia » génère du contenu IA générique qui mentionne Doctolib sans en être le sujet).
- **Étape suivante — étendre aux autres solutions Agendas** : relancer le script sur Maiia, Keldoc, Clickdoc, Mondocteur et les autres solutions actives de la catégorie. Commande type :
  ```bash
  node scripts/discover-videos-youtube.mjs --solution-name=maiia --max=8 --dry-run
  # puis sans --dry-run + --yes une fois la sélection OK
  ```
- **Étape d'après — étendre aux autres catégories** : Logiciels métier, IA Scribes, Téléconsultation, etc. Adapter peut-être la requête pour ces catégories (`"<nom>" logiciel médical` plutôt que `"<nom>" agenda`).
- **Améliorations possibles du scoring** (à voir après plusieurs runs) :
  - Blacklist par chaîne YouTube (pas seulement par mot-clé) : `Mediia` semble produire des vidéos qui matchent mais ne sont pas sur la solution recherchée.
  - Bonus si la chaîne YouTube = chaîne officielle de la solution (ex. chaîne `Doctolib` officielle).
  - Détecter les comparatifs (`X vs Y`) et lier automatiquement aux deux solutions via `video_solutions` plutôt que de réimporter.
- **Cas du doublon** : une même URL YouTube partagée par plusieurs solutions (ex. comparatif). Le script saute aujourd'hui les URLs déjà en BDD (SELECT + `continue`), donc le rattachement à la 2e solution se fait manuellement via le panneau "Vidéos liées" de la fiche solution admin. Évolution possible : si l'URL existe déjà, ajouter juste un nouveau lien `video_solutions` au lieu de skip.

### Nettoyage

#### `publishArticle` revalide la mauvaise URL (vu le 2026-09-30)
- Le bouton « Publier » du panneau réseaux sociaux ([SocialPanel](src/components/admin/SocialPanel.tsx)) appelle `publishArticle`, qui revalide `/blog/${id}` (l'UUID) au lieu de `/blog/${slug}`, et pas l'accueil. Effet : la page de l'article et l'aperçu blog de l'accueil peuvent attendre jusqu'à 1 h (expiration ISR) avant de refléter la publication. Correctif de 2 lignes (relire le slug, revalider `/blog/${slug}` et `/`), comme `updateArticle` le fait depuis le 2026-09-30.

#### Nettoyage progressif des ~270 erreurs ESLint préexistantes — règle CLAUDE.md active
- **État 2026-05-25** : règle « migration au fil de l'eau » ajoutée dans [CLAUDE.md](CLAUDE.md) → les `as any` typables seront nettoyés automatiquement quand je touche les fichiers concernés pour d'autres raisons.
- **Pas un sujet de fiabilité** : `tsc --noEmit` passe, `next build` passe, le site tourne.
- **Cause principale** : schema drift (`actualites`, `documents` absentes des types Supabase auto-générés) → contournement légitime via `as any`. Le vrai remède = régénérer `src/types/database.ts` (`npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts`), pas du typage manuel.
- **Pas de chantier dédié prévu** sauf si un jour on veut un lint propre en CI.

#### Couper définitivement le cordon Firebase — EN COURS (2026-07-26)
- ✅ **Fait (code, 2026-07-26)** : `firebase-admin` désinstallé (−160 packages) ; **16 scripts** important `firebase-admin` supprimés ; **0 import résiduel** dans `src/` ; `npm run build` vert.
- ✅ **Backup exporté avant coupure** : `evaluations_firebase_backup` (679 lignes) → `firebase-final-backup/…json` (1,26 Mo, gitignoré — **local à ce poste**, à copier vers une archive durable si besoin cross-machine).
- ⏳ **Reste (DDL, David)** : `DROP TABLE public.evaluations_firebase_backup;` puis régénérer `src/types/database.ts`.
- ⏳ **Côté Google (quand tu veux, sans urgence — coût nul)** : **résilier le projet Firebase** + révoquer le service-account `medecins-7a4ed-firebase-adminsdk-*.json`.

### UX / UI

#### Tooltip note globale — affiner après la livraison initiale (2026-05-30)

- **Livré (2026-05-30)** : tooltip cliquable à côté de la note globale sur chaque fiche solution (popover au survol + modale au clic), éditable depuis `/admin/pages` → « Tooltip — Note globale des solutions ».
- **À retravailler (2026-06-04)** : refaire le texte de la modale d'information (titre + corps) à côté de la note globale sur les pages solutions. Le texte actuel est à revoir avant éventuelle réactivation de la modale via le nouveau toggle `modale_active` dans l'admin (livré 2026-06-04). Pour rappel, la modale est désormais désactivable par défaut depuis `/admin/pages` → « Tooltip — Note globale des solutions ».

#### Extraire des composants UI partagés (mini design system pragmatique)
- **Constat** : 7 valeurs de `rounded-*` (348× xl, 279× lg, 168× card, 72× button, 69× 2xl…), 10 variations de padding pour des boutons « primaire » (42× `px-4 py-2`, 23× `px-7 py-3`…), 4 styles de badges concurrents, 10 fichiers qui redéclarent `inputClass` inline, 10 fichiers avec leur propre overlay `fixed inset-0 bg-black/`.
- **Phase 0 livrée (2026-05-24)** : dossier `src/components/ui/` créé, conventions tokens validées dans [src/components/ui/README.md](src/components/ui/README.md) (radius = `rounded-card` 16px et `rounded-button` 12px ; primaire = `bg-navy`, secondaire = `bg-accent-blue`).
- **Phase 1 livrée (2026-05-25)** : `<Button>` étendu (l'existant a été enrichi, pas remplacé — 14 usages publics conservés). Nouveaux props : `size` (sm/md/lg, défaut lg), `loading` (spinner + disabled), `leftIcon`/`rightIcon`, `fullWidth`, support de tous les attrs HTML. Nouveaux variants : `secondary` (bg-accent-blue), `danger` (bg-red-500). **15 fichiers migrés** : 5 formulaires admin (Video/Editeur/Categorie/Partenaire/Article) + AdminLoginForm + BlogForm + SolutionForm + PropositionForm + 5 pages admin (categories/editeurs/solutions/pages/pages-nouveau) + page mon-compte/proposer/video. Tous les boutons `px-7 py-3.5 rounded-button bg-navy` sont migrés.
- **Phase 2 livrée (2026-05-25)** : `<Badge>` créé (variants info/warning/success/danger/neutral/dark × sizes sm/md, avec `dot`, `leftIcon`/`rightIcon`, `onClick`). 3 fichiers migrés : `etudes-cliniques/_public.tsx`, `questionnaires-these/page.tsx`, `VideosPendingPanel.tsx`. **Reste à migrer au fil de l'eau** : ~30 occurrences de chips `bg-*-50 text-*-700 border border-*-200` dans d'autres composants.
- **Phase 3 livrée (2026-05-25)** : `<Input>`, `<Textarea>`, `<Select>`, `<Field>` créés dans `src/components/ui/`. `<Input>` et `<Textarea>` partagent une fonction `buildInputClasses()` exportée (cohérence du style). `<Select>` rend un `<select>` natif avec chevron SVG inline. `<Field>` = wrapper label + hint + error. 6 formulaires migrés : `PartenaireForm` (complet), `CategorieForm` (complet), `EditeurForm` (2 fields démo), `BlogForm` (complet, 6 fields), `ArticleForm` (4 fields principaux), `VideoForm` (complet).
- **Phase 4 livrée (2026-05-25)** : `<Modal>` composé créé (`<Modal>`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>`). Gère pour toi : ESC pour fermer, clic backdrop (opt-out via `closeOnBackdropClick={false}`), scroll body bloqué, `aria-modal`. 4 tailles (sm/md/lg/xl). 3 modales migrées : `DeleteAccountModal` (pattern composé complet avec Footer), `ProposeCommunauteModal` (mode libre avec header custom), `PublishEmailModal` (juste l'overlay externe — contenu interne préservé). **Reste à migrer** : ~9 autres modales (`SolutionGallery` carousel/zoom, `ArticleForm`, `BlogForm`, `EmailTemplateEditor`, `LancementSyndicatsManager`, `AdminEmailsClient`, `NewslettersClient`, `etudes-cliniques/_public`, `questionnaires-these/page`).
- **Phase 5 livrée (2026-05-25)** : `<Card>` créé ([src/components/ui/Card.tsx](src/components/ui/Card.tsx)). Props : `padding` (none/sm/md/lg/xl), `hoverable` (cards cliquables), `overflow` (hidden/visible), forward de tous les attrs HTML standards. 4 fichiers migrés en démo. **Reste à migrer** : ~87 autres usages de `bg-white rounded-card shadow-card`.
- **Toutes les phases sont livrées** ✅ — règle « migration au fil de l'eau » active dans [CLAUDE.md](CLAUDE.md) (section « Design system — composants UI à utiliser »). Les ~87 cards, ~10 modales et ~11 inputs inline restants seront migrés automatiquement quand je touche les fichiers pour d'autres raisons. Pas de chantier dédié.
- **Primitives étendues (2026-09-02)** : `<Button size="icon">` (carré 32px rond, seule taille qui bascule le radius en `rounded-full`) et `<Select fullWidth={false}>` (largeur naturelle au lieu de `w-full`). Les deux existent parce qu'une classe passée en `className` **ne peut pas** l'emporter sur une classe de base — Tailwind arbitre par l'ordre dans la feuille générée. **À migrer au fil de l'eau** : les boutons ronds encore en Tailwind brut de `CitationCarousel` et `SolutionGallery`.
- **Méthode** : composant **extrait d'abord**, **remplacé ensuite** au fil de l'eau dans les fichiers qu'on touche pour d'autres raisons. Pas de big-bang.
- **Pas dans le scope** : Storybook, doc formelle — pas de valeur tant qu'on est seul à coder.

### Espace éditeur

_(rien en cours)_

### Performance

#### ⚠️ Passer Vercel Pro AVANT la campagne de rentrée (décidé le 2026-08-08)
- **Décision** : ne pas basculer maintenant (59 % projeté, marge confortable en régime normal), **mais basculer avant l'envoi aux syndicats**.
- **Pourquoi** : sur Hobby, dépassement = **mise en pause du site**, pas un throttle. Une campagne réussie multiplie les **conversions** (inscriptions + évaluations = le chemin CPU coûteux ; les lectures de pages sont absorbées par l'ISR) → ×1,7 de marge ne suffit plus sur un pic de quelques jours.
- **Coût** : 20 $/mois/siège. L'Active CPU on-demand `iad1` = 0,128 $/CPU-heure → ~0,40 $/mois de compute à ce volume, absorbé par le crédit d'usage Pro. **C'est une prime d'assurance anti-downtime, pas une facture de calcul.**
- Réversible : on peut redescendre en Hobby après la campagne si le trafic retombe.

### SEO / Référencement

#### Sitemap — statut GSC « Impossible de récupérer » collant (contournement déployé 2026-07-20)
- **Serveur 100 % sain** (vérifié en Googlebot le 2026-07-20) : `/sitemap.xml` **et** `/sitemap-main.xml` = HTTP 200, `application/xml`, **240 URLs**, ~0,5 s, ISR (helper partagé `getSitemapEntries`, repli try/catch → jamais de 5xx). `robots.txt` déclare les deux.
- **Problème = côté GSC, pas le site** : `/sitemap.xml` bloqué depuis > 2 mois sur « Impossible de récupérer » (« Dernière lecture » VIDE) = état collant hérité d'un échec initial (mi-juin). L'outil « Tester l'URL active » plante aussi chez GSC (« Un problème est survenu »). **Non bloquant** : les pages sont indexées par crawl direct.
- **Contournement déployé (2026-07-20, commit `cc38782`)** : nouvelle URL `/sitemap-main.xml` (même contenu, **entité GSC vierge** sans historique d'échec) + déclarée dans `robots.txt`.
- ✅ **`sitemap-main.xml` soumis dans GSC (2026-07-21)** → surveiller que l'entrée neuve passe « lu ». Optionnel : supprimer l'ancienne entrée `/sitemap.xml` bloquée. Patience (2-4 sem).
- 🆕 **6ᵉ tentative déployée (~2026-08-16/17, commit `7da3424`)** : le statut traîne depuis le **27/05** et a survécu à 5 tentatives. Diagnostic verrouillé — serveur, DNS et réseau **hors de cause** (65/65 réponses 200 en Googlebot, XML sans BOM, 240 URLs identiques entre les deux sitemaps, gzip/304 OK, ni DNSSEC ni AAAA, pare-feu Vercel sans Bot Protection). **Seul paramètre jamais modifié en 5 tentatives : le TYPE de document** → nouvelle route `/sitemap-index.xml` servant un `<sitemapindex>` (les deux autres sont des `<urlset>`), déclarée en 3ᵉ entrée de `robots.ts`. Détail : [docs/2026-08-16-diagnostic-sitemap-gsc.md](docs/2026-08-16-diagnostic-sitemap-gsc.md).
- 🔒 **Critère d'ARRÊT à appliquer à la prochaine lecture GSC** : index **lu** mais enfant en échec → le blocage vise le `<urlset>` ; index **en échec aussi** → blocage au niveau de la **propriété GSC**, plus rien à tenter côté code, **on clôt le sujet**. Élaguer les entrées `Sitemap` de `robots.ts` dès qu'une passe en « Réussite ».
- ⚠️ **Trou de doc** : cette session n'a **pas d'entrée au CHANGELOG** (seulement le commit et le doc dédié).
- ✅ **`dev.*` déréférencé (vérifié 2026-07-21)** : `site:dev.100000medecins.org` sur Google = « Aucun document ». Blocage durable en place (robots Disallow + noindex). Revérif passive occasionnelle.

### Mises à jour techniques

#### Réduire le cached egress Supabase sous 5 GB avant le 6 août 2026 (Fair Use Policy) [✅ SOUS CONTRÔLE — vérifié 20/07 : 17 %]
- **Contexte** : mail Supabase (org `100KMED` / `sdljuyadmxlyjtsrvvrq`) — le **cached egress** dépasse le quota Free (**5 GB/mois inclus**, tolérance ~5,5 GB). **Fair Use Policy applicable au 6 août 2026** ; au-delà, restrictions possibles. Ce n'est pas une fuite : **aucun pipeline d'images**. Détail complet + chiffres + arbitrage Pro : [docs/2026-07-08-optimisation-egress-supabase.md](docs/2026-07-08-optimisation-egress-supabase.md).
- **Cause (vérifiée)** : ~170 `<img src>` (84 fichiers) pointent en direct sur le Storage en **pleine résolution, non optimisé** ; seuls 4 fichiers utilisent `next/image` et `next.config.mjs` n'a pas de section `images`. L'endpoint d'upload stockait tel quel jusqu'à 5 Mo, sans compression ni `cacheControl`.
- **Audit BDD (2026-07-08) — ce que le Storage sert** : **132 captures galerie** (`solutions_galerie`, bucket `media`, PNG pleine réso — **1er poste**) + **79 avatars** + 70 logos solutions + 29 logos éditeurs + 7 images catégories (sur la home) + 7 logos partenaires. Buckets : `media`, `images`, `avatars`. (Les 113 logos solutions/éditeurs « externes » sont déjà hors Supabase.)
- ✅ **Fait (2026-07-08/09)** — code commité sur `dev` **+ recompression exécutée** : `media` −81 % (72,7→13,6 Mo), `images` −90 % (24→2,3 Mo), `avatars` déjà légers (rien à gagner). Originaux dans `storage-backups/` (gitignored). ⚠️ `cacheControl` ignoré par l'endpoint public (sert `no-cache`) — impact faible (ETag→304), cf. doc. Code :
  - **`scripts/optimize-storage-images.ts`** — recompresse en WebP l'existant d'un bucket, ré-uploadé **sous le même chemin** (⇒ **aucune URL à changer en base**). Dry-run par défaut, `--execute` requis, backup binaire des originaux + `manifest.json` avant écriture, GIF/SVG ignorés.
  - **`src/app/api/upload/route.ts`** patché — tout nouvel upload raster → resize ≤1600px + WebP q80 + `cacheControl` 1 an. GIF (logo animé email) / SVG conservés intacts. (`sharp` tourne en runtime Node, la route n'est pas `edge`.)
- **Reste à faire** (recompression images + **patch upload : FAITS & déployés** — merge `dev→main` `a8f255a` du 08/07, `sharp`/WebP confirmés dans `main:upload/route.ts`) : **(b) ✅ Vérifié le 2026-07-20** — nouveau cycle (12/07→12/08) à J+8 : **cached egress 0,857/5 Go = 17 %** (vs 131 % avant le fix), egress total 23 %. Projection plein cycle ~3,3 Go → confortablement sous 5 Go. Le fix a marché ; le bandeau « grace period jusqu'au 06/08 » concerne l'**ancien** cycle. *(Le 131 % au 11/07 = un mois d'images non optimisées cumulées AVANT le fix, qui franchit le seuil en fin de cycle ; ce n'est ni un bug de comptage ni notre travail — recompression + `getNbNotes` réduisent l'egress. **Grâce jusqu'au 06/08**, aucune restriction d'ici là. Vérifier aussi le détail journalier : régulier = trafic images / pic 08-09/07 = script de recompression one-shot.)* ; **(c) passer Pro UNIQUEMENT si** encore > 5 Go après un cycle complet post-optimisation (vrai signal de trafic). Le swap avatars→`public/` est **abandonné** (79 en base vs 48 fichiers ; les avatars sont déjà minuscules). Détail/historique des étapes ci-dessous :
  1. **Dry-run** (lecture seule, sans risque) pour les vrais Mo avant/après :
     ```bash
     npx tsx scripts/optimize-storage-images.ts             # bucket media
     npx tsx scripts/optimize-storage-images.ts --bucket images
     ```
     WebP sur des PNG = **−60 à −80 %** ; comme les captures dominent l'egress, ça seul devrait repasser sous 5 GB.
  2. Si gains OK → **`--execute`** sur `media` puis `images`. **Déployer** le patch upload (sinon la compression à l'upload ne prend pas effet).
  3. **Basculer les 48 avatars stock vers `public/`** (fichiers déjà dans `public/images/portraits/avatar-N.png`) — meilleur ratio (vus sur tous les avis). ⚠️ **AVANT** : vérifier qu'une URL locale s'affiche en prod (`https://<domaine>/images/portraits/avatar-1.png` — historiquement `/images/*` renvoyait un 404, raison de la bascule initiale vers Storage) **et** qu'aucun email ne rend d'avatar (chemin relatif = cassé hors site). SQL :
     ```sql
     -- Dry-run : contrôler la correspondance
     select url, '/images/portraits/' || regexp_replace(url, '^.*/', '') as nouvelle_url
     from avatars where user_id is null and url like '%/avatars/portraits/avatar-%';
     -- Bascule (après vérif)
     update avatars set url = '/images/portraits/' || regexp_replace(url, '^.*/', '')
     where user_id is null and url like '%/avatars/portraits/avatar-%';
     ```
  4. *(Optionnel, priorité basse)* logos syndicats du « mot du président » (`pages_statiques.metadata`, page `qui-sommes-nous`) → `/images/syndicats/*.png` (déjà dans `public/`). Le footer/home utilisent déjà les chemins locaux ([src/lib/data.ts](src/lib/data.ts)).
- **Arbitrage plan Pro** : passer Pro **juste pour l'egress = traiter le symptôme** (sans optimisation, ça remonte avec le trafic + surplus 0,09 $/GB sur images non optimisées). Free (5 GB) → Pro (~25 $/mois, **250 GB egress**, backups quotidiens auto, fin de la pause après inactivité, +DB/compute). **Reco : faire l'optimisation d'abord** (gratuit, utile même en Pro — perf/SEO/coûts), **puis** décider Pro sur ses bénéfices propres (surtout backups quotidiens vs notre backup **hebდo manuel** via `/backup`) et la trajectoire de trafic — pas sous la pression du mail. **Ce mail n'est donc PAS en soi « la raison qu'on attendait » pour Pro** ; il l'est seulement si les autres bénéfices Pro nous intéressaient déjà.
- **Optionnel plus tard** : brancher `next/image` (`remotePatterns` Supabase) → Vercel sert du WebP redimensionné depuis son CDN (egress Supabase ÷ nb visiteurs, mais consomme les quotas d'optimisation Vercel) ; vérifier les logs Storage (écarter bot/scraper/hotlinking).

#### Vulnérabilités npm restantes
- **État 2026-05-23 (post-`npm audit fix`)** : 12 vulnérabilités — 11 moderate, 1 high. `ws` + `protobufjs` + 1 transitive ont été résolus le 2026-05-23.
- **État 2026-06-06** : `xlsx` désinstallé (vulnérabilité high éliminée) + `xlsx-js-style` désinstallé en préventif. Audit npm : **12 moderate, 0 high**. Cf CHANGELOG 2026-06-06.
- **12 moderate restantes** : toute la chaîne `uuid` / `@google-cloud/storage` / `@google-cloud/firestore` / `gaxios` / `google-gax` / `teeny-request` / `retry-request` / `firebase-admin`. **Partira automatiquement** quand on désinstallera `firebase-admin` (cf. item Nettoyage « Couper le cordon Firebase », prévu ~2 mois post-prod).
- **✅ 2026-07-26 (coupure Firebase + `npm audit fix` NON-`--force` appliqué)** : chaîne firebase disparue ; fix appliqué → **critique `tar` + highs fixables (axios, ws, form-data, js-yaml, linkify-it, next patches) résolus**, **build vert, AUCUNE dép directe changée** (que des patches transitifs dans `package-lock`). **Reste 6 packages uniques** (le « 22 » du compte npm est par-chemin, gonflé) :
  - `esbuild` (low, dev-only) — correctif non-force théorique mais bloqué par un parent, négligeable.
  - **5 en `--force` UNIQUEMENT = BREAKING → NE PAS FAIRE** : `postcss` (→ downgrade **next@9.3.3** ⚠️ catastrophe), `uuid` (→ downgrade **exceljs@3.4.0**, annule la migration xlsx→exceljs), `sharp` (→0.35.3 ; **seul vrai enjeu prod** : parsing d'images uploadées libvips — upgrade dédié + test `/api/upload` un jour), `@anthropic-ai/sdk` (→0.115), `brace-expansion` (→eslint@10).
  - **Confirmation** : `--force` est bien destructeur (next 16→9). Rien de plus à faire sans chantier de MAJ dédié.
- ⚠️ **NE JAMAIS utiliser `npm audit fix --force`** — breaking changes silencieux (downgraderait Next 16 → 9).

### Supervision admin — notifications d'activité du site

_(rien en cours)_

### Déploiement final

#### Relance PSC — interrupteur séparé (en production depuis le 2026-10-09, `6cb56be`)
- Dans Admin → Emails : envoyer un test du modèle « Relance vérification PSC » et le relire, puis allumer « Relance PSC ».
- Effet attendu : ~116 relances le premier lundi vers 11 h, selon la date d'activation (126 évaluations en attente au 09/10, dont les 34 MedGPT, gardées par décision de David), puis une par semaine, 4 au plus.
- À vérifier au premier envoi : les liens du mail doivent pointer vers `www.100000medecins.org`. L'adresse est tirée de l'appel de Vercel ; on peut la voir dans le récapitulatif « [Activité] » du lundi.

#### ⚠️ Kill-switch emails routiniers — à activer maintenant que le site est en prod
- Dans **Admin → Emails** (sur https://www.100000medecins.org/admin/emails), activer le toggle "Emails routiniers"
- Le switch est actuellement OFF (vérifié en base le 2026-09-24 : `site_config.crons_routiniers_actifs = false`)
- **Tant qu'il est OFF** : aucune relance évaluation / newsletter ne partira (la relance PSC a son propre interrupteur depuis le 2026-10-09)
- **À corriger avant de l'activer** (vu le 2026-10-09) :
  - le lien « revalider en un clic » ([revalider-avis](src/app/api/revalider-avis/route.ts)) agit dès l'ouverture (GET, jeton sans expiration) : les antivirus des messageries qui suivent les liens revalideraient des avis à la place des médecins → page de confirmation avec bouton ;
  - 499 destinataires, dont ~27 seulement se sont connectés au nouveau site ; objet « Votre avis a 1 an » alors que 148 avis datent de 2023 ; 249 reçoivent un « Rappel » qui renvoie au mail parti par erreur le 23/04.
- **Avant d'activer (2026-09-24)** :
  1. Déployer en prod le correctif « adresse d'envoi » (merge `dev` → `main`) ;
  2. Lancer `npx tsx scripts/fix-users-email-psc.ts --execute` (175 comptes : vrai email saisi mais `users.email` resté en `psc-…`) ;
  3. Supprimer le brouillon de newsletter d'**avril** dans `/admin/newsletters` (sinon rappel quotidien à `contact@`).
- **Volume attendu** (recompté le 2026-10-09) : 527 rappels de revalidation en retard (499 destinataires) → **100/jour** grâce au plafond, donc ~6 jours ; le lundi +19 relances d'évals incomplètes. Ensuite 5 à 15 rappels par mois, et les ~500 reviennent tous les 3 mois tant qu'ils ne revalident pas. Détail : [docs/2026-10-09-etude-inscriptions-connexions-emails.md](docs/2026-10-09-etude-inscriptions-connexions-emails.md).

#### ⚠️ Newsletter : l'envoi ne toucherait que 1 000 inscrits sur 6 545 (constaté le 2026-09-24)
- `send-newsletter`, `send-infos-mensuels` et le cron `envoyer-newsletter-programmee` lisent les opt-in sans pagination → Supabase plafonne à **1 000 lignes**. Puis `.in('id', …)` avec 1 000 uuid dans l'URL risque d'échouer, et 6 500 envois séquentiels dépasseraient la durée max d'une fonction Vercel.
- **Aucune newsletter n'est jamais partie** → aucun dégât. À corriger **avant la première** (pagination + envoi par lots, via l'API batch SendGrid ou un cron qui avance par tranches).

### Nouvelles catégories de solutions (en cours)

#### Affichage des prix — plomberie livrée, remplissage en cours
- **Plomberie livrée 2026-06-04** : helpers `src/lib/prix.ts`, table `app_settings` + toggle `/admin/parametres` (OFF par défaut), bloc Tarification fiche solution, indicateur €/€€/€€€/€€€€ + tri, colonne « Prix » + filtre admin, aperçu éditeur.
- **En cours** : remplissage des prix par les éditeurs — **mails envoyés**. 24 solutions ont déjà un vrai prix au 2026-06-20 (scraping abandonné : sources tierces contradictoires/périmées).
- **Reste** : une fois la masse critique atteinte, **activer le toggle** dans `/admin/parametres` + retirer le badge « Bientôt affiché sur le site » (`src/app/mon-compte/mon-espace-editeur/page.tsx`).

---

### Sauvegardes hors site — bucket européen
- Aujourd'hui les dumps ne vivent que sur les postes Windows + le NAS : un sinistre au domicile (incendie, vol, ransomware qui chiffre le NAS monté) emporte tout. Il manque une copie **hors site**.
- Cible : une GitHub Action planifiée qui `pg_dump` et pousse vers un bucket **européen** (Scaleway ou OVH object storage, hébergement français, quelques centimes/mois, rétention illimitée). L'Action supprime au passage la dépendance à un PC allumé.
- ⚠️ **Écarté : les artifacts GitHub comme destination** — le dump contient les nom, prénom, RPPS, email et évaluations nominatives de ~6 300 professionnels de santé. Les stocker chez GitHub (États-Unis) ajoute un transfert de données de santé vers un sous-traitant américain, dans un service qui n'est pas fait pour ça, avec une rétention plafonnée à 90 jours. Décision du 2026-08-05.
- À cadrer : fournisseur, chiffrement au repos (`age` / `gpg` avant upload), politique de rétention, où stocker la clé de déchiffrement.

### Thèmes alternatifs du site
- Implémenter un système de thème global switchable (CSS variables ou Tailwind config)
- Version "Pinky" : palette rose/violet
- Version "Dark" : mode sombre complet

### Obsolescence des notes (pondération temporelle)
- Les avis anciens devraient peser moins que les récents dans le calcul des notes globales
- Piste 1 — decay côté SQL : score pondéré = note × exp(-λ × ancienneté_en_jours), λ réglable (ex. 0.001 → demi-vie ~700 jours)
- Piste 2 — fenêtre glissante : ne compter que les avis des N derniers mois (ex. 24 mois), afficher l'avertissement « basé sur X avis récents »
- Piste 3 — badge "note ancienne" : si la dernière évaluation date de plus de 18 mois, afficher un indicateur visuel sur la fiche solution
- À décider : seuil de decay, affichage ou non du détail dans l'UI, impact sur le classement de la page comparatif

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
