# Annuaire — tranche 3 : raccordement de l'application au site

## Décisions de David (09-10/10)

1. **Identification (option A)** : le site ouvre des adresses réservées à l'application ; elle y présente son
   jeton PSC (obtenu par le relais, même client PSC que le site), le site le fait vérifier par PSC (`userinfo`),
   contrôle le client émetteur, et rend un jeton du site (30 min). Pas de compte site pour les utilisateurs de
   l'application.
2. **Fiches téléchargées à chaque connexion** (pas dans le fichier mensuel `annuaire.db`) : un médecin qui
   dépublie disparaît à la connexion suivante. Sans les portables.
3. **Modification de sa fiche dans l'application** (pas seulement un lien vers le site).
4. **Lecteurs : médecins seulement** pour l'instant (comme sur le site).
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

## Étape 3 — après le passage de la production au nouveau code

- Retirer `user_id` de `fiches_annuaire`, `fiches_annuaire_portables`, `fiches_intitules`, les passerelles
  (`annuaire_cles`, `annuaire_suivre_compte`), `intitules.propose_par`, `lecteur_id` / `consulte_id` du journal
  (`lecteur_rpps` / `consulte_rpps` obligatoires), et les règles RLS d'écriture par `user_id`.
- Avant : essais de suppression et de fusion de comptes de test sur `dev`.

## Contrat d'échange avec l'application (pour la session messagerie)

### Principes

