# Audit base de données — 100 000 Médecins
**Date :** 2026-05-08 (v3 — 3e passe post-corrections)
**Outil :** MCP Supabase (read-only)
**Périmètre :** schema `public`, 37 tables

---

## Résumé des corrections appliquées (sessions 1 & 2)

| Problème | Correction |
|---|---|
| Policy `etudes_all` (ALL → public) sur etudes_cliniques | ✅ Supprimée |
| FK duale `evaluations.user_id → solutions_utilisees` | ✅ Supprimée |
| Policy newsletters trop permissive (ALL → public) | ✅ Remplacée par SELECT uniquement |
| FK manquante `solutions_tags.id_tag → tags.id` | ✅ Ajoutée |
| FK manquante `solutions_criteres_actifs.id_critere → criteres.id` | ✅ Ajoutée |
| 6 index manquants (solutions_utilisees, resultats, users…) | ✅ Créés |
| Index redondant `idx_pages_statiques_slug` | ✅ Supprimé |
| `users_notification_preferences` vide (0 lignes pour 5862 users) | ✅ Backfill + trigger créé |
| 6 colonnes TEXT inutilisées dans `solutions` | ✅ Supprimées |
| `editeurs.creation` TEXT inutilisée | ✅ Supprimée |
| `solutions.date_maj` TEXT → DATE | ✅ Migré |
| `users.annee_naissance` TEXT → INTEGER | ✅ Migré |
| FK `videos.rubrique_id` (NO ACTION → SET NULL) | ✅ Corrigé |
| FK `questionnaires_these.created_by` (NO ACTION → SET NULL) | ✅ Corrigé |
| `editeurs` sans timestamps | ✅ created_at + updated_at ajoutés |
| `solutions` sans created_at | ✅ created_at ajouté |

---

## 1. Cartographie — État actuel

### Volumétrie (37 tables)

| Table | Lignes | Domaine |
|---|---|---|
| users | ~5 862 | Utilisateurs |
| users_notification_preferences | ~5 865 | Utilisateurs |
| resultats | 2 332 | Évaluations |
| solutions_utilisees | ~739 | Évaluations |
| evaluations | ~682 | Évaluations |
| evaluations_firebase_backup | 0 | **Temporaire → DROP 2026-06-26** |
| solutions_tags | 544 | Logiciels |
| users_preferences | ~318 | Utilisateurs |
| criteres | 170 | Logiciels |
| solutions_galerie | 134 | Logiciels |
| questionnaire_questions | 119 | Questionnaires |
| solutions | 92 | Logiciels |
| tags | 90 | Logiciels |
| acronymes | 57 | Contenu |
| avatars | 48 | Utilisateurs |
| editeurs | 46 | Logiciels |
| questionnaire_sections | 26 | Questionnaires |
| compte_suppressions | ~38 | Admin |
| videos | 13 | Contenu |
| solutions_favorites | ~13 | Évaluations |
| email_templates | 12 | Communication |
| site_config | 10 | Admin |
| partenaires | 8 | Contenu |
| pages_statiques | 8 | Contenu |
| categories | 6 | Logiciels |
| articles_categories | 5 | Contenu |
| articles | 3 | Contenu |
| video_rubriques | 2 | Contenu |
| preferences | 2 | Utilisateurs |
| groupes_categories | 2 | Logiciels |
| questionnaires_these | 1 | Questionnaires |
| newsletters | 1 | Communication |
| etudes_cliniques | 1 | Études |
| solutions_criteres_actifs | 0 | Logiciels (feature future) |
| suggestions_acronymes | 0 | Contenu (feature future) |
| editeur_claims | 0 | Admin (feature future) |
| emails_campagnes | 0 | Communication (campagnes futures) |

> Note : lignes marquées `~` sont estimées depuis l'audit 2 (RLS bloque le comptage anon pour ces tables).

---

## 2. Problèmes structurels restants

### 🟠 IMPORTANT — `etudes_cliniques` INSERT accessible à tous les utilisateurs authentifiés

**Problème :** La policy `DMH gère ses études INSERT` a `with_check: auth.uid() = created_by` mais aucun rôle restreint (`roles: {}`). N'importe quel utilisateur authentifié peut insérer une étude clinique.

**Mitigation actuelle :** Le flux de validation (`statut = en_attente` par défaut → validation admin manuelle) empêche les soumissions non-DMH d'être publiées.

**Correction recommandée :**
```sql
-- Ajouter un check sur le rôle DMH (via users.role = 'digital_medical_hub')
-- Option 1 : check inline dans la policy
DROP POLICY "DMH gère ses études INSERT" ON etudes_cliniques;
CREATE POLICY "DMH gère ses études INSERT" ON etudes_cliniques
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'digital_medical_hub'
    )
  );
```

---

### 🟠 IMPORTANT — `editeurs.updated_at` sans trigger d'auto-mise à jour

