# UI — Composants partagés

Dossier d'accueil des composants UI primitifs (Button, Badge, Card, Input, Modal…)
extraits progressivement du projet pour éliminer les duplications visuelles.

**Convention : extraction par phases indépendantes, remplacement au fil de l'eau.**

---

## Tokens validés (2026-05-24)

Tous définis dans `tailwind.config.ts`, à ne **pas** redéfinir inline.

| Usage | Token | Valeur | Pourquoi |
|---|---|---|---|
| Radius carte/section | `rounded-card` | 16px | Token custom du projet, sémantique. **Ne pas utiliser `rounded-2xl`.** |
| Radius bouton/input | `rounded-button` | 12px | Token custom. **Ne pas utiliser `rounded-xl`.** |
| Couleur primaire | `bg-navy` / `text-navy` | #1B2A4A | Identité médicale sérieuse. Variantes `navy-dark`, `navy-light` disponibles. |
| Couleur secondaire | `bg-accent-blue` | #4A90D9 | Actions secondaires, liens, boutons moins critiques. |
| Couleur succès | `bg-rating-green` ou `bg-teal-600` | - | À unifier dans Badge. |
| Couleur warning | `bg-amber-500` ou `bg-accent-yellow` | - | À unifier. |
| Couleur danger | `bg-red-500` | - | Boutons destructifs uniquement. |
| Ombre carte | `shadow-card` | - | Avec `hover:shadow-card-hover` pour les cartes cliquables. |

## Plan d'extraction

Voir l'item « Extraire des composants UI partagés » dans `TODO.md`.

Ordre prévu :
1. ✅ Phase 0 — tokens validés + dossier créé (2026-05-24)
2. ⏳ Phase 1 — `<Button>` (variants primary/secondary/danger/ghost, sizes sm/md/lg)
3. ⏳ Phase 2 — `<Badge>` (variants info/warning/success/danger/neutral)
4. ⏳ Phase 3 — `<Input>` / `<Textarea>` / `<Select>`
5. ⏳ Phase 4 — `<Modal>` (consolidation des 10 overlays existants)
6. ⏳ Phase 5 — `<Card>`

## Règle d'or

**Une phase = un commit (ou plusieurs petits).** Chaque phase doit être revertable
sans casser les autres. Pas de big-bang.

Le composant est **extrait d'abord, remplacé ensuite**, formulaire par formulaire,
pour limiter le rayon de l'éventuelle régression.

## Hors-scope assumé

- **Storybook** : pas de valeur tant qu'on est seul à coder.
- **Composants applicatifs sophistiqués** (`RichTextEditor`, `SolutionDiffPanel`,
  `VideosAdminList`) — ils restent là où ils sont, ce ne sont pas des primitives UI.
- **Refondre la palette Tailwind** — elle est définie, on s'y conforme.
