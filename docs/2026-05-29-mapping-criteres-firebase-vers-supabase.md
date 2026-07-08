# Mapping critères Firebase → Supabase (évaluations logiciels-métier)

> Référence pour toute conversion d'évaluations importées de Firebase.
> Source : `mapping_criteres_v2.csv` (fichier de travail David) + reconstruction empirique
> validée sur 622 évals déjà converties (session 2026-05-28).
> **Ne concerne que la catégorie `logiciels-metiers`** (les autres catégories — agenda, IA, etc.
> — utilisent d'autres préfixes de clés : `agenda_*`, `docai_*`, `ias_*`).

## Contexte

Dans Firebase, une évaluation stockait ses notes sous des **clés numériques** (`identifiantTech`
`"1"` à `"50"`), toutes notées sur **0-10**. La migration vers Supabase a :
- converti les notes en **0-5** (division par 2)
- renommé les 5 critères majeurs (`"1"`→`interface`, etc.)
- renommé les sous-critères en clés `detail_*` (référentiel repensé)
- gardé le commentaire libre dans `scores.commentaire`

Le **vrai mapping** n'avait pas été versionné — ce document corrige ce manque.

## Critères majeurs (idTech 1-5)

| idTech FB | nomLong FB | clé Supabase |
|---|---|---|
| 1 | Son interface utilisateur | `interface` |
| 2 | Ses fonctionnalités | `fonctionnalites` |
| 3 | Sa fiabilité | `fiabilite` |
| 4 | Votre rapport à l'éditeur | `editeur` |
| 5 | Rapport qualité/prix | `qualite_prix` |

## Sous-critères (idTech 6-49) → `detail_*`

| idTech FB | nomLong FB | clé Supabase `detail_*` |
|---|---|---|
| 6 | Intuitif | `detail_prise_en_main` |
| 7 | Pratique | `detail_donnees_utiles_prescription` |
| 8 | Réactif | `detail_reactif` |
| 9 | Stable | `detail_stabilite` |
| 10 | Dossier patient | *(pas d'équivalent moderne — supprimé)* |
| 11 | Prescription de médicaments | `detail_ordonnance_pharmacie` |
| 12 | LDAP | `detail_alertes_ldap` |
| 13 | Modèles de prescription | `detail_modeles_ordonnance` |
| 14 | Signature | `detail_signature_numerique` |
| 15 | Prescription autres | `detail_prescription_autres` |
| 16 | Modèles de prescription (doublon FB) | `detail_modeles_ordonnance` |
| 17 | Gestion des courriers | `detail_classement_docs` |
| 18 | Édition | `detail_courrier_adressage` |
| 19 | Réception | *(pas d'équivalent moderne — supprimé)* |
| 20 | Importation des résultats | `detail_resultats_bio` |
| 21 | Module de télétransmission | `detail_teletransmission` |
| 22 | Carnet d'adresses | `detail_carnet_adresse` |
| 23 | Module de comptabilité | `detail_comptabilite` |
| 24 | Sauvegarde | `detail_hebergement` |
| 25 | Mise à jour | `detail_maj` |
| 26 | Messagerie interne | `detail_messagerie_interne` |
| 27 | Intégration d'un agenda natif / externe | `detail_agenda` |
| 28 | Moteur de recherche interne multicritères | `detail_recherche_multicriteres` |
| 29 | Modèles de consultation & saisie données structurées | `detail_modeles_consultation` |
| 30 | Base de documents | *(pas d'équivalent moderne — supprimé)* |
| 31 | Dictée vocale | `detail_ia_scribe` |
| 32 | Gestion des droits d'accès | `detail_droits_acces` |
| 33 | Visualisation des résultats biologiques | `detail_examens_visualisation` |
| 34 | Téléservices de l'assurance maladie | `detail_teleservices` |
| 35 | Intégration d'une messagerie sécurisée | `detail_messagerie_securisee` |
| 36 | Signature électronique et échange de documents | `detail_signature_numerique` |
| 37 | Intégration des examens en consultation | `detail_examens_integration` |
| 38 | Interconnexion avec le DMP | `detail_dmp_recuperation` |
| 39 | Usage en mobilité | `detail_mobilite` |
| 40 | Interopérabilité | `detail_teleexpertise` |
| 41 | Module pour objets médicaux connectés | *(pas d'équivalent moderne — supprimé)* |
| 42 | Sa transparence | `detail_resiliation` |
| 43 | Ses pratiques commerciales | `detail_pratiques_commerciales` |
| 44 | L'accessibilité de son SAV | `detail_sav` |
| 45 | La qualité des réponses du SAV | `detail_sav` |
| 46 | La formation initiale | `detail_formation` |
| 47 | La formation continue | `detail_formation` |
| 48 | L'écoute et l'intégration de vos besoins | `detail_ecoute_besoins` |
| 49 | Votre appréciation (NPS) | `detail_nps` |
| 50 | Commentaires libres | `scores.commentaire` |

## Fusions N→1

Plusieurs anciens critères Firebase ont été **fusionnés** en un seul critère moderne.
Lors d'une conversion, prendre la **moyenne** des valeurs (FB/2) :

- `detail_modeles_ordonnance` ← idTech **13 + 16** (doublon « Modèles de prescription »)
- `detail_signature_numerique` ← idTech **14 + 36** (Signature + Signature électronique)
- `detail_sav` ← idTech **44 + 45** (accessibilité SAV + qualité réponses SAV)
- `detail_formation` ← idTech **46 + 47** (formation initiale + continue)

## Sous-critères Firebase sans équivalent moderne (supprimés à la conversion)

idTech **10** (Dossier patient), **19** (Réception), **30** (Base de documents),
**41** (Objets médicaux connectés). Le questionnaire a été repensé ; ces questions n'ont
pas de correspondance dans le référentiel actuel.

## Critères `detail_*` modernes « ajoutés » (sans ancien équivalent Firebase)

Ces critères existent dans le nouveau questionnaire mais n'avaient pas d'ancien critère FB
(colonne `statut = ajouté` dans le CSV) : `detail_connexion`, `detail_ins`, `detail_atcd`,
`detail_ordonnance_numerique`, `detail_envoi_dmp`, `detail_modeles_certificats`,
`detail_pluripro`, `detail_staffs`, `detail_aati`, `detail_profil_remplacant`,
`detail_import_donnees`, `detail_communication`, `detail_politique_tarifaire`,
`detail_efficience`. Ils restent vides pour les évals importées de Firebase.

## Validation

- **CSV officiel** (`ancien_critere_1`/`2` → `detail_*`) et **reconstruction empirique**
  (valeur SB == valeur FB/2 sur 250-590 évals) **concordent** sur les 23 mappings 1:1
  vérifiables. L'empirique a comblé 5 trous du CSV (doublons de libellé / critères marqués
  « ajouté » mais en réalité matchables : idTech 12, 23, 27, 28, 48, 49).
- Mapping figé dans les scripts `scripts/fix-anciennes-evals-format.ts` et
  `scripts/fix-import-evals-manquantes.ts` (constante `IDTECH_TO_DETAIL`).
