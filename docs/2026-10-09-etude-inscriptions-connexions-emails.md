# Étude : inscriptions, connexions et emails depuis le lancement

> Date : 2026-10-09. Période étudiée : du 25/05/2026 (mise en production du site) au 08/10/2026, soit 4 mois et demi.
> Sources : comptes d'authentification Supabase, tables `users`, `evaluations`, `psc_session_events`, `activity_log`, `site_config`, et statistiques SendGrid. Toutes les données ont été lues sans écriture. Ce document ne contient aucune adresse email.

## L'essentiel

1. **Aucune relance n'est partie depuis le lancement.** L'interrupteur des envois automatiques (`crons_routiniers_actifs`, Admin → Emails) est sur « non » depuis l'incident du 23/04. Aucune relance PSC, aucune relance de profil incomplet ou de revalidation, aucune newsletter et aucune campagne n'est partie. On ne peut donc pas mesurer de taux d'abandon après relance : il n'y a pas eu de relance.
2. **La plus grosse perte concerne les évaluations.** 41 % des évaluations écrites depuis le lancement (129 sur 314) attendent toujours leur validation par Pro Santé Connect. Parmi les évaluations déposées sans compte, environ 6 sur 10 ne sont jamais validées. Les 126 concernées n'ont reçu aucune relance.
3. **Après PSC, deux comptes sur trois restent injoignables.** En production, PSC ne transmet pas l'adresse email du médecin. 434 des 675 comptes PSC créés depuis le lancement (64 %) n'ont aucune adresse utilisable : on ne peut pas leur écrire.
4. **La connexion PSC elle-même fonctionne.** Depuis le correctif du 05/07, on mesure 0,8 % d'échec au retour de PSC, contre 14,8 % avant. On ne mesure pas, en revanche, les médecins qui partent vers PSC et n'en reviennent jamais.
5. **L'inscription par email est marginale et fonctionne.** On compte 44 inscriptions par email, dont 27 éditeurs. 91 % des inscrits confirment leur adresse, presque toujours dans le quart d'heure.
6. **La base historique ne revient pas.** Sur les quelque 5 900 comptes antérieurs au lancement, 209 seulement (3,5 %) se sont reconnectés. Notre SendGrid ne leur a envoyé aucun email de lancement : le volume journalier n'a jamais dépassé 43 envois.
7. **Les visiteurs reviennent peu.** 90 % des médecins connectés par PSC ne l'ont fait qu'une fois sur la période. Sur 486 nouveaux comptes PSC créés depuis le 28/06, 20 (4 %) sont revenus un autre jour.

## 1. Vue d'ensemble des comptes

| | Nombre |
|---|---|
| Comptes créés depuis le lancement | 723 |
| dont par Pro Santé Connect (tous médecins) | 675 |
| dont par email | 44 (27 éditeurs, 17 médecins) |
| dont comptes techniques (scripts, tests) | 4 |
| Comptes antérieurs au lancement (ancien site, import de février) | ~5 900 |
| Comptes connectés au moins une fois depuis le lancement | 873 |

**97 % des médecins arrivent par PSC** (675 sur 692). L'inscription par email sert surtout aux éditeurs.

Nouveaux comptes par mois :

| Mois | PSC | Email |
|---|---|---|
| fin mai | 30 | 3 |
| juin | 179 | 15 |
| juillet | 145 | 20 |
| août | 109 | 5 |
| septembre | 176 | 1 |
| octobre (au 08) | 36 | 4 |

## 2. Inscription par email

Déroulé : formulaire → compte créé → email « Confirmez votre inscription » → clic → compte confirmé et connecté. Les comptes non confirmés ne sont jamais supprimés, donc tous les abandons sont visibles.

| Étape | Nombre | Taux |
|---|---|---|
| Inscriptions | 44 | |
| Adresse confirmée (clic sur le lien) | 40 | 91 % |
| Jamais confirmée | 4 | 9 % (4 médecins sur 17, soit 24 %) |
| Profil complété | 26 | 59 % (médecins : 9 sur 17) |

