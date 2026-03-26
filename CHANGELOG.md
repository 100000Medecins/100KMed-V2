# Changelog

## Unreleased

### Changed
- Page categorie : filtres en sidebar a gauche (sticky), solutions en grille a droite — responsive (empile sur mobile)
- Grille solutions : 3 colonnes a partir de xl (au lieu de lg) pour compenser la largeur de la sidebar
- Filtres affiches verticalement dans la sidebar au lieu de pills horizontales

### Fixed
- Evaluation : cocher "je n'utilise plus ce logiciel" n'enregistrait pas la date de fin (le state dateFin n'etait pas initialise au clic)
- Avis redaction et notes detaillees : les balises HTML (br, u, b) s'affichaient en texte brut au lieu d'etre rendues

### Added
- `src/lib/sanitize.ts` : utilitaire sanitizeHtml — ne garde que les balises autorisees (br, u, b, strong, em, i, p)

## 2025-03-03

### Added
- Blog admin + pages statiques
