# Contexte projet — 100 000 Médecins

> Fichier maintenu manuellement pour persister le contexte entre postes et sessions.
> Dernière mise à jour : 2026-04-14

---

## Profil utilisateur

- **Prénom** : David
- **Rôle** : fondateur / responsable produit de la plateforme 100 000 Médecins
- **Profil technique** : non-développeur, travaille avec Claude Code comme principal outil de développement
- **Postes** : deux machines Windows 11 synchronisées via Synology CloudStation (répertoire partagé). Toujours faire un `git pull origin dev` en arrivant sur un nouveau poste, même si le répertoire est synchronisé, car Synology et Git sont indépendants.
- **Faux positifs git Synology** : Synology peut synchroniser les fichiers de travail avant que git soit mis à jour, ce qui fait apparaître des "modifications locales" dans `git status`. Ces modifications sont en réalité déjà commitées sur le remote. Diagnostic : `git diff HEAD` ne montre rien (faux positif CRLF/LF). Fix sans confirmation : `git checkout -- .` puis `git pull origin dev`.

---

## Préférences de travail

- Réponses **courtes et directes**
- Toujours inclure un résumé en fin de message pour confirmer ce qui a été fait (David préfère savoir ce qui a changé plutôt que de découvrir un diff sans explication)
- Pas d'emojis
- Langue française pour toutes les communications
- Confirmer avant toute action destructive (suppression fichier, force push, reset…)
- Ne pas ajouter de fonctionnalités non demandées, ni de commentaires/docstrings sur du code non modifié
- Toujours lire un fichier avant de le modifier
- David peut changer d'avis en cours de route sur des choix UX/produit — ne pas résister, ajuster sans commentaire
- Proposer l'architecture avant d'implémenter quand la tâche est non triviale (DB + composants + actions)

---

## Feedback technique important

### Supabase types — régénérer après chaque migration SQL
Après chaque `CREATE TABLE` ou `ALTER TABLE`, rappeler de régénérer :
```bash
npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts
```
**Pourquoi :** sans ça, Vercel échoue au build avec des erreurs TypeScript sur les nouvelles colonnes.

### `ignoreBuildErrors: true` dans next.config.mjs
Activé suite à une migration UTF-16→UTF-8 de `database.ts` qui a exposé ~50 erreurs TypeScript latentes. Ne pas le retirer sans résoudre les erreurs sous-jacentes d'abord.

### `src/types/database.ts` — ne jamais éditer manuellement
Fichier auto-généré par Supabase CLI. Si ce fichier se retrouve corrompu ou réduit à quelques octets (peut arriver avec Synology), faire `git restore src/types/database.ts` pour le récupérer depuis git.

### Schémas dérivés de Firebase (migration ancienne)
Plusieurs champs existent dans le code mais pas dans les types générés — utiliser `as any` :
- `solutions.prix` n'existe plus → utiliser `prix_ttc`, `prix_devise`, `prix_frequence`, `prix_duree_engagement_mois`
- Tables `actualites` et `documents` absentes des types → `(supabase as any).from('actualites')`
- `solutions.updated_at` et `editeurs.updated_at` n'existent pas
- `tags.is_principale_fonctionnalite` renommé en `is_tag_principal`

### signOut Supabase
`supabase.auth.signOut()` peut rester suspendu indéfiniment à cause du lock `navigator.locks`. Solution en place : `Promise.race` avec timeout 2s + nettoyage manuel du localStorage (`sb-*-auth-token`) dans le catch.

### RichTextEditor (TipTap)
Le composant attend `initialContent` (pas `value`) et `onChange`. Toujours utiliser `dynamic(() => import(...), { ssr: false })` pour l'importer.

---

## État du projet (avril 2026)

### Fonctionnalités récemment livrées
- **Études cliniques** : onglet toujours visible dans "Mon compte". Page utilisateur avec cartes tronquées + modale. Page DMH avec CRUD études (TipTap, images, dates) + tableau inscrits + export CSV.
- **Digital Medical Hub** : rôle `digital_medical_hub`, auto-assigné aux emails `@digitalmedicalhub.com` à l'inscription. Accès à `/mon-compte/health-data-hub`.
- **Espace éditeur** : les éditeurs (rôle `editeur`) peuvent modifier logo, mot de l'éditeur et site internet depuis `/mon-compte/mon-espace-editeur`.
- **Enrichissement RPPS** : script `scripts/enrich-rpps.mjs` utilisant l'API Tabular data.gouv.fr (resource `fffda7e9-0ea2-4c35-bba0-4496f3af935d`). 110 profils enrichis.
- **Gestion utilisateurs admin** : pagination, recherche, édition inline du rôle, spécialités SM résolues en libellés français, variantes médecine générale fusionnées.

### Fonctionnalités en attente / à venir
- **Page d'accueil** : remplacer la section "Les enjeux de l'e-santé" par les 3 derniers articles de blog
- **Études cliniques / Questionnaires** : contenu à compléter dans "Mes notifications" (en attente d'info partenaire)
- **Nettoyage schéma Supabase** : supprimer les colonnes résiduelles de la migration Firebase
- **PSC production** : migration vers l'environnement ANS production (actuellement sur BAS/test)

### Rôles utilisateur
| Rôle | Accès |
|------|-------|
| `medecin` | compte standard |
| `editeur` | + espace éditeur (logo, mot, site) |
| `digital_medical_hub` | + health-data-hub (CRUD études, inscrits) |
| `admin` | interface admin séparée (`/admin/*`, cookie HMAC) |

---

## Déploiement

- **Hébergement** : Vercel (branche `dev` → preview, branche `main` → production)
- **Git** : toujours travailler sur `dev`, merger sur `main` pour mettre en production
- **Commande de build** : `npm run build` — doit passer sans erreur avant de merger
- **Variables d'environnement** : gérées dans Vercel dashboard (ne jamais committer `.env.local`)

---

## Architecture — points clés

- **Auth** : Supabase email/password + PSC (Pro Santé Connect, flux OIDC manuel). Session cookie via middleware sur `/mon-compte/*`.
- **Service role** : utiliser `createServiceRoleClient()` uniquement pour les opérations admin/publiques (bypass RLS). `createServerClient()` pour les requêtes utilisateur (RLS enforced).
- **Emails transactionnels** : SendGrid (`@sendgrid/mail`). Variable `SENDGRID_API_KEY`. L'email DMH pour les demandes d'études cliniques est récupéré dynamiquement depuis `users` (l'utilisateur avec rôle `digital_medical_hub`).
- **Upload images** : endpoint `/api/upload`, bucket Supabase Storage `images`. Sous-dossier `etudes/` pour les études cliniques.
- **Spécialités PSC** : codes SM résolus via `resolveSpecialite()` dans `src/lib/constants/profil.ts`. SM26/SM53/SM54 = "Médecin généraliste".
