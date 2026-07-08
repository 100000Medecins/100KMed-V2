# Audit Firebase ↔ Supabase — évaluations

> Généré le 2026-05-28.
> Périmètre : 24 solutions `is_firebase_legacy = true`.

## Synthèse globale

| Métrique | Valeur |
|---|---|
| Évaluations Firebase totales (solutions legacy) | 705 |
| Évaluations Supabase totales (mêmes solutions) | 658 |
| Évals présentes des deux côtés (match RPPS) | 652 |
| Évals Firebase **non importées** (FB only) | 49 |
| Évals Supabase sans pendant FB (post-migration) | 1 |
| Évals avec **moyenne_utilisateur divergente** vs FB/2 | 155 |
| Évals avec **commentaire Firebase perdu** | 0 |
| Évals SB avec **ancien format** (clés numériques "1"-"50") | 0 |
| Évals SB avec **critères majeurs manquants** | 155 |

## Détail par solution

| Solution | FB | SB | Match | FB-only | Moy div | Com perdus | Anc fmt | Maj manquants |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Acteur.fr | 4 | 3 | 3 | 1 | 1 | 0 | 0 | 0 |
| Alma Pro | 57 | 56 | 55 | 2 | 16 | 0 | 0 | 16 |
| AxiSanté 5 | 62 | 58 | 58 | 4 | 17 | 0 | 0 | 17 |
| Crossway | 38 | 37 | 37 | 1 | 15 | 0 | 0 | 15 |
| Doctolib Médecin | 84 | 76 | 74 | 9 | 0 | 0 | 0 | 0 |
| DrSanté | 47 | 40 | 39 | 7 | 10 | 0 | 0 | 10 |
| easy-care | 4 | 2 | 2 | 2 | 0 | 0 | 0 | 0 |
| éO Médecin | 4 | 3 | 3 | 1 | 0 | 0 | 0 | 0 |
| Follow | 3 | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| HelloDoc | 57 | 56 | 55 | 1 | 26 | 0 | 0 | 27 |
| Med'Oc | 3 | 3 | 3 | 0 | 2 | 0 | 0 | 2 |
| Medicab | 2 | 2 | 2 | 0 | 1 | 0 | 0 | 1 |
| MedicaWin | 3 | 3 | 3 | 0 | 2 | 0 | 0 | 2 |
| Mediclick | 24 | 22 | 22 | 2 | 12 | 0 | 0 | 12 |
| MEDILINK | 8 | 7 | 7 | 1 | 0 | 0 | 0 | 0 |
| Medimust | 11 | 9 | 9 | 1 | 4 | 0 | 0 | 4 |
| Medistory | 93 | 88 | 88 | 5 | 21 | 0 | 0 | 21 |
| MLM | 34 | 32 | 32 | 2 | 12 | 0 | 0 | 12 |
| Odaiji | 35 | 34 | 33 | 2 | 0 | 0 | 0 | 0 |
| Premiocare | 7 | 6 | 6 | 1 | 0 | 0 | 0 | 0 |
| Shaman | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| TAMM | 3 | 3 | 3 | 0 | 0 | 0 | 0 | 0 |
| Weda | 114 | 107 | 107 | 7 | 16 | 0 | 0 | 16 |
| XMED | 6 | 6 | 6 | 0 | 0 | 0 | 0 | 0 |

## Anomalies détaillées par solution

### Acteur.fr

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10001493146 | JULIEN GERVAIS | 2024-10-22 |

**1 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10001048536 |  | 0 | 0 | 2.5 | 2.5 |

### Alma Pro

**2 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10101401213 | ALEX PESCHARD | 2023-07-05 |
| 10100100733 | SANDRA MALAK | 2024-01-04 |