- Presque toutes les confirmations arrivent dans le quart d'heure. Deux seulement sont arrivées après 4 et 7 jours.
- Sur les 4 adresses jamais confirmées, celle du 08/10 n'a jamais reçu le mail : son domaine n'a pas de serveur de messagerie et SendGrid l'a bloqué, ce qui fait sans doute penser à une faute de frappe. Son lien reste valable jusqu'au 15/10. Les 3 autres datent du 03/07, du 12/08 et du 29/08.
- **Non mesurable** : les inscriptions refusées (adresse déjà utilisée, filtre anti-robot) et les clics sur « Renvoyer l'email ». Aucune trace n'est enregistrée.
- Un médecin inscrit par email n'a pas de RPPS. Ses évaluations restent donc en attente tant qu'il ne passe pas par PSC (3 cas aujourd'hui).

## 3. Connexion Pro Santé Connect

Le suivi existe depuis le 28/06. Il commence au retour de PSC : on ne sait pas qui a cliqué sur le bouton sans revenir.

| | Avant le correctif (28/06 → 04/07) | Après le correctif (depuis le 05/07) |
|---|---|---|
| Retours de PSC | 115 | 630 |
| Connexions réussies | 97 | 625 |
| Perdus au retour, sans message | 17 (14,8 %) | 0 |
| Erreur « lien expiré » | 1 | 5 (0,8 %) |

- Au total, on compte 745 connexions PSC faites par 640 médecins différents.
- Le bug corrigé le 05/07 a laissé **52 comptes PSC créés sans que la personne arrive connectée** : 8 fin mai, 42 en juin et 2 en juillet. Ces médecins sont passés par PSC sans pouvoir utiliser le site.
- **Non mesurable** : le départ vers PSC. Un médecin sans application e-CPS, ou qui abandonne chez PSC, ne laisse aucune trace. Un indice sur les 3 derniers jours (le détail des messages SendGrid ne remonte pas plus loin) : 5 des 7 mails « Validez votre évaluation » ont été cliqués, mais seules 2 des 7 évaluations concernées sont validées. L'échantillon est trop petit pour conclure. Il laisse quand même penser à une perte importante chez PSC.
- Contrôle `state_check` posé le 08/10 : on compte 3 retours, dont 1 « ok » et 2 « absent ». C'est trop tôt pour décider. La décision reste prévue vers le 22/10 (TODO), mais ce premier signal appelle à la prudence avant de bloquer.

### Complétion du profil après PSC

Après sa première connexion PSC, le médecin arrive sur « Compléter mon profil ». La page lui demande notamment une adresse email.

| Mois de création | Comptes PSC | Profil complété |
|---|---|---|
| fin mai | 30 | 3 (10 %) |
| juin | 179 | 56 (31 %) |
| juillet | 145 | 70 (48 %) |
| août | 109 | 32 (29 %) |
| septembre | 176 | 61 (35 %) |
| octobre | 36 | 10 (28 %) |
| **Total** | **675** | **232 (34 %)** |

Le suivi de cette page existe depuis le 30/09 : 61 médecins l'ont vue et 18 l'ont validée (30 %).
- Quand le champ email était vide, 8 affichages sur 38 ont abouti (21 %).
- Quand l'adresse était déjà remplie, 10 affichages sur 30 ont abouti (33 %).

**Conséquence** : 434 comptes PSC (64 %) n'ont ni adresse réelle, ni adresse de contact. Pour eux, aucun email n'est possible, ni relance, ni newsletter. Le seul moyen de les revoir est qu'ils se reconnectent d'eux-mêmes.

## 4. Évaluations : la validation par PSC

Un médecin sans compte peut écrire une évaluation et laisser son email. Il la valide ensuite par PSC, soit tout de suite, soit plus tard grâce au mail « Validez votre évaluation ».

| | Nombre |
|---|---|
| Évaluations écrites depuis le lancement | 314 |
| Publiées | 185 |
| **Toujours en attente de validation PSC** | **129 (41 %)** |
| dont en attente depuis plus de 30 jours | 103 |
| dont en attente depuis plus de 90 jours | 60 |

**Évaluations déposées sans compte** (au moins 205) :

| | Nombre | Taux |
|---|---|---|
| Validées par PSC | 79 | 39 % |
| dont validées dans l'heure | 57 | |
| dont validées après plus de 24 h | 11 | |
| Jamais validées | 126 | 61 % |

- La validation se fait surtout tout de suite : le délai médian est de 2 minutes. Sur environ 148 médecins qui n'ont pas validé sur le moment, une vingtaine l'ont fait plus tard (≈ 15 %). C'est le plafond de ce que le mail de validation a pu rattraper.
- **Les 126 évaluations non validées n'ont reçu aucune relance.** Elles remplissent toutes les conditions de la relance PSC (jusqu'à 4 rappels à 7 jours d'intervalle), qui n'est jamais partie.
- Trois pics pèsent lourd dans les évaluations non validées :
  - **MedGPT, 27 et 28/08** : 34 évaluations, 34 adresses différentes sur 10 domaines, aucune validée. Cela ressemble à un appel de l'éditeur à ses utilisateurs.
  - **MadeForMed, 22/06** : 11 évaluations (10 adresses, 3 domaines), aucune validée.
  - **Congrès WONCA, 01 au 03/07** : 33 évaluations non validées, sur de nombreux logiciels.
- Sans les pics MedGPT et MadeForMed, le taux de validation passe à environ 49 %.

## 5. Emails envoyés (SendGrid)

| Depuis le lancement | |
|---|---|
| Emails envoyés | 513 (≈ 4 par jour) |
| Délivrés | 497 (97 %) |
| Rejetés car l'adresse n'existe pas | 3 |
| Bloqués par le destinataire | 10 |
| Plaintes pour spam | 0 |
| Désinscriptions | 0 |

- **Ce ne sont que des emails déclenchés par une action** : confirmation d'inscription, validation d'évaluation, mot de passe, changement d'adresse, fusion de comptes, accusés de réception. Le tableau Admin → Emails des campagnes est vide. Aucune newsletter n'est partie.
- **Les ouvertures et les clics ne sont pas fiables.** SendGrid affiche environ 90 % d'ouvertures et au plus 45 % de clics. Mais Apple Mail et les antivirus des messageries professionnelles et hospitalières ouvrent les mails et suivent les liens à la place du lecteur. Ces chiffres sont donc très gonflés. C'est pourquoi cette étude mesure l'efficacité des mails par leur effet réel : compte confirmé, évaluation validée.
- **Pas de détail par type de mail** : les envois ne portent aucune étiquette, et le détail message par message n'est conservé que 3 jours.
- La seule mesure d'une relance date d'avant le lancement : l'incident du 23 au 27/04. 718 emails de relance sont alors partis par erreur depuis le site de développement. On a compté 682 délivrés, 6 adresses inexistantes, 21 blocages et 1 plainte pour spam. Environ 24 % des destinataires ont cliqué, ce qui est un plafond pour la même raison.

## 6. Ce qui n'est pas mesuré aujourd'hui, et comment le mesurer

| Angle mort | Ce qu'il faudrait | Effort |
|---|---|---|
| Ouvertures et clics par type de mail | Ajouter le nom du modèle comme « catégorie » SendGrid à chaque envoi. Les statistiques par catégorie sont ensuite lisibles par l'API. | Faible, un seul endroit (construction des emails) |
| Départs vers PSC sans retour | Enregistrer un événement « départ PSC » au clic sur le bouton (`connectWithPsc`, `psc-initier`) | Faible |
| Inscriptions refusées (adresse déjà utilisée, robot) | Enregistrer un événement dans `activity_log` | Faible |
| Mots de passe oubliés | Même chose | Faible |

La base est partagée entre la production et le développement. Les essais faits depuis `dev.` comptent donc aussi dans les chiffres, mais leur poids est faible.

## 7. Leviers, par ordre d'impact estimé

1. **Relancer les évaluations en attente** : 126 évaluations sont prêtes à être relancées et ne l'ont jamais été. ⚠️ L'interrupteur est unique. Le remettre sur « oui » relance aussi les rappels de revalidation (environ 520 en retard, plafonnés à 100 par jour) et les profils incomplets. Il faut décider s'il faut le rallumer tel quel ou séparer la relance PSC.
2. **Récupérer une adresse email après PSC** : 64 % des comptes PSC sont injoignables, et seulement 30 % des médecins valident la page « Compléter mon profil ».
3. **Écrire à la base historique** : environ 5 700 comptes de l'ancien site ne se sont jamais reconnectés. À notre connaissance, aucun email de lancement ne leur est parti de notre côté (les syndicats ont fait leurs envois de leur côté).
4. **Étiqueter les envois SendGrid et suivre les départs vers PSC** (tableau du §6) : sans cela, la prochaine étude aura les mêmes angles morts.

## Annexe : détail des sources

| Donnée | Source | Limite |
|---|---|---|
| Création, confirmation, dernière connexion | Comptes Supabase (lecture par l'API d'administration) | Seule la dernière connexion est conservée |
| Parcours PSC | `psc_session_events` | Depuis le 28/06 (page « Compléter » depuis le 30/09, `state_check` depuis le 08/10) |
| Évaluations, relances | `evaluations` | Le jeton d'une évaluation anonyme est effacé à la validation : les évaluations validées sont reconnues à la date de création du compte |
| Emails | Statistiques SendGrid par jour | Pas de détail par type, détail par message sur 3 jours seulement |
| Interrupteur des relances | `site_config.crons_routiniers_actifs` = `false` | |

Étude précédente sur un sujet voisin : [2026-06-16-diagnostic-emails-psc.md](2026-06-16-diagnostic-emails-psc.md) (adresses fictives PSC et page « Compléter mon profil »).
