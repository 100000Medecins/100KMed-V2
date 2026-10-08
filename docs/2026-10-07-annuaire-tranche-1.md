# Annuaire mutualisé — tranche 1 « Ma fiche annuaire »

2026-10-07. Document de référence de la tranche 1 : décisions, schéma appliqué en base, étapes.
Sources (dépôt messagerie, lecture seule) : `docs/annuaire-mutualise.md` (proposition technique),
`docs/annuaire-surspecialites.md` (catalogue), `docs/annuaire-cgu-confidentialite.md` et
`docs/site-textes/LISEZMOI.md` (promesses des CGU et de la charte).

## Périmètre

Dans Mon compte, une fiche annuaire **invisible des autres** : moyen de contact préféré, portable
avec sa case de visibilité, compétences choisies dans une liste commune (avec proposition d'un
intitulé manquant), case « publier ma fiche ». Dans l'administration : validation des intitulés
proposés. Suppression et fusion de compte étendues aux nouvelles tables. La lecture par les
confrères (portable fiche par fiche, plafond, journal) est la tranche 2.

## Décisions de David (05-07/10)

- Données gardées dans la base Supabase du site ; lecture réservée aux médecins connectés par PSC.
- Fiche publiée seulement sur case cochée (non cochée par défaut) ; date et version de l'accord
  enregistrées. Portable masqué par défaut, case distincte ; jamais dans une liste ni un fichier.
- Nouvelles tables seulement, `users` non modifiée (hors correctif de droits du 06/10).
- **Interrupteur** plutôt qu'une branche longue : travail sur `dev`. `app_settings.annuaire_actif`
  (ligne absente = éteint) piloté depuis l'admin ; `ANNUAIRE_FORCER_ACTIF=true` dans `.env.local`
  des deux postes et dans Vercel (environnements Preview et Development), jamais en Production.
- **Médecins seulement** sur le site. Les autres professions pourront remplir leur fiche par
  l'application (stockée chez nous), sans accès par le site → `identites_psc.code_profession`.
- **Preuve PSC** dans `identites_psc`, écrite seulement par le callback PSC : `users.rpps` était
  modifiable par l'utilisateur (corrigé le 06/10) et ne prouve pas une connexion PSC.
- **Catalogue** :
  1. pas de pratiques non conventionnelles sauf « Hypnose médicale » (retirés : acupuncture,
     homéopathie, mésothérapie, médecine manuelle-ostéopathie) ;
  2. rubrique **« Compétences »**, sans case « diplôme », mention « déclarées par le médecin,
     non vérifiées » ;
  3. niveau de détail du document messagerie, plus une dizaine d'intitulés pour les spécialités
     chirurgicales presque vides (neurochirurgie, plastique, vasculaire, cardiaque et thoracique) ;
  4. ordre alphabétique, 20 compétences au plus, nature (FST, capacité…) ni affichée ni stockée ;
  5. David valide seul dans `/admin/intitules` : Accepter, Reformuler, Fusionner comme synonyme,
     Refuser (= suppression) ; propositions signalées dans le flux Activité et le résumé hebdo.
- **Compétences et pathologies fusionnées** : une seule liste « Compétences » (`type = 'competence'`) ;
  les conditions d'exercice (domicile, téléconsultation, secteur, langues) viendront plus tard
  (`type = 'condition'`). Saisie et recherche par champ de recherche (libellé + synonymes, sans
  accents) ; champ vide → compétences de la rubrique du médecin.
- **Pas de redite avec la spécialité RPPS** : un intitulé équivalent à la spécialité du médecin
  (DES ou option de DES, codes SM) lui est masqué (`intitules.specialites_sm`) ; la recherche du
  confrère porte sur la spécialité et les compétences.

## Schéma appliqué le 2026-10-07 (SQL Editor, rôle postgres, une transaction)