**16 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10001114551 | MICHEL LARDET | 0 | 0 | 1.46 | 1.46 |
| 10100426021 | Lucile SCHUBEL | 0 | 0 | 4.23 | 4.23 |
| 10000719624 | FRANCOIS-YVES LEGET | 0 | 0 | 3.75 | 3.75 |
| 10002793155 | CHRISTOPHE DIENER | 0 | 0 | 3.96 | 3.96 |
| 10003816583 | Anne BALLOUL | 0 | 0 | 4.05 | 4.05 |
| 10002777307 | SOPHIE BORDES | 0 | 0 | 4.97 | 4.97 |
| 10004406996 | BRUNO PAGES | 0 | 0 | 3.58 | 3.58 |
| 10003098802 | MYRIAM OLIVA | 0 | 0 | 4.76 | 4.76 |
| 10002114931 | LAURENT WAYMEL | 0 | 0 | 4.06 | 4.06 |
| 10100175602 | JULIETTE DUPRE | 0 | 0 | 3.37 | 3.37 |
| 10002695624 | DIDIER CABANNES | 0 | 0 | 4.44 | 4.44 |
| 10002522216 | Marie-Christine BERTIN | 0 | 0 | 3.69 | 3.69 |
| 10001514222 | Nha Huong TRAN | 0 | 0 | 4.85 | 4.85 |
| 10100842649 | Priscillia WOLSZTYNSKI | 0 | 0 | 4.27 | 4.27 |
| 10004067889 | SANDRINE ABGRALL-ROQUES | 0 | 0 | 4.27 | 4.27 |
| 10003409322 | Catherine ZANUTTINI | 0 | 0 | 4.29 | 4.29 |

**16 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10001114551 | MICHEL LARDET | fiabilite |
| 10100426021 | Lucile SCHUBEL | fiabilite |
| 10000719624 | FRANCOIS-YVES LEGET | fiabilite |
| 10002793155 | CHRISTOPHE DIENER | fiabilite |
| 10003816583 | Anne BALLOUL | fiabilite |
| 10002777307 | SOPHIE BORDES | fiabilite |
| 10004406996 | BRUNO PAGES | fiabilite |
| 10003098802 | MYRIAM OLIVA | fiabilite |
| 10002114931 | LAURENT WAYMEL | fiabilite |
| 10100175602 | JULIETTE DUPRE | fiabilite |
| 10002695624 | DIDIER CABANNES | fiabilite |
| 10002522216 | Marie-Christine BERTIN | fiabilite |
| 10001514222 | Nha Huong TRAN | fiabilite |
| 10100842649 | Priscillia WOLSZTYNSKI | fiabilite |
| 10004067889 | SANDRINE ABGRALL-ROQUES | fiabilite |
| 10003409322 | Catherine ZANUTTINI | fiabilite |

### AxiSanté 5

**4 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10002939303 | JEAN-PHILIPPE COISNE | 2025-11-16 |
| 10100204659 | Vincent POUPARD | 2026-03-18 |
| 10101251436 | Adriaan DETAVERNIER | 2023-09-21 |
| 10001930196 | NATHALIE BOURGEAIS | 2024-10-20 |

**17 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10002777307 | SOPHIE BORDES | 0 | 0 | 2.5 | 2.5 |
| 10100921351 | ROMAIN PINON | 0 | 0 | 1.93 | 1.93 |
| 10100617165 | GAELLE FOUGERE | 0 | 0 | 3.51 | 3.51 |
| 10002321338 | LAURENCE LEGROS | 0 | 0 | 4.06 | 4.06 |
| 10000696004 | VERONIQUE BOZON-GONNET | 0 | 0 | 3.39 | 3.39 |
| 10003219382 | Jean MOLLES | 0 | 0 | 1.55 | 1.55 |
| 10003226023 | PIERRE FRANCOIS | 0 | 0 | 3.49 | 3.49 |
| 10003741054 | PHILIPPE BICHAT | 0 | 0 | 3.89 | 3.89 |
| 10003058541 | VERONIQUE PETITET | 0 | 0 | 2.02 | 2.02 |
| 10100472561 | Elodie MARTEL | 0 | 0 | 3.49 | 3.49 |
| 10003258604 | CARINE MICHOT | 0 | 0 | 1.47 | 1.47 |
| 10002643947 | HERVE COUEPEL | 0 | 0 | 2.91 | 2.91 |
| 10002124799 | EMMANUELLE GEFFRAY | 0 | 0 | 3.22 | 3.22 |
| 10100396521 | DIMITRI STEPOWSKI | 0 | 0 | 2.54 | 2.54 |
| 10100595445 | NICOLAS PELLEGRIN | 0 | 0 | 2.87 | 2.87 |
| 10100565182 | Vincent ROBERDEAU | 0 | 0 | 3.2 | 3.2 |
| 10002308848 | Frédéric MOUQUET | 0 | 0 | 2.34 | 2.34 |

