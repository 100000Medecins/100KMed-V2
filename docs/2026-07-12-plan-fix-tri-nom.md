# Plan — Corriger 2 comportements du tri « Nom » sur la page catégorie

**Overall Progress:** `90%` — _implémenté + build vert ; reste ta vérif visuelle locale._

_Créé le 2026-07-12. Suite de la passe 2 ISR ([docs/2026-07-11-plan-isr-passe-2.md](2026-07-11-plan-isr-passe-2.md))._

## TLDR

Deux comportements à corriger sur les cartes de la page catégorie (`/solutions/[cat]`) :

1. **En tri « Nom A→Z », aucune note ne s'affiche** (« Pas encore noté ») alors que les notes
   existent → afficher **les deux notes (Utilisateurs + Rédaction), comme sur l'accueil**.
2. **En tri « Nom », cocher un tag repasse le tri sur « Note utilisateurs »** (bug préexistant) →
   persister le tri « Nom » quand on filtre par tags.

## Causes (vérifiées dans le code)

- **P1** : [SolutionList.tsx](../src/components/solutions/SolutionList.tsx#L113-L138) — `displayNote = tri === 'nom' ? null : …` → note forcée à `null` en tri nom.
- **P2** : [SolutionFilters.tsx](../src/components/solutions/SolutionFilters.tsx#L82) — `if (currentTri && currentTri !== 'nom') params.set('tri', …)` → le tri `nom` n'est jamais écrit dans l'URL → le lecteur retombe sur le défaut `note_utilisateurs`. Bug **préexistant** (composant non modifié par la passe 2).

## Critical Decisions

- **P1 — n'afficher les deux notes QUE en tri « nom »** (les autres tris gardent la note de
  classement actuelle : util. / rédac / critère). C'est le cas demandé ; comportement des autres
  tris inchangé. Si une catégorie n'a pas de note rédac (valeur nulle), n'afficher que la note
  utilisateurs (comme l'accueil). Réutiliser le style compact de `RecommendedSoftware` (labels
  « Util. » / « Réd. » + `RatingBadge` + `StarRating` + lien « N avis »).
- **P2 — persister le tri sauf le défaut réel** : remplacer la condition `!== 'nom'` par
  `!== 'note_utilisateurs'` (on n'omet que le défaut, pour garder des URLs propres). Aligner au
  passage la `DEFAULT_DIR` locale de `SolutionFilters` sur celle, partagée, de
  [solutions-filter-sort.ts](../src/lib/solutions-filter-sort.ts) (ajouter `prix`) pour éviter la dérive.
- **Données déjà disponibles** : la passe 2 charge **toujours** `noteUtilisateursBase5` **et**
  `noteRedacBase5` pour toutes les solutions → aucune requête supplémentaire nécessaire.
- **Portée `SolutionList`** : composant partagé (page catégorie + fiche éditeur). Le mode « deux
  notes » ne se déclenche qu'en `tri === 'nom'` ; les autres appelants (fiche éditeur, `tri`
  absent) sont **inchangés**. À vérifier au build.

## Tasks

- [x] 🟩 **Étape 1 : Afficher les deux notes en tri « nom » (`SolutionList.tsx`)** *(fait)*
  - [x] 🟩 Bloc note réécrit : si `tri === 'nom'`, rendu **deux lignes** (Utilisateurs, Rédaction) façon accueil au lieu de `null`.
  - [x] 🟩 Ligne « Utilisateurs » si `noteUtilisateursBase5 != null` (+ lien « N avis » si `nbNotesUtilisateurs > 0`) ; ligne « Rédaction » si `noteRedacBase5 != null`.
  - [x] 🟩 Aucune des deux → « Pas encore noté ». Layout compact grille `[auto_auto]`, labels courts (Util./Réd. sur mobile).
  - [x] 🟩 Autres tris inchangés (util. / rédac / critère / prix gardent leur note de classement).

- [x] 🟩 **Étape 2 : Persister le tri « nom » au filtrage tags (`SolutionFilters.tsx`)** *(fait)*
  - [x] 🟩 `buildUrl` : `currentTri !== 'nom'` → `currentTri !== 'note_utilisateurs'` (persiste nom / note_redac / prix ; omet seulement le défaut).
  - [x] 🟩 `DEFAULT_DIR` locale alignée (ajout `prix: 'asc'`).

- [ ] 🟨 **Étape 3 : Build + vérif**
  - [x] 🟩 `npm run build` OK (13,4 s) ; page catégorie reste `●`. Smoke test runtime : rendu par défaut OK (200, 30 cartes), `?tri=nom` → 200.
  - [ ] 🟥 **Vérif locale (`npm run dev`) — à faire par toi** : (a) tri « Nom » → les 2 notes s'affichent sur chaque carte ; (b) en tri « Nom », cocher/décocher un tag garde le tri « Nom » ; (c) URL partageable (`?tri=nom&tags=…`) ; (d) fiche éditeur inchangée.

## Hors scope

- Ne pas toucher au tri/filtre côté données (la fonction pure `filterAndSortSolutions` reste identique).
- Pas de changement des autres modes de tri ni de l'accueil.
