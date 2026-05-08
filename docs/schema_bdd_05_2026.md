# Schéma base de données — 100 000 Médecins
**Date :** 2026-05-08 | **37 tables** | Stack : Supabase (PostgreSQL)

---

## Vue d'ensemble — Domaines

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│   UTILISATEURS  │     │           LOGICIELS                  │
│  users          │     │  groupes_categories                  │
│  users_notif_   │     │       └─ categories                  │
│    preferences  │     │            ├─ solutions              │
│  users_prefs    │     │            ├─ criteres (hiérarchie)  │
│  preferences    │     │            └─ tags                   │
│  avatars        │     │                                      │
└────────┬────────┘     └──────────────────┬──────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                       ÉVALUATIONS                           │
│  solutions_utilisees  ◄──── users × solutions               │
│  evaluations          ◄──── users × solutions (scores JSONB)│
│  resultats            ◄──── agrégats par solution × critere │
│  solutions_favorites  ◄──── users × solutions               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐
│  QUESTIONNAIRES  │  │  COMMUNICATION  │  │  CONTENU ÉDITO │
│  & ÉTUDES        │  │  newsletters    │  │  articles      │
│  questionnaire_  │  │  emails_camp.   │  │  pages_stat.   │
│    sections      │  │  email_templ.   │  │  acronymes     │
│  questionnaire_  │  │  site_config    │  │  partenaires   │
│    questions     │  └─────────────────┘  │  videos        │
│  questionnaires_ │                       └────────────────┘
│    these         │
│  etudes_cliniq.  │
└──────────────────┘
```

---

## Domaine 1 — Utilisateurs

```
auth.users (Supabase Auth)
    │ (FK CASCADE)
    ▼
┌─────────────────────────────────────────────────────────────┐
│ users                                           5 862 lignes │
├─────────────────────────────────────────────────────────────┤
│ id              uuid        PK (= auth.users.id)            │
│ rpps            text        UNIQUE — identifiant PSC        │
│ nom             text                                        │
│ prenom          text                                        │
│ email           text        email public (peut ≠ auth email)│
│ contact_email   text        email réel (PSC)                │
│ role            text        défaut: 'medecin'               │
│ specialite      text        INDEX                           │
│ mode_exercice   text        L=Libéral, S=Salarié            │
│ is_actif        boolean                                     │
│ is_complete     boolean                                     │
│ is_etudiant     boolean                                     │
│ annee_naissance integer                                     │
│ editeur_id      text        FK → editeurs (SET NULL)        │
│ created_at      timestamptz                                 │
│ updated_at      timestamptz  (trigger auto-update)          │
└──────────────┬──────────────────────────────────────────────┘
               │ 1:1
    ┌──────────▼───────────────────────────────────────────┐
    │ users_notification_preferences          5 865 lignes  │
    ├──────────────────────────────────────────────────────┤
    │ user_id              uuid  PK + FK → users (CASCADE) │
    │ relance_emails        bool  défaut: true              │
    │ marketing_emails      bool  défaut: true              │
    │ etudes_cliniques      bool  défaut: false             │
    │ questionnaires_these  bool  défaut: false             │
    └──────────────────────────────────────────────────────┘

               │ N:N
    ┌──────────▼─────────────────────┐
    │ users_preferences  318 lignes  │   ┌──────────────────┐
    ├────────────────────────────────┤   │ preferences      │
    │ user_id      uuid  PK + FK     │──▶│ id   uuid  PK    │
    │ preference_id uuid  PK + FK    │   │ libelle  text    │
    └────────────────────────────────┘   └──────────────────┘
