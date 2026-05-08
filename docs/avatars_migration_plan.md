# Plan migration avatars
**Date :** 2026-05-08
**Contexte :** audit BDD session 2026-05-08

---

## Problème actuel

`users.portrait` (TEXT) stocke l'**URL** de l'avatar (ex: `/images/portraits/avatar-22.png`),
pas l'UUID. La table `avatars` (id UUID, url TEXT) est le catalogue source, mais la valeur
copiée dans `users.portrait` n'est jamais mise à jour si l'URL change.

**Conséquence :** remplacer les images sans migration = UPDATE massif sur ~5 800 utilisateurs
pour synchroniser les URLs copiées.

### Flow actuel (`src/lib/actions/user.ts` — `updateAvatar`)
1. Reçoit `avatarId` (UUID)
2. Lit `avatars.url` par cet UUID
3. Stocke l'URL dans `users.portrait`
4. Affichage : `<img src={user.portrait}>` — utilise l'URL directement

---

## Plan d'action (4 étapes — à faire en une session)

### Étape 1 — Migrer les données existantes (URL → UUID)

À exécuter dans Supabase SQL Editor :

```sql
UPDATE users u
SET portrait = a.id::text
FROM avatars a
WHERE u.portrait = a.url;

-- Vérification : combien ont été migrés
SELECT COUNT(*) FROM users WHERE portrait ~ '^[0-9a-f-]{36}$';
-- Combien n'ont pas d'avatar correspondant (portrait = ancienne URL orpheline)
SELECT COUNT(*) FROM users
WHERE portrait IS NOT NULL
  AND portrait NOT IN (SELECT id::text FROM avatars);
```

### Étape 2 — Modifier `updateAvatar` (`src/lib/actions/user.ts` lignes 318–343)

```typescript
export async function updateAvatar(avatarId: string) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Vérifier que l'avatar existe
  const { error: checkError } = await supabase
    .from('avatars')
    .select('id')
    .eq('id', avatarId)
    .single()

  if (checkError) throw checkError

  // Stocker l'UUID (plus l'URL)
  const { error } = await supabase
    .from('users')
    .update({ portrait: avatarId })
    .eq('id', user.id)

  if (error) throw error

  revalidatePath('/mon-compte')
  return { status: 'SUCCESS' }
}
```

### Étape 3 — Adapter les requêtes d'affichage

Partout où `portrait` est sélectionné et affiché comme `<img src>`, il faut résoudre l'UUID
en URL via une jointure avec `avatars`.

**Fichiers concernés :**
- `src/lib/db/evaluations.ts` — 3 endroits avec `user:users(pseudo, portrait, ...)`
- `src/lib/db/users.ts` — `getUserById` sélectionne `portrait`
- `src/lib/actions/user.ts` — `updateUserProfile` et lecture du profil
- `src/app/mon-compte/profil/page.tsx` — lecture + mise à jour avatar
- `src/app/completer-profil/page.tsx` — initialisation `selectedAvatar`

**Pattern Supabase pour joindre :**
```typescript
// Avant
user:users(pseudo, portrait, specialite, mode_exercice)

// Après — portrait devient l'URL via la jointure
user:users(pseudo, avatar:avatars(url), specialite, mode_exercice)
// puis utiliser item.user.avatar?.url à la place de item.user.portrait
```

> Ou garder `portrait` comme alias et reconstruire un objet compatible — à décider lors de l'implémentation.

**Côté affichage (`<img src>`) :** remplacer `user.portrait` par `user.avatar?.url ?? null`.

### Étape 4 — Remplacer les images

Une fois les étapes 1–3 en place :
1. Préparer les nouvelles images (même convention de nommage ou nouvelle)
2. Uploader dans `/public/images/portraits/` (ou Supabase Storage si changement d'hébergement)
3. Mettre à jour `avatars.url` pour chaque entrée
4. **Tous les utilisateurs voient instantanément les nouvelles images** — aucun UPDATE sur `users`

---

## Ordre recommandé

Ne pas faire les étapes séparément. Tout en une session :
1. SQL migration données
2. Modifier le code (étapes 2 + 3)
3. Déployer en preview Vercel — vérifier que les portraits s'affichent encore
4. Remplacer les images dans `avatars`
5. Vérifier l'affichage final

---

## Régénérer les types après

```bash
npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo --schema public > src/types/database.ts
```

*Plan rédigé session 2026-05-08 — audit BDD v4*
