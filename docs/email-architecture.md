# Architecture emails — 100 000 Médecins

*Dernière mise à jour : 2026-06-20*

---

## Deux systèmes d'envoi coexistent

### 1. Emails natifs Supabase — PLUS AUCUN (depuis 2026-06-20)

**Aucun email transactionnel ne passe plus par Supabase.** Les trois flux qui en dépendaient ont été migrés vers des liens HMAC idempotents envoyés par SendGrid (les tokens OTP Supabase, à usage unique, étaient consommés par le pré-scan Outlook Safe Links / Gmail avant le clic réel → liens morts) :

- inscription (2026-05-21) — `supabase.auth.signUp()` plus appelé,
- réinitialisation mot de passe (2026-05-21) — `resetPasswordForEmail()` / `generateLink({ type: 'recovery' })` plus appelés,
- **changement d'email (2026-06-20)** — `auth.updateUser({ email })` plus appelé (dernier flux migré).

> ⚠️ **Les templates natifs du dashboard Supabase (Authentication → Email Templates : « Confirm signup », « Reset password », « Change Email Address »…) sont désormais MORTS** : aucun code ne les déclenche plus. **Ne pas les éditer en croyant agir sur les emails réels** — tout passe par les templates `email_templates` en BDD + SendGrid (section ci-dessous). On les laisse en place uniquement comme filet de sécurité au cas où un flux natif serait un jour réactivé.
>
> Note : Supabase Auth reste la source de vérité pour l'**identité**, les **sessions** et la **RLS** (on utilise toujours l'API admin : `createUser`, `updateUserById`, `generateLink`, `verifyOtp`). Seule la **couche d'envoi d'emails** a quitté Supabase.

---

### 2. Emails transactionnels via SendGrid (templates en BDD)

Ces emails sont envoyés par le code, via SendGrid, avec des templates stockés dans la table `email_templates`.

| Template `id` | Déclencheur | Fichier |
|---|---|---|
| `confirmation_inscription` | Inscription email/mot de passe | `src/lib/actions/user.ts` → `registerWithEmail()` |
| `reinitialisation_mot_de_passe` | Demande reset mdp | `src/lib/actions/user.ts` → `sendPasswordReset()` |
| `confirmation_changement_email` | Demande de changement d'email (envoyé à la **nouvelle** adresse) | `src/lib/actions/user.ts` → `requestEmailChange()` |
| `notification_changement_email` | Courtoisie après changement (envoyé à l'**ancienne** adresse) | `src/app/confirmer-changement-email/route.ts` |
| `fusion_comptes` | Conflit d'email à la complétion de profil | `src/lib/actions/user.ts` → `completeProfile()` |
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

Chaque template est soit un **fragment** (contenu seul, encapsulé dans le `master_layout`), soit un **document complet** (commence par `<!DOCTYPE html>`, utilisé tel quel). La détection `isFullDocument` permet aux deux de coexister.

Templates déjà migrés en fragment `<tr><td>` : `fusion_comptes`, `confirmation_inscription`, `reinitialisation_mot_de_passe`. Les templates de relance / étude / questionnaire / infos mensuels sont encore en document complet (ils embarquent leur propre layout) — leur migration est optionnelle.

⚠️ Un fragment ne doit **jamais** embarquer son propre `<img>` logo ni sa barre accent : le `master_layout` les fournit déjà. Sinon → double logo (bug rencontré sur `confirmation_inscription`, corrigé le 2026-05-21).

Pour "migrer" un template vers le nouveau système (optionnel) :
1. Ouvrir le template dans Admin → Emails
2. Passer en mode HTML brut
3. Supprimer le squelette externe (tout ce qui est autour du contenu principal)
4. Conserver uniquement les balises internes : paragraphes, variables, boutons CTA
5. Sauvegarder → `buildEmail()` encapsulera automatiquement dans le master layout

⚠️ Il n'y a **plus aucun email Supabase natif** (cf. §1) — tous les emails transactionnels passent par ce système de templates BDD + SendGrid.

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

## Footer "Gérer mes préférences de notification" (lien HMAC-only)

> Tous les emails marketing/relance/newsletter doivent contenir ce footer.
> Le lien permet à un utilisateur de modifier ses préférences **sans se logguer**.

### Architecture

Le lien dans le footer ressemble à :
```
{siteUrl}/gerer-notifications?uid={userId}&iat={timestamp}&token={HMAC}
```

- **`uid`** : id du destinataire
- **`iat`** : timestamp d'émission Unix
- **`token`** : `sha256(EMAIL_SECRET, "notif:" + uid + ":" + iat)` — TTL 1 an

La page `/gerer-notifications` est un Server Component **idempotent** (GET ne modifie rien). Le HMAC est revérifié à chaque toggle (POST via server action). **Aucun magiclink, aucune session créée** → résistant aux scanners anti-phishing (Outlook Safe Links, Gmail) qui consommeraient un magiclink single-use.

Si le navigateur a déjà une session active, un lien "Aller à mon compte" s'affiche en bas de la page.

### Génération du lien (single source of truth)

```ts
import { generateUnsubscribeLink } from '@/lib/email/unsubscribe'

const lienDesabonnement = generateUnsubscribeLink(user.id, siteUrl)
```

Cette fonction est l'unique point de génération. Tous les endpoints d'envoi doivent l'utiliser. **Ne jamais hardcoder** `${siteUrl}/mon-compte/mes-notifications` (qui exigerait une session loggée — perd l'intérêt du footer).

