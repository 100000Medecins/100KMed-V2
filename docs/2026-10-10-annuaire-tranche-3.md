# Annuaire — tranche 3 : raccordement de l'application au site

## Décisions de David (09-10/10)

1. **Identification (option A)** : le site ouvre des adresses réservées à l'application ; elle y présente son
   jeton PSC (obtenu par le relais), le site le fait vérifier par PSC (`userinfo`), contrôle le client émetteur,
   et rend un jeton du site (30 min). Pas de compte site pour les utilisateurs de l'application. Le client PSC
   du relais n'est pas celui du site en production : voir « Environnement et client PSC » dans le contrat.
2. **Fiches téléchargées à chaque connexion** (pas dans le fichier mensuel `annuaire.db`) : un médecin qui
   dépublie disparaît à la connexion suivante. Sans les portables.
3. **Modification de sa fiche dans l'application** (pas seulement un lien vers le site).
4. **Lecteurs : médecins seulement** pour l'instant (comme sur le site). *Remplacé le 17/11 : l'application
   s'ouvre à toutes les professions de santé, le site reste aux médecins (voir « Ajout du 17/11 »).*
5. Suppression d'un compte du site : la fiche annuaire part avec lui, y compris pour l'application (inchangé).

## Conséquence : l'annuaire rangé par RPPS

Une fiche appartenait à un compte du site (`user_id`). Un médecin qui n'utilise que l'application n'en a pas :
les tables de l'annuaire passent au RPPS. **Le reste du site garde `user_id`** (comptes, profil, évaluations,
`users` non touchée).

La base est partagée par la production et `dev` : une migration s'applique tout de suite au code en production,
qui utilise `user_id` sur ces tables même annuaire éteint (suppression de compte par le médecin et par l'admin,
fusion de comptes). D'où trois temps :

1. **Ajout** (fait le 10/10) : colonnes RPPS à côté de `user_id`, passerelles qui gardent les deux remplies ;
   le code en production continue tel quel.
