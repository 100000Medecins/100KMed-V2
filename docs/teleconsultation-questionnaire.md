# Questionnaire d'évaluation — Catégorie Téléconsultation

> Brouillon initial — **2026-06-09**
> Statut : **proposition à valider**, pas encore implémenté en BDD.
> Modèle : calqué sur `docs/teletransmission-questionnaire.md` (livré 2026-05-17).

---

## Rappel architecture (lecture rapide)

Le système d'évaluation a 2 niveaux, communs à toutes les catégories :

1. **5 critères majeurs fixes** (hardcodés dans `src/app/solution/noter/[...slug]/page.tsx:18`) :
   `interface`, `fonctionnalites`, `fiabilite`, `editeur`, `qualite_prix`.
   Le médecin les note en étape 1.

2. **Questions détaillées en BDD** (`questionnaire_sections` + `questionnaire_questions`), chaque question taggée avec un des 5 critères majeurs. En étape 2, la moyenne des sous-questions d'un critère **remplace** la note de niveau 1 si la majorité reçoit une note.

**Convention de `key`** : préfixe `tlc_*` pour cette catégorie (téléconsultation), suivi d'un nom court explicite. Le `key` est stocké dans `evaluations.scores` JSONB → **immuable une fois publié**.

---

## Spécificités de la catégorie à respecter

Le catalogue Téléconsultation regroupe **15 solutions très hétérogènes** (cf [docs/teleconsultation-import.md](teleconsultation-import.md)) :

- **Plateformes agréées société de TLC** (Qare, Livi, MEDADOM, Tessan, MédecinDirect) — modèle salariat ou commission, médecin de plateforme.
- **Modules vidéo intégrés à un LGC/agenda** (Doctolib, Maiia, Hellocare Pro, Clickdoc, MadeForMed) — médecin en nom propre, sa patientèle.
- **Outils de coordination territoriale** (Medaviz, Globule, Prédice, Télémédecine SARA, TELMI) — orientation CPTS/MSP/régionale.

