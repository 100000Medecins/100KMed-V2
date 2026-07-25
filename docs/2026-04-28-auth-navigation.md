# Auth — Architecture de navigation (2026-05-14)

> **Voir aussi** : [user-creation-flow.md](2026-04-30-user-creation-flow.md) pour la **couche données** (quelles tables sont remplies à quel moment, rattachement éval anonyme, race conditions). Ce doc-ci couvre la **couche navigation** (`window.location.href` vs `router.push`, middleware, redirections post-auth).

## Règle fondamentale

> **Toute navigation post-auth utilise `window.location.href` ou `window.location.replace`, jamais `router.push/replace`.**

`router.push/replace` du Next.js 14 App Router peut échouer silencieusement quand il est appelé depuis un callback async qui vient de modifier les cookies de session (signIn, signUp, verifyOtp). La session est bien établie, mais la navigation n'a pas lieu. `window.location.href` est une navigation native du navigateur : elle est garantie et provoque un reload complet, ce qui est souhaitable après une opération d'auth (le middleware voit les nouveaux cookies dès la requête suivante).

---

## Flux d'authentification

### 1. Connexion email/mdp (`/connexion`)

```
User soumet formulaire (mode login)
  → signInWithEmail() [supabase.auth.signInWithPassword]
      → erreur (email inconnu OU mot de passe erroné) : setError() — on reste sur /connexion
      → succès                                        : window.location.href = redirect || '/mon-compte/profil'
```

> **Changement de comportement 2026-06-20** : on **ne pré-vérifie plus** l'email via `checkEmailExists()` et on **ne redirige plus** vers `/inscription` quand l'email est inconnu. Raison : c'est le plus souvent une **faute de frappe** (email OU mot de passe), et basculer brutalement vers la création de compte est désagréable. On reste désormais sur `/connexion` avec le message générique « Email ou mot de passe incorrect » (qui, en bonus, ne révèle pas si le compte existe — pas d'énumération d'emails). Le lien **« Créer un compte »** reste disponible sous le formulaire pour ceux qui n'ont effectivement pas de compte. `checkEmailExists` reste utilisée ailleurs si besoin, mais plus dans ce flux.

**Pas de useEffect([user]) dans la page.** La redirection si déjà connecté est gérée côté serveur par le middleware.

### 2. Inscription email (`/inscription`)

```
User soumet formulaire
  → signUpWithEmail() [supabase.auth.signUp + createUserProfile]
    → email déjà existant : setError('Un compte existe déjà...')
      → bouton 'Se connecter' affiché
        → signInWithEmail()
          → succès : window.location.href = '/mon-compte/profil'
          → erreur : setError(), setSubmitting(false)
    → succès : setSuccess('Vérifiez votre email...')
```

**Pas de useEffect([user]) dans la page.**

### 3. PSC — connexion directe (nouveau compte ou reconnexion)

```
connectWithPsc() → window.location.href vers wallet PSC
  → retour sur /api/auth/psc-callback [Route Handler]
    → échange code → tokens → userInfo
    → create/update Supabase user (admin API)
    → rattachement évaluations anonymes en_attente_psc (voir user-creation-flow.md §Flux 3)
    → generateLink(magiclink)
    → establishPscSession : verifyOtp côté serveur (client SSR + cookies) pose la session
      → succès : NextResponse.redirect(next)
        → si évaluation liée : next = '/mon-compte/profil?evaluation=publiee'
        → sinon              : next = '/mon-compte/profil' (ou '/completer-profil')
      → erreur  : NextResponse.redirect('/connexion?error=psc_session_error')
```

> Depuis 2026-07-20, la session est établie **côté serveur** dans le callback (plus de page cliente `/auth/psc-session`, supprimée le 2026-07-21). La fusion de comptes (`merge.ts`) suit le même modèle.

### 4. PSC — association depuis le profil

Même flow que 3, mais l'état PSC contient `currentUserId` (UUID de l'utilisateur déjà connecté). Le callback détecte ce mode et met à jour le compte existant au lieu d'en créer un nouveau. Redirige vers `/mon-compte/profil?psc=associe`.

### 5. PSC — fusion de comptes

Quand le RPPS appartient déjà à un autre compte : `NextResponse.redirect('/fusionner-compte?token=...')`.

### 6. Déconnexion

```
signOut() [AuthProvider]
  → localStorage nettoyé (clés sb-*)
  → window.location.href = '/api/auth/signout'
    → supabase.auth.signOut() [serveur]
    → NextResponse.redirect('/')
```

### 7. Réinitialisation mot de passe

```
sendPasswordReset(email) [server action]
  → supabase.auth.admin.generateLink({ type: 'recovery' })
  → SendGrid email avec lien custom
  → User clique → /reinitialiser-mot-de-passe
    → supabase.auth.updateUser({ password })
    → window.location.href = '/connexion?reset=success'
```

---

## Middleware (`/src/middleware.ts`)

Routes couvertes : `/mon-compte/*`, `/solution/noter/*`, `/api/auth/*`, `/connexion`, `/inscription`

Logique :
- **Route protégée + non connecté** → redirect `/connexion?redirect=<chemin>`
- **Route d'auth (`/connexion`, `/inscription`) + déjà connecté** → redirect `/mon-compte/profil`

Cette dernière règle remplace les anciens `useEffect([user, loading])` côté client qui causaient des doubles navigations (le useEffect + le handler se déclenchaient simultanément après un signIn).

---

## Ce qu'il ne faut jamais faire

```ts
// ❌ Fragile — échoue silencieusement après une opération auth async
const router = useRouter()
const result = await supabase.auth.signInWithPassword(...)
router.push('/mon-compte/profil')

// ✅ Garanti
const result = await supabase.auth.signInWithPassword(...)
window.location.href = '/mon-compte/profil'
```

```ts
// ❌ Double navigation — useEffect + handler se télescopent
useEffect(() => {
  if (user && !loading) router.replace('/mon-compte/profil')
}, [user, loading])

// ✅ Géré côté serveur par le middleware
// Aucun useEffect de redirection dans /connexion et /inscription
```