2. **Nouveau code** sur `dev` (fonctions de lecture par RPPS, module serveur commun au site et à l'application,
   adresses de l'application), essais, fusion dans `main` avec l'accord de David.
3. **Retrait** de `user_id` des tables de fiches et des passerelles, seulement après le passage de la production
   au nouveau code.

## Étape 1 — migration d'ajout (lancée par David le 10/10, vérifiée)

- `identites_psc` : clé primaire `rpps` (11 chiffres, contrôlé) ; `user_id` facultatif et unique ; colonnes
  `nom`, `prenom`, `specialite_code` (remplies par PSC à l'étape 2).
- `fiches_annuaire`, `fiches_annuaire_portables`, `fiches_intitules` : colonne `rpps` (clé primaire, clés
  étrangères en cascade) ; `user_id` gardé, unique, rempli.
- `intitules.propose_par_rpps` ; journal des portables : `lecteur_rpps`, `consulte_rpps` (+ index).
- Passerelles (déclencheurs `annuaire_cles`, `annuaire_suivre_compte`) : `user_id` ↔ `rpps` toujours remplis ;
  un compte qui change de RPPS rattaché (fusion) emmène ses fiches.
- Plafond de 20 compétences compté par RPPS.
- Constat après migration : clés en place, 0 clé manquante, 1 fiche et 3 compétences cohérentes.
- Code : types régénérés ; les insertions du site fournissent le RPPS (exigé par les types ; la passerelle le
  remplirait de toute façon).

### Retour arrière de l'étape 1

Valable tant qu'aucune fiche n'existe sans compte du site (`user_id` vide).

```sql
begin;
drop trigger annuaire_suivre_compte on public.identites_psc;
drop trigger annuaire_cles on public.annuaire_affichages_portables;
drop trigger annuaire_cles on public.fiches_intitules;
drop trigger annuaire_cles on public.fiches_annuaire_portables;
drop trigger annuaire_cles on public.fiches_annuaire;
drop function public.annuaire_suivre_compte();
drop function public.annuaire_completer_journal();
drop function public.annuaire_completer_cles();

create or replace function public.annuaire_limiter_competences()
returns trigger language plpgsql set search_path to '' as $function$
begin
  if (select count(*) from public.fiches_intitules where user_id = new.user_id) >= 20 then
    raise exception 'Une fiche compte au plus 20 compétences.' using errcode = 'check_violation';
  end if;
  return new;
end $function$;

drop index public.annuaire_affichages_lecteur_rpps_idx;
alter table public.annuaire_affichages_portables drop column lecteur_rpps, drop column consulte_rpps;
alter table public.annuaire_affichages_portables alter column lecteur_id set not null, alter column consulte_id set not null;
alter table public.intitules drop column propose_par_rpps;

alter table public.fiches_intitules drop constraint fiches_intitules_rpps_fkey, drop constraint fiches_intitules_pkey,
  drop constraint fiches_intitules_user_intitule_key;
alter table public.fiches_intitules alter column user_id set not null;
alter table public.fiches_intitules add constraint fiches_intitules_pkey primary key (user_id, intitule_id);
alter table public.fiches_intitules drop column rpps;

alter table public.fiches_annuaire_portables drop constraint fiches_annuaire_portables_rpps_fkey,
  drop constraint fiches_annuaire_portables_pkey, drop constraint fiches_annuaire_portables_user_id_key;
alter table public.fiches_annuaire_portables alter column user_id set not null;
alter table public.fiches_annuaire_portables add constraint fiches_annuaire_portables_pkey primary key (user_id);
alter table public.fiches_annuaire_portables drop column rpps;

alter table public.fiches_annuaire drop constraint fiches_annuaire_rpps_fkey, drop constraint fiches_annuaire_pkey,
  drop constraint fiches_annuaire_user_id_key;
alter table public.fiches_annuaire alter column user_id set not null;
alter table public.fiches_annuaire add constraint fiches_annuaire_pkey primary key (user_id);
alter table public.fiches_annuaire drop column rpps;

alter table public.identites_psc drop constraint identites_psc_pkey, drop constraint identites_psc_rpps_format,
  drop constraint identites_psc_user_id_key;
alter table public.identites_psc alter column user_id set not null;
alter table public.identites_psc add constraint identites_psc_pkey primary key (user_id);
alter table public.identites_psc add constraint identites_psc_rpps_key unique (rpps);
alter table public.identites_psc drop column nom, drop column prenom, drop column specialite_code;

alter table public.fiches_annuaire add constraint fiches_annuaire_user_id_fkey
  foreign key (user_id) references public.identites_psc (user_id) on update cascade on delete cascade;
alter table public.fiches_annuaire_portables add constraint fiches_annuaire_portables_user_id_fkey
  foreign key (user_id) references public.fiches_annuaire (user_id) on update cascade on delete cascade;
alter table public.fiches_intitules add constraint fiches_intitules_user_id_fkey
  foreign key (user_id) references public.fiches_annuaire (user_id) on update cascade on delete cascade;
commit;
```

## Étape 2 — faite (10/10)

- **Migration** (lancée par David, vérifiée) : `annuaire_filtres`, `annuaire_rechercher`, `annuaire_fiche` lisent
  les fiches par RPPS (nom et spécialité de l'identité PSC, à défaut du compte du site), fiches sans compte du
  site comprises ; `annuaire_portable_pour(lecteur, rpps)` (serveur seulement) porte la logique du portable,
  plafond et journal par RPPS ; `annuaire_afficher_portable` (site) l'appelle avec le RPPS du lecteur connecté.
  Mêmes signatures et droits ; `annuaire_compter` inchangée. Retour arrière : définitions 2b-ter, puis
  `drop function public.annuaire_portable_pour(text, text);`.
- **Code** : module serveur commun [fiche-serveur.ts](../src/lib/annuaire/fiche-serveur.ts) (lire, enregistrer,
  proposer, supprimer une fiche par RPPS, catalogue, propositions de l'Annuaire Santé), utilisé par « Ma fiche »
  du site et par l'application ; preuve PSC écrite par RPPS avec nom, prénom, spécialité
  ([identite-psc.ts](../src/lib/annuaire/identite-psc.ts)) ; suppression et fusion de comptes par RPPS
  ([compte.ts](../src/lib/annuaire/compte.ts)) ; auteur des propositions par RPPS dans l'admin ; identification
  de l'application ([app-session.ts](../src/lib/annuaire/app-session.ts)) et ses adresses
  (`src/app/api/annuaire/app/`).
- **Essai local** (build de production, faux PSC d'essai, deux médecins fictifs 99900000001 / 99900000002) :
  27 vérifications sur 27 (détail dans le CHANGELOG du 10/10), journal des portables contrôlé en base ; données
  d'essai effacées.
- Écritures directes depuis le navigateur (règles RLS par `user_id`) : plus utilisées par le site, retirées à
  l'étape 3.

## Étape 3 — faite (10/10)

- Préalables : suppression et fusion de comptes éprouvées sur trois comptes de test (14 / 14, données effacées) ;
  production passée au nouveau code (`9c97175`).
- **Migration de retrait** (lancée par David, vérifiée) : passerelles supprimées ; règles RLS des tables de
  fiches supprimées et droits de `authenticated` retirés (le site passe par le serveur) ; règle de lecture des
  intitulés réduite aux validés ; `user_id` retiré des tables de fiches, `intitules.propose_par` retiré ; journal
  des portables par RPPS seulement (`lecteur_rpps` / `consulte_rpps` obligatoires, liés à `identites_psc` en
  cascade : le journal part avec l'identité) ; `annuaire_portable_pour` n'écrit plus que les RPPS.
- État final : l'annuaire est rangé par RPPS ; `identites_psc.user_id` reste le seul lien (facultatif) avec un
  compte du site. Types régénérés.
- Vérifié après migration : essai de l'application 27 / 27, essai des comptes 14 / 14 ; base revenue à 1 identité,
  1 fiche, 3 compétences.
- Retour arrière : pas de retour simple (les `user_id` des fiches se recalculeraient depuis `identites_psc`).

## Premier essai réel de l'application (10/10, 14:36) : client PSC

- `POST /api/annuaire/app/session` contre `dev` → `401 jeton_psc_autre_client`.
- **Cause** : le site comparait `azp` à son propre client PSC (`NEXT_PUBLIC_PSC_CLIENT_ID`). Au bac à sable, le
  site et le relais partagent le même client, d'où des essais locaux verts ; en production, le relais a le sien
  (`100000medecins-100000medecins-org`, enregistré par PSC le 09/10), distinct de celui du site
  (`100000medecins`).
- **Correctif** : `verifierJetonPsc` compare `azp` au client de l'application pour l'environnement PSC du site
  (tableau du contrat ci-dessous). Le message de refus cite le client attendu. Le client du site n'est pas
  accepté en plus sur ces adresses (choix confirmé par David le 10/10).
- **Identifiant de production recoupé** : c'est la valeur de `PSC_PROD_CLIENT_ID` dans le `.env` du dépôt
  messagerie.
- **Vérifié** (fonction appelée directement, faux `userinfo` local, rien écrit en base), dans les deux
  environnements, 16 / 16 : client de l'application accepté ; client de l'application de l'autre environnement,
  client du site en production, client inconnu et `azp` absent refusés avant tout appel à PSC ; refus d'un autre
  émetteur, d'un jeton expiré et d'un jeton refusé par PSC inchangés.
- **Deuxième essai de l'application (10/10, 17:15) : session ouverte** avec un vrai jeton du relais de
  production (flux CIBA, scopes `openid scope_all`). Textes d'accord lus, `GET /fiches` rendu (1 fiche, 212
  compétences), réouverture de session après un `401 jeton_invalide` provoqué.
- **`userinfo` rend bien l'identité pour ces jetons** (lu en base le 10/10) : la ligne `identites_psc` du médecin
  de l'essai porte profession `10`, spécialité `SM53`, nom et prénom, avec une dernière connexion à 18:17 (heure
  de Paris). Aucune connexion PSC au site à cette heure (`psc_session_events`, dernière à 17:33) : cette écriture
  vient d'une session de l'application, qui remplace ces champs par ce que PSC rend (vide si absent).
- **Reste une faiblesse du code, sans effet constaté** : une profession absente n'est pas refusée (seule une
  profession présente et différente de `10` l'est). PSC la rend aujourd'hui ; si un jour il ne la rendait plus,
  la règle « médecins seulement » ne s'appliquerait plus à l'application.

## Ajout du 15/10 : « accepte de nouveaux patients » (généralistes)

Demande de David : demander au médecin généraliste s'il accepte de nouveaux patients comme médecin traitant, et
le montrer aux confrères (site et application). Ajout **rétrocompatible** au contrat : l'application actuelle
continue de fonctionner sans changement.

- **Généralistes** = spécialité PSC (`identites_psc.specialite_code`, donnée par PSC à la dernière ouverture de
  session) **SM26** « Qualifié en Médecine générale », **SM53** « Spécialiste en Médecine générale », **SM54**
  « Médecine générale » : les trois codes de médecine générale de la nomenclature des spécialités ordinales (ANS,
  TRE-R38). Liste dans [constants/annuaire.ts](../src/lib/constants/annuaire.ts)
  (`SPECIALITES_MEDECINE_GENERALE`).
- Trois états : oui (`true`), non (`false`), non renseigné (`null`, par défaut). Déclaration du médecin, non
  vérifiée, comme le reste de la fiche.
- **Date de la dernière réponse** : remise au jour à chaque enregistrement qui contient la réponse, même identique
  (une confirmation date aussi) ; effacée avec « non renseigné ».
- Visible comme le reste de la fiche : seulement si elle est publiée, des seuls médecins connectés par PSC.
- Réponse envoyée pour un non-généraliste : **ignorée** (le reste de la fiche est enregistré, la réponse reste
  inchangée). Décision de David du 15/10, plutôt qu'un refus de tout l'enregistrement.
- Base (migration du 15/10, lancée par David) : `fiches_annuaire.nouveaux_patients` (booléen) et
  `nouveaux_patients_le` (date et heure), contrainte « les deux vides ou les deux remplis ». Droits inchangés
  (seul le serveur écrit les fiches).
- Fonctions du site (migration B du 16/10, lancée par David) : `annuaire_filtres`, `annuaire_compter` et
  `annuaire_rechercher` prennent `p_nouveaux_patients` (filtre seulement si `true` : fiches publiées qui ont
  répondu « oui ») ; `annuaire_fiche` rend `nouveaux_patients` et `nouveaux_patients_le`. Mêmes droits qu'avant
  (`annuaire_filtres` : serveur seulement ; les trois autres : `authenticated` et `service_role`). Retour arrière :
  `drop` des quatre fonctions (signatures avec `boolean`), puis recréer celles de l'archive en fin de document et
  reposer les mêmes droits sur les anciennes signatures.

## Ajout du 17/11 : l'annuaire de l'application ouvert à toutes les professions de santé

Décisions de David (17/11), consigne de la session messagerie (`docs/prompt-site-2026-11-17-toutes-professions.md`
du dépôt messagerie). Ajouts **rétrocompatibles** : l'application installée continue de marcher (elle ignore
`code_profession` et `professions`).

1. « 100 000 Messages » s'ouvre à **toutes les professions de santé** (infirmiers, kinés, pharmaciens,
   sages-femmes, dentistes, orthophonistes…) : toutes ont un RPPS et une e-CPS.
2. **Fiches vues de tous les professionnels connectés** par PSC depuis l'application ; chacun remplit sa « Ma fiche »
   **depuis l'application**.
3. **Le site reste réservé aux médecins** : connexion PSC du site inchangée (`psc-callback`, refus des non-médecins),
   pas de compte du site pour les autres professions ; seule l'API de l'application s'ouvre, et elle n'écrit que la
   ligne `identites_psc` du RPPS (RPPS, nom, prénom, profession, spécialité PSC).
4. **Fiches déjà publiées** : pas de nouvel accord demandé ; elles deviennent visibles de tous les professionnels
   connectés. Nouveaux textes d'accord, version `2026-11-17` (un accord donné sous l'ancienne version reste daté de
   son jour).
5. **« Accepte de nouveaux patients »** : généralistes seulement, inchangé.
6. **Catalogue par profession** : `intitules.professions` (codes RPPS, nomenclature TRE_G15 ; `{10}` par défaut).
   Catalogue de départ rédigé par la session messagerie (118 intitulés nouveaux pour 12 professions, 37 intitulés
   des médecins ouverts à d'autres professions) : `scripts/data/annuaire-catalogue-professions.json`, versé par
   [annuaire-catalogue-professions.ts](../scripts/annuaire-catalogue-professions.ts) (contrôle des doublons contre
   la base avant écriture).

Codes de profession (vérifiés dans l'extraction RPPS du 10/10, `PROFESSIONS_SANTE` dans
[constants/annuaire.ts](../src/lib/constants/annuaire.ts)) : `10` Médecin, `21` Pharmacien, `40` Chirurgien-dentiste,
`50` Sage-femme, `60` Infirmier, `70` Masseur-kinésithérapeute, `80` Pédicure-podologue, `91` Orthophoniste,
`92` Orthoptiste, `93` Psychologue, `94` Ergothérapeute, `95` Diététicien, `96` Psychomotricien. Une identité sans
profession (PSC ne la donne pas) est traitée en médecin, comme avant.

**Règles**
- « Ma fiche » (application et site) ne propose que les intitulés validés **dont `professions` contient la profession
  du professionnel**, plus ses propres propositions. Le site, réservé aux médecins, ne propose que ceux des médecins.
- Une compétence ajoutée doit être de ce catalogue (sinon `422`) ; une compétence **déjà cochée** reste acceptée
  même si l'association a retiré depuis la profession de l'intitulé (elle n'est simplement plus proposée).
- Proposer : `existant` seulement si l'intitulé est dans le catalogue du professionnel. Un intitulé de même nom
  qui n'existe que pour d'autres professions devient une **proposition** (`professions` = la profession du
  proposant), que l'association valide en **fusionnant** avec l'intitulé existant (qui s'ouvre alors à cette
  profession) ou en l'acceptant. Unicité du libellé : **entre compétences validées seulement**.
- `GET /fiches` : catalogue **entier** (toutes professions), pour que la recherche par compétence trouve tous ceux
  qui la déclarent.
- Portable : même plafond et même journal ; tout professionnel connecté peut afficher un portable depuis
  l'application. Sur le site, le contrôle « médecins » reste (`annuaire_lecteur_autorise`).
- Site : une fiche d'une autre profession apparaît dans la recherche, la carte et la fiche d'un confrère avec **sa
  profession** à la place de la spécialité ; « Dr » devant le nom des médecins, pharmaciens et chirurgiens-dentistes
  seulement (décision de David). La recherche par compétence du site utilise aussi le catalogue entier.
- Admin (`/admin/intitules`) : professions de chaque compétence visibles et modifiables, filtre par profession,
  choix des professions à l'ajout ; une proposition montre la profession de son auteur et, si une compétence
  validée porte le même nom, « Fusionner » est présélectionné pour l'ouvrir à cette profession.

**Base (migration du 17/11, lancée par David)** : `intitules.professions text[] not null default '{10}'` (contrôle :
codes à deux chiffres) ; index unique du libellé limité aux compétences validées ; `annuaire_portable_pour` accepte
tout lecteur présent dans `identites_psc` ; `annuaire_filtres`, `annuaire_rechercher` et `annuaire_fiche` rendent
`code_profession` (profession de l'auteur d'une fiche, vide pour un médecin de l'Annuaire Santé sans fiche). Mêmes
droits qu'avant. Retour arrière : archive en fin de document.

## Contrat d'échange avec l'application (pour la session messagerie)

### Principes

- **Toutes les professions de santé** depuis le 17/11 (avant : médecins seulement). Le code
  `403 profession_non_admise` reste au contrat pour le jour où une profession serait exclue ; il n'est plus rendu
  aujourd'hui.
- **Identité = RPPS à 11 chiffres** (le site retire le « 8 » de l'identifiant national).
- **Fiches téléchargées à chaque session** (`GET /fiches`), jamais gardées au-delà de la session suivante : un
  médecin qui dépublie disparaît à la connexion suivante de ses confrères.
- **Le portable n'est dans aucun fichier** : `GET /fiches` dit seulement `portable_disponible` ; le numéro
  s'obtient fiche par fiche (`POST /portable`), à la demande explicite du médecin, plafonné et tracé ; ne pas le
  conserver (affichage seulement).
- **Accords** : l'application affiche au médecin les textes d'accord rendus par le site (`accord.publication`,
  `accord.portable`) et renvoie `accord_version` quand elle publie la fiche ou rend le portable visible. Si les
  textes ont changé : `409 accord_perime` → afficher les nouveaux.
- **Environnement et client PSC** : le site n'accepte que les jetons PSC de **son** environnement (émetteur
  `iss`) émis pour le **client PSC de l'application** (`azp`), c'est-à-dire celui du relais de la messagerie
  (service « Messagerie 100000Médecins », flux CIBA). Ce n'est pas le client du site : en production ils sont
  distincts, et un jeton émis pour le client du site y est refusé (`401 jeton_psc_autre_client`).

  | Environnement PSC | Sites | `iss` attendu | `azp` attendu (application) | Client du site |
  |---|---|---|---|---|
  | production | `www.100000medecins.org`, `dev.100000medecins.org` | `https://auth.esw.esante.gouv.fr/auth/realms/esante-wallet` | `100000medecins-100000medecins-org` | `100000medecins` |
  | bac à sable | poste local de David | `https://auth.bas.psc.esante.gouv.fr/auth/realms/esante-wallet` | `100000medecins-100000medecins-org-bas` | le même |

  Les deux identifiants sont écrits dans [app-session.ts](../src/lib/annuaire/app-session.ts)
  (`CLIENT_PSC_APPLICATION`) et choisis par `NEXT_PUBLIC_PSC_ENV` : aucune variable à poser chez Vercel. Si PSC
  change l'identifiant du relais, le corriger là. Tant que l'annuaire est éteint sur www, toutes les adresses y
  répondent `404 annuaire_ferme` ; `dev` l'a allumé.

### Adresses

Base : `https://<site>/api/annuaire/app`. Réponses JSON, `Cache-Control: no-store`. Erreurs :
`{ "erreur": "<code>", "detail": "<phrase lisible>" }`.

**`POST /session`** — en-tête `Authorization: Bearer <jeton d'accès PSC>` (celui que le relais remet à
l'application, `SessionRelais.jetonPourConnexion`). Réponse `200` :

```json
{ "jeton": "v1.…", "expire_dans": 1800, "rpps": "10100394740",
  "accord": { "version": "2026-11-17", "publication": "Je publie ma fiche…", "portable": "Je rends mon portable…" } }
```

Textes d'accord depuis le 17/11 (version `2026-11-17`) : « Je publie ma fiche dans l’annuaire, visible des seuls
professionnels de santé connectés par Pro Santé Connect. » et « Je rends mon portable visible des professionnels de
santé connectés par Pro Santé Connect, à la demande, fiche par fiche. » L'application affiche ceux que le site rend.

Erreurs : `401 jeton_psc_absent | jeton_psc_illisible | jeton_psc_autre_client | jeton_psc_autre_environnement |
jeton_psc_expire | jeton_psc_refuse`, `403 rpps_absent | profession_non_admise` (ce dernier plus rendu depuis le
17/11), `502 psc_indisponible` (réessayer), `404 annuaire_ferme`. Le site enregistre la preuve PSC (nom, prénom,
profession, spécialité) et met à jour la date de dernière connexion. Rouvrir une session (nouveau jeton PSC) avant
l'expiration ou sur `401 jeton_invalide`.

Toutes les autres adresses : `Authorization: Bearer <jeton du site>`. Erreurs communes :
`401 jeton_invalide | identite_inconnue`, `403 profession_non_admise` (plus rendu depuis le 17/11),
`404 annuaire_ferme`.

**`GET /fiches`** — fiches publiées et catalogue, lus par tous les professionnels connectés :

```json
{ "genere_le": "2026-10-10T12:00:00.000Z",
  "fiches": [ { "rpps": "…", "nom": "…", "prenom": "…", "specialite_code": "SM53", "code_profession": "10",
                "moyen_contact": "messagerie | mssante | telephone | null",
                "ville": "…", "code_postal": "…", "lat": 45.75, "lon": 4.84,
                "mssante": "…@….mssante.fr", "telephone_cabinet": "+33478000000",
                "portable_disponible": true, "competences": ["<id intitulé>"], "mise_a_jour": "…",
                "nouveaux_patients": true | false | null, "nouveaux_patients_le": "2026-10-15T09:12:00.000Z" | null } ],
  "competences": [ { "id": "…", "libelle": "…", "synonymes": ["…"], "groupe": "…", "specialites_sm": ["SM57"],
                     "professions": ["10", "60"] } ] }
```

`code_profession` d'une fiche (ajouté le 17/11) : profession RPPS de son auteur (`"10"` médecin, `"60"` infirmier…,
toujours rempli : une identité sans profession compte comme médecin). À afficher à la place de la spécialité pour
une autre profession que `10`. `professions` d'une compétence (ajouté le 17/11) : professions à qui elle est
proposée dans « Ma fiche ». Le catalogue reste **entier** : la recherche par compétence trouve tous ceux qui la
déclarent, quelle que soit leur profession.

`nouveaux_patients` et `nouveaux_patients_le` (ajoutés le 15/10) : le médecin accepte-t-il de nouveaux patients
comme médecin traitant (`null` = non renseigné, toujours `null` pour un non-généraliste), et date de sa dernière
réponse. À afficher sur la fiche d'un confrère : « Accepte de nouveaux patients comme médecin traitant (déclaré le
JJ/MM/AAAA) » ou « N'accepte pas de nouveaux patients comme médecin traitant (déclaré le …) » ; rien si `null`.
Filtre possible « accepte de nouveaux patients » = `nouveaux_patients === true`.

`competences` d'une fiche : compétences validées seulement. `specialites_sm` d'une compétence : spécialités RPPS
pour lesquelles elle fait redite (masquée à la saisie pour ces médecins ; une recherche par cette compétence doit
aussi trouver les médecins de ces spécialités). Les noms des médecins sans fiche viennent de `annuaire.db`.

**`POST /portable`** — corps `{ "rpps": "…" }` → `200 { "portable": "+33612345678" }`. Erreurs :
`404 portable_indisponible` (pas de fiche publiée ou portable non visible), `429 plafond` (10 confrères
différents par 24 h, plafond commun avec le site ; réafficher un même numéro dans les 24 h ne compte pas ; son
propre numéro ni plafond ni trace), `400 rpps_invalide`, `403 lecteur_non_admis`.

**`GET /ma-fiche`** — la fiche du médecin connecté :

```json
{ "rpps": "…", "code_profession": "60", "specialite_code": "SM53" | null, "nouveaux_patients_possible": true,
  "fiche": null | { "moyen_contact": "…", "publiee": true, "publiee_le": "…", "mise_a_jour": "…",
                    "portable": "+336…" | null, "portable_visible": false,
                    "commune": null | { "ville": "…", "code_postal": "…", "commune_insee": "…", "lat": 0, "lon": 0 },
                    "mssante": "…" | null, "telephone_cabinet": "+33…" | null, "competences": ["<id>"],
                    "nouveaux_patients": true | false | null, "nouveaux_patients_le": "…" | null },
  "catalogue": [ { "id": "…", "libelle": "…", "synonymes": [], "groupe": "…", "specialites_sm": [], "statut": "valide | propose",
                   "professions": ["60"] } ],
  "accord": { "version": "…", "publication": "…", "portable": "…" },
  "moyens_contact": [ { "valeur": "messagerie", "libelle": "…" } ],
  "limites": { "competences": 20, "propositions_en_attente": 5 },
  "annuaire_sante": null | { "version": "2026-10-04",
      "lieux": [ { "nom": "…", "voie": "…", "codePostal": "…", "commune": "…", "telephones": ["…"], "lat": 0, "lon": 0 } ],
      "mssante": ["…"] } }
```

`specialite_code` (ajouté le 10/10) : spécialité du médecin connecté telle que PSC l'a donnée à sa dernière
ouverture de session (code SM, `null` si PSC n'en donne pas). Elle sert à masquer à la saisie les compétences
dont `specialites_sm` la contient. `catalogue` : compétences validées **de sa profession** + ses propositions en
attente (17/11 : une infirmière ne voit pas celles des médecins, ni l'inverse). `code_profession` (ajouté le
17/11) : sa profession RPPS (vide chez PSC → `"10"`).
`annuaire_sante` : ce que l'ANS connaît pour lui, à proposer en un geste (« Utiliser ce lieu ») comme sur le site.

`nouveaux_patients_possible` (ajouté le 15/10) : `true` si `specialite_code` est SM26, SM53 ou SM54 ; ne poser la
question qu'à ces médecins. Libellé du site : « Acceptez-vous de nouveaux patients comme médecin traitant ? », avec
Oui / Non / Non renseigné, la date de la dernière réponse, et la mention « déclaration non vérifiée, visible des
confrères si votre fiche est publiée ; mettez-la à jour quand votre situation change ». `fiche.nouveaux_patients` /
`nouveaux_patients_le` : sa réponse enregistrée et sa date (gardées même fiche dépubliée).

**`PUT /ma-fiche`** — corps :

```json
{ "moyen_contact": "mssante", "publiee": true, "portable": "06 12 34 56 78", "portable_visible": false,
  "commune": { "ville": "…", "code_postal": "69003", "commune_insee": "69383", "lat": 45.7597, "lon": 4.8422 },
  "mssante": "prenom.nom@medecin.mssante.fr", "telephone_cabinet": "04 78 00 00 00",
  "competences": ["<id>"], "accord_version": "2026-11-17",
  "nouveaux_patients": true }
```

`nouveaux_patients` (ajouté le 15/10), **facultatif** :
- absent : réponse inchangée (c'est ce qu'envoie l'application d'avant le 15/10 : rien n'est effacé) ;
- `true` / `false` : réponse enregistrée, datée du jour, même identique à la précédente (confirmation) ;
- `null` : non renseigné, date effacée ;
- autre type : `400 corps_invalide` ;
- médecin non généraliste (`nouveaux_patients_possible` faux) : **ignoré**, le reste de la fiche est enregistré.

Chaînes vides = effacer. Téléphones acceptés en saisie libre (normalisés en `+33…`, outre-mer compris).
`commune` : choisie dans le géocodeur IGN (`data.geopf.fr/geocodage`, type `municipality`) ou un lieu de
`annuaire_sante` ; `null` = aucune. `competences` : identifiants du catalogue (au plus 20) ; une compétence ajoutée
doit être dans le catalogue de sa profession (sinon `422`), une compétence déjà cochée reste acceptée (17/11).
Réponse `200` :
`{ "publiee_le", "mise_a_jour", "portable", "telephone_cabinet", "nouveaux_patients", "nouveaux_patients_le" }`
(formats normalisés ; les deux derniers, ajoutés le 15/10, tels qu'enregistrés : `null` / `null` pour un
non-généraliste). Erreurs :
`400 corps_invalide`, `409 accord_perime`, `422 saisie_refusee` (`detail` à afficher tel quel : portable,
téléphone ou MSSanté non reconnus, commune invalide, compétence inconnue, plus de 20).

**`DELETE /ma-fiche`** → `200 { "supprimee": true }` : fiche, portable, compétences cochées et propositions en
attente effacés. L'identité PSC reste (preuve de connexion).

**`POST /competences`** — corps `{ "libelle": "…" }` → `200 { "existant": {…} }` si le libellé ou un synonyme
existe déjà **dans son catalogue** (le cocher), sinon `201 { "proposee": {…, "statut": "propose", "professions":
["<sa profession>"]} }` (créée et cochée, validée ensuite par l'association). 17/11 : un libellé qui n'existe que
pour d'autres professions donne une proposition (l'association l'ouvre ensuite à sa profession). Erreurs :
`422 proposition_refusee` (déjà proposé par un confrère, 5 propositions en attente, fiche à 20 compétences,
longueur 2 à 120).

### À faire côté application

- Ouvrir la session site après chaque validation ou rafraîchissement PSC ; télécharger `/fiches` à chaque
  session et remplacer la copie précédente.
- Fiche d'un confrère : badge « Fiche complétée », moyen de contact préféré, compétences, coordonnées déclarées,
  bouton « Afficher le portable » si `portable_disponible` (mentions : usage professionnel, nombre limité, chaque
  affichage est enregistré).
- Recherche par compétence (libellé + synonymes, sans accents ; spécialités équivalentes `specialites_sm`).
- Écran « Ma fiche » : mêmes champs, accords et mentions que le site (« informations déclarées, non vérifiées »).
- Nouveaux patients (15/10) : question dans « Ma fiche » si `nouveaux_patients_possible`, champ envoyé dans le
  `PUT` ; sur la fiche d'un confrère, mention « Accepte » / « N'accepte pas de nouveaux patients comme médecin
  traitant (déclaré le …) » ; filtre « accepte de nouveaux patients » dans la recherche.
- Toutes professions (17/11) : sur la fiche d'un confrère, la profession (`code_profession`, table des codes
  ci-dessus) à la place de la spécialité quand ce n'est pas `10` ; sur le site, « Dr » pour `10`, `21` et `40`
  seulement ; « Ma fiche » ouverte à tous, catalogue tel que
  rendu (déjà filtré par profession).
- Exclure `annuaire_oppositions` de `annuaire.db` (déjà dans la TODO).

## Archive : fonctions de l’annuaire avant la migration B du 16/10 (retour arrière)

Définitions relues en base le 15/10 (`pg_get_functiondef`), avant l’ajout de `p_nouveaux_patients`. Pour revenir en
arrière : supprimer les quatre fonctions actuelles, exécuter ce texte, puis reposer les droits
(`annuaire_filtres` : `service_role` seulement ; les trois autres : `authenticated` et `service_role` ; rien pour
`anon` ni `public`).

```sql
CREATE OR REPLACE FUNCTION public.annuaire_compter(p_texte text DEFAULT NULL::text, p_specialites text[] DEFAULT NULL::text[], p_intitule uuid DEFAULT NULL::uuid, p_specialites_equivalentes text[] DEFAULT NULL::text[], p_lat double precision DEFAULT NULL::double precision, p_lon double precision DEFAULT NULL::double precision, p_rayon_km double precision DEFAULT NULL::double precision)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET work_mem TO '8MB'
AS $function$
declare
  v_lot integer := (select v.lot from public.ans_version v where v.cle = 'courante');
  v_f record;
  v_total bigint;
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  select * into v_f from public.annuaire_filtres(p_texte, p_specialites, p_intitule, p_specialites_equivalentes);

  if p_lat is not null and p_lon is not null and p_rayon_km is not null then
    execute 'with ' || v_f.ctes || $q$,
  positions as (
    select e.rpps,
           2 * 6371 * asin(sqrt(power(sin(radians(s.lat - $2) / 2), 2)
             + cos(radians($2)) * cos(radians(s.lat)) * power(sin(radians(s.lon - $3) / 2), 2))) as d
    from public.ans_sites s
    join public.ans_exerce e on e.lot = s.lot and e.site_id = s.id
    where s.lot = $1
      and s.lat between $2 - $5 and $2 + $5
      and s.lon between $3 - $6 and $3 + $6
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = e.rpps)
    union all
    select fi.rpps,
           2 * 6371 * asin(sqrt(power(sin(radians(fi.lat - $2) / 2), 2)
             + cos(radians($2)) * cos(radians(fi.lat)) * power(sin(radians(fi.lon - $3) / 2), 2)))
    from fiches fi
    where fi.lat between $2 - $5 and $2 + $5
      and fi.lon between $3 - $6 and $3 + $6
  )
select count(*) from (
  select x.rpps collate "C" from positions x
  where x.d <= $4 $q$ || v_f.filtres || $q$
  group by 1
) t$q$
      into v_total
      using v_lot, p_lat, p_lon, p_rayon_km, p_rayon_km / 111.0, p_rayon_km / (111.0 * greatest(cos(radians(p_lat)), 0.01)),
            p_specialites, v_f.motifs, p_intitule, p_specialites_equivalentes;
  else
    execute 'with ' || v_f.ctes || $q$,
  candidats as (
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps from fiches fi
    where not exists (select 1 from public.ans_medecins m where m.lot = $1 and m.rpps = fi.rpps
                        and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps))
  )
select count(*) from candidats x where true $q$ || v_f.filtres
      into v_total
      using v_lot, p_lat, p_lon, null::double precision, null::double precision, null::double precision,
            p_specialites, v_f.motifs, p_intitule, p_specialites_equivalentes;
  end if;
  return v_total;
end $function$;

CREATE OR REPLACE FUNCTION public.annuaire_fiche(p_rpps text)
 RETURNS TABLE(rpps text, nom text, prenom text, specialite text, specialite_code text, a_une_fiche boolean, moyen_contact text, ville text, code_postal text, lat double precision, lon double precision, mssante text, telephone_cabinet text, portable_disponible boolean, competences text[], mise_a_jour timestamp with time zone, lieux jsonb, mssante_ans text[], source_version date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_lot integer := (select v.lot from public.ans_version v where v.cle = 'courante');
  v_oppose boolean := exists (select 1 from public.annuaire_oppositions o where o.rpps = p_rpps);
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  return query
  with fi as (
    select f.rpps, coalesce(i.nom, u.nom) as nom, coalesce(i.prenom, u.prenom) as prenom,
           u.specialite, i.specialite_code,
           f.moyen_contact, f.ville, f.code_postal, f.lat, f.lon, f.mssante, f.telephone_cabinet, f.mise_a_jour,
           exists (select 1 from public.fiches_annuaire_portables p where p.rpps = f.rpps and p.visible) as portable_disponible,
           coalesce((select array_agg(it.libelle order by it.libelle) from public.fiches_intitules x
                     join public.intitules it on it.id = x.intitule_id
                     where x.rpps = f.rpps and it.statut = 'valide'), '{}'::text[]) as competences
    from public.fiches_annuaire f
    join public.identites_psc i on i.rpps = f.rpps
    left join public.users u on u.id = i.user_id
    where f.rpps = p_rpps and f.publiee
  ),
  ans as (
    select m.rpps, m.nom, m.prenom, m.specialite_libelle, m.specialite_code
    from public.ans_medecins m
    where m.lot = v_lot and m.rpps = p_rpps and not v_oppose
  )
  select coalesce(ans.rpps, fi.rpps), coalesce(ans.nom, fi.nom), coalesce(ans.prenom, fi.prenom),
         coalesce(ans.specialite_libelle, fi.specialite), coalesce(ans.specialite_code, fi.specialite_code),
         fi.rpps is not null, fi.moyen_contact, fi.ville, fi.code_postal, fi.lat, fi.lon,
         fi.mssante, fi.telephone_cabinet, coalesce(fi.portable_disponible, false),
         coalesce(fi.competences, '{}'::text[]), fi.mise_a_jour,
         case when ans.rpps is null then '[]'::jsonb else coalesce((
           select jsonb_agg(jsonb_build_object('nom', s.nom, 'voie', s.voie, 'code_postal', s.code_postal,
             'commune', s.commune, 'telephones', s.telephones, 'lat', s.lat, 'lon', s.lon) order by s.id)
           from public.ans_exerce e join public.ans_sites s on s.lot = e.lot and s.id = e.site_id
           where e.lot = v_lot and e.rpps = ans.rpps), '[]'::jsonb) end,
         case when ans.rpps is null then '{}'::text[] else coalesce((
           select array_agg(b.adresse order by b.adresse) from public.ans_mssante b
           where b.lot = v_lot and b.rpps = ans.rpps), '{}'::text[]) end,
         (select v.version from public.ans_version v where v.cle = 'courante')
  from ans full join fi on fi.rpps = ans.rpps;
end $function$;

CREATE OR REPLACE FUNCTION public.annuaire_filtres(p_texte text, p_specialites text[], p_intitule uuid, p_specialites_equivalentes text[], OUT ctes text, OUT filtres text, OUT motifs text[])
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  -- Morceaux de requête fixes ; les valeurs passent par USING : $1 lot, $7 spécialités,
  -- $8 motifs du nom, $9 compétence, $10 spécialités équivalentes. Jamais de concaténation de valeurs.
  ctes := $q$
  fiches as (
    select f.rpps, f.moyen_contact, f.mise_a_jour, f.ville, f.code_postal, f.lat, f.lon,
           coalesce(i.nom, u.nom) as nom, coalesce(i.prenom, u.prenom) as prenom,
           u.specialite, i.specialite_code
    from public.fiches_annuaire f
    join public.identites_psc i on i.rpps = f.rpps
    left join public.users u on u.id = i.user_id
    where f.publiee
  )$q$;
  filtres := '';
  motifs := case when nullif(btrim(p_texte), '') is null then null else (
    select array_agg('%' || replace(replace(replace(w.mot, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    from unnest(string_to_array(public.annuaire_normaliser(p_texte), ' ')) as w(mot)
    where w.mot <> '') end;

  if p_specialites is not null then
    ctes := ctes || $q$,
  f_specialites as materialized (
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and m.specialite_code = any($7)
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps from fiches fi where fi.specialite_code = any($7)
  )$q$;
    filtres := filtres || ' and x.rpps in (select rpps from f_specialites)';
  end if;

  if motifs is not null then
    ctes := ctes || $q$,
  f_texte as materialized (
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and m.nom_recherche like all ($8)
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps from fiches fi
    where public.annuaire_normaliser(coalesce(fi.nom, '') || ' ' || coalesce(fi.prenom, '')) like all ($8)
  )$q$;
    filtres := filtres || ' and x.rpps in (select rpps from f_texte)';
  end if;

  if p_intitule is not null then
    ctes := ctes || $q$,
  f_intitule as materialized (
    select fi.rpps from fiches fi
    join public.fiches_intitules fx on fx.rpps = fi.rpps
    where fx.intitule_id = $9 $q$
      || case when p_specialites_equivalentes is null then '' else $q$
    union all
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and m.specialite_code = any($10)
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps) $q$ end
      || $q$
  )$q$;
    filtres := filtres || ' and x.rpps in (select rpps from f_intitule)';
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.annuaire_rechercher(p_texte text DEFAULT NULL::text, p_specialites text[] DEFAULT NULL::text[], p_intitule uuid DEFAULT NULL::uuid, p_specialites_equivalentes text[] DEFAULT NULL::text[], p_lat double precision DEFAULT NULL::double precision, p_lon double precision DEFAULT NULL::double precision, p_rayon_km double precision DEFAULT NULL::double precision, p_limite integer DEFAULT 50, p_decalage integer DEFAULT 0)
 RETURNS TABLE(rpps text, nom text, prenom text, specialite text, specialite_code text, ville text, code_postal text, lat double precision, lon double precision, distance_km double precision, a_une_fiche boolean, moyen_contact text, competences text[], mise_a_jour timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET work_mem TO '8MB'
AS $function$
#variable_conflict use_column
declare
  v_lot integer := (select v.lot from public.ans_version v where v.cle = 'courante');
  v_f record;
  v_rayon double precision := case when p_lat is null or p_lon is null then null else coalesce(p_rayon_km, 2000) end;
  v_r double precision;
  -- Jusqu'à 2 000 par appel : la carte affiche tout le rayon d'un coup
  v_limite int := least(greatest(coalesce(p_limite, 50), 1), 2000);
  v_decalage int := greatest(coalesce(p_decalage, 0), 0);
  v_top jsonb;
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  select * into v_f from public.annuaire_filtres(p_texte, p_specialites, p_intitule, p_specialites_equivalentes);

  if v_rayon is not null then
    -- Avec une position : le lieu le plus proche par médecin, tri par distance.
    -- On cherche d'abord dans 10 km et on élargit (×4) tant que la page n'est pas pleine.
    v_r := least(v_rayon, 10);
    loop
      execute 'with ' || v_f.ctes || $q$,
  positions as (
    select e.rpps, s.commune as ville, s.code_postal, s.lat, s.lon,
           2 * 6371 * asin(sqrt(power(sin(radians(s.lat - $2) / 2), 2)
             + cos(radians($2)) * cos(radians(s.lat)) * power(sin(radians(s.lon - $3) / 2), 2))) as d
    from public.ans_sites s
    join public.ans_exerce e on e.lot = s.lot and e.site_id = s.id
    where s.lot = $1
      and s.lat between $2 - $5 and $2 + $5
      and s.lon between $3 - $6 and $3 + $6
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = e.rpps)
    union all
    select fi.rpps, fi.ville, fi.code_postal, fi.lat, fi.lon,
           2 * 6371 * asin(sqrt(power(sin(radians(fi.lat - $2) / 2), 2)
             + cos(radians($2)) * cos(radians(fi.lat)) * power(sin(radians(fi.lon - $3) / 2), 2)))
    from fiches fi
    where fi.lat between $2 - $5 and $2 + $5
      and fi.lon between $3 - $6 and $3 + $6
  ),
  plus_proches as (
    select distinct on (x.rpps collate "C") x.rpps, x.ville, x.code_postal, x.lat, x.lon, x.d
    from positions x
    where x.d <= $4 $q$ || v_f.filtres || $q$
    order by x.rpps collate "C", x.d
  )
select coalesce(jsonb_agg(t), '[]'::jsonb) from (
  select * from plus_proches order by d, rpps collate "C" limit $11 offset $12
) t$q$
        into v_top
        using v_lot, p_lat, p_lon, v_r, v_r / 111.0, v_r / (111.0 * greatest(cos(radians(p_lat)), 0.01)),
              p_specialites, v_f.motifs, p_intitule, p_specialites_equivalentes, v_limite, v_decalage;
      exit when jsonb_array_length(v_top) >= v_limite or v_r >= v_rayon;
      v_r := least(v_r * 4, v_rayon);
    end loop;

    return query
    with fiches as (
      select f.rpps, f.moyen_contact, f.mise_a_jour,
             coalesce(i.nom, u.nom) as nom, coalesce(i.prenom, u.prenom) as prenom,
             u.specialite, i.specialite_code
      from public.fiches_annuaire f
      join public.identites_psc i on i.rpps = f.rpps
      left join public.users u on u.id = i.user_id
      where f.publiee
    )
    select t.rpps,
           case when m.rpps is not null then m.nom else fi.nom end,
           case when m.rpps is not null then m.prenom else fi.prenom end,
           case when m.rpps is not null then m.specialite_libelle else fi.specialite end,
           coalesce(m.specialite_code, fi.specialite_code),
           t.ville, t.code_postal, t.lat, t.lon, t.d,
           fi.rpps is not null, fi.moyen_contact,
           case when fi.rpps is null then '{}'::text[] else coalesce((
             select array_agg(it.libelle order by it.libelle) from public.fiches_intitules fx
             join public.intitules it on it.id = fx.intitule_id
             where fx.rpps = fi.rpps and it.statut = 'valide'), '{}'::text[]) end,
           fi.mise_a_jour
    from jsonb_to_recordset(v_top) as t(rpps text, ville text, code_postal text, lat double precision, lon double precision, d double precision)
    left join public.ans_medecins m on m.lot = v_lot and m.rpps = t.rpps
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    left join fiches fi on fi.rpps = t.rpps
    order by t.d, t.rpps collate "C";
  else
    -- Sans position : ordre alphabétique ; lieu affiché = premier lieu de l'ANS, à défaut la fiche
    return query execute 'with ' || v_f.ctes || $q$,
  candidats as (
    select m.rpps, m.nom, m.prenom, m.specialite_libelle as specialite, m.specialite_code
    from public.ans_medecins m
    where m.lot = $1 and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps, fi.nom, fi.prenom, fi.specialite, fi.specialite_code
    from fiches fi
    where not exists (select 1 from public.ans_medecins m where m.lot = $1 and m.rpps = fi.rpps
                        and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps))
  ),
  page as (
    select x.rpps, x.nom, x.prenom, x.specialite, x.specialite_code
    from candidats x
    where true $q$ || v_f.filtres || $q$
    order by x.nom, x.prenom, x.rpps
    limit $11 offset $12
  )
select p.rpps, p.nom, p.prenom, p.specialite, p.specialite_code,
       coalesce(pos.ville, fi.ville), coalesce(pos.code_postal, fi.code_postal),
       coalesce(pos.lat, fi.lat), coalesce(pos.lon, fi.lon), null::double precision,
       fi.rpps is not null, fi.moyen_contact,
       case when fi.rpps is null then '{}'::text[] else coalesce((
         select array_agg(it.libelle order by it.libelle) from public.fiches_intitules fx
         join public.intitules it on it.id = fx.intitule_id
         where fx.rpps = fi.rpps and it.statut = 'valide'), '{}'::text[]) end,
       fi.mise_a_jour
from page p
left join fiches fi on fi.rpps = p.rpps
left join lateral (
  select s.commune as ville, s.code_postal, s.lat, s.lon
  from public.ans_exerce e
  join public.ans_sites s on s.lot = e.lot and s.id = e.site_id
  where e.lot = $1 and e.rpps = p.rpps and s.lat is not null
    and not exists (select 1 from public.annuaire_oppositions o where o.rpps = p.rpps)
  order by s.id limit 1
) pos on true
order by p.nom, p.prenom, p.rpps$q$
      using v_lot, p_lat, p_lon, v_r, null::double precision, null::double precision,
            p_specialites, v_f.motifs, p_intitule, p_specialites_equivalentes, v_limite, v_decalage;
  end if;
end $function$;
```

## Archive : avant la migration du 17/11 (retour arrière)

Définitions relues en base le 17/11 (`pg_get_functiondef`), avant l’ajout de `code_profession` et l’ouverture du
portable à toutes les professions. Retour arrière, dans une transaction :

1. `drop function public.annuaire_rechercher(text, text[], uuid, text[], double precision, double precision, double precision, integer, integer, boolean);` et `drop function public.annuaire_fiche(text);` (nouvelles colonnes rendues) ;
2. exécuter le texte ci-dessous (`annuaire_filtres` et `annuaire_portable_pour` se remplacent sur place) ;
3. reposer les droits des deux fonctions recréées : `revoke all … from public, anon;` puis
   `grant execute … to authenticated, service_role;` ;
4. intitulés : effacer d’abord les compétences des autres professions si elles ne doivent pas devenir des
   compétences de médecins (`delete from public.intitules where not ('10' = any(professions));`), traiter les
   propositions homonymes d’une compétence validée, puis
   `drop index public.intitules_type_libelle_key;`,
   `create unique index intitules_type_libelle_key on public.intitules (type, lower(btrim(libelle)));`,
   `alter table public.intitules drop constraint intitules_professions_check, drop column professions;`.

```sql
CREATE OR REPLACE FUNCTION public.annuaire_filtres(p_texte text, p_specialites text[], p_intitule uuid, p_specialites_equivalentes text[], p_nouveaux_patients boolean, OUT ctes text, OUT filtres text, OUT motifs text[])
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  -- Morceaux de requête fixes ; les valeurs passent par USING : $1 lot, $7 spécialités,
  -- $8 motifs du nom, $9 compétence, $10 spécialités équivalentes. Jamais de concaténation de valeurs.
  ctes := $q$
  fiches as (
    select f.rpps, f.moyen_contact, f.mise_a_jour, f.ville, f.code_postal, f.lat, f.lon, f.nouveaux_patients,
           coalesce(i.nom, u.nom) as nom, coalesce(i.prenom, u.prenom) as prenom,
           u.specialite, i.specialite_code
    from public.fiches_annuaire f
    join public.identites_psc i on i.rpps = f.rpps
    left join public.users u on u.id = i.user_id
    where f.publiee
  )$q$;
  filtres := '';
  motifs := case when nullif(btrim(p_texte), '') is null then null else (
    select array_agg('%' || replace(replace(replace(w.mot, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    from unnest(string_to_array(public.annuaire_normaliser(p_texte), ' ')) as w(mot)
    where w.mot <> '') end;

  if p_specialites is not null then
    ctes := ctes || $q$,
  f_specialites as materialized (
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and m.specialite_code = any($7)
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps from fiches fi where fi.specialite_code = any($7)
  )$q$;
    filtres := filtres || ' and x.rpps in (select rpps from f_specialites)';
  end if;

  if motifs is not null then
    ctes := ctes || $q$,
  f_texte as materialized (
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and m.nom_recherche like all ($8)
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps from fiches fi
    where public.annuaire_normaliser(coalesce(fi.nom, '') || ' ' || coalesce(fi.prenom, '')) like all ($8)
  )$q$;
    filtres := filtres || ' and x.rpps in (select rpps from f_texte)';
  end if;

  if p_intitule is not null then
    ctes := ctes || $q$,
  f_intitule as materialized (
    select fi.rpps from fiches fi
    join public.fiches_intitules fx on fx.rpps = fi.rpps
    where fx.intitule_id = $9 $q$
      || case when p_specialites_equivalentes is null then '' else $q$
    union all
    select m.rpps from public.ans_medecins m
    where m.lot = $1 and m.specialite_code = any($10)
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps) $q$ end
      || $q$
  )$q$;
    filtres := filtres || ' and x.rpps in (select rpps from f_intitule)';
  end if;

  -- Accepte de nouveaux patients comme médecin traitant (fiches publiées) : filtre seulement si true
  if p_nouveaux_patients then
    filtres := filtres || ' and x.rpps in (select fi.rpps from fiches fi where fi.nouveaux_patients)';
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.annuaire_rechercher(p_texte text DEFAULT NULL::text, p_specialites text[] DEFAULT NULL::text[], p_intitule uuid DEFAULT NULL::uuid, p_specialites_equivalentes text[] DEFAULT NULL::text[], p_lat double precision DEFAULT NULL::double precision, p_lon double precision DEFAULT NULL::double precision, p_rayon_km double precision DEFAULT NULL::double precision, p_limite integer DEFAULT 50, p_decalage integer DEFAULT 0, p_nouveaux_patients boolean DEFAULT NULL::boolean)
 RETURNS TABLE(rpps text, nom text, prenom text, specialite text, specialite_code text, ville text, code_postal text, lat double precision, lon double precision, distance_km double precision, a_une_fiche boolean, moyen_contact text, competences text[], mise_a_jour timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET work_mem TO '8MB'
AS $function$
#variable_conflict use_column
declare
  v_lot integer := (select v.lot from public.ans_version v where v.cle = 'courante');
  v_f record;
  v_rayon double precision := case when p_lat is null or p_lon is null then null else coalesce(p_rayon_km, 2000) end;
  v_r double precision;
  -- Jusqu'à 2 000 par appel : la carte affiche tout le rayon d'un coup
  v_limite int := least(greatest(coalesce(p_limite, 50), 1), 2000);
  v_decalage int := greatest(coalesce(p_decalage, 0), 0);
  v_top jsonb;
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  select * into v_f from public.annuaire_filtres(p_texte, p_specialites, p_intitule, p_specialites_equivalentes, p_nouveaux_patients);

  if v_rayon is not null then
    -- Avec une position : le lieu le plus proche par médecin, tri par distance.
    -- On cherche d'abord dans 10 km et on élargit (×4) tant que la page n'est pas pleine.
    v_r := least(v_rayon, 10);
    loop
      execute 'with ' || v_f.ctes || $q$,
  positions as (
    select e.rpps, s.commune as ville, s.code_postal, s.lat, s.lon,
           2 * 6371 * asin(sqrt(power(sin(radians(s.lat - $2) / 2), 2)
             + cos(radians($2)) * cos(radians(s.lat)) * power(sin(radians(s.lon - $3) / 2), 2))) as d
    from public.ans_sites s
    join public.ans_exerce e on e.lot = s.lot and e.site_id = s.id
    where s.lot = $1
      and s.lat between $2 - $5 and $2 + $5
      and s.lon between $3 - $6 and $3 + $6
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = e.rpps)
    union all
    select fi.rpps, fi.ville, fi.code_postal, fi.lat, fi.lon,
           2 * 6371 * asin(sqrt(power(sin(radians(fi.lat - $2) / 2), 2)
             + cos(radians($2)) * cos(radians(fi.lat)) * power(sin(radians(fi.lon - $3) / 2), 2)))
    from fiches fi
    where fi.lat between $2 - $5 and $2 + $5
      and fi.lon between $3 - $6 and $3 + $6
  ),
  plus_proches as (
    select distinct on (x.rpps collate "C") x.rpps, x.ville, x.code_postal, x.lat, x.lon, x.d
    from positions x
    where x.d <= $4 $q$ || v_f.filtres || $q$
    order by x.rpps collate "C", x.d
  )
select coalesce(jsonb_agg(t), '[]'::jsonb) from (
  select * from plus_proches order by d, rpps collate "C" limit $11 offset $12
) t$q$
        into v_top
        using v_lot, p_lat, p_lon, v_r, v_r / 111.0, v_r / (111.0 * greatest(cos(radians(p_lat)), 0.01)),
              p_specialites, v_f.motifs, p_intitule, p_specialites_equivalentes, v_limite, v_decalage;
      exit when jsonb_array_length(v_top) >= v_limite or v_r >= v_rayon;
      v_r := least(v_r * 4, v_rayon);
    end loop;

    return query
    with fiches as (
      select f.rpps, f.moyen_contact, f.mise_a_jour,
             coalesce(i.nom, u.nom) as nom, coalesce(i.prenom, u.prenom) as prenom,
             u.specialite, i.specialite_code
      from public.fiches_annuaire f
      join public.identites_psc i on i.rpps = f.rpps
      left join public.users u on u.id = i.user_id
      where f.publiee
    )
    select t.rpps,
           case when m.rpps is not null then m.nom else fi.nom end,
           case when m.rpps is not null then m.prenom else fi.prenom end,
           case when m.rpps is not null then m.specialite_libelle else fi.specialite end,
           coalesce(m.specialite_code, fi.specialite_code),
           t.ville, t.code_postal, t.lat, t.lon, t.d,
           fi.rpps is not null, fi.moyen_contact,
           case when fi.rpps is null then '{}'::text[] else coalesce((
             select array_agg(it.libelle order by it.libelle) from public.fiches_intitules fx
             join public.intitules it on it.id = fx.intitule_id
             where fx.rpps = fi.rpps and it.statut = 'valide'), '{}'::text[]) end,
           fi.mise_a_jour
    from jsonb_to_recordset(v_top) as t(rpps text, ville text, code_postal text, lat double precision, lon double precision, d double precision)
    left join public.ans_medecins m on m.lot = v_lot and m.rpps = t.rpps
      and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    left join fiches fi on fi.rpps = t.rpps
    order by t.d, t.rpps collate "C";
  else
    -- Sans position : ordre alphabétique ; lieu affiché = premier lieu de l'ANS, à défaut la fiche
    return query execute 'with ' || v_f.ctes || $q$,
  candidats as (
    select m.rpps, m.nom, m.prenom, m.specialite_libelle as specialite, m.specialite_code
    from public.ans_medecins m
    where m.lot = $1 and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps)
    union all
    select fi.rpps, fi.nom, fi.prenom, fi.specialite, fi.specialite_code
    from fiches fi
    where not exists (select 1 from public.ans_medecins m where m.lot = $1 and m.rpps = fi.rpps
                        and not exists (select 1 from public.annuaire_oppositions o where o.rpps = m.rpps))
  ),
  page as (
    select x.rpps, x.nom, x.prenom, x.specialite, x.specialite_code
    from candidats x
    where true $q$ || v_f.filtres || $q$
    order by x.nom, x.prenom, x.rpps
    limit $11 offset $12
  )
select p.rpps, p.nom, p.prenom, p.specialite, p.specialite_code,
       coalesce(pos.ville, fi.ville), coalesce(pos.code_postal, fi.code_postal),
       coalesce(pos.lat, fi.lat), coalesce(pos.lon, fi.lon), null::double precision,
       fi.rpps is not null, fi.moyen_contact,
       case when fi.rpps is null then '{}'::text[] else coalesce((
         select array_agg(it.libelle order by it.libelle) from public.fiches_intitules fx
         join public.intitules it on it.id = fx.intitule_id
         where fx.rpps = fi.rpps and it.statut = 'valide'), '{}'::text[]) end,
       fi.mise_a_jour
from page p
left join fiches fi on fi.rpps = p.rpps
left join lateral (
  select s.commune as ville, s.code_postal, s.lat, s.lon
  from public.ans_exerce e
  join public.ans_sites s on s.lot = e.lot and s.id = e.site_id
  where e.lot = $1 and e.rpps = p.rpps and s.lat is not null
    and not exists (select 1 from public.annuaire_oppositions o where o.rpps = p.rpps)
  order by s.id limit 1
) pos on true
order by p.nom, p.prenom, p.rpps$q$
      using v_lot, p_lat, p_lon, v_r, null::double precision, null::double precision,
            p_specialites, v_f.motifs, p_intitule, p_specialites_equivalentes, v_limite, v_decalage;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.annuaire_fiche(p_rpps text)
 RETURNS TABLE(rpps text, nom text, prenom text, specialite text, specialite_code text, a_une_fiche boolean, moyen_contact text, ville text, code_postal text, lat double precision, lon double precision, mssante text, telephone_cabinet text, portable_disponible boolean, competences text[], mise_a_jour timestamp with time zone, lieux jsonb, mssante_ans text[], source_version date, nouveaux_patients boolean, nouveaux_patients_le timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  v_lot integer := (select v.lot from public.ans_version v where v.cle = 'courante');
  v_oppose boolean := exists (select 1 from public.annuaire_oppositions o where o.rpps = p_rpps);
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  return query
  with fi as (
    select f.rpps, coalesce(i.nom, u.nom) as nom, coalesce(i.prenom, u.prenom) as prenom,
           u.specialite, i.specialite_code,
           f.moyen_contact, f.ville, f.code_postal, f.lat, f.lon, f.mssante, f.telephone_cabinet, f.mise_a_jour,
           f.nouveaux_patients, f.nouveaux_patients_le,
           exists (select 1 from public.fiches_annuaire_portables p where p.rpps = f.rpps and p.visible) as portable_disponible,
           coalesce((select array_agg(it.libelle order by it.libelle) from public.fiches_intitules x
                     join public.intitules it on it.id = x.intitule_id
                     where x.rpps = f.rpps and it.statut = 'valide'), '{}'::text[]) as competences
    from public.fiches_annuaire f
    join public.identites_psc i on i.rpps = f.rpps
    left join public.users u on u.id = i.user_id
    where f.rpps = p_rpps and f.publiee
  ),
  ans as (
    select m.rpps, m.nom, m.prenom, m.specialite_libelle, m.specialite_code
    from public.ans_medecins m
    where m.lot = v_lot and m.rpps = p_rpps and not v_oppose
  )
  select coalesce(ans.rpps, fi.rpps), coalesce(ans.nom, fi.nom), coalesce(ans.prenom, fi.prenom),
         coalesce(ans.specialite_libelle, fi.specialite), coalesce(ans.specialite_code, fi.specialite_code),
         fi.rpps is not null, fi.moyen_contact, fi.ville, fi.code_postal, fi.lat, fi.lon,
         fi.mssante, fi.telephone_cabinet, coalesce(fi.portable_disponible, false),
         coalesce(fi.competences, '{}'::text[]), fi.mise_a_jour,
         case when ans.rpps is null then '[]'::jsonb else coalesce((
           select jsonb_agg(jsonb_build_object('nom', s.nom, 'voie', s.voie, 'code_postal', s.code_postal,
             'commune', s.commune, 'telephones', s.telephones, 'lat', s.lat, 'lon', s.lon) order by s.id)
           from public.ans_exerce e join public.ans_sites s on s.lot = e.lot and s.id = e.site_id
           where e.lot = v_lot and e.rpps = ans.rpps), '[]'::jsonb) end,
         case when ans.rpps is null then '{}'::text[] else coalesce((
           select array_agg(b.adresse order by b.adresse) from public.ans_mssante b
           where b.lot = v_lot and b.rpps = ans.rpps), '{}'::text[]) end,
         (select v.version from public.ans_version v where v.cle = 'courante'),
         fi.nouveaux_patients, fi.nouveaux_patients_le
  from ans full join fi on fi.rpps = ans.rpps;
end $function$;

CREATE OR REPLACE FUNCTION public.annuaire_portable_pour(p_lecteur_rpps text, p_rpps text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_portable text;
  v_nb int;
begin
  if not exists (select 1 from public.identites_psc i
                 where i.rpps = p_lecteur_rpps and coalesce(i.code_profession, '10') = '10') then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  select p.portable into v_portable
  from public.fiches_annuaire f
  join public.fiches_annuaire_portables p on p.rpps = f.rpps and p.visible
  where f.rpps = p_rpps and f.publiee;
  if v_portable is null then return null; end if;
  if p_rpps = p_lecteur_rpps then return v_portable; end if;  -- sa propre fiche : ni plafond ni trace
  if exists (select 1 from public.annuaire_affichages_portables a
             where a.lecteur_rpps = p_lecteur_rpps and a.consulte_rpps = p_rpps
               and a.affiche_le > now() - interval '24 hours') then
    return v_portable;  -- déjà affiché dans les 24 h : ne compte pas deux fois
  end if;
  select count(distinct a.consulte_rpps) into v_nb from public.annuaire_affichages_portables a
   where a.lecteur_rpps = p_lecteur_rpps and a.affiche_le > now() - interval '24 hours';
  if v_nb >= 10 then
    raise exception 'Plafond atteint : 10 numéros de portable par 24 heures' using errcode = 'P0001', hint = 'plafond';
  end if;
  insert into public.annuaire_affichages_portables (lecteur_rpps, consulte_rpps) values (p_lecteur_rpps, p_rpps);
  return v_portable;
end $function$;
```