- **Médecins seulement** (code profession PSC `10`) ; autre profession → `403 profession_non_admise`.
- **Identité = RPPS à 11 chiffres** (le site retire le « 8 » de l'identifiant national).
- **Fiches téléchargées à chaque session** (`GET /fiches`), jamais gardées au-delà de la session suivante : un
  médecin qui dépublie disparaît à la connexion suivante de ses confrères.
- **Le portable n'est dans aucun fichier** : `GET /fiches` dit seulement `portable_disponible` ; le numéro
  s'obtient fiche par fiche (`POST /portable`), à la demande explicite du médecin, plafonné et tracé ; ne pas le
  conserver (affichage seulement).
- **Accords** : l'application affiche au médecin les textes d'accord rendus par le site (`accord.publication`,
  `accord.portable`) et renvoie `accord_version` quand elle publie la fiche ou rend le portable visible. Si les
  textes ont changé : `409 accord_perime` → afficher les nouveaux.
- **Environnement** : le site n'accepte que les jetons PSC de **son** environnement (émetteur `iss`) et du
  client PSC de l'association (`azp` = celui du relais). `www.100000medecins.org` et `dev.100000medecins.org` :
  PSC de production ; poste local de David : bac à sable. Tant que l'annuaire est éteint sur www, toutes les
  adresses y répondent `404 annuaire_ferme` ; `dev` l'a allumé.

### Adresses

Base : `https://<site>/api/annuaire/app`. Réponses JSON, `Cache-Control: no-store`. Erreurs :
`{ "erreur": "<code>", "detail": "<phrase lisible>" }`.

**`POST /session`** — en-tête `Authorization: Bearer <jeton d'accès PSC>` (celui que le relais remet à
l'application, `SessionRelais.jetonPourConnexion`). Réponse `200` :

```json
{ "jeton": "v1.…", "expire_dans": 1800, "rpps": "10100394740",
  "accord": { "version": "2026-10-07", "publication": "Je publie ma fiche…", "portable": "Je rends mon portable…" } }
```

Erreurs : `401 jeton_psc_absent | jeton_psc_illisible | jeton_psc_autre_client | jeton_psc_autre_environnement |
jeton_psc_expire | jeton_psc_refuse`, `403 rpps_absent | profession_non_admise`, `502 psc_indisponible`
(réessayer), `404 annuaire_ferme`. Le site enregistre la preuve PSC (nom, prénom, spécialité) et met à jour la
date de dernière connexion. Rouvrir une session (nouveau jeton PSC) avant l'expiration ou sur
`401 jeton_invalide`.

Toutes les autres adresses : `Authorization: Bearer <jeton du site>`. Erreurs communes :
`401 jeton_invalide | identite_inconnue`, `403 profession_non_admise`, `404 annuaire_ferme`.

**`GET /fiches`** — fiches publiées et catalogue :

```json
{ "genere_le": "2026-10-10T12:00:00.000Z",
  "fiches": [ { "rpps": "…", "nom": "…", "prenom": "…", "specialite_code": "SM53",
                "moyen_contact": "messagerie | mssante | telephone | null",
                "ville": "…", "code_postal": "…", "lat": 45.75, "lon": 4.84,
                "mssante": "…@….mssante.fr", "telephone_cabinet": "+33478000000",
                "portable_disponible": true, "competences": ["<id intitulé>"], "mise_a_jour": "…" } ],
  "competences": [ { "id": "…", "libelle": "…", "synonymes": ["…"], "groupe": "…", "specialites_sm": ["SM57"] } ] }
```

`competences` d'une fiche : compétences validées seulement. `specialites_sm` d'une compétence : spécialités RPPS
pour lesquelles elle fait redite (masquée à la saisie pour ces médecins ; une recherche par cette compétence doit
aussi trouver les médecins de ces spécialités). Les noms des médecins sans fiche viennent de `annuaire.db`.

**`POST /portable`** — corps `{ "rpps": "…" }` → `200 { "portable": "+33612345678" }`. Erreurs :
`404 portable_indisponible` (pas de fiche publiée ou portable non visible), `429 plafond` (10 confrères
différents par 24 h, plafond commun avec le site ; réafficher un même numéro dans les 24 h ne compte pas ; son
propre numéro ni plafond ni trace), `400 rpps_invalide`, `403 lecteur_non_admis`.

**`GET /ma-fiche`** — la fiche du médecin connecté :

```json
{ "rpps": "…",
  "fiche": null | { "moyen_contact": "…", "publiee": true, "publiee_le": "…", "mise_a_jour": "…",
                    "portable": "+336…" | null, "portable_visible": false,
                    "commune": null | { "ville": "…", "code_postal": "…", "commune_insee": "…", "lat": 0, "lon": 0 },
                    "mssante": "…" | null, "telephone_cabinet": "+33…" | null, "competences": ["<id>"] },
  "catalogue": [ { "id": "…", "libelle": "…", "synonymes": [], "groupe": "…", "specialites_sm": [], "statut": "valide | propose" } ],
  "accord": { "version": "…", "publication": "…", "portable": "…" },
  "moyens_contact": [ { "valeur": "messagerie", "libelle": "…" } ],
  "limites": { "competences": 20, "propositions_en_attente": 5 },
  "annuaire_sante": null | { "version": "2026-10-04",
      "lieux": [ { "nom": "…", "voie": "…", "codePostal": "…", "commune": "…", "telephones": ["…"], "lat": 0, "lon": 0 } ],
      "mssante": ["…"] } }
```

`catalogue` : compétences validées + propositions en attente de ce médecin. `annuaire_sante` : ce que l'ANS
connaît pour lui, à proposer en un geste (« Utiliser ce lieu ») comme sur le site.

**`PUT /ma-fiche`** — corps :

```json
{ "moyen_contact": "mssante", "publiee": true, "portable": "06 12 34 56 78", "portable_visible": false,
  "commune": { "ville": "…", "code_postal": "69003", "commune_insee": "69383", "lat": 45.7597, "lon": 4.8422 },
  "mssante": "prenom.nom@medecin.mssante.fr", "telephone_cabinet": "04 78 00 00 00",
  "competences": ["<id>"], "accord_version": "2026-10-07" }
```

Chaînes vides = effacer. Téléphones acceptés en saisie libre (normalisés en `+33…`, outre-mer compris).
`commune` : choisie dans le géocodeur IGN (`data.geopf.fr/geocodage`, type `municipality`) ou un lieu de
`annuaire_sante` ; `null` = aucune. `competences` : identifiants du catalogue (au plus 20). Réponse `200` :
`{ "publiee_le", "mise_a_jour", "portable", "telephone_cabinet" }` (formats normalisés). Erreurs :
`400 corps_invalide`, `409 accord_perime`, `422 saisie_refusee` (`detail` à afficher tel quel : portable,
téléphone ou MSSanté non reconnus, commune invalide, compétence inconnue, plus de 20).

**`DELETE /ma-fiche`** → `200 { "supprimee": true }` : fiche, portable, compétences cochées et propositions en
attente effacés. L'identité PSC reste (preuve de connexion).

**`POST /competences`** — corps `{ "libelle": "…" }` → `200 { "existant": {…} }` si le libellé ou un synonyme
existe déjà (le cocher), sinon `201 { "proposee": {…, "statut": "propose"} }` (créée et cochée, validée ensuite
par l'association). Erreurs : `422 proposition_refusee` (déjà proposé par un confrère, 5 propositions en
attente, fiche à 20 compétences, longueur 2 à 120).

### À faire côté application

- Ouvrir la session site après chaque validation ou rafraîchissement PSC ; télécharger `/fiches` à chaque
  session et remplacer la copie précédente.
- Fiche d'un confrère : badge « Fiche complétée », moyen de contact préféré, compétences, coordonnées déclarées,
  bouton « Afficher le portable » si `portable_disponible` (mentions : usage professionnel, nombre limité, chaque
  affichage est enregistré).
- Recherche par compétence (libellé + synonymes, sans accents ; spécialités équivalentes `specialites_sm`).
- Écran « Ma fiche » : mêmes champs, accords et mentions que le site (« informations déclarées, non vérifiées »).
- Exclure `annuaire_oppositions` de `annuaire.db` (déjà dans la TODO).
