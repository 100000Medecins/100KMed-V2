# Annuaire mutualisé — tranche 2 « lecture par les confrères » et chaîne de données commune

2026-10-08. **Proposition** (à valider par David), rédigée après lecture du dépôt messagerie
(`C:\Users\david\Documents\100000Medecins_messagerie`, lecture seule) pour synchroniser la base
téléchargée par l'application et celle du site. Tranche 1 : `docs/2026-10-07-annuaire-tranche-1.md`.

## Décisions déjà prises (08/10)

- Fiche : ajout de champs facultatifs saisis par le médecin — ville / code postal d'exercice,
  adresse MSSanté, téléphone du cabinet.
- Portable : **10 affichages par jour et par lecteur**, journal des affichages purgé à 12 mois ;
  un médecin ne sait pas qui a affiché son numéro (05/10).
- Page `/annuaire` (privée, non indexée, derrière l'interrupteur), accessible depuis le menu de
  Mon compte ; fiche `/annuaire/<RPPS>`.
- Lecteurs : tout médecin avec une preuve PSC, sans obligation d'avoir publié sa fiche.
- Recherche par **localisation**, comme dans l'application.
- **Une seule chaîne de données ANS**, la même pour l'application et le site, limitée aux
  informations utiles.

## Ce qui existe

### Dans l'application (dépôt messagerie)

- **Base construite sur le PC** par `lot8/annuaire.py` (`base` puis `publier`) à partir de deux
  extractions ANS en Licence Ouverte (data.gouv.fr) : « Extraction des BAL MSSanté » (93,5 Mo) et
  l'extraction RPPS « personne-activité » (823 Mo — les « 800 Mo » de la question 24).
- Toutes les professions qui ont une BAL : **380 378 professionnels, dont 198 281 médecins**.
  Pas de filtre « actif ». Lieux d'exercice et téléphones issus du RPPS, adresses MSSanté des BAL.
- **Géocodage** par le géocodeur BAN de la Géoplateforme IGN (`data.geopf.fr/geocodage`, score
  ≥ 0,5, caches `geocache*.tsv`) : 93 % des professionnels placés.
- Sortie **SQLite** `annuaire.db` (134 Mo, 63 Mo compressée) : tables `pro`, `site` (lat/lon),
  `exerce`, `bal_adresse`, `structure`, `libelle`, `meta` (version = date de l'extraction).
- **Publication manuelle** sur le relais de l'association ; une seule version (04/10). Le
  téléphone la télécharge après une connexion PSC de moins de 4 h (option B, décision du 05/10).
- **Sur le téléphone** : recherche par nom, métier, spécialité, ville ; carte MapLibre + Plan IGN ;
  **« Autour de moi »** (position approximative, une mesure, rayon 5 / 10 / 20 / 50 km ou France,
  tri par distance). Rien ne sort du téléphone (ni recherche, ni position), hors tuiles IGN.
- Aucune liste d'opposition codée. Aucune lecture des fiches du site (prévu « plus tard »).
- ⚠️ `pro.rpps` contient l'**identifiant national** (« 8 » + RPPS), le site le **RPPS à 11 chiffres**.

### Sur le site

- Tranche 1 en production, éteinte : fiches déclarées (`fiches_annuaire`, portables à part),
  catalogue de 212 compétences, preuve PSC (`identites_psc`, RPPS à 11 chiffres).
- Base Supabase : 48 Mo utilisés sur 500 Mo (plan gratuit). Extensions : `pg_trgm` (pas de PostGIS).

## Proposition — une seule chaîne, deux sorties

1. **Une seule construction** : le script `lot8/annuaire.py` lit les extractions une fois, géocode
   une fois (mêmes caches) et produit **deux sorties de la même version** :
   - `annuaire.db` pour l'application (inchangé) ;
   - un **import dans Supabase pour le site**, médecins seulement, champs utiles seulement :
     `ans_medecins` (rpps, civilité, nom, prénom, spécialité), `ans_lieux` (rpps, voie, code postal,
     commune, téléphones, lat, lon), `ans_mssante` (rpps, adresse), `ans_version` (date de
     l'extraction). Estimation : ~150 Mo.
   La même date s'affiche des deux côtés : « Source : ANS, Annuaire Santé, données du JJ/MM/AAAA ».
2. **Les fiches déclarées restent dans Supabase**, source unique. À chaque construction, le script y
   lit les fiches **publiées, sans portable**, et les ajoute à `annuaire.db` (table `fiche` +
   compétences) : l'application les affiche hors ligne.
3. **Le portable n'est dans aucun fichier.** Site et application le demandent fiche par fiche à la
   **même fonction Supabase** → un seul plafond (10 / jour) et un seul journal pour les deux.
   (Côté application : suppose une session Supabase obtenue depuis la connexion PSC du relais —
   point ouvert n° 2 du dépôt messagerie, tranche 3.)
4. **Une seule liste d'opposition** (`annuaire_oppositions` dans Supabase, gérée dans l'admin du
   site) : la construction exclut ces RPPS des deux sorties. Elle honore le droit d'opposition
   promis par la charte (P5) aux médecins non inscrits.
5. **Clé commune : le RPPS à 11 chiffres** partout (le script retire le « 8 » à l'export).
6. **Fréquence** : mensuelle, lancée à la main au début comme aujourd'hui ; à automatiser ensuite.
7. **Qui fait quoi** : le site crée les tables et les fonctions Supabase (migrations montrées à
   David) ; le script commun reste dans le dépôt messagerie, où il fonctionne avec ses caches de
   géocodage, et gagne deux étapes : « export Supabase » et « import des fiches publiées ».

## Recherche par localisation sur le site

- « **Autour de moi** » (géolocalisation du navigateur) ou « **près de** » une ville / un code
  postal ; rayon 5 / 10 / 20 / 50 km ou France ; tri par distance ; **carte MapLibre + Plan IGN**
  (mêmes tuiles que l'application, déjà citées par la charte).
- **Différence avec l'application** : le téléphone cherche dans son fichier, la position ne sort
  pas ; sur le site la base est sur le serveur, la position doit lui être envoyée pour trier par
  distance. Proposition fidèle au principe du 01/10 : position **arrondie par le navigateur
  (~1 km)** avant envoi, utilisée pour la requête, **jamais enregistrée ni journalisée** ; ou ville
  / code postal saisis.
- Distance calculée en SQL (formule de haversine, préfiltre par rectangle sur lat/lon indexés) :
  pas besoin de PostGIS.
- Avant l'import ANS (2b), seules les fiches avec une ville déclarée sont placées (géocodée une fois
  par la BAN à l'enregistrement).

## Découpage proposé

- **2a — site** : migration (champs déclarés + coordonnées, journal des portables, oppositions,
  fonctions de lecture), page `/annuaire` (recherche nom / spécialité / compétence + localisation +
  carte), fiche `/annuaire/<RPPS>` (mention « déclaré, non vérifié », date), portable 10 / jour +
  journal + purge à 12 mois, pas de Vercel Analytics sur ces pages.
- **2b — chaîne commune** : tables `ans_*` côté site + étapes d'export et d'import dans `lot8`
  (session messagerie) → l'annuaire du site montre tous les médecins, fiches comprises.
- **3 — application** : lecture des fiches (fichier) et du portable (fonction Supabase).

## Réponses de David (08/10)

A. **Localisation** : la ville ou le code postal saisi dans la recherche, à défaut celui de la fiche
   du lecteur, sert de point de départ — pas de géolocalisation dans ce cas. Si aucun n'est
   renseigné quand le médecin ouvre la carte ou « Autour de moi », le site **propose** la
   géolocalisation du navigateur (position arrondie à ~1 km avant envoi, jamais enregistrée).
   La ville saisie est géocodée par le service IGN depuis le navigateur → mention à ajouter à la
   charte le jour J (« la ville que vous saisissez est envoyée au service de géocodage de l'IGN »).
B. **Le script commun reste dans le dépôt messagerie** ; le site crée les tables et les fonctions.
C. **Ordre 2a puis 2b.**

## Migration 2a appliquée le 2026-10-08 (SQL Editor, une transaction)

```sql
begin;

alter table public.fiches_annuaire
  add column ville text check (ville is null or char_length(btrim(ville)) between 1 and 120),
  add column code_postal text check (code_postal is null or code_postal ~ '^[0-9]{5}$'),
  add column commune_insee text check (commune_insee is null or commune_insee ~ '^[0-9][0-9AB][0-9]{3}$'),
  add column lat double precision check (lat is null or lat between -90 and 90),
  add column lon double precision check (lon is null or lon between -180 and 180),
  add column mssante text check (mssante is null or mssante ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column telephone_cabinet text check (telephone_cabinet is null or telephone_cabinet ~ '^\+[1-9][0-9]{7,14}$');
create index fiches_annuaire_position_idx on public.fiches_annuaire (lat, lon) where publiee;

create table public.annuaire_affichages_portables (
  id uuid primary key default gen_random_uuid(),
  lecteur_id uuid not null references public.users(id) on delete cascade,
  consulte_id uuid not null references public.users(id) on delete cascade,
  affiche_le timestamptz not null default now()
);
create index annuaire_affichages_lecteur_idx on public.annuaire_affichages_portables (lecteur_id, affiche_le);
revoke all on public.annuaire_affichages_portables from anon, authenticated;
grant select, insert, delete on public.annuaire_affichages_portables to service_role;
alter table public.annuaire_affichages_portables enable row level security;

create function public.annuaire_lecteur_autorise() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.identites_psc i
                 where i.user_id = (select auth.uid()) and coalesce(i.code_profession, '10') = '10')
$$;

create function public.annuaire_normaliser(t text) returns text
language sql immutable set search_path = '' as $$
  select lower(translate(coalesce(t, ''),
    'ÀÂÄÁÃÉÈÊËÍÎÏÌÓÔÖÒÕÚÛÜÙÇÑàâäáãéèêëíîïìóôöòõúûüùçñ''’-',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn   '))
$$;

-- annuaire_rechercher, annuaire_fiche, annuaire_afficher_portable : voir « Fonctions de la 2a
-- (archive) » ci-dessous (remplacées en 2b, sauf annuaire_afficher_portable).

revoke all on function public.annuaire_lecteur_autorise() from public, anon;
revoke all on function public.annuaire_normaliser(text) from public, anon;
revoke all on function public.annuaire_rechercher(text, text[], uuid, text[], double precision, double precision, double precision, int, int) from public, anon;
revoke all on function public.annuaire_fiche(text) from public, anon;
revoke all on function public.annuaire_afficher_portable(text) from public, anon;
grant execute on function public.annuaire_lecteur_autorise() to authenticated, service_role;
grant execute on function public.annuaire_normaliser(text) to authenticated, service_role;
grant execute on function public.annuaire_rechercher(text, text[], uuid, text[], double precision, double precision, double precision, int, int) to authenticated, service_role;
grant execute on function public.annuaire_fiche(text) to authenticated, service_role;
grant execute on function public.annuaire_afficher_portable(text) to authenticated, service_role;

commit;
```

Retour arrière :

```sql
drop function if exists public.annuaire_afficher_portable(text), public.annuaire_fiche(text),
  public.annuaire_rechercher(text, text[], uuid, text[], double precision, double precision, double precision, int, int),
  public.annuaire_normaliser(text), public.annuaire_lecteur_autorise();
drop table if exists public.annuaire_affichages_portables;
alter table public.fiches_annuaire drop column if exists ville, drop column if exists code_postal,
  drop column if exists commune_insee, drop column if exists lat, drop column if exists lon,
  drop column if exists mssante, drop column if exists telephone_cabinet;
```

## Fonctions de la 2a (archive, avant leur remplacement en 2b)

Pour revenir à la 2a (après avoir supprimé les versions 2b) :

```sql
create function public.annuaire_rechercher(
  p_texte text default null, p_specialites text[] default null, p_intitule uuid default null,
  p_specialites_equivalentes text[] default null, p_lat double precision default null,
  p_lon double precision default null, p_rayon_km double precision default null,
  p_limite int default 50, p_decalage int default 0
) returns table (
  rpps text, nom text, prenom text, specialite text, ville text, code_postal text,
  lat double precision, lon double precision, distance_km double precision,
  moyen_contact text, competences text[], mise_a_jour timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  return query
  with base as (
    select i.rpps, u.nom, u.prenom, u.specialite, f.ville, f.code_postal, f.lat, f.lon,
           f.moyen_contact, f.mise_a_jour, f.user_id,
           case when p_lat is not null and p_lon is not null and f.lat is not null and f.lon is not null then
             2 * 6371 * asin(sqrt(power(sin(radians(f.lat - p_lat) / 2), 2)
               + cos(radians(p_lat)) * cos(radians(f.lat)) * power(sin(radians(f.lon - p_lon) / 2), 2)))
           end as distance_km
    from public.fiches_annuaire f
    join public.identites_psc i on i.user_id = f.user_id
    join public.users u on u.id = f.user_id
    where f.publiee
      and (p_texte is null or not exists (
            select 1 from unnest(string_to_array(public.annuaire_normaliser(p_texte), ' ')) as m(mot)
            where m.mot <> '' and public.annuaire_normaliser(coalesce(u.nom, '') || ' ' || coalesce(u.prenom, '')) not like '%' || m.mot || '%'))
      and (p_specialites is null or u.specialite = any(p_specialites))
      and (p_intitule is null
           or exists (select 1 from public.fiches_intitules fi where fi.user_id = f.user_id and fi.intitule_id = p_intitule)
           or (p_specialites_equivalentes is not null and u.specialite = any(p_specialites_equivalentes)))
      and (p_rayon_km is null or p_lat is null or p_lon is null or (
           f.lat between p_lat - p_rayon_km / 111.0 and p_lat + p_rayon_km / 111.0
           and f.lon between p_lon - p_rayon_km / (111.0 * greatest(cos(radians(p_lat)), 0.01))
                         and p_lon + p_rayon_km / (111.0 * greatest(cos(radians(p_lat)), 0.01))))
  )
  select b.rpps, b.nom, b.prenom, b.specialite, b.ville, b.code_postal, b.lat, b.lon, b.distance_km,
         b.moyen_contact,
         coalesce((select array_agg(it.libelle order by it.libelle) from public.fiches_intitules fi
                   join public.intitules it on it.id = fi.intitule_id
                   where fi.user_id = b.user_id and it.statut = 'valide'), '{}'),
         b.mise_a_jour
  from base b
  where p_rayon_km is null or p_lat is null or p_lon is null or b.distance_km <= p_rayon_km
  order by b.distance_km nulls last, b.nom, b.prenom
  limit least(greatest(p_limite, 1), 100) offset greatest(p_decalage, 0);
end $$;

create function public.annuaire_fiche(p_rpps text) returns table (
  rpps text, nom text, prenom text, specialite text, ville text, code_postal text,
  lat double precision, lon double precision, moyen_contact text, mssante text, telephone_cabinet text,
  portable_disponible boolean, competences text[], mise_a_jour timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.annuaire_lecteur_autorise() then
    raise exception 'Annuaire réservé aux médecins connectés par Pro Santé Connect' using errcode = '42501';
  end if;
  return query
  select i.rpps, u.nom, u.prenom, u.specialite, f.ville, f.code_postal, f.lat, f.lon,
         f.moyen_contact, f.mssante, f.telephone_cabinet,
         exists (select 1 from public.fiches_annuaire_portables p where p.user_id = f.user_id and p.visible),
         coalesce((select array_agg(it.libelle order by it.libelle) from public.fiches_intitules fi
                   join public.intitules it on it.id = fi.intitule_id
                   where fi.user_id = f.user_id and it.statut = 'valide'), '{}'),
         f.mise_a_jour
  from public.identites_psc i
  join public.fiches_annuaire f on f.user_id = i.user_id
  join public.users u on u.id = i.user_id
  where i.rpps = p_rpps and f.publiee;
end $$;

-- annuaire_afficher_portable : inchangée en 2b (texte dans la migration 2a ci-dessus).
```