### À inclure dans le template HTML (BDD)

Le footer doit contenir explicitement le placeholder `{{lien_desabonnement}}` quelque part dans le HTML stocké en `email_templates.contenu_html`. Exemple :

```html
<p style="font-size:11px;color:#888;">
  <a href="{{lien_desabonnement}}" style="color:#888;">Gérer mes préférences de notification</a>
</p>
```

Le `master_layout` **ne contient pas** ce footer automatiquement — chaque template doit l'inclure dans son contenu. Sans ce placeholder, la variable est ignorée et l'email part sans footer.

---

## Flux de réinitialisation de mot de passe (lien HMAC idempotent)

> Réécrit le 2026-05-21. Ce flux **n'utilise plus** ni `supabase.auth.resetPasswordForEmail()` ni `admin.generateLink({ type: 'recovery' })`. Le token OTP Supabase est à usage unique : les clients mail / antivirus qui pré-scannent les liens le consommaient avant le clic réel de l'utilisateur (→ lien mort). Il est remplacé par un lien HMAC maison **idempotent** (rejouable), sur le même modèle que la confirmation d'inscription.

### Étapes

1. L'utilisateur saisit son email sur `/mot-de-passe-oublie`.
2. `sendPasswordReset(email)` (`src/lib/actions/user.ts`) résout l'`uid` depuis la table `users`. Si l'email est inconnu : retour silencieux (on ne révèle pas l'existence d'un compte).
3. `generateResetToken(uid)` (`src/lib/email/reset-token.ts`) produit un HMAC `sha256(EMAIL_SECRET, "reset:uid:iat")`, TTL **1 heure**.
4. `buildEmail('reinitialisation_mot_de_passe', { lien_reinitialisation }, siteUrl)` compose l'email — le lien pointe directement sur `/reinitialiser-mot-de-passe?uid&iat&token` (plus de passage par `supabase.co/auth/v1/verify`).
5. SendGrid envoie l'email.
6. L'utilisateur clique → la page `/reinitialiser-mot-de-passe` (Server Component) re-vérifie le HMAC et n'affiche le formulaire que si le token est valide.
7. À la soumission, l'action `resetPasswordWithToken(uid, iat, token, newPassword)` re-vérifie le HMAC côté serveur puis appelle `admin.updateUserById`.

### Idempotence (résistance au pré-scan)

Le **GET** du lien n'affiche que le formulaire — il ne modifie rien. C'est le **POST** (`resetPasswordWithToken`) qui agit. Un scanner anti-phishing qui ouvre le lien ne consomme donc rien, et le HMAC reste rejouable jusqu'à expiration. Plus de « lien mort ».

### Configuration requise

1. `EMAIL_SECRET` (ou `ADMIN_PASSWORD` en fallback) défini — clé de signature HMAC.
2. `NEXT_PUBLIC_SITE_URL` dans Vercel → `https://www.100000medecins.org` (sans slash final) en production : sert à construire le lien absolu.
3. Le template BDD `email_templates` où `id = 'reinitialisation_mot_de_passe'` doit contenir `{{lien_reinitialisation}}`.
4. `SENDGRID_API_KEY` dans les variables d'environnement Vercel.

> **Plus besoin** de déclarer `/reinitialiser-mot-de-passe` dans les Redirect URLs Supabase : le lien ne transite plus par `supabase.co/auth/v1/verify`.

---

## Page de réinitialisation (`/reinitialiser-mot-de-passe`)

Server Component (`force-dynamic`). Lit `uid`, `iat`, `token` dans les `searchParams` et appelle `verifyResetToken` :

- token **valide** → rend `ResetPasswordForm` (client component) ;
- token **expiré** / **invalide** → écran d'erreur + lien vers `/connexion`.

Aucune session n'est ouverte, aucun `code` / `access_token` n'est échangé : la page ne fait que vérifier le HMAC et afficher un formulaire. La mise à jour réelle du mot de passe passe par l'action serveur `resetPasswordWithToken`.

---