**Problème :** La colonne `updated_at` a été ajoutée en session 2 avec `DEFAULT now()`, mais aucun trigger `BEFORE UPDATE` n'existe sur `editeurs`. La valeur restera bloquée à la date de création pour toutes les mises à jour futures.

**Trigger actif sur `editeurs` :** aucun (vérifié via pg_trigger).

**Correction recommandée :**
```sql
CREATE TRIGGER update_editeurs_updated_at
  BEFORE UPDATE ON editeurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

> La fonction `update_updated_at_column()` existe déjà (utilisée par evaluations, articles, pages_statiques, users, etc.).

---

### 🟡 MINEUR — `solutions.date_fondation` encore en TEXT

**Problème :** Seul champ "date" restant en TEXT sur `solutions`. Correspond à une année de fondation (ex: "1998"). Non utilisé dans le code applicatif — uniquement présent dans `database.ts` (types auto-générés).

**Options :**
- Si l'intention est de stocker une année → migrer en `INTEGER`
- Si jamais utilisé et sans valeur fonctionnelle → supprimer

```sql
-- Option A : supprimer (recommandé si inutilisé)
ALTER TABLE solutions DROP COLUMN date_fondation;

-- Option B : convertir en integer
ALTER TABLE solutions ALTER COLUMN date_fondation TYPE INTEGER
  USING NULLIF(date_fondation, '')::INTEGER;
```

---

### 🟡 MINEUR — `users.age` colonne morte

**Problème :** `users.age` (INTEGER) coexiste avec `annee_naissance` (INTEGER, utilisé dans getTrancheAge) et `date_naissance` (DATE). La colonne `age` n'est référencée nulle part dans le code applicatif (uniquement dans `database.ts` auto-généré). Un age stocké en dur devient faux avec le temps.

**Correction recommandée :**
```sql
ALTER TABLE users DROP COLUMN age;
```

---

### 🟡 MINEUR — `solutions` sans `updated_at`

**Situation :** `solutions` a maintenant `created_at` (ajouté en session 2) mais pas `updated_at`. Les fiches logiciels sont modifiées régulièrement via l'admin.

**Correction recommandée (si suivi des modifications souhaité) :**
```sql
ALTER TABLE solutions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER update_solutions_updated_at
  BEFORE UPDATE ON solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 🟡 MINEUR — `email_templates` lisibles publiquement

**Problème :** Policy `lecture publique` avec `qual: true` — n'importe qui peut lire les 12 templates email (sujet + contenu HTML complet). Ces templates révèlent la structure des emails de relance, PSC, etc. Pas de secret strict, mais exposé sans raison.

**Correction recommandée :**
```sql
DROP POLICY "lecture publique" ON email_templates;
-- Accès uniquement via service_role (pas de policy = accès bloqué pour anon/authenticated)
```

> Si le front doit parfois lire un template (ex: prévisualisation admin), utiliser service_role côté serveur.

---

### 🟡 MINEUR — `solutions_utilisees.solution_precedente_id` sans FK

**Problème :** Colonne UUID qui référence implicitement `solutions.id` sans contrainte formelle ni index.

**Correction recommandée :**
```sql
ALTER TABLE solutions_utilisees
  ADD CONSTRAINT fk_utilisees_solution_precedente
  FOREIGN KEY (solution_precedente_id) REFERENCES solutions(id) ON DELETE SET NULL;

CREATE INDEX idx_solutions_utilisees_precedente ON solutions_utilisees(solution_precedente_id)
  WHERE solution_precedente_id IS NOT NULL;
```

---

### 🟡 MINEUR — FKs avec `ON DELETE NO ACTION` (risque d'orphelins)

| Table | Colonne | Référence | Risque |
|---|---|---|---|
| `solutions` | `id_categorie` | `categories.id` | Faible (catégories stables) |
| `solutions` | `id_editeur` | `editeurs.id` | Faible (éditeurs rarement supprimés) |
| `criteres` | `id_categorie` | `categories.id` | Faible |
| `criteres` | `parent_id` | `criteres.id` | Faible (hiérarchie stable) |
| `tags` | `id_categorie` | `categories.id` | Faible |

Ces tables référencent des entités stables (catégories, éditeurs). Risque opérationnel bas.

---

### 🟡 MINEUR — `database.ts` stale post-migrations

**Situation :** `database.ts` (types auto-générés) reflète encore l'ancien état :
- `date_fondation: string | null` (devrait être `number | null` si migré en INTEGER)
- `date_maj: string | null` (migré en DATE → devrait être `string | null` avec format ISO, ou utiliser un type Date)
- `editeurs.updated_at` absent des types alors qu'il existe maintenant

**Action :** Régénérer après toute migration SQL :
```bash
npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts
```

**Également : mettre à jour `CLAUDE.md`** — la note "solutions.updated_at and editeurs.updated_at do not exist" est partiellement périmée (editeurs.updated_at existe maintenant).

---

## 3. Index — État actuel ✅

Tous les index importants sont en place.

