# Design system — aperçus pour Claude Design

Aperçus HTML autonomes du design system de 100000Médecins, destinés à être poussés
vers un projet **Claude Design** (claude.ai/design) via l'outil `DesignSync` / la skill
`/design-sync`.

> Généré le 2026-06-18. Source de vérité du code : `src/components/ui/` + `tailwind.config.ts`.
> Ces fichiers sont des **reproductions HTML** (pas du React) — Claude Design ne stocke que du HTML.

## Structure

```
design-system/
├── _tokens/index.html              # Foundations — palette, radius, ombres, Poppins
└── components/
    ├── button/index.html           # Components — 7 variantes × 3 tailles
    ├── card/index.html             # Components — paddings + hoverable
    ├── badge/index.html            # Components — 6 variantes × 2 tailles + dot
    ├── form-fields/index.html      # Components — Input/Textarea/Select/Field
    ├── modal/index.html            # Components — Header/Body/Footer
    ├── ratings/index.html          # Applicatifs — StarRating + RatingBadge
    ├── software-card/index.html    # Applicatifs — carte logiciel
    ├── mission-card/index.html     # Applicatifs — carte article
    ├── video-card/index.html       # Applicatifs — short YouTube 9/16
    ├── search-bar/index.html       # Applicatifs — recherche globale
    ├── breadcrumb/index.html       # Applicatifs — fil d'ariane
    └── logo/
        ├── index.html              # Applicatifs — variantes logo (SVG réels)
        └── assets/                 # 4 SVG copiés depuis public/logos/ (référencés en relatif)
```

Chaque fichier porte en **première ligne** un marqueur `<!-- @dsCard group="…" name="…" -->`
qui crée automatiquement la carte correspondante dans le panneau Design System de Claude Design
(groupes : `Foundations`, `Components`, `Applicatifs`).

## Point d'attention — Logo

`components/logo/index.html` affiche les **vrais SVG** copiés dans `components/logo/assets/`
(depuis `public/logos/`) et référencés en relatif (`assets/logo-…svg`).
**Inclure ce dossier `assets/` dans le push** sinon les images seront cassées côté Claude Design.
Versions : couleur sur fond clair, nb (blanc) sur fond sombre.

## Pousser vers Claude Design

Le push nécessite une connexion **claude.ai** (pas un token API/`CLAUDE_CODE_OAUTH_TOKEN`).
Depuis un terminal où `/login` a été fait avec un compte claude.ai :

1. `cd` dans ce repo, lancer `claude`
2. Demander la synchro vers Claude Design (création du projet si besoin)
3. Pousser composant par composant (jamais en remplacement global)

### ⚠️ Étape obligatoire : `register_assets` après chaque push

La skill `/design-sync` n'est pas installée → on utilise l'**outil brut `DesignSync`**.
Un `write_files` brut **ne régénère pas** l'index des cartes (`_ds_manifest.json` n'est pas
compilé automatiquement) : la pane Design System reste **vide** même si les fichiers sont bien
présents (vérifiable via `list_files`).

**Remède** (fait le 2026-06-18, projet « 100000Médecins ») : après le push, appeler
`DesignSync register_assets` pour déclarer explicitement les cartes — `finalize_plan` avec
`writes` = les chemins concernés (sans les réécrire), puis `register_assets` avec
`{name, path, group, subtitle, viewport}` repris des marqueurs `@dsCard`. À refaire pour tout
composant ajouté/modifié.
