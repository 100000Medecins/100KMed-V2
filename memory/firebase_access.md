---
name: Accès Firebase Admin opérationnel
description: État de l'accès Firebase (service account JSON, scripts, structure Firestore) pour le projet medecins-7a4ed
type: project
---

Accès Firebase Admin (projet `medecins-7a4ed`) opérationnel sur le poste desktop depuis 2026-05-12.

**Why :** la migration Firebase→Supabase d'avril 2026 utilisait `firebase-admin` v13.7.0 + un service account JSON. Le JSON est gitignored (`scripts/*firebase*.json`), donc absent à chaque nouveau poste tant qu'on ne le copie pas ou ne le regénère pas. David a regénéré une nouvelle clé depuis Firebase Console le 2026-05-12, placée à `scripts/medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json`.

**How to apply :**
- Pour tester la connexion : `npx tsx scripts/firebase-explore.ts` (read-only, liste les 15 collections)
- Si le fichier JSON disparaît (autre poste, perte) : regénérer via Firebase Console → projet `medecins-7a4ed` → Paramètres → Comptes de service → Générer nouvelle clé. Garder le même nom de fichier pour rester compatible avec les scripts existants.
- Pattern d'init dans tout script Firebase : `import { initializeApp, cert } from 'firebase-admin/app'` + `require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))` + `initializeApp({ credential: cert(serviceAccount) })`.
- Structure Firestore observée : `users` (6421 docs, ID = RPPS), `evaluations` (717), `resultats` (1300), `solutionsUtilisees` (785), `solutions` (24), `editeurs` (19), `criteres` (51), + actualites, avatars, categories, documents, preferences, solutionsFavorites, tags, videos.
- Pour les users tardifs (post-migration avril 2026) : passer par **Firebase Auth** (`auth.listUsers()` + `metadata.creationTime`), pas la collection Firestore `users` qui ne tracke pas la date de création auth.