**17 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10002777307 | SOPHIE BORDES | fiabilite, editeur, qualite_prix |
| 10100921351 | ROMAIN PINON | fiabilite |
| 10100617165 | GAELLE FOUGERE | fiabilite |
| 10002321338 | LAURENCE LEGROS | fiabilite |
| 10000696004 | VERONIQUE BOZON-GONNET | fiabilite |
| 10003219382 | Jean MOLLES | fiabilite |
| 10003226023 | PIERRE FRANCOIS | fiabilite |
| 10003741054 | PHILIPPE BICHAT | fiabilite, qualite_prix |
| 10003058541 | VERONIQUE PETITET | fiabilite |
| 10100472561 | Elodie MARTEL | fiabilite |
| 10003258604 | CARINE MICHOT | fiabilite |
| 10002643947 | HERVE COUEPEL | fiabilite |
| 10002124799 | EMMANUELLE GEFFRAY | fiabilite |
| 10100396521 | DIMITRI STEPOWSKI | fiabilite |
| 10100595445 | NICOLAS PELLEGRIN | fiabilite |
| 10100565182 | Vincent ROBERDEAU | fiabilite |
| 10002308848 | Frédéric MOUQUET | fiabilite |

### Crossway

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10003354981 | CHRISTIAN FABRE | 2026-01-01 |

**15 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10002697190 | FRANCOIS THISSE | 0 | 0 | 2.57 | 2.57 |
| 10000782010 | Jean-Francois DEVERRE | 0 | 0 | 3.91 | 3.91 |
| 10002108446 | JEAN-PHILIPPE LARGILLIERE | 0 | 0 | 3.49 | 3.49 |
| 10002086311 | SAMIA FARAD | 0 | 0 | 2.76 | 2.76 |
| 10002601135 | JEAN-LOUIS FOURS | 0 | 0 | 3.98 | 3.98 |
| 10003110367 | BERANGERE BERTHOMME | 0 | 0 | 2.91 | 2.91 |
| 10002950250 | Philippe BERTRON | 0 | 0 | 3.5 | 3.5 |
| 10004060223 | Anne ROUSSEAU | 0 | 0 | 3.47 | 3.47 |
| 10000779305 | Christophe ANDRE | 0 | 0 | 4.52 | 4.52 |
| 10002305935 | Ludovic WILLEMS | 0 | 0 | 3.08 | 3.08 |
| 10101089810 | Simon FRÉMAUX | 0 | 0 | 1.67 | 1.67 |
| 10002598836 | Frederick EVELLIN | 0 | 0 | 4.2 | 4.2 |
| 10100323525 | EDOUARD SEVE | 0 | 0 | 3.13 | 3.13 |
| 10100467934 | EVA DE PERETTI DELLA ROCCA | 0 | 0 | 1.61 | 1.61 |
| 10000672377 | BRUNO GUILLEMOT | 0 | 0 | 3.08 | 3.08 |

**15 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10002697190 | FRANCOIS THISSE | fiabilite |
| 10000782010 | Jean-Francois DEVERRE | fiabilite |
| 10002108446 | JEAN-PHILIPPE LARGILLIERE | fiabilite |
| 10002086311 | SAMIA FARAD | fiabilite |
| 10002601135 | JEAN-LOUIS FOURS | fiabilite |
| 10003110367 | BERANGERE BERTHOMME | fiabilite, qualite_prix |
| 10002950250 | Philippe BERTRON | fiabilite |
| 10004060223 | Anne ROUSSEAU | fiabilite |
| 10000779305 | Christophe ANDRE | fiabilite |
| 10002305935 | Ludovic WILLEMS | fiabilite |
| 10101089810 | Simon FRÉMAUX | fiabilite, qualite_prix |
| 10002598836 | Frederick EVELLIN | fiabilite |
| 10100323525 | EDOUARD SEVE | fiabilite |
| 10100467934 | EVA DE PERETTI DELLA ROCCA | fiabilite |
| 10000672377 | BRUNO GUILLEMOT | fiabilite |

### Doctolib Médecin

**9 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10003714283 | Christophe BUSUTTIL | 2024-03-18 |
| 10000961945 | Olivier MICHEL | 2024-08-06 |
| 10101516705 | Benoît PONCET | 2024-10-31 |
| 10003450250 | Marc Georges RAINAUDI | 2024-12-09 |
| 10109299932 | Hichem GHAOUTI | 2026-01-25 |
| 10100835908 | LUC HUMBERTCLAUDE | 2025-12-11 |
| 10101772977 | Desimir BORISOV | 2024-12-06 |
| 10100396497 | YOANN HENRI | 2025-07-21 |
| 10100499812 | Stéphane TALA | 2024-09-30 |