```

---

## Domaine 2 — Logiciels

```
┌─────────────────────────────────────┐
│ groupes_categories        2 lignes  │
├─────────────────────────────────────┤
│ id    uuid  PK                      │
│ nom   text  NOT NULL                │
│ ordre integer                       │
└──────────────┬──────────────────────┘
               │ 1:N
    ┌──────────▼──────────────────────────────────────────────┐
    │ categories                                    6 lignes   │
    ├─────────────────────────────────────────────────────────┤
    │ id               text      PK (legacy Firebase)         │
    │ nom              text      NOT NULL                     │
    │ slug             text      UNIQUE INDEX                 │
    │ groupe_id        uuid      FK → groupes_categories      │
    │ actif            boolean                                │
    │ schema_evaluation jsonb    structure du formulaire      │
    │ criteres_recherche jsonb   filtres de recherche         │
    │ has_note_redac   boolean   afficher note rédaction ?    │
    │ label_fonctionnalites text  ex: "Utilité" pour l'IA     │
    └──────┬───────────────┬─────────────────┬───────────────┘
           │               │                 │
      1:N  │          1:N  │            1:N  │
    ┌──────▼───────┐ ┌─────▼──────────┐ ┌───▼────────────────┐
    │ criteres     │ │ tags           │ │ solutions          │
    │ 170 lignes   │ │ 90 lignes      │ │ 92 lignes          │
    ├──────────────┤ ├────────────────┤ ├────────────────────┤
    │ id text PK   │ │ id text PK     │ │ id uuid PK         │
    │ id_categorie │ │ id_categorie   │ │ nom  NOT NULL      │
    │ parent_id    │ │ libelle        │ │ slug UNIQUE        │
    │  (self-ref)  │ │ is_tag_principal│ │ id_categorie       │
    │ nom_court    │ │ is_separator   │ │ id_editeur         │
    │ nom_long     │ │ parent_ids[]   │ │ description        │
    │ type         │ └──────┬─────────┘ │ date_maj date      │
    │ is_parent    │        │           │ actif boolean      │
    │ is_enfant    │        │ N:N       │ evaluation_redac_* │
    │ reponse_type │  ┌─────▼─────────┐│ prix_ttc numeric   │
    └──────────────┘  │ solutions_tags ││ meta jsonb         │
                      │ 544 lignes    │└────────────────────┘
                      ├───────────────┤
                      │ id  int  PK   │
                      │ id_solution FK│
                      │ id_tag FK     │
                      │ ordre         │
                      │ is_tag_principal│
                      └───────────────┘

┌──────────────────────────────────────────────────────────────┐
│ editeurs                                          46 lignes  │
├──────────────────────────────────────────────────────────────┤
│ id            text   PK (legacy Firebase)                    │
│ nom           text                                           │
│ siret         text                                           │
│ description   text                                           │
│ website       text                                           │
│ logo_url      text                                           │
│ contact_email text                                           │
│ user_id       uuid   FK → users (SET NULL)                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ solutions_galerie                               134 lignes   │
├──────────────────────────────────────────────────────────────┤
│ id          int   PK serial                                  │
│ id_solution uuid  FK → solutions (CASCADE)  INDEX           │
│ type        text  (image/video)                              │
│ url         text                                             │
│ ordre       int                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ solutions_criteres_actifs                          0 lignes  │
├──────────────────────────────────────────────────────────────┤
│ id          int   PK serial                                  │
│ id_solution uuid  FK → solutions (CASCADE)  INDEX           │
│ id_critere  text  FK → criteres (CASCADE)                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Domaine 3 — Évaluations

```
users ──────────────────────────────────────────────────────────┐
  │                                                             │
  │ N:N (une utilisation = une solution utilisée par un user)  │
  ▼                                                             │
┌──────────────────────────────────────────────────────────┐   │
│ solutions_utilisees                          739 lignes   │   │
├──────────────────────────────────────────────────────────┤   │
│ id              uuid   PK                                │   │
│ user_id         uuid   FK → users (CASCADE)   INDEX      │   │
│ solution_id     uuid   FK → solutions (CASCADE)  INDEX   │   │
│ statut_evaluation text  défaut: 'instanciee'             │   │
│ date_debut      date                                     │   │
│ date_fin        date                                     │   │
│ solution_precedente_id uuid (référence informelle)       │   │
│ UNIQUE (user_id, solution_id)                            │   │
└──────────────────────────────────────────────────────────┘   │
  │                                                             │
  │ 1:N (une utilisation → une évaluation)                     │
  ▼                                                             │
┌──────────────────────────────────────────────────────────┐   │
│ evaluations                                  682 lignes   │   │
├──────────────────────────────────────────────────────────┤   │
│ id                  uuid  PK                             │   │
│ user_id             uuid  FK → users (CASCADE)   INDEX   │◄──┘
│ solution_id         uuid  FK → solutions (CASCADE) INDEX │
│ scores              jsonb NOT NULL — toutes les notes    │
│ moyenne_utilisateur numeric — calculée auto (trigger)    │
│ statut              text  publiee/en_attente_psc/…       │
│ email_temp          text  — éval anonyme avant compte    │
│ token_verification  uuid  INDEX                          │
│ relance_count       int   NOT NULL défaut: 0             │
│ created_at / updated_at  timestamptz                     │
│ UNIQUE (user_id, solution_id)                            │
└──────────────────────────────────────────────────────────┘
  │
  │ Calcul agrégé (trigger/fonction recalcResultats)
  ▼
┌──────────────────────────────────────────────────────────┐
│ resultats                                  2 332 lignes   │
├──────────────────────────────────────────────────────────┤
│ id                    uuid  PK                           │
│ solution_id           uuid  FK → solutions (CASCADE) IDX │
│ critere_id            text  FK → criteres (CASCADE)  IDX │
│ moyenne_utilisateurs  numeric                            │
│ moyenne_utilisateurs_base5 numeric  (échelle 0-5)        │
│ nb_notes              int                                │
│ note_redac            numeric  (note éditoriale)         │
│ note_redac_base5      numeric                            │
│ nps                   numeric  (Net Promoter Score)      │
│ notes / repartition   jsonb  histogramme détaillé        │
│ UNIQUE (solution_id, critere_id)                         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ solutions_favorites                           13 lignes   │
├──────────────────────────────────────────────────────────┤
│ user_id     uuid  PK + FK → users (CASCADE)              │
│ solution_id uuid  PK + FK → solutions (CASCADE)          │
│ created_at  timestamptz                                  │
└──────────────────────────────────────────────────────────┘
```

