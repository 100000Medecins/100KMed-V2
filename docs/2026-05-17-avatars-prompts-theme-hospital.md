# Génération avatars — style pixel art portrait (final)

**Date :** 2026-05-16 (màj après arbitrage final)
**Cible :** ~50 médicaux + ~15 décalés geek à intégrer dans `public/images/portraits/` lors de l'étape 4 du plan `avatars_migration_plan.md`.
**Référence visuelle initiale :** écrans d'embauche Theme Hospital (Bullfrog 1997).
**Style retenu :** pixel art portrait avec contour marqué, palette VGA limitée. Joli individuellement, avec une légère variation stylistique acceptée entre jeunes/séniors (les jeunes sortent plus indie/Stardew, les vieux plus caricature 90s — ce qui reflète la palette actuelle des 48 avatars du site).

---

## Réglages Retro Diffusion

Sur [retrodiffusion.ai](https://retrodiffusion.ai), via l'**API** (cf. `scripts/generate-avatars.ts`) :

- **prompt_style** : `rd_plus__classic` *(Art Style "Classic" dans l'UI — "Strongly outlined medium-resolution pixel art with a focus on simple shading and clear design")*
- **Model** : `RD Plus` (implicite via le prompt_style)
- **Width × Height** : `128 × 128`
- **num_images** : `1` par appel (le script boucle pour les variantes)
- **remove_bg** : `true` (fond transparent natif)
- **seed** : aléatoire (par défaut)

L'API Retro Diffusion ne propose pas de negative prompt. Le prompt master est en mode "positif renforcé".

---

## Prompt master — MÉDICAUX

```
pixel art portrait, {AGE} {GENDER} {ETHNICITY} medical doctor,
{HAIR}, {FACIAL_HAIR}, {GLASSES},
wearing {OUTFIT}, {EXPRESSION},
frontal bust portrait, transparent background,
Bullfrog Theme Hospital 1997 hiring screen style,
strict VGA palette, flat 2d sprite, hard pixel edges, sharp clean outline,
flat solid color skin, no skin texture, no gradient shading,
bright cheerful retro DOS game colors, friendly face,
vintage 16-bit game character portrait
```

## Prompt master — DÉCALÉS / GEEK

```
pixel art portrait of {CHARACTER_DESCRIPTION},
frontal bust portrait, transparent background,
Bullfrog Theme Hospital 1997 hiring screen style,
strict VGA palette, flat 2d sprite, hard pixel edges, sharp clean outline,
flat solid color shading, no gradient shading, no anti-aliasing,
bright cheerful retro DOS game colors, friendly face,
vintage 16-bit game character portrait
```

---

## Variables de diversité — MÉDICAUX

**AGE** : `young` (25-35) / `middle-aged` (35-55) / `senior` (55+)

**GENDER** : `male` / `female` / `androgynous`

**ETHNICITY** : `caucasian pale skin` / `caucasian fair skin` / `mediterranean olive skin` / `north african tan skin` / `sub-saharan african dark skin` / `east asian` / `south asian brown skin`

**HAIR** (hairstyle + haircolor combinés, ex. `short auburn`, `long wavy dark brown`, `bald`, `bun grey`)

**FACIAL_HAIR** (homme : `clean-shaven` / `moustache` / `short beard` / `full beard` / `goatee` ; femme : `clean-shaven`)

**GLASSES** : `no glasses` / `round glasses` / `square glasses`

**OUTFIT** : `white doctor coat with stethoscope` / `blue surgical scrubs` / `green surgical scrubs` / `white coat with shirt and tie` / `green surgical scrubs with surgical cap and mask` / `nurse uniform`

**EXPRESSION** : `neutral confident look` / `slight polite smile` / `proud expression` / `serious focused look` / `tired but friendly` / `raised eyebrow skeptical`

---

## Distribution cible — MÉDICAUX (60 prompts → tri vers ~50)

- **Genre :** 28 H / 30 F / 2 androgynes
- **Âge :** 20 jeunes / 25 moyens / 15 séniors
- **Ethnies :** réparties sur 7 groupes
- **Cheveux :** ~5 chauves, ~10 grisonnants/blancs, mix couleurs/styles
- **Tenues :** ~25 blouse, ~12 scrubs bleus, ~8 scrubs verts, ~6 chirurgien, ~5 nurse, ~4 costume+stétho
- **Lunettes :** ~20 en portent

Liste complète des 60 prompts → directement dans `scripts/generate-avatars.ts` (tableau `MEDICAL`).

---

## Archétypes — DÉCALÉS (20 prompts → tri vers ~15)

Archétypes génériques choisis pour éviter tout risque IP (pas de Yoda, Pikachu, Link nommément). Le style retro pixel art transmet quand même la touche geek.

| ID | Label | Archétype |
|---|---|---|
| 1 | `space-monk` | Moine de l'espace (jedi-like) |
| 2 | `furry-warrior` | Guerrier sylvestre poilu (wookie-like) |
| 3 | `wise-alien` | Petit alien sage à grandes oreilles |
| 4 | `medical-robot` | Robot médical |
| 5 | `wizard` | Sorcier barbu chapeau pointu |
| 6 | `knight` | Chevalier en armure |
| 7 | `pirate` | Capitaine pirate avec perroquet |
| 8 | `ninja` | Ninja masqué |
| 9 | `samurai` | Samouraï avec kabuto |
| 10 | `cowboy` | Cowboy western |
| 11 | `vampire` | Gentleman vampire |
| 12 | `astronaut` | Astronaute scaphandre |
| 13 | `steampunk` | Inventeur steampunk |
| 14 | `princess` | Princesse médiévale |
| 15 | `viking` | Viking à cornes |
| 16 | `detective` | Détective victorien à pipe (Sherlock-like) |
| 17 | `boxer` | Boxeur retro années 20 |
| 18 | `witch` | Sorcière au chapeau pointu |
| 19 | `cyborg` | Cyborg œil rouge |
| 20 | `mad-scientist` | Savant fou |

Descriptions complètes dans le tableau `GEEK` du script.

---

## Workflow batch (via API Retro Diffusion)

Le batch est automatisé par `scripts/generate-avatars.ts`. Voir l'en-tête du fichier pour l'usage complet.

**Étapes :**

1. **Acheter des crédits** sur [retrodiffusion.ai](https://retrodiffusion.ai). Estim. ~16-30 USD pour 160 images (60 médicaux + 20 décalés, × 2 variantes).
2. **Créer une clé API** : Account → API Keys. L'ajouter dans `.env.local` :
   ```
   RD_API_KEY=sk_xxx...
   ```
3. **Test sur 1 prompt** pour valider le rendu :
   ```bash
   npx tsx scripts/generate-avatars.ts --only=1 --variants=1 --set=med
   ```
4. **Batch médicaux seuls** :
   ```bash
   npx tsx scripts/generate-avatars.ts --set=med
   ```
5. **Batch décalés seuls** :
   ```bash
   npx tsx scripts/generate-avatars.ts --set=geek
   ```
6. **Tout en une fois** : `npx tsx scripts/generate-avatars.ts`

Le script :
- Skip les fichiers déjà générés → reprise OK après interruption
- Log le coût et le solde à chaque appel
- Affiche le total à la fin
- Sortie : `out/avatars/med-XX-vY.png` et `out/avatars/geek-XX-{label}-vY.png`

---

## Tri et intégration

1. **Tri visuel** dans `out/avatars/` : retenir les meilleurs (~50 médicaux, ~15 décalés)
2. **Post-prod** : upscale x2 (nearest neighbor, sans lissage) → 256×256 pour le web
3. **Intégration** :
   - Renommer en `avatar-1.png` à `avatar-N.png` (convention actuelle)
   - **Coupler obligatoirement** avec les étapes 1-3 du plan `avatars_migration_plan.md` (migration `users.portrait` URL→UUID)
   - Uploader dans `public/images/portraits/`
   - Mettre à jour `avatars.url` en BDD
4. **Côté CSS** : si tu veux reproduire l'effet "carré pastel" des avatars actuels (les PNG sont transparents), ajouter un `background-color` sur le container des avatars. Optionnellement varier la couleur par avatar via une colonne `avatars.bg_color` ou un hash de l'UUID.

## Critères de tri

Garder en priorité :
- Cadrage homogène (bust frontal, marges similaires)
- Lisibilité à 128×128
- Conformité au prompt (genre, accessoires, tenue, archétype identifiable)
- Pas de halos blancs résiduels sur les bords transparents

Écarter :
- Visages déformés / asymétriques excessifs
- Anti-aliasing parasite ou bords flous
- Tenues incohérentes
- Décalés non reconnaissables (si on ne voit pas qu'un pirate est un pirate, écarte)

---

## Historique des décisions (pour mémoire)

- **Cible initiale** : pure caricature Bullfrog Theme Hospital
- **Test 1 (Classic + prompt v1 positif renforcé)** : rendu jeune femme auburn — **bon style indie pixel joli individuel** → retenu finalement
- **Tests 2/3 (mêmes réglages, sujets différents)** : jeunes femmes basculaient vers anime/Stardew, vieux hommes vers caricature → écart stylistique inter-sujet
- **Plan B (Cartoon + prompt v2 anti-anime)** : cohérence inter-sujet, mais style moins joli individuellement → **non retenu**
- **Plan C (Classic + prompt v3 ultra-anti-anime)** : amélioration jeunes femmes mais retour de l'écart avec séniors → **non retenu**
- **Choix final** : **Classic + prompt v1 simple** (le test 1 d'origine). On accepte la légère variation stylistique entre jeunes/séniors comme cohérente avec la palette actuelle des avatars du site.

## Note diversité

**Pas de portraits voilés (hijab/headscarf) dans le set médical.** Choix éditorial assumé — la diversité passe par âges, ethnies, couleurs/coupes de cheveux, tenues, accessoires.

**Archétypes geek génériques, sans personnages identifiables nommément.** Choix juridique assumé pour éviter tout risque IP (Disney/Lucasfilm/Nintendo, etc.) — les descriptions évocatrices suffisent à transmettre l'esprit.