## Flux de changement d'email (lien HMAC idempotent)

> Migré le 2026-06-20. **N'utilise plus** `supabase.auth.updateUser({ email })` (qui envoyait un email natif Supabase + gérait un état « pending email » côté auth). Remplacé par un lien HMAC maison idempotent via SendGrid, sur le même modèle que le reset mot de passe.

### Étapes

1. Sur `/mon-compte/profil`, l'utilisateur saisit la nouvelle adresse → `requestEmailChange(newEmail)` (`src/lib/actions/user.ts`).
2. L'action vérifie la session, le format, que l'adresse diffère de l'actuelle, et fait un **pré-check d'unicité** (`users.email` / `users.contact_email`).
3. `generateEmailChangeToken(uid, newEmail)` (`src/lib/email/email-change-token.ts`) produit un HMAC `sha256(EMAIL_SECRET, "email-change:uid:newEmail:iat")`, TTL **1 heure**. **Le `newEmail` est signé** → un lien valide ne peut pas être rejoué vers une autre adresse.
4. `buildEmail('confirmation_changement_email', { lien_confirmation, nouvelle_adresse }, siteUrl)` → SendGrid envoie le lien **à la nouvelle adresse**.
5. L'utilisateur clique → `GET /confirmer-changement-email?uid&new_email&iat&token` (`src/app/confirmer-changement-email/route.ts`) re-vérifie le HMAC, puis :
   - `admin.updateUserById(uid, { email: newEmail, email_confirm: true })` (le clic depuis la boîte prouve le contrôle de l'adresse) ;
   - **synchronise `public.users.email` ET `public.users.contact_email`** (= l'email réellement affiché/utilisé côté profil, surtout pour les comptes PSC qui priorisent `contact_email`). Les 3 valeurs alignées (auth + email + contact_email) ;
   - envoie un **email de courtoisie à l'ancienne adresse** (`notification_changement_email`, « ce n'était pas vous ? ») ;
   - redirige vers `/mon-compte/profil?email_changed=1` (le profil rafraîchit alors la session pour afficher le nouvel email sans reconnexion).

### Choix & garde-fous

- **Les 3 emails sont alignés** (`auth.users.email`, `public.users.email`, `public.users.contact_email`). ⚠️ Décision corrigée le 2026-06-20 : la v1 ne touchait pas `contact_email`, ce qui laissait l'ancien email affiché pour les comptes PSC (qui priorisent `contact_email`) et faisait apparaître un faux champ « Email Pro Santé Connect ».
- **Idempotence** : le GET applique le changement mais le HMAC est rejouable jusqu'à expiration (re-confirmer un email déjà appliqué = quasi no-op) → résistant au pré-scan.
- **Anti-rejeu** : le `newEmail` est dans la signature (cf. étape 3).
- **Anti-prise-de-contrôle** : double notification (validation à la nouvelle adresse + courtoisie à l'ancienne).
- Le bandeau « en attente » côté profil est un simple hint `localStorage` (`pendingEmail_<uid>`), nettoyé automatiquement quand `user.email` reflète la nouvelle adresse.

### Configuration requise

- Templates BDD `confirmation_changement_email` (avec `{{lien_confirmation}}`, `{{nouvelle_adresse}}`) et `notification_changement_email` (avec `{{ancienne_adresse}}`, `{{nouvelle_adresse}}`, `{{lien_contact}}`).
- `EMAIL_SECRET` (ou `ADMIN_PASSWORD`), `NEXT_PUBLIC_SITE_URL`, `SENDGRID_API_KEY`.

---

## Checklist ajout d'un nouvel email SendGrid

1. Insérer un nouveau template dans `email_templates` via SQL ou l'admin (id unique, sujet, contenu_html).
2. **Si l'email est marketing/relance/newsletter** : inclure `{{lien_desabonnement}}` dans le footer du template (voir section « Footer Gérer mes préférences »). Sans ce placeholder, le footer ne s'affiche pas.
3. Ajouter les `SAMPLE_VARS` pour cet id dans `/api/admin/test-email/route.ts` (avec `lien_desabonnement: '#'` si applicable — le `'#'` sera remplacé au runtime par un vrai lien HMAC si le destinataire existe en base).
4. Créer ou modifier la route d'envoi pour :
   - appeler `buildEmail(templateId, vars, siteUrl)` puis `sgMail.send()`
   - **Si applicable** : passer `lien_desabonnement: generateUnsubscribeLink(user.id, siteUrl)` dans les vars (ne jamais hardcoder l'URL).
5. Tester depuis Admin → Emails → onglet correspondant → "Tester" puis cliquer le lien du footer pour vérifier qu'il atterrit sur `/gerer-notifications`, pas sur `/mon-compte/mes-notifications`.