---

## Domaine 4 — Questionnaires & Études

```
┌──────────────────────────────────────────────────────────┐
│ questionnaire_sections                        26 lignes   │
├──────────────────────────────────────────────────────────┤
│ id            uuid  PK                                   │
│ categorie_slug text  → categories.slug (informel)   IDX  │
│ titre         text  NOT NULL                             │
│ introduction  text                                       │
│ ordre         int   NOT NULL                             │
└──────────────┬───────────────────────────────────────────┘
               │ 1:N
    ┌──────────▼───────────────────────────────────────────┐
    │ questionnaire_questions                  119 lignes   │
    ├──────────────────────────────────────────────────────┤
    │ id              uuid  PK                             │
    │ section_id      uuid  FK → sections (CASCADE)   IDX  │
    │ key             text  NOT NULL (clé dans scores JSONB)│
    │ question        text  NOT NULL                       │
    │ critere_majeur  text  → criteres.id (informel)       │
    │ ordre           int   NOT NULL                       │
    └──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ questionnaires_these                            3 lignes  │
├──────────────────────────────────────────────────────────┤
│ id           uuid  PK                                    │
│ titre        text  NOT NULL                              │
│ lien         text  NOT NULL                              │
│ created_by   uuid  FK → users (NO ACTION ⚠ → SET NULL)  │
│ statut       text  en_attente/publie/refuse              │
│ date_fin     date                                        │
│ specialites_cibles text[]                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ etudes_cliniques                                1 ligne   │
├──────────────────────────────────────────────────────────┤
│ id           uuid  PK                                    │
│ titre        text  NOT NULL                              │
│ created_by   uuid  FK → users (SET NULL)                 │
│ statut       text  en_attente/publie/refuse              │
│ date_debut   date                                        │
│ date_fin     date                                        │
│ specialites_cibles text[]                                │
└──────────────────────────────────────────────────────────┘
```

---

## Domaine 5 — Communication

```
┌──────────────────────────────────────────────────────────┐
│ email_templates                               12 lignes   │
├──────────────────────────────────────────────────────────┤
│ id          text  PK (ex: 'bienvenue', 'relance_eval')   │
│ sujet       text  NOT NULL                               │
│ contenu_html text NOT NULL                               │
│ updated_at  timestamptz                                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ newsletters                                    1 ligne    │
├──────────────────────────────────────────────────────────┤
│ id           uuid  PK                                    │
│ mois         text  UNIQUE (ex: '2026-05')                │
│ statut       text  draft/sent                            │
│ contenu_html text                                        │
│ scheduled_at timestamptz                                 │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ emails_campagnes                               0 lignes   │
├──────────────────────────────────────────────────────────┤
│ id          uuid  PK                                     │
│ type        text  email_etude/email_questionnaire        │
│ ref_id      uuid  → solution ou newsletter (polymorphe)  │
│ statut      text  pending/sent/cancelled                 │
│ specialites_cibles text[]                                │
│ scheduled_at timestamptz                                 │
│ INDEX (statut, scheduled_at)                             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ site_config                                   10 lignes   │
├──────────────────────────────────────────────────────────┤
│ cle    text  PK  (ex: 'crons_routiniers_actifs')         │
│ valeur text  NOT NULL                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Domaine 6 — Contenu éditorial

```
┌──────────────────────────────────────────────────┐
│ articles_categories                    5 lignes   │
├──────────────────────────────────────────────────┤
│ id    uuid  PK                                   │
│ nom   text  NOT NULL                             │
│ slug  text  UNIQUE                               │
└──────────────┬───────────────────────────────────┘
               │ 1:N
    ┌──────────▼───────────────────────────────────┐
    │ articles                           5 lignes   │
    ├──────────────────────────────────────────────┤
    │ id              uuid  PK                     │
    │ titre           text  NOT NULL               │
    │ slug            text  NOT NULL UNIQUE        │
    │ id_categorie    uuid  FK → articles_cat      │
    │ statut          text  défaut: 'brouillon'    │
    │ date_publication timestamptz                 │
    │ scheduled_at    timestamptz                  │
    └──────────────────────────────────────────────┘