### DrSanté

**7 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10101671039 | ? | 2026-05-12 |
| 10004395389 | SEVERINE LETELLIER | 2025-04-18 |
| 10100394740 | DAVID AZERAD | 2023-07-12 |
| 10100599553 | Vasilis ANGELIS | 2025-11-14 |
| 10003235305 | BERTRAND RAYNAL | 2025-01-01 |
| 10100927895 | MAXIME JOHAN | 2024-12-29 |
| 10101083227 | AUDREY VERNEAU | 2025-03-24 |

**10 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10002723335 | GASTON DOURESSAMY | 0 | 0 | 5 | 5 |
| 10003249611 | JEROME CAMPAGNAC | 0 | 0 | 2.68 | 2.68 |
| 10100947448 | GENEVIEVE BERTAINA | 0 | 0 | 3.91 | 3.91 |
| 10002392149 | HELENE DALLAIRE | 0 | 0 | 4.35 | 4.35 |
| 10100036200 | PIERRE ABBADIE | 0 | 0 | 4.16 | 4.16 |
| 10100515872 | DESIRE KOTCHONI YABI | 0 | 0 | 3.91 | 3.91 |
| 10002945102 | STEPHANIE TANDY | 0 | 0 | 4.22 | 4.22 |
| 10100574010 | Elie CAPERA | 0 | 0 | 4.19 | 4.19 |
| 10000035252 | Iyadh ALLANI | 0 | 0 | 2.96 | 2.96 |
| 10004085337 | ISABELLE THIERRY | 0 | 0 | 3.8 | 3.8 |

**10 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10002723335 | GASTON DOURESSAMY | fiabilite |
| 10003249611 | JEROME CAMPAGNAC | fiabilite |
| 10100947448 | GENEVIEVE BERTAINA | fiabilite |
| 10002392149 | HELENE DALLAIRE | fiabilite |
| 10100036200 | PIERRE ABBADIE | fiabilite |
| 10100515872 | DESIRE KOTCHONI YABI | fiabilite |
| 10002945102 | STEPHANIE TANDY | fiabilite |
| 10100574010 | Elie CAPERA | fiabilite |
| 10000035252 | Iyadh ALLANI | fiabilite |
| 10004085337 | ISABELLE THIERRY | fiabilite |

### easy-care

**2 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10100394740 | DAVID AZERAD | 2025-04-04 |
| 10002489226 | MARTIAL PARDON | 2024-12-18 |

### éO Médecin

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10100394740 | DAVID AZERAD | 2025-03-06 |

### HelloDoc

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10002603248 | Nadine DURAND-TILY | 2024-10-30 |

**26 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10100972966 | HADRIEN FEY | 0 | 0 | 3.21 | 3.21 |
| 10003806634 | RENE LAVOT | 0 | 0 | 2.13 | 2.13 |
| 10100660017 | THOMAS CORNILLIER | 0 | 0 | 2.8 | 2.8 |
| 10002784394 | Claudine NORMAND-PASCAL | 0 | 0 | 2.98 | 2.98 |
| 10100912848 | CAMILLE BOISARD | 0 | 0 | 3.56 | 3.56 |
| 10100075034 | MICHAEL CORNAIRE | 0 | 0 | 0.93 | 0.93 |
| 10003440616 | Stephanie TOULLEC-HOANG | 0 | 0 | 1.67 | 1.67 |
| 10002901204 | Jean-Marc PARIENTE | 0 | 0 | 1.93 | 1.93 |
| 10004055660 | Mélanie SUTY | 0 | 0 | 1.55 | 1.55 |
| 10002114931 | LAURENT WAYMEL | 0 | 0 | 2.13 | 2.13 |
| 10000761865 | Francois BONNAUD | 0 | 0 | 2.63 | 2.63 |
| 10101001567 | Guillaume WILMOUTH | 0 | 0 | 2.63 | 2.63 |
| 10001567881 | Christophe HOUSSAINT | 0 | 0 | 2.22 | 2.22 |
| 10100036200 | PIERRE ABBADIE | 0 | 0 | 1.94 | 1.94 |
| 10002793155 | CHRISTOPHE DIENER | 0 | 0 | 1 | 1 |
| 10002331881 | CAROLE EYGASIER | 0 | 0 | 2.94 | 2.94 |
| 10003375713 | REYNALD CHAPUIS | 0 | 0 | 2.7 | 2.7 |
| 10100330173 | FRANCOIS TRABUT | 0 | 0 | 2.42 | 2.42 |
| 10003105524 | RICHARD TOPENOT | 0 | 0 | 2.51 | 2.51 |
| 10002995875 | Valérie BOURIN-KLEIN | 0 | 0 | 2.63 | 2.63 |
| 10002792645 | THIERRY BRIGNOL | 0 | 0 | 1.59 | 1.59 |
| 10001834513 | FRANCK BEAUDOIN | 0 | 0 | 1.23 | 1.23 |
| 10003164166 | Pierre CHAMBON | 0 | 0 | 3.53 | 3.53 |
| 10002529492 | JOSE GALVEZ | 0 | 0 | 1.54 | 1.54 |
| 10003009510 | Bernadette COLOMBET-VALEILLE | 0 | 0 | 3.12 | 3.12 |
| 10002903036 | FANCHON CARIOU | 0 | 0 | 3.34 | 3.34 |