| Table | Index présents |
|---|---|
| `evaluations` | user_id, solution_id, statut, token, email_temp, updated_at ✅ |
| `solutions` | id_categorie, id_editeur, nom (trgm), description (trgm), slug (unique) ✅ |
| `solutions_utilisees` | user_id, solution_id, unique(user_id, solution_id) ✅ |
| `resultats` | solution_id, critere_id, unique(solution_id, critere_id) ✅ |
| `solutions_tags` | id_solution, id_tag ✅ |
| `users` | specialite, rpps (unique) ✅ |
| `criteres` | id_categorie ✅ |
| `editeur_claims` | user_id, statut ✅ |

**Index manquant mineur :**
- `solutions_utilisees.solution_precedente_id` (si FK ajoutée)

---

## 4. Conventions de nommage

- Nommage FK mixte (`id_xxx` vs `xxx_id`) : héritage Firebase, ne pas modifier
- PKs hétérogènes (uuid / text legacy / integer serial pour solutions_galerie, solutions_tags, solutions_criteres_actifs) : héritage, pas de migration urgente
- Colonnes timestamps manquantes sur les tables de référence (avatars, categories, criteres, tags, etc.) : tables stables, peu de valeur ajoutée

---

## 5. Sécurité RLS ✅

**RLS activé sur les 37 tables.** Toutes les tables ont des policies, sauf :
- `emails_campagnes` : 0 policy — **intentionnel** (accès service_role uniquement)
- `evaluations_firebase_backup` : 0 policy — **intentionnel** (table à supprimer 2026-06-26)

**Anomalies résiduelles :**
- `etudes_cliniques` INSERT trop permissif → voir §2 ci-dessus
- `email_templates` lecture publique → voir §2 ci-dessus
- `suggestions_acronymes` : INSERT anonyme autorisé (`roles: {anon}`, `with_check: true`) → **voulu** pour suggestions de la part des visiteurs, mais sans aucune validation. Risque de spam.

---

## 6. Tables vides / temporaires

| Table | Statut |
|---|---|
| `evaluations_firebase_backup` | **À supprimer le 2026-06-26** |
| `solutions_criteres_actifs` | Feature future, non active |
| `editeur_claims` | Feature en attente d'activation |
| `emails_campagnes` | Campagnes pas encore lancées |
| `suggestions_acronymes` | Feature pas encore activée |

---

## 7. Relations implicites non formalisées

| Table | Colonne | Référence implicite | Formalisation |
|---|---|---|---|
| `solutions_utilisees` | `solution_precedente_id` | `solutions.id` | Recommandée (voir §2) |
| `questionnaire_sections` | `categorie_slug` | `categories.slug` | Non (TEXT→TEXT) |
| `questionnaire_questions` | `critere_majeur` | `criteres.id` (logique app) | Non |
| `emails_campagnes` | `ref_id` | polymorphique | Non |
| `users` | `portrait` | `avatars.id` (probable) | Faible (portrait = URL ou id) |

---

## 8. Analyse des tables borgnes / simplifications

### Tables sans FK entrante (autonomes)
- `acronymes` — table de lookup, pas de relations. Normal.
- `partenaires` — table de contenu, pas de relations. Normal.
- `pages_statiques` — table de contenu, pas de relations. Normal.
- `avatars` — relation implicite via `users.portrait`, pas de FK formelle.
- `groupes_categories` — 2 lignes, référencée par `categories.groupe_id`. Fonctionnelle mais très petite.

### Simplification possible : `groupes_categories`
Avec seulement 2 lignes, cette table pourrait être inlinée dans `categories` via un champ `groupe_nom TEXT`. L'avantage est une jointure en moins pour récupérer les groupes. L'inconvénient est de perdre la flexibilité d'ajouter des attributs aux groupes plus tard.

**Recommandation :** ne pas migrer maintenant — trop peu de valeur ajoutée pour le travail de refactor. À reconsidérer si les groupes prennent de l'importance (descriptions, images, etc.).

---

## 9. Actions priorisées restantes

| # | Action | Sévérité | Effort |
|---|---|---|---|
| 1 | Restreindre `etudes_cliniques` INSERT aux users DMH (role='digital_medical_hub') | Important | 5 min |
| 2 | Ajouter trigger `updated_at` sur `editeurs` | Important | 2 min |
| 3 | Supprimer `users.age` (colonne morte) | Mineur | 2 min |
| 4 | Décider `solutions.date_fondation` : supprimer ou convertir en INTEGER | Mineur | 2 min |
| 5 | Régénérer `database.ts` + corriger `CLAUDE.md` | Mineur | 5 min |
| 6 | Restreindre `email_templates` au service_role | Mineur | 2 min |
| 7 | Ajouter FK + index sur `solutions_utilisees.solution_precedente_id` | Mineur | 3 min |
| 8 | Ajouter `solutions.updated_at` + trigger | Optionnel | 5 min |
| 9 | DROP `evaluations_firebase_backup` | Nettoyage | 2026-06-26 |

---

*Rapport v3 — 3e passe post-corrections, session 2026-05-08*