┌─────────────────────┐  ┌──────────────────────────┐
│ avatars  48 lignes  │  │ partenaires    8 lignes   │
│ id uuid PK          │  │ id uuid PK               │
│ url text NOT NULL   │  │ nom / logo_url / lien_url │
└─────────────────────┘  │ actif boolean            │
                         └──────────────────────────┘

┌──────────────────────────────────────────────────┐
│ acronymes                              57 lignes  │
├──────────────────────────────────────────────────┤
│ id         uuid  PK                              │
│ sigle      text  NOT NULL                        │
│ definition text  NOT NULL                        │
│ categorie  text  (thématique, ex: 'médical')     │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ video_rubriques                         2 lignes  │
├──────────────────────────────────────────────────┤
│ id    uuid  PK                                   │
│ nom   text  NOT NULL                             │
└──────────────┬───────────────────────────────────┘
               │ 1:N
    ┌──────────▼───────────────────────────────────┐
    │ videos                            13 lignes   │
    ├──────────────────────────────────────────────┤
    │ id          uuid  PK                         │
    │ rubrique_id uuid  FK → video_rubriques       │
    │             (NO ACTION ⚠ → devrait SET NULL) │
    │ titre / url / type                           │
    │ statut text  défaut: 'publie'                │
    └──────────────────────────────────────────────┘
```

---

## Domaine 7 — Admin / Technique

```
┌──────────────────────────────────────────────────────────┐
│ compte_suppressions                           38 lignes   │
├──────────────────────────────────────────────────────────┤
│ id          uuid  PK                                     │
│ deleted_at  timestamptz  NOT NULL                        │
│ prenom / nom / specialite / raison  text                 │
│ avec_suppression_avis  boolean  NOT NULL                 │
│ RLS: service_role only (qual: false)                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ editeur_claims                                 0 lignes   │
├──────────────────────────────────────────────────────────┤
│ id          uuid  PK                                     │
│ user_id     uuid  FK → users (CASCADE)                   │
│ editeur_id  text  FK → editeurs (SET NULL)               │
│ solution_id uuid  FK → solutions (SET NULL)              │
│ statut      text  défaut: 'en_attente'                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ evaluations_firebase_backup           679 lignes          │
│ ⚠ TABLE TEMPORAIRE — DROP prévu le 2026-06-26            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ pages_statiques                             8 lignes      │
├──────────────────────────────────────────────────────────┤
│ id       uuid  PK                                        │
│ slug     text  UNIQUE                                    │
│ titre    text  NOT NULL                                  │
│ contenu  text  (HTML sanitizé)                           │
│ metadata jsonb                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Règles RLS résumées

| Type d'accès | Tables | Règle |
|---|---|---|
| **Lecture publique** | solutions, editeurs, categories, criteres, tags, resultats, avatars, acronymes, articles (publiés), pages_statiques, partenaires, videos, questionnaire_*, site_config, email_templates, groupes_categories, solutions_galerie, solutions_tags, solutions_criteres_actifs, preferences | `qual: true` — accessible sans auth |
| **Données personnelles** | evaluations, solutions_utilisees, solutions_favorites, users, users_preferences, users_notification_preferences | `auth.uid() = user_id/id` |
| **Service role uniquement** | compte_suppressions, emails_campagnes | Bloqué pour tous les autres rôles |
| **Submissions modérées** | etudes_cliniques, questionnaires_these | INSERT libre (auth), validation admin avant publication |

---

## Légende

- `FK →` : clé étrangère formelle
- `IDX` : index dédié présent
- `PK` : clé primaire
- `NOT NULL` : contrainte d'intégrité
- `UNIQUE` : contrainte d'unicité
- `⚠` : point d'attention (voir audit)
- `(CASCADE)` : suppression en cascade
- `(SET NULL)` : mise à NULL si parent supprimé
- `(NO ACTION)` : aucune action = risque d'orphelins

---

*Schéma généré par audit MCP Supabase — 100 000 Médecins — 2026-05-08*