→ Les questions doivent rester **pertinentes pour ces 3 familles** (pas de question type "votre patientèle gagnée" qui n'a pas de sens pour un salarié Livi).

→ Le critère `qualite_prix` doit être adapté : pour les plateformes gratuites (Qare, Livi), c'est plus une question de **rémunération honnête au paiement** que de tarif facturé au médecin.

→ Éviter les questions trop "agendas/LGC" : ces aspects sont déjà évalués dans les catégories Agendas et Logiciels métier.

---

## Contenu proposé — 18 questions / 3 sections

### Section 1 — Qualité de la téléconsultation
*Introduction : « À propos de la consultation vidéo elle-même : la fluidité, la qualité, et les outils cliniques disponibles : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tlc_qualite_video` | La qualité vidéo/audio est-elle bonne, stable, sans coupures fréquentes ? | `fiabilite` |
| `tlc_connexion_patient` | Le patient se connecte-t-il facilement (envoi du lien, prérequis, support à la connexion) sans assistance technique côté médecin ? | `fonctionnalites` |
| `tlc_outils_cliniques` | Les outils cliniques disponibles pendant la consultation sont-ils utiles (partage d'écran, annotation d'images/photos, accès au dossier patient, prescription électronique) ? | `fonctionnalites` |
| `tlc_dispositifs_connectes` | Si la solution propose des dispositifs médicaux connectés (cabine, dermatoscope, stéthoscope…), sont-ils fiables et la qualité de mesure est-elle exploitable cliniquement ? | `fonctionnalites` |
| `tlc_continuite_soins` | La continuité des soins est-elle bien gérée (CR auto-versé au dossier, notification du médecin traitant, partage MSSanté) ? | `fonctionnalites` |

### Section 2 — Modèle économique & administratif
*Introduction : « Concernant la rémunération, la facturation et la place dans votre activité : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tlc_facturation_fse` | La facturation FSE (mode SESAM sans Vitale en TLC) fonctionne-t-elle bien, avec tiers payant et NOEMIE fluides ? | `fonctionnalites` |
| `tlc_tarification_transparente` | La tarification de la solution est-elle transparente, sans frais cachés, et le modèle économique (abonnement, commission, salariat) est-il clair dès le départ ? | `qualite_prix` |
| `tlc_remuneration_juste` | Pour les plateformes agréées ou à la commission : la rémunération du médecin est-elle équitable et perçue dans des délais raisonnables ? Pour les autres : le rapport qualité-prix est-il satisfaisant ? | `qualite_prix` |
| `tlc_flux_patients` | La solution apporte-t-elle un flux de patients pertinents (volumétrie, profils, motifs adaptés à votre activité) ou permet-elle de garder votre patientèle ? | `fonctionnalites` |
| `tlc_charge_administrative` | La charge administrative résiduelle pour le médecin (paperasse, justificatifs, déclarations) est-elle réduite au minimum ? | `interface` |

### Section 3 — Ergonomie, intégration & relation éditeur
*Introduction : « Sur le confort d'usage au quotidien, l'intégration à votre environnement et la qualité de l'éditeur : »*

| key BDD | Question | critère majeur |
|---|---|---|
| `tlc_facilite_prise_en_main` | La prise en main est-elle rapide pour un médecin et son secrétariat (interface intuitive, parcours de RDV clair) ? | `interface` |
| `tlc_integration_agenda_lgc` | L'intégration à votre agenda et/ou LGC habituel est-elle fluide (pas de double saisie, ordonnance dans le dossier, accès historique patient) ? | `interface` |
| `tlc_mobilite` | L'usage en mobilité (app mobile, tablette, consultation hors cabinet) est-il satisfaisant et non dégradé par rapport au desktop ? | `fonctionnalites` |
| `tlc_securite_conformite` | Les garanties de sécurité et conformité sont-elles claires et tenues (HDS, PSC/CPS, RGPD, audit régulier) ? | `fiabilite` |
| `tlc_disponibilite_service` | La disponibilité du service est-elle au rendez-vous (peu de pannes, maintenance hors horaires consultation, communication transparente en cas d'incident) ? | `fiabilite` |
| `tlc_support_quotidien` | Le support technique au quotidien est-il réactif, disponible aux horaires de consultation et de qualité ? | `editeur` |
| `tlc_accompagnement_humain` | L'accompagnement humain (onboarding, formation, conseil sur la cotation/parcours de soin) est-il à la hauteur ? | `editeur` |
| `tlc_evolutions_communication` | L'éditeur communique-t-il clairement sur les évolutions, les changements réglementaires et écoute-t-il les retours utilisateurs ? | `editeur` |

---

## Répartition des 18 questions par critère majeur

| Critère majeur | Nb questions | Lesquelles (résumé) |
|---|---|---|
| `interface` | 3 | charge_administrative, facilite_prise_en_main, integration_agenda_lgc |
| `fonctionnalites` | 8 | connexion_patient, outils_cliniques, dispositifs_connectes, continuite_soins, facturation_fse, flux_patients, mobilite, *(8 au total)* |
| `fiabilite` | 3 | qualite_video, securite_conformite, disponibilite_service |
| `editeur` | 3 | support_quotidien, accompagnement_humain, evolutions_communication |
| `qualite_prix` | 2 | tarification_transparente, remuneration_juste |
| **Total** | **18** | |

Distribution équilibrée vs Télétransmission qui était à 20 questions (dont 12 sur `fonctionnalites`). Ici on a un peu plus de poids sur `interface` et `editeur` car la téléconsultation est autant un sujet de **service/expérience** que de fonctionnel pur.

---

## Points à valider avant implémentation BDD

1. **Le nombre de questions (18) te convient-il ?** Télétransmission avait 20. Si tu veux raccourcir, on peut fusionner 2-3 paires (ex. `securite_conformite` + `disponibilite_service`, ou `support_quotidien` + `accompagnement_humain`).
2. **La question `tlc_remuneration_juste`** est volontairement bi-formulation (plateforme agréée vs autres). Soit on garde ça, soit on coupe en 2 questions distinctes — moins élégant mais plus net.
3. **La question `tlc_dispositifs_connectes`** ne concerne que 2-3 solutions (MEDADOM, Tessan). Le médecin qui évalue Doctolib pourra-t-il la skip ? **Réponse architecture** : oui, toutes les questions sont individuellement skippables (notation 0 = pas notée → ignorée dans la moyenne). Cf [page.tsx:619](src/app/solution/noter/[...slug]/page.tsx#L619).
4. **Convention de préfixe `tlc_*`** : OK ? (vs `tc_*` plus court mais possible confusion avec « tags catégories »)
5. **Formulation des intros de section** : préférences éditoriales ?

---

## Implémentation BDD (à faire après validation)

Mêmes 2 tables que Télétransmission :
- `questionnaire_sections` → 3 lignes pour `categorie_slug = 'teleconsultation'`
- `questionnaire_questions` → 18 lignes rattachées

Le questionnaire sera servi automatiquement par `getSectionsForSlug('teleconsultation')` sur `/solution/noter/teleconsultation/[idSolution]`. Pas de modif de code nécessaire.

SQL inline à livrer en bloc unique après validation des questions.