**27 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10100972966 | HADRIEN FEY | fiabilite |
| 10003806634 | RENE LAVOT | fiabilite |
| 10100660017 | THOMAS CORNILLIER | fiabilite |
| 10002784394 | Claudine NORMAND-PASCAL | fiabilite |
| 10002275138 | PASCAL GUFFROY | editeur |
| 10100912848 | CAMILLE BOISARD | fiabilite |
| 10100075034 | MICHAEL CORNAIRE | fiabilite |
| 10003440616 | Stephanie TOULLEC-HOANG | fiabilite |
| 10002901204 | Jean-Marc PARIENTE | fiabilite |
| 10004055660 | Mélanie SUTY | fiabilite, qualite_prix |
| 10002114931 | LAURENT WAYMEL | fiabilite |
| 10000761865 | Francois BONNAUD | fiabilite |
| 10101001567 | Guillaume WILMOUTH | fiabilite |
| 10001567881 | Christophe HOUSSAINT | fiabilite |
| 10100036200 | PIERRE ABBADIE | fiabilite, qualite_prix |
| 10002793155 | CHRISTOPHE DIENER | fiabilite, qualite_prix |
| 10002331881 | CAROLE EYGASIER | fiabilite |
| 10003375713 | REYNALD CHAPUIS | fiabilite |
| 10100330173 | FRANCOIS TRABUT | fiabilite |
| 10003105524 | RICHARD TOPENOT | fiabilite |
| 10002995875 | Valérie BOURIN-KLEIN | fiabilite |
| 10002792645 | THIERRY BRIGNOL | fiabilite |
| 10001834513 | FRANCK BEAUDOIN | fiabilite, editeur, qualite_prix |
| 10003164166 | Pierre CHAMBON | fiabilite |
| 10002529492 | JOSE GALVEZ | fiabilite |
| 10003009510 | Bernadette COLOMBET-VALEILLE | fiabilite |
| 10002903036 | FANCHON CARIOU | fiabilite |

### Med'Oc

**2 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10001661957 | AGNES NICOLAS | 0 | 0 | 4.21 | 4.21 |
| 10002993961 | FREDERIC LASCOUTOUNAX | 0 | 0 | 4.45 | 4.45 |

**2 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10001661957 | AGNES NICOLAS | fiabilite |
| 10002993961 | FREDERIC LASCOUTOUNAX | fiabilite |

### Medicab

**1 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10003127502 | Stéphanie CUOMO-ROBERT | 0 | 0 | 3.24 | 3.24 |

**1 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10003127502 | Stéphanie CUOMO-ROBERT | fiabilite |

### MedicaWin

**2 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10003200481 | OLIVIER ANTHERIEU | 0 | 0 | 2.15 | 2.15 |
| 10001114551 | MICHEL LARDET | 0 | 0 | 2.94 | 2.94 |

**2 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10003200481 | OLIVIER ANTHERIEU | fiabilite |
| 10001114551 | MICHEL LARDET | fiabilite |

### Mediclick

**2 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10002466851 | Véronique SCHALLER | 2025-03-27 |
| 10002718038 | JEAN-PHILIPPE MESA | 2023-09-26 |

