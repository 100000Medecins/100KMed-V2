# Architecture emails — 100 000 Médecins

*Dernière mise à jour : 2026-04-27*

---

## Deux systèmes d'envoi coexistent

### 1. Emails natifs Supabase (non personnalisables depuis le code)

Ces emails sont envoyés automatiquement par Supabase via ses propres serveurs. Leurs templates sont configurés dans **Supabase Dashboard → Authentication → Email Templates**.

| Déclencheur code | Type Supabase | Template à éditer |
|---|---|---|
| `supabase.auth.signUp()` | Confirm signup | "Confirm signup" |
| `supabase.auth.updateUser({ email })` | Change email | "Change Email Address" |
| `supabase.auth.resetPasswordForEmail()` | Reset password | "Reset Password" |

> Ces emails ne passent **pas** par SendGrid et ne sont **pas** liés aux templates en base de données. Pour les modifier, aller dans le dashboard Supabase.

---

### 2. Emails transactionnels via SendGrid (templates en BDD)

Ces emails sont envoyés par le code, via SendGrid, avec des templates stockés dans la table `email_templates`.

| Template `id` | Déclencheur | Fichier |
|---|---|---|
| `reinitialisation_mot_de_passe` | Demande reset mdp | `src/lib/actions/user.ts` → `sendPasswordReset()` |
| `relance_1an` | Cron automatique | `src/app/api/cron/relance-evaluations/route.ts` |
| `relance_3mois` | Cron automatique | `src/app/api/cron/relance-evaluations/route.ts` |
| `relance_incomplet` | Cron automatique | `src/app/api/cron/relance-incomplets/route.ts` |
| `relance_psc` | Cron automatique | `src/app/api/cron/relance-psc/route.ts` |
| `verification_psc` | Inscription PSC | `src/app/api/auth/psc-callback/route.ts` |
| `suppression_compte` | Suppression compte | `src/lib/actions/user.ts` |
| `lancement` | Envoi manuel admin | `src/app/api/admin/send-lancement/route.ts` |
| `etude_clinique` | Envoi manuel admin | `src/app/api/admin/send-etude/route.ts` |
| `questionnaire_recherche` | Envoi manuel admin | `src/app/api/admin/send-questionnaire/route.ts` |

---

## Master layout (système de template unifié)

### Principe

Un template spécial `master_layout` stocké en BDD contient le squelette HTML complet de tous les emails SendGrid (fond navy, logo, carte blanche, barre de couleur accent). Il contient un placeholder `{{contenu}}` à l'endroit où chaque email injecte son corps.

La fonction centrale `buildEmail()` (`src/lib/actions/emailTemplates.ts`) :
1. Charge en parallèle le template demandé et le `master_layout`
2. Si le contenu du template **n'est pas** un document HTML complet (`<!DOCTYPE html>`), l'injecte dans le `{{contenu}}` du master layout
3. Si le contenu est déjà un document HTML complet, l'utilise tel quel (rétro-compatibilité)
4. Remplace toutes les variables `{{var}}` dans le HTML et dans le sujet

**Détection full document :** `contentHtml.trim().toLowerCase().startsWith('<!doctype')`

### Migration progressive des templates

Les 8 templates existants contiennent encore le HTML complet (avec `<!DOCTYPE html>`). Ils continuent de fonctionner sans modification grâce à la détection `isFullDocument`.

Pour "migrer" un template vers le nouveau système (optionnel) :
1. Ouvrir le template dans Admin → Emails
2. Passer en mode HTML brut
3. Supprimer le squelette externe (tout ce qui est autour du contenu principal)
4. Conserver uniquement les balises internes : paragraphes, variables, boutons CTA
5. Sauvegarder → `buildEmail()` encapsulera automatiquement dans le master layout

⚠️ "Migrer" ne concerne **pas** les emails Supabase natifs (confirm signup, change email). Ceux-là ne passent pas par ce système.

### Modifier l'apparence globale de tous les emails

Aller dans Admin → Emails → onglet "Template email". Modifier le layout et sauvegarder. Tous les templates **migrés** (non full-HTML) adopteront le nouveau rendu au prochain envoi.

---

## Prévisualisation et envoi de test

### Depuis l'admin

