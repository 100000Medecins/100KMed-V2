# Diagnostic — Emails PSC manquants & friction `/completer-profil`

> Date : 2026-06-16. Investigation déclenchée par le constat d'une rafale de comptes
> `psc-…@psc.sante.fr` sans email réel dans l'admin utilisateurs, + impossibilité de
> se connecter par email pour un compte pourtant présent.

## TL;DR

1. Les emails `psc-{RPPS}@psc.sante.fr` **ne sont pas un bug** : Pro Santé Connect **en
   production ne renvoie pas l'email** des médecins (absent de l'annuaire RPPS). Le code
   génère alors un email synthétique de repli.
2. **Significatif sur le flux récent** (~90 % des inscriptions depuis la bascule prod du
   25/05/2026), marginal en cumul (102 / 6029).
3. **Beaucoup n'ont pas terminé** : 13 / 102 comptes synthétiques seulement sont
   `is_complete`. Les 89 autres ont abandonné à `/completer-profil` (qui exige email +
   mot de passe manuels après l'auth PSC).
4. **Sans email capté, aucune relance possible** par mail (seul levier : reconnexion PSC).

## 1. Mécanisme

`src/app/api/auth/psc-callback/route.ts` (l.73, 95) :

```ts
const email = userInfo.email || null
const userEmail = email || `psc-${rpps || sub}@psc.sante.fr`
```

Scope demandé : `openid scope_all` (`src/lib/auth/psc.ts:68`). PSC ne fournit l'email que
s'il est présent dans l'annuaire — rare pour de vrais praticiens. `userEmail` synthétique
sert alors d'email **auth ET public**.

## 2. Chronologie (preuve)

| Mois | Inscrits | Synthétiques |
|---|---|---|
| Mai 2026 | 79 | 72 (91 %) |
| Avril 2026 | 38 | 29 (76 %) |
| Mars 2026 | 22 | 1 |
| Fév 2026 | 30 | 0 |
| Jan 2026 | 330 | 0 |
| ≤ 2025 | — | 0 |

0 synthétique avant mars → bascule en **PSC production** concomitante de la mise en prod du
site (25/05/2026). En BAS (test), les comptes de test PSC avaient un email.

## 3. Ampleur (6029 utilisateurs)

- 102 emails de login synthétiques `psc-…@psc.sante.fr`
- 89 sans **aucun** email réel (ni `email`, ni `contact_email`) → injoignables
- 5927 emails réels = héritage Firebase + inscriptions email classiques

Parmi les 102 synthétiques : `is_complete=true` → **13** ; ont une spécialité (PSC abouti)
→ **102** ; ont ≥ 1 évaluation → **4**.

## 4. Le mur `/completer-profil`

`src/app/completer-profil/page.tsx` (l.110-116) — pour un utilisateur PSC, validation
exige : email de contact (vide au départ) **+ mot de passe ≥ 6**. Placé juste après une
auth PSC réussie → friction/confusion → ~87 % de décrochage. C'est le vrai point de perte,
pas l'inscription.

`completeProfile` (`src/lib/actions/user.ts:366-394`) : met `is_complete=true` et
`contact_email` côté `public.users` **avant** de synchroniser `auth.users.email` + mot de
passe. Force aussi `role='medecin'`.

## 5. Bug de casse sur la connexion (corrigé le 2026-06-16)

`check_auth_email_exists` (RPC) fait un match **exact, sensible à la casse** :

```sql
SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = p_email AND deleted_at IS NULL)
```

La page connexion passait l'email non normalisé → une casse différente (mobile en
auto-majuscule) renvoyait « Aucun compte trouvé » et redirigeait vers l'inscription, alors
que le compte existe. **Correctif** (pas de DDL — `auth.users.email` est déjà en
minuscules, normaliser l'entrée suffit) :

- `src/lib/actions/user.ts` `checkEmailExists` : `email.trim().toLowerCase()` avant la RPC.
- `src/components/providers/AuthProvider.tsx` `signInWithEmail` : idem avant
  `signInWithPassword`.

## 6bis. Règle : ne JAMAIS afficher l'email synthétique `@psc.sante.fr` (2026-06-20)

L'adresse `psc-{rpps}@psc.sante.fr` est un **placeholder technique fabriqué par notre code**
(cf §1) : ce n'est **pas une vraie boîte mail**, personne ne reçoit rien dessus, l'utilisateur
se connecte via PSC (OIDC), jamais via cet email. **Il ne doit jamais être présenté à
l'utilisateur** (confusant — il ressemble à un vrai email).

Implémentation côté profil (`src/app/mon-compte/profil/page.tsx`) :
- helper `emailReel = contact_email || (auth.email non synthétique) || null` ;
- l'« Email » des identifiants affiche `emailReel`, sinon **« Non renseignée »** (le bouton
  « Changer » permet d'en saisir un vrai via le flux HMAC) ;
- le **champ « Email Pro Santé Connect » a été supprimé** (il n'exposait que le synthétique) ;
- les messages de reset mdp utilisent aussi `emailReel`.

Discriminant : `email.endsWith('@psc.sante.fr')` (placeholder), comme déjà fait dans
`AdminUtilisateursClient.tsx` (`hasRealEmail`) et `psc-callback` (`hasFakeEmail`). À réutiliser
partout où un email PSC peut s'afficher.

## 6. Pistes restantes (non implémentées)

2. **Réduire la friction PSC** : rendre le mot de passe **optionnel** à `/completer-profil`
   pour les comptes PSC (ils ont déjà PSC pour se reconnecter) → devrait remonter la
   complétion bien au-dessus de 13 %.
3. **Relance des 89 décrocheurs** : impossible par mail (pas d'email) → bannière
   « reconnectez-vous via PSC » au mieux.
4. **Admin** : afficher `contact_email` (vrai email) à côté de `email` (login) dans la
   liste utilisateurs, pour ne plus afficher `psc-…@` quand un vrai email existe.