**12 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10002561685 | JEAN-LUC CORMIER | 0 | 0 | 3.31 | 3.31 |
| 10101368917 | Guillaume MALAFOSSE | 0 | 0 | 2.58 | 2.58 |
| 10000981810 | Marc WURSTHORN | 0 | 0 | 2.75 | 2.75 |
| 10003107108 | JULIEN MATHIAS | 0 | 0 | 0.94 | 0.94 |
| 10002087483 | MICKAEL MALHAIRE | 0 | 0 | 2.76 | 2.76 |
| 10000035252 | Iyadh ALLANI | 0 | 0 | 2.36 | 2.36 |
| 10002697190 | FRANCOIS THISSE | 0 | 0 | 3.99 | 3.99 |
| 10001669265 | Francois BOUTARIC | 0 | 0 | 2.94 | 2.94 |
| 10100916161 | ANNA LEBATEUX | 0 | 0 | 2.89 | 2.89 |
| 10100095107 | Mathieu VAN DESSEL | 0 | 0 | 2.19 | 2.19 |
| 10001769016 | Francois LEAUD | 0 | 0 | 4.06 | 4.06 |
| 10100898187 | FRANKLIN HAYS | 0 | 0 | 3.35 | 3.35 |

**12 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10002561685 | JEAN-LUC CORMIER | fiabilite |
| 10101368917 | Guillaume MALAFOSSE | fiabilite |
| 10000981810 | Marc WURSTHORN | fiabilite |
| 10003107108 | JULIEN MATHIAS | fiabilite, qualite_prix |
| 10002087483 | MICKAEL MALHAIRE | fiabilite |
| 10000035252 | Iyadh ALLANI | fiabilite |
| 10002697190 | FRANCOIS THISSE | fiabilite |
| 10001669265 | Francois BOUTARIC | fiabilite |
| 10100916161 | ANNA LEBATEUX | fiabilite |
| 10100095107 | Mathieu VAN DESSEL | fiabilite |
| 10001769016 | Francois LEAUD | fiabilite |
| 10100898187 | FRANKLIN HAYS | fiabilite |

### MEDILINK

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10002240256 | PASCAL AGRICOLE | 2025-01-03 |

### Medimust

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10002402674 | PIERRE KUHN | 2025-06-29 |

**4 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10001040111 | ERIC BOROTTO | 0 | 0 | 4.22 | 4.22 |
| 10100950251 | MAXIME BERTHONNEAU | 0 | 0 | 3.43 | 3.43 |
| 10002818085 | JEROME PELLETIER | 0 | 0 | 3.97 | 3.97 |
| 10002918612 | ANNE MENA | 0 | 0 | 3.24 | 3.24 |

**4 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10001040111 | ERIC BOROTTO | fiabilite |
| 10100950251 | MAXIME BERTHONNEAU | fiabilite |
| 10002818085 | JEROME PELLETIER | fiabilite |
| 10002918612 | ANNE MENA | fiabilite |

### Medistory

**5 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10004002720 | ? | 2026-03-30 |
| 10100754901 | Thomas ROUILLAY | 2024-10-02 |
| 10101211190 | YACINE GUESSOUM | 2024-02-19 |
| 10001969004 | LIANA SAVESCU | 2025-04-01 |
| 10101157021 | BENJAMIN PENPENIC | 2024-09-26 |

