# Flux de création utilisateur — 100 000 Médecins

Daté 2026-05-02. À mettre à jour si le flux change.

---

## Tables impliquées

| Table | Géré par | Rôle |
|-------|----------|------|
| `auth.users` | Supabase Auth | Identité, email, mot de passe, session. Ne jamais écrire directement. |
| `public.users` | Notre code | Profil applicatif : nom, prénom, spécialité, RPPS, rôle, `is_complete`. |

Les deux tables sont liées par `public.users.id = auth.users.id`. Un utilisateur peut exister dans `auth.users` sans entrée dans `public.users` (état transitoire pendant l'inscription — voir §Risques).

---

## Flux 1 — Inscription email / mot de passe

### Étape 1 — Formulaire d'inscription
**Page** : `/inscription`  
**Composant** : `src/components/providers/AuthProvider.tsx` → `signUpWithEmail(email, password)`

```
supabase.auth.signUp({ email, password, options: { emailRedirectTo: .../api/auth/callback } })
```

- Crée une entrée dans `auth.users` avec `email_confirmed_at = null`
- **Immédiatement après** : `createUserProfile(user.id, email)` (`src/lib/actions/user.ts`) crée une ligne dans `public.users` avec `is_complete = false`
- Supabase envoie l'email de confirmation via SMTP SendGrid

> ⚠️ Le profil `public.users` est créé AVANT la confirmation email. Si l'utilisateur ne confirme jamais, une ligne orpheline reste en base (voir §Risques).

### Étape 2 — Email de confirmation
**Template** : Supabase Dashboard → Authentication → Email Templates → Confirm sign up  
**Lien dans l'email** : `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`

### Étape 3 — Validation du lien
**Route** : `src/app/auth/confirm/route.ts`

```
supabase.auth.verifyOtp({ token_hash, type: 'signup' })
→ valide auth.users.email_confirmed_at
→ crée la session Supabase (cookie)
→ vérifie public.users.is_complete
  → false → redirect /completer-profil
  → true  → redirect /mon-compte/profil
```

> Note : si `public.users` est absent à cette étape (race condition), la route recrée le profil.

### Étape 4 — Complétion du profil
**Page** : `/completer-profil`  
**Action** : `completeProfile()` dans `src/lib/actions/user.ts`

Pour les utilisateurs email/mdp :
- Champs éditables : nom, prénom, spécialité (`<select>`), mode d'exercice (boutons), pseudo, avatar
- Email de contact : **lecture seule** (déjà confirmé par Supabase)
- Pas de champ mot de passe (déjà défini à l'inscription)
- `completeProfile()` met à jour `public.users`, **sans** appeler `updateUserById` → session conservée
- Redirect : `window.location.href = '/mon-compte/profil'`

---

## Flux 2 — Pro Santé Connect (PSC)

### Étape 1 — Déclenchement
**Bouton** : page `/connexion` ou `/inscription`  
**Fonction** : `connectWithPsc()` dans `src/lib/auth/psc.ts`

- Génère `state` et `nonce`, stockés en **cookies** (pas sessionStorage — PSC redirige via app mobile qui perd le sessionStorage)
- Construit l'URL d'authentification PSC selon l'environnement (`NEXT_PUBLIC_PSC_ENV = bas | production`)
- Redirect vers le wallet PSC

### Étape 2 — Callback PSC
**Route** : `src/app/api/auth/psc-callback/route.ts`

1. Valide `state` (anti-CSRF)
2. Échange le `code` contre des tokens PSC
3. Appelle `userInfo` PSC → extrait :
   - `given_name`, `family_name` → nom/prénom
   - `preferred_username` → RPPS (identifiant unique médecin)
   - `SubjectRefPro.exercices[0].codeSavoirFaire` (type=`'S'`) → spécialité (code SM, résolu via `SM_SPECIALITES`)
   - `activities[0].codeModeExercice` → mode d'exercice (`L`=Libéral, `S`=Salarié)
4. Crée ou met à jour `auth.users` via admin API (`generateLink` ou `updateUserById`)
5. Vérifie OTP côté serveur → crée la session cookie
6. Crée `public.users` si inexistant (avec `rpps`, nom, prénom, spécialité)
7. Si `is_complete = false` → redirect `/completer-profil`

### Étape 3 — Complétion du profil PSC
**Page** : `/completer-profil` (flag `isFromPsc = true`)

- Champs PSC en **lecture seule** : nom, prénom, spécialité, mode d'exercice (`isFromPsc` détecté via `profile.rpps` ou `user_metadata.provider === 'psc'`)
- Champs à saisir : email de contact (modifiable), mot de passe (≥6 car.) — permettra reconnexion email
- `completeProfile()` appelle `updateUserById(email, password)` → **invalide la session existante**
- Re-authentification immédiate : `supabase.auth.signInWithPassword(email, password)`
- Redirect : `window.location.href = '/mon-compte/profil'`

> Note : `window.location.href` est obligatoire ici (pas `router.push`) — le changement de cookies de session n'est pas détecté par le router Next.js côté client.

---

---

## Flux 3 — Évaluation anonyme → Rattachement PSC

Un utilisateur peut évaluer une solution **sans être connecté** (parcours fréquent : il découvre le site, note directement). Il saisit son email → `submitEvaluationAnonyme()` crée l'évaluation avec :
- `statut = en_attente_psc`
- `email_temp = email saisi`
- `token_verification = UUID` (secret lié à cet email)
- `last_date_note = NOW()`
- `user_id = null`

Un email lui est envoyé avec un lien PSC : `/api/auth/psc-initier?token=UUID`.

### Rattachement dans psc-callback

Après authentification PSC, le callback recherche les évaluations à lier avec **4 stratégies en cascade** :

| # | Méthode | Condition |
|---|---------|-----------|
| 1 | `token_verification = UUID` dans le state PSC | Lien email cliqué (chemin direct) |
| 2 | `email_temp = email PSC` | Email PSC = email personnel |
| 3 | `email_temp = users.email` | Compte existant avec email standard |
| 4 | `email_temp = users.contact_email` | **Comptes PSC avec email synthétique** (`@psc.sante.fr`) — indispensable car les stratégies 2 et 3 échouent dans ce cas |

> ⚠️ Sans la stratégie 4, les médecins PSC dont l'email auth est synthétique (`psc-RPPS@psc.sante.fr`) ne peuvent être rattachés que par le token — si ce token est perdu (autre navigateur, session expirée), leur évaluation reste bloquée `en_attente_psc` indéfiniment.

### Résultat du rattachement

Pour chaque évaluation trouvée :
```
evaluations.update({ statut: 'publiee', user_id, email_temp: null, token_verification: null })
solutions_utilisees.insert({ user_id, solution_id, statut_evaluation: 'finalisee' })  // si absent
recalcResultatsPourSolution(solution_id)
users.update({ contact_email: email_temp })  // sauvegardé si contact_email absent
```

Redirect final : `/mon-compte/profil?evaluation=publiee` si au moins une évaluation liée.

### Évaluations bloquées (rétrocompat)

Les évaluations `en_attente_psc` existantes avec `user_id = null` se resolvent automatiquement à la prochaine connexion PSC de l'utilisateur grâce à la stratégie 4 (si `contact_email` est déjà renseigné sur son compte).

---

## Cas limites documentés

### Email technique PSC (`@psc.sante.fr`)
PSC fournit parfois une adresse technique non personnelle. Le champ email de contact dans `/completer-profil` est pré-rempli avec :
1. `contact_email` déjà sauvegardé en base (priorité)
2. `email_temp` d'une évaluation anonyme liée au compte
3. `user.email` sauf si se termine par `@psc.sante.fr`

### Email non confirmé
Si un utilisateur email/mdp tente de se connecter avant de confirmer son email, `signInWithEmail` retourne l'erreur Supabase `'Email not confirmed'` → traduite en message lisible dans l'UI : *"Votre email n'est pas encore confirmé. Vérifiez votre boîte mail (et vos spams)."*

Un bouton **Renvoyer** est disponible sur l'écran de succès de l'inscription (`src/app/inscription/page.tsx`) via `supabase.auth.resend({ type: 'signup', email })`.

### Profil orphelin (auth.users sans public.users)
- **Cause** : `createUserProfile()` échoue après `signUp` réussi (erreur réseau, RLS, etc.)
- **Gestion** : la route `/auth/confirm` recrée `public.users` si absent après `verifyOtp`
- **Risque résiduel** : si l'utilisateur ne clique jamais le lien de confirmation, la ligne `auth.users` existe sans `public.users`

### Utilisateur supprimé de auth.users mais pas de public.users
- **Non géré** actuellement — peut créer des incohérences si un admin supprime un user depuis le dashboard Supabase sans passer par notre interface
- À surveiller dans les opérations de nettoyage

---

## Schéma résumé

```
EMAIL/MDP                              PSC
─────────────────────────────────────────────────────────
/inscription                           /connexion (bouton PSC)
    │                                       │
signUpWithEmail()                     connectWithPsc()
    │                                       │
auth.users créé (non confirmé)        wallet.psc.esante.gouv.fr
public.users créé (is_complete=false)       │
    │                               /api/auth/psc-callback
Email SendGrid                              │
    │                               auth.users créé/mis à jour
/auth/confirm?token_hash=...         public.users créé
    │                                       │
verifyOtp()                                 │
    │                                       │
    └──────────────────────────────────────►│
                                            │
                                   is_complete ?
                                    ├── false → /completer-profil
                                    └── true  → /mon-compte/profil
```