Chaque template a un éditeur avec :
- **Aperçu** : ouvre une iframe avec le rendu final (layout + contenu composés). Si le template est encore full-HTML, affiche le template seul.
- **Envoi de test** : envoie via `/api/admin/test-email` avec des variables fictives. Destinataire par défaut : `david.azerad@100000medecins.org` (modifiable).

### Route `/api/admin/test-email`

- Accepte `{ templateId, testEmail? }` en POST
- Vérifie le cookie admin (HMAC)
- Utilise `buildEmail()` (même chemin qu'en production — prévisualise le rendu réel)
- Variables fictives définies dans `SAMPLE_VARS` côté route ET dans `EmailTemplateEditor.tsx` côté preview

---

## Flux de réinitialisation de mot de passe (custom SendGrid)

> Ce flux **n'utilise pas** `supabase.auth.resetPasswordForEmail()`. Il utilise `admin.generateLink()` pour générer le lien, puis envoie lui-même l'email via SendGrid avec le template `reinitialisation_mot_de_passe`.

### Étapes

1. Utilisateur saisit son email sur `/mot-de-passe-oublie`
2. `sendPasswordReset(email)` est appelée (`src/lib/actions/user.ts`)
3. `supabase.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })` génère un `action_link` Supabase
4. `buildEmail('reinitialisation_mot_de_passe', { lien_reinitialisation: action_link }, siteUrl)` compose l'email
5. SendGrid envoie l'email
6. L'utilisateur clique → passe par `supabase.co/auth/v1/verify` (vérification token)
7. Supabase redirige vers `redirect_to` → `/reinitialiser-mot-de-passe?code=xxx`
8. La page détecte le `?code=`, appelle `exchangeCodeForSession()`, ouvre la session, affiche le formulaire

### Points de défaillance connus

**Bug historique (corrigé 2026-04-27) :** Le `redirectTo` était construit depuis les headers HTTP (`host`), ce qui pouvait produire des URLs différentes selon l'environnement (avec/sans `www`, preview vs prod). Supabase rejetait alors le `redirect_to` et renvoyait l'utilisateur vers la Site URL racine (= index du site).

**Fix appliqué :** `redirectTo` utilise maintenant `process.env.NEXT_PUBLIC_SITE_URL` (fixe par environnement Vercel).

### Checklist si le bug réapparaît

1. Vérifier `NEXT_PUBLIC_SITE_URL` dans Vercel → doit être `https://www.100000medecins.org` (sans slash final) en production
2. Vérifier **Supabase → Authentication → URL Configuration → Redirect URLs** → doit contenir :
   - `https://www.100000medecins.org/reinitialiser-mot-de-passe`
   - `https://dev.100000medecins.org/reinitialiser-mot-de-passe`
   - `http://localhost:3000/reinitialiser-mot-de-passe`
3. Vérifier le template BDD → `email_templates` où `id = 'reinitialisation_mot_de_passe'` doit contenir `{{lien_reinitialisation}}`
4. Vérifier `SENDGRID_API_KEY` dans les variables d'environnement Vercel

### Configuration Supabase requise

- **Site URL** : `https://www.100000medecins.org` (fallback si redirect_to refusé — ne pas laisser à `localhost`)
- **Redirect URLs** : voir checklist ci-dessus

---

## Page de réinitialisation (`/reinitialiser-mot-de-passe`)

La page gère deux flows de retour Supabase :

- **PKCE** (recommandé) : paramètre `?code=xxx` → `supabase.auth.exchangeCodeForSession(code)`
- **Implicit** (legacy) : fragment `#access_token=...&type=recovery` → `supabase.auth.setSession()`

Après ouverture de session, appel direct à `PUT /auth/v1/user` (bypass SDK) pour éviter les problèmes de ré-authentification côté client.

---

## Checklist ajout d'un nouvel email SendGrid

1. Insérer un nouveau template dans `email_templates` via SQL ou l'admin (id unique, sujet, contenu_html)
2. Ajouter les `SAMPLE_VARS` pour cet id dans `/api/admin/test-email/route.ts`
3. Créer ou modifier la route d'envoi pour appeler `buildEmail(templateId, vars, siteUrl)` puis `sgMail.send()`
4. Tester depuis Admin → Emails → onglet correspondant → "Tester"