**21 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10100429033 | Celine ROUSSEL | 0 | 0 | 3.48 | 3.48 |
| 10002891579 | Francis BLANC | 0 | 0 | 3.35 | 3.35 |
| 10000853001 | Abdelhafid AHMED YAHIA | 0 | 0 | 4.86 | 4.86 |
| 10000674746 | MICHEL ARNOULD | 0 | 0 | 4.52 | 4.52 |
| 10100608511 | REMY PAZZOGNA | 0 | 0 | 4.13 | 4.13 |
| 10003825030 | CHRISTOPHE LHERBIER | 0 | 0 | 4.21 | 4.21 |
| 10100027639 | Sophie WENDLING | 0 | 0 | 3.84 | 3.84 |
| 10101835154 | Astrid CHARDINY | 0 | 0 | 4.32 | 4.32 |
| 10001753465 | Nicolas CONSTANT | 0 | 0 | 3.49 | 3.49 |
| 10101018256 | Hélène PERUZZETTO | 0 | 0 | 4.35 | 4.35 |
| 10001787240 | MICHEL VALLAEYS | 0 | 0 | 3.63 | 3.63 |
| 10101372935 | DAMIEN BARAT | 0 | 0 | 4.29 | 4.29 |
| 10002347994 | FRANCK ROUNG | 0 | 0 | 4.3 | 4.3 |
| 10102006390 |  | 0 | 0 | 4.6 | 4.6 |
| 10100098150 | Colin CHAUMONT | 0 | 0 | 3.11 | 3.11 |
| 10100958882 | VINCENT TOUPIN | 0 | 0 | 2.97 | 2.97 |
| 10100193449 | OLIVIER AMIEL | 0 | 0 | 2.86 | 2.86 |
| 10101002664 | Maxime LAMIRAND | 0 | 0 | 3.88 | 3.88 |
| 10100996999 | GAUTIER LABORIE | 0 | 0 | 4.09 | 4.09 |
| 10003928859 | Marie-Hélène MAZEYRAC | 0 | 0 | 3.53 | 3.53 |
| 10003819975 | WILFRID DANNER | 0 | 0 | 4.05 | 4.05 |

**21 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10100429033 | Celine ROUSSEL | fiabilite |
| 10002891579 | Francis BLANC | fiabilite |
| 10000853001 | Abdelhafid AHMED YAHIA | fiabilite |
| 10000674746 | MICHEL ARNOULD | fiabilite |
| 10100608511 | REMY PAZZOGNA | fiabilite |
| 10003825030 | CHRISTOPHE LHERBIER | fiabilite |
| 10100027639 | Sophie WENDLING | fiabilite |
| 10101835154 | Astrid CHARDINY | fiabilite |
| 10001753465 | Nicolas CONSTANT | fiabilite |
| 10101018256 | Hélène PERUZZETTO | fiabilite |
| 10001787240 | MICHEL VALLAEYS | fiabilite |
| 10101372935 | DAMIEN BARAT | fiabilite |
| 10002347994 | FRANCK ROUNG | fiabilite |
| 10102006390 |  | fiabilite |
| 10100098150 | Colin CHAUMONT | fiabilite |
| 10100958882 | VINCENT TOUPIN | fiabilite |
| 10100193449 | OLIVIER AMIEL | fiabilite |
| 10101002664 | Maxime LAMIRAND | fiabilite |
| 10100996999 | GAUTIER LABORIE | fiabilite |
| 10003928859 | Marie-Hélène MAZEYRAC | fiabilite |
| 10003819975 | WILFRID DANNER | fiabilite |

### MLM

**2 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10000654656 | GERARD BENZAKEN | 2024-10-30 |
| 10002257748 | Stéphane AGUETTAZ | 2024-09-24 |

**12 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10100631554 | Marianne VASSEUR | 0 | 0 | 3.04 | 3.04 |
| 10002372364 | ERIC JARROUSSE | 0 | 0 | 5 | 5 |
| 10101095734 | HELENE LEBOULANGER | 0 | 0 | 3.66 | 3.66 |
| 10001623254 | Olivier DE SAUNIÈRE | 0 | 0 | 3 | 3 |
| 10100908085 | SOPHIE PLAGNARD | 0 | 0 | 4.03 | 4.03 |
| 10100909877 | AURELIE COMBIER | 0 | 0 | 2.61 | 2.61 |
| 10100165355 | NABIL MAZOUZI | 0 | 0 | 3.05 | 3.05 |
| 10001151827 | Henry ZILBERSCHLAG | 0 | 0 | 2.85 | 2.85 |
| 10002048337 | Michel THENAISY | 0 | 0 | 2.74 | 2.74 |
| 10002950482 | JACQUES BRIAND | 0 | 0 | 2.24 | 2.24 |
| 10005059745 | Geraldine VERGNES | 0 | 0 | 3.36 | 3.36 |
| 10100598209 | SIMON DROIN | 0 | 0 | 3.3 | 3.3 |

**12 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10100631554 | Marianne VASSEUR | fiabilite |
| 10002372364 | ERIC JARROUSSE | fiabilite |
| 10101095734 | HELENE LEBOULANGER | fiabilite |
| 10001623254 | Olivier DE SAUNIÈRE | fiabilite |
| 10100908085 | SOPHIE PLAGNARD | fiabilite |
| 10100909877 | AURELIE COMBIER | fiabilite |
| 10100165355 | NABIL MAZOUZI | fiabilite |
| 10001151827 | Henry ZILBERSCHLAG | fiabilite |
| 10002048337 | Michel THENAISY | fiabilite |
| 10002950482 | JACQUES BRIAND | fiabilite |
| 10005059745 | Geraldine VERGNES | fiabilite |
| 10100598209 | SIMON DROIN | fiabilite |