Supabase donne encore d'office **tous les droits** à `anon` et `authenticated` sur toute table créée
dans `public` (`pg_default_acl`, jusqu'au changement du 2026-10-30) : la migration retire tout avant
d'accorder.

```sql
begin;

create table public.identites_psc (
  user_id uuid primary key references public.users(id) on delete cascade,
  rpps text not null unique,
  code_profession text,
  verifie_le timestamptz not null default now(),
  derniere_connexion_psc timestamptz not null default now()
);

create table public.fiches_annuaire (
  user_id uuid primary key references public.identites_psc(user_id) on delete cascade on update cascade,
  moyen_contact text check (moyen_contact in ('messagerie', 'mssante', 'telephone')),
  publiee boolean not null default false,
  publiee_accord_le timestamptz,
  publiee_accord_version text,
  created_at timestamptz not null default now(),
  mise_a_jour timestamptz not null default now(),
  constraint fiches_annuaire_accord_si_publiee
    check (not publiee or (publiee_accord_le is not null and publiee_accord_version is not null))
);

create table public.fiches_annuaire_portables (
  user_id uuid primary key references public.fiches_annuaire(user_id) on delete cascade on update cascade,
  portable text not null check (portable ~ '^\+[1-9][0-9]{7,14}$'),
  visible boolean not null default false,
  visible_accord_le timestamptz,
  visible_accord_version text,
  mise_a_jour timestamptz not null default now(),
  constraint portables_accord_si_visible
    check (not visible or (visible_accord_le is not null and visible_accord_version is not null))
);

create table public.intitules (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'competence' check (type in ('competence', 'condition')),
  libelle text not null check (char_length(btrim(libelle)) between 2 and 120),
  synonymes text[] not null default '{}',
  groupe text,
  specialites_sm text[] not null default '{}',
  statut text not null default 'propose' check (statut in ('propose', 'valide')),
  propose_par uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  decide_le timestamptz
);
create unique index intitules_type_libelle_key on public.intitules (type, lower(btrim(libelle)));

create table public.fiches_intitules (
  user_id uuid not null references public.fiches_annuaire(user_id) on delete cascade on update cascade,
  intitule_id uuid not null references public.intitules(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, intitule_id)
);
create index fiches_intitules_intitule_idx on public.fiches_intitules (intitule_id);

create function public.annuaire_horodater_fiche() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.mise_a_jour := now();
  if not new.publiee then
    new.publiee_accord_le := null;
    new.publiee_accord_version := null;
  elsif tg_op = 'INSERT' then
    new.publiee_accord_le := now();
  elsif not old.publiee or new.publiee_accord_version is distinct from old.publiee_accord_version then
    new.publiee_accord_le := now();
  else
    new.publiee_accord_le := old.publiee_accord_le;
  end if;
  return new;
end $$;

create function public.annuaire_horodater_portable() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.mise_a_jour := now();
  if not new.visible then
    new.visible_accord_le := null;
    new.visible_accord_version := null;
  elsif tg_op = 'INSERT' then
    new.visible_accord_le := now();
  elsif not old.visible or new.visible_accord_version is distinct from old.visible_accord_version then
    new.visible_accord_le := now();
  else
    new.visible_accord_le := old.visible_accord_le;
  end if;
  return new;
end $$;

create function public.annuaire_limiter_competences() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.fiches_intitules where user_id = new.user_id) >= 20 then
    raise exception 'Une fiche compte au plus 20 compétences.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger fiches_annuaire_horodater before insert or update on public.fiches_annuaire
  for each row execute function public.annuaire_horodater_fiche();
create trigger portables_horodater before insert or update on public.fiches_annuaire_portables
  for each row execute function public.annuaire_horodater_portable();
create trigger fiches_intitules_limiter before insert on public.fiches_intitules
  for each row execute function public.annuaire_limiter_competences();

revoke all on public.identites_psc, public.fiches_annuaire, public.fiches_annuaire_portables,
  public.intitules, public.fiches_intitules from anon, authenticated;

grant select on public.identites_psc to authenticated;
grant select, insert, update, delete on public.fiches_annuaire, public.fiches_annuaire_portables to authenticated;
grant select on public.intitules to authenticated;
grant select, insert, delete on public.fiches_intitules to authenticated;

grant select, insert, update, delete on public.identites_psc, public.fiches_annuaire,
  public.fiches_annuaire_portables, public.intitules, public.fiches_intitules to service_role;

grant select on public.identites_psc, public.fiches_annuaire, public.intitules, public.fiches_intitules to claude_readonly;

alter table public.identites_psc enable row level security;
alter table public.fiches_annuaire enable row level security;
alter table public.fiches_annuaire_portables enable row level security;
alter table public.intitules enable row level security;
alter table public.fiches_intitules enable row level security;

create policy "Voit sa preuve PSC" on public.identites_psc
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Voit sa fiche" on public.fiches_annuaire
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Crée sa fiche" on public.fiches_annuaire
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Modifie sa fiche" on public.fiches_annuaire
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Supprime sa fiche" on public.fiches_annuaire
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Voit son portable" on public.fiches_annuaire_portables
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Crée son portable" on public.fiches_annuaire_portables
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Modifie son portable" on public.fiches_annuaire_portables
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Supprime son portable" on public.fiches_annuaire_portables
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Voit les intitulés validés et ses propositions" on public.intitules
  for select to authenticated using (statut = 'valide' or propose_par = (select auth.uid()));

create policy "Voit ses compétences" on public.fiches_intitules
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Ajoute une compétence validée ou proposée par lui" on public.fiches_intitules
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.intitules i
                where i.id = intitule_id and (i.statut = 'valide' or i.propose_par = (select auth.uid())))
  );
create policy "Retire une compétence" on public.fiches_intitules
  for delete to authenticated using (user_id = (select auth.uid()));

commit;
```

Retour arrière (tant que les tables sont vides ou qu'on accepte de perdre leur contenu) :

```sql
drop table if exists public.fiches_intitules, public.fiches_annuaire_portables, public.fiches_annuaire,
  public.intitules, public.identites_psc cascade;
drop function if exists public.annuaire_horodater_fiche(), public.annuaire_horodater_portable(),
  public.annuaire_limiter_competences();
```

### Points de conception

- **Pas de fiche sans preuve PSC** : la clé étrangère `fiches_annuaire → identites_psc` l'impose
  en base, sans fonction de contrôle. `identites_psc` n'est écrite que par le serveur.
- **Fusion de comptes** : déplacer `identites_psc.user_id` suffit, la fiche, le portable et les
  compétences suivent (`on update cascade`).
- **Dates d'accord** posées par la base : nouvel accord (case cochée, ou version changée) = `now()` ;
  accord inchangé = date intouchable ; case décochée = date et version effacées.
- **Portable** : table à part, sans règle de lecture pour les autres, et fermée au rôle MCP
  `claude_readonly`. En tranche 2, il ne sortira que par une fonction (plafond par jour + journal).
- **Propositions** : écrites par une action serveur (service role) après contrôle (preuve PSC,
  nombre de propositions en attente) ; `authenticated` n'a que la lecture sur `intitules`.

### Vérifié le 2026-10-07 après exécution

RLS active sur les 5 tables ; 13 règles (4 + 4 + 3 + 1 + 1) ; `anon` sans aucun droit ;
`authenticated` limité à ce qui est accordé ci-dessus, sans `TRUNCATE` ; `service_role` complet ;
`claude_readonly` en lecture sauf sur `fiches_annuaire_portables` ; 3 déclencheurs en place.
`src/types/database.ts` régénéré : +185 lignes (les 5 tables), rien de retiré.

## Étapes

1. ~~Correctif des droits `users` / `evaluations` (06/10).~~
2. ~~Questions du catalogue (06-07/10).~~
3. ~~Migration + types (07/10).~~
4. ~~Catalogue de départ : 209 intitulés insérés le 07/10 (`scripts/annuaire-catalogue-initial.ts`).~~
5. ~~Interrupteur (`/admin/parametres`) + preuve PSC écrite par `psc-callback` (07/10).~~
6. ~~Page « Ma fiche annuaire » (`/mon-compte/annuaire`) : essai réel par David le 07/10 en local
   (connexion PSC BAS), proposition puis refus dans l'admin.~~
7. ~~Page `/admin/intitules` (07/10) : accepter / reformuler, fusionner comme synonyme, refuser.~~
8. ~~Suppression (`account.ts`, `admin-users.ts`) et fusion (`merge.ts`) de compte (07/10) ; compte
   de test BAS supprimé le 08/10 par l'action admin réelle : plus rien dans l'annuaire.~~ (La fusion
   n'est pas essayée en réel : il faudrait deux comptes du même médecin.)

**Tranche 1 terminée le 2026-10-08**, en production derrière l'interrupteur éteint (`bb41b77`).
9. ~~Étanchéité (07/10) : anonyme refusé sur les 5 tables ; un autre médecin connecté ne lit ni ne
   modifie rien ; le titulaire voit sa fiche.~~ Test rejouable dans le SQL Editor :
   `select set_config('role','authenticated',true); select set_config('request.jwt.claims','{"sub":"<uuid>","role":"authenticated"}',true);`
   puis la requête de comptage, en une seule exécution.
