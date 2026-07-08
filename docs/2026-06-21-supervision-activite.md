# Supervision admin — flux d'activité du site

> Dernière mise à jour : 2026-06-21

Journal d'activité unifié pour l'admin : voir en un coup d'œil ce qui se passe sur le
site (inscriptions, évaluations) **et** les modifications sensibles faites par les
éditeurs, sans fouiller table par table.

## Cadrage (figé le 2026-06-21)

- **Périmètre** : événements *sensibles* uniquement = ce qui **crée / modifie / supprime
  une donnée métier**, ou **attend une action admin**. Hors périmètre : lectures,
  navigation, recherches, brouillons intermédiaires (pas de bruit analytique).
- **Diff** : avant/après **champ par champ** ; on ne loggue que les champs réellement modifiés.
- **Canaux** : in-app (`/admin/activite` + badge non-lus) **+ digest email hebdomadaire**.
  Pas de mail immédiat (le mail à la suppression de compte existe déjà par ailleurs).
- **Rétention** : aucune purge. Volume négligeable (~10 Mo/an), sert aussi de **trace d'audit**.

## Architecture

### Table `activity_log` (flux d'événements)

Une ligne = **un événement**. Distincte de `editeurs_edit_log` (qui garde le détail
champ par champ des modifs éditeur — voir plus bas).

| Colonne        | Type          | Rôle |
|----------------|---------------|------|
| `id`           | uuid          | PK |
| `type`         | text          | cf. catalogue ci-dessous |
| `acteur_type`  | text          | `medecin` \| `editeur` \| `admin` \| `systeme` |
| `acteur_id`    | uuid          | `users.id` si applicable (null pour admin/système) |
| `acteur_label` | text          | libellé dénormalisé (survit à la suppression du compte) |
| `cible_type`   | text          | `editeur` \| `solution` \| `evaluation` \| `user` \| `proposition` \| `parametre` |
| `cible_id`     | **text**      | les ids editeurs/solutions sont des ids Firebase (text, pas uuid) |
| `cible_label`  | text          | libellé dénormalisé |
| `diff`         | jsonb         | `{ champ: { avant, apres }, … }` |
| `gravite`      | text          | `info` \| `a_moderer` |
| `lu`           | boolean       | défaut `false` |
| `created_at`   | timestamptz   | défaut `now()` |

**Sécurité** : RLS activée **sans policy** → `anon`/`authenticated` ne lisent aucune ligne.
Accès uniquement via `service_role` (les server actions et les pages admin). `claude_readonly`
a `SELECT` pour les analyses MCP. Table sensible : ne jamais exposer côté public.

### Helper `logActivity()`

`src/lib/activity/log.ts` — point d'entrée unique. **Règle d'or : ne fait jamais échouer
l'action métier appelante** (try/catch, erreur avalée + `console.error`). Le catalogue des
types est exporté dans `ACTIVITY_TYPES`.

### Capture des événements

Toutes les écritures passent par les **server actions** → point de branchement unique.

| Type | Source | Gravité |
|------|--------|---------|
| `inscription_email` | `registerWithEmail` (`actions/user.ts`) | info |
| `inscription_psc` | callback PSC (`api/auth/psc-callback`), **création de compte uniquement** (`isNewUser`) | info |
| `evaluation_publiee` / `evaluation_en_attente_psc` | `submitEvaluation` (`actions/evaluation.ts`), **création uniquement** | info / warning |
| `evaluation_a_completer` | `saveDraftEvaluation`, **1re bascule** en « à compléter » seulement | warning |
| `editeur_modif_fiche` / `editeur_modif_solution` | `updateEditeurByUser` / `updateSolutionByEditeur` (`actions/admin-users.ts`) — diff issu des `logRows` | info |
| `proposition` | `submitProposition` (`actions/propositions.ts`) | a_moderer |
| `revendication` | `createEditeurClaim` (`actions/user.ts`) | a_moderer |
| `demande_referencement` | `suggestEditeurReferencement` (`actions/admin.ts`) | a_moderer |
| `admin_suppression` | `deleteUser` (`actions/admin-users.ts`) | info |
| `admin_parametre` | `setSiteConfig` (`actions/siteConfig.ts`), si la valeur change | info |

### Modifs éditeur : deux niveaux

- **`editeurs_edit_log`** (préexistante) : détail **champ par champ**, page `/admin/editeurs-log`.
- **`activity_log`** : **1 événement résumé** par modification (avec le diff complet), pour
  que le flux unifié reste lisible. Les deux sont écrits dans la même server action.

## Restitution

### Page `/admin/activite`

- Sidebar admin → entrée **« Activité »** (au-dessus de « Utilisateurs »), badge non-lus.
- 200 derniers événements, filtres : Tous / À modérer / Inscriptions / Évaluations / Modifs éditeur.
- Non-lus surlignés, diff avant→après affiché, liens vers la cible.
- Bouton **« Tout marquer comme lu »** → `markAllActivityRead` (`actions/activity.ts`, admin-gardé).
- Badge intégré au système `AdminBadges` (`lib/db/admin-badges.ts`, clé `activite`).

### Digest hebdomadaire

`/api/cron/digest-activite` — cron Vercel **lundi 7h30** (`30 7 * * 1`).

- Récap des 7 derniers jours : total, nombre « à modérer », répartition par type, 40 plus récents.
- Email à **david.azerad@100000medecins.org** (expéditeur `contact@`, adresse SendGrid vérifiée).
- **N'envoie rien si la période est vide.**
- **Non gaté par le kill-switch `crons_routiniers_actifs`** : c'est un email **interne admin**,
  pas une relance utilisateur. Il part donc chaque lundi dès le déploiement en prod.
  Pour le couper sans redéploiement : retirer l'entrée de `vercel.json`, ou ajouter une clé
  `digest_activite_actif` (non implémenté à ce jour).
- Auth : `CRON_SECRET`, prod uniquement.

## Pour étendre

Ajouter un type dans `ACTIVITY_TYPES`, appeler `logActivity({ … })` dans la server action
concernée (après l'écriture réussie), et ajouter le libellé dans `TYPE_META`
(`admin/activite/page.tsx`) + `TYPE_LABELS` (`cron/digest-activite/route.ts`).