### Odaiji

**2 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10002182730 | NICOLAS RIBON | 2025-04-23 |
| 10100394740 | DAVID AZERAD | 2025-11-19 |

### Premiocare

**1 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10003741542 | GUILLAUME SCHLACHET | 2025-10-18 |

### Weda

**7 évaluation(s) Firebase non importée(s) :**

| RPPS | Nom | Date FB |
|---|---|---|
| 10100226561 | Dominique GAUTHIER | 2024-05-18 |
| 10101687860 | BRYAN HORN | 2023-07-06 |
| 10101578606 | RADU-CRISTIAN TUDOSE | 2024-07-29 |
| 10100394740 | DAVID AZERAD | 2023-01-20 |
| 10004420948 | CESAR ANCELLE-HANSEN | 2026-05-06 |
| 10100919850 | ALEXIS ASTRUC | 2024-11-11 |
| 10002527652 | PASCALE GEFFROY | 2025-04-24 |

**16 évaluation(s) avec moyenne divergente (>0.1) :**

| RPPS | Nom | FB moy /10 | FB /2 attendu | SB moy | Diff |
|---|---|--:|--:|--:|--:|
| 10100278406 | PIERRE KOUCHNER | 0 | 0 | 3.23 | 3.23 |
| 10004088489 | CAROLINE MARSANNE | 0 | 0 | 3.77 | 3.77 |
| 10002098126 | ALICE PERRAIN | 0 | 0 | 4.38 | 4.38 |
| 10101205754 | Yannick KOLLMANN | 0 | 0 | 4.27 | 4.27 |
| 10100848349 | AMELIE DESCLEVES | 0 | 0 | 2.19 | 2.19 |
| 10100909877 | AURELIE COMBIER | 0 | 0 | 3.61 | 3.61 |
| 10004008750 | DJAMILA BERADJA-SEKKAI | 0 | 0 | 3.94 | 3.94 |
| 10100284047 |  | 0 | 0 | 1.21 | 1.21 |
| 10101131034 | DAVID DEBANDT | 0 | 0 | 3.82 | 3.82 |
| 10002620085 | Florence CARIOU | 0 | 0 | 4.28 | 4.28 |
| 10100402022 | RANIA BERKAI | 0 | 0 | 2.92 | 2.92 |
| 10003120572 | TOUFEK BERREMILI | 0 | 0 | 1.89 | 1.89 |
| 10100704237 | Marie-Laure CARIEN | 0 | 0 | 3.81 | 3.81 |
| 10002867538 | SERGE RALUY | 0 | 0 | 2.18 | 2.18 |
| 10100304459 | GREGORY FURBACHER | 0 | 0 | 3.99 | 3.99 |
| 10003227179 | JEAN-CHRISTOPHE CALMES | 0 | 0 | 4.02 | 4.02 |

**16 évaluation(s) avec critère(s) majeur(s) manquant(s) :**

| RPPS | Nom | Manquants |
|---|---|---|
| 10100278406 | PIERRE KOUCHNER | fiabilite |
| 10004088489 | CAROLINE MARSANNE | fiabilite |
| 10002098126 | ALICE PERRAIN | fiabilite |
| 10101205754 | Yannick KOLLMANN | fiabilite |
| 10100848349 | AMELIE DESCLEVES | fiabilite |
| 10100909877 | AURELIE COMBIER | fiabilite |
| 10004008750 | DJAMILA BERADJA-SEKKAI | fiabilite |
| 10100284047 |  | fiabilite |
| 10101131034 | DAVID DEBANDT | fiabilite |
| 10002620085 | Florence CARIOU | fiabilite |
| 10100402022 | RANIA BERKAI | fiabilite |
| 10003120572 | TOUFEK BERREMILI | fiabilite |
| 10100704237 | Marie-Laure CARIEN | fiabilite |
| 10002867538 | SERGE RALUY | fiabilite |
| 10100304459 | GREGORY FURBACHER | fiabilite |
| 10003227179 | JEAN-CHRISTOPHE CALMES | fiabilite |
