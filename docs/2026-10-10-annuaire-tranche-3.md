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

## Étape 2 — à faire

- Migration : fonctions de lecture (`annuaire_filtres`, `annuaire_rechercher`, `annuaire_compter`,
  `annuaire_fiche`, `annuaire_afficher_portable`) par RPPS, fiches sans compte du site comprises ; journal et
  plafond par RPPS ; fonctions réservées au serveur pour l'application (portable d'un lecteur donné, fiches
  publiées) ; fermeture des écritures directes depuis le navigateur.
- Code : un module serveur unique (lire, enregistrer, proposer, supprimer une fiche, par RPPS) utilisé par
  « Ma fiche » du site et par les adresses de l'application ; preuve PSC écrite par RPPS avec nom, prénom,
  spécialité.
- Adresses de l'application (`/api/annuaire/app/…`) : session, fiches publiées + catalogue, portable, ma fiche
  (lire, enregistrer, supprimer), proposition de compétence. Variable Vercel `ANNUAIRE_APP_SECRET`.
- Contrat d'échange pour la session messagerie.
- Essais : suppression et fusion de comptes de test, Ma fiche, `/annuaire`, admin, connexion PSC.
