# Annuaire mutualisé — tranche 2 « lecture par les confrères » et chaîne de données commune

2026-10-08. **Proposition** (à valider par David), rédigée après lecture du dépôt messagerie
(`C:\Users\david\Documents\100000Medecins_messagerie`, lecture seule) pour synchroniser la base
téléchargée par l'application et celle du site. Tranche 1 : `docs/2026-10-07-annuaire-tranche-1.md`.

## Décisions déjà prises (08/10)

- Fiche : ajout de champs facultatifs saisis par le médecin — ville / code postal d'exercice,
  adresse MSSanté, téléphone du cabinet.
- Portable : **10 affichages par jour et par lecteur**, journal des affichages purgé à 12 mois ;
  un médecin ne sait pas qui a affiché son numéro (05/10).
- Page `/annuaire` (privée, non indexée, derrière l'interrupteur), accessible depuis le menu de
  Mon compte ; fiche `/annuaire/<RPPS>`.
- Lecteurs : tout médecin avec une preuve PSC, sans obligation d'avoir publié sa fiche.
- Recherche par **localisation**, comme dans l'application.
- **Une seule chaîne de données ANS**, la même pour l'application et le site, limitée aux
  informations utiles.

## Ce qui existe

### Dans l'application (dépôt messagerie)

- **Base construite sur le PC** par `lot8/annuaire.py` (`base` puis `publier`) à partir de deux
  extractions ANS en Licence Ouverte (data.gouv.fr) : « Extraction des BAL MSSanté » (93,5 Mo) et
  l'extraction RPPS « personne-activité » (823 Mo — les « 800 Mo » de la question 24).
- Toutes les professions qui ont une BAL : **380 378 professionnels, dont 198 281 médecins**.
  Pas de filtre « actif ». Lieux d'exercice et téléphones issus du RPPS, adresses MSSanté des BAL.
- **Géocodage** par le géocodeur BAN de la Géoplateforme IGN (`data.geopf.fr/geocodage`, score
  ≥ 0,5, caches `geocache*.tsv`) : 93 % des professionnels placés.
- Sortie **SQLite** `annuaire.db` (134 Mo, 63 Mo compressée) : tables `pro`, `site` (lat/lon),
  `exerce`, `bal_adresse`, `structure`, `libelle`, `meta` (version = date de l'extraction).
- **Publication manuelle** sur le relais de l'association ; une seule version (04/10). Le
  téléphone la télécharge après une connexion PSC de moins de 4 h (option B, décision du 05/10).
- **Sur le téléphone** : recherche par nom, métier, spécialité, ville ; carte MapLibre + Plan IGN ;
  **« Autour de moi »** (position approximative, une mesure, rayon 5 / 10 / 20 / 50 km ou France,
  tri par distance). Rien ne sort du téléphone (ni recherche, ni position), hors tuiles IGN.
- Aucune liste d'opposition codée. Aucune lecture des fiches du site (prévu « plus tard »).
- ⚠️ `pro.rpps` contient l'**identifiant national** (« 8 » + RPPS), le site le **RPPS à 11 chiffres**.

### Sur le site

- Tranche 1 en production, éteinte : fiches déclarées (`fiches_annuaire`, portables à part),
  catalogue de 212 compétences, preuve PSC (`identites_psc`, RPPS à 11 chiffres).
- Base Supabase : 48 Mo utilisés sur 500 Mo (plan gratuit). Extensions : `pg_trgm` (pas de PostGIS).

## Proposition — une seule chaîne, deux sorties

1. **Une seule construction** : le script `lot8/annuaire.py` lit les extractions une fois, géocode
   une fois (mêmes caches) et produit **deux sorties de la même version** :
   - `annuaire.db` pour l'application (inchangé) ;
   - un **import dans Supabase pour le site**, médecins seulement, champs utiles seulement :
     `ans_medecins` (rpps, civilité, nom, prénom, spécialité), `ans_lieux` (rpps, voie, code postal,
     commune, téléphones, lat, lon), `ans_mssante` (rpps, adresse), `ans_version` (date de
     l'extraction). Estimation : ~150 Mo.
   La même date s'affiche des deux côtés : « Source : ANS, Annuaire Santé, données du JJ/MM/AAAA ».
2. **Les fiches déclarées restent dans Supabase**, source unique. À chaque construction, le script y
   lit les fiches **publiées, sans portable**, et les ajoute à `annuaire.db` (table `fiche` +
   compétences) : l'application les affiche hors ligne.
3. **Le portable n'est dans aucun fichier.** Site et application le demandent fiche par fiche à la
   **même fonction Supabase** → un seul plafond (10 / jour) et un seul journal pour les deux.
   (Côté application : suppose une session Supabase obtenue depuis la connexion PSC du relais —
   point ouvert n° 2 du dépôt messagerie, tranche 3.)
4. **Une seule liste d'opposition** (`annuaire_oppositions` dans Supabase, gérée dans l'admin du
   site) : la construction exclut ces RPPS des deux sorties. Elle honore le droit d'opposition
   promis par la charte (P5) aux médecins non inscrits.
5. **Clé commune : le RPPS à 11 chiffres** partout (le script retire le « 8 » à l'export).
6. **Fréquence** : mensuelle, lancée à la main au début comme aujourd'hui ; à automatiser ensuite.
7. **Qui fait quoi** : le site crée les tables et les fonctions Supabase (migrations montrées à
   David) ; le script commun reste dans le dépôt messagerie, où il fonctionne avec ses caches de
   géocodage, et gagne deux étapes : « export Supabase » et « import des fiches publiées ».

## Recherche par localisation sur le site

- « **Autour de moi** » (géolocalisation du navigateur) ou « **près de** » une ville / un code
  postal ; rayon 5 / 10 / 20 / 50 km ou France ; tri par distance ; **carte MapLibre + Plan IGN**
  (mêmes tuiles que l'application, déjà citées par la charte).
- **Différence avec l'application** : le téléphone cherche dans son fichier, la position ne sort
  pas ; sur le site la base est sur le serveur, la position doit lui être envoyée pour trier par
  distance. Proposition fidèle au principe du 01/10 : position **arrondie par le navigateur
  (~1 km)** avant envoi, utilisée pour la requête, **jamais enregistrée ni journalisée** ; ou ville
  / code postal saisis.
- Distance calculée en SQL (formule de haversine, préfiltre par rectangle sur lat/lon indexés) :
  pas besoin de PostGIS.
- Avant l'import ANS (2b), seules les fiches avec une ville déclarée sont placées (géocodée une fois
  par la BAN à l'enregistrement).

## Découpage proposé

- **2a — site** : migration (champs déclarés + coordonnées, journal des portables, oppositions,
  fonctions de lecture), page `/annuaire` (recherche nom / spécialité / compétence + localisation +
  carte), fiche `/annuaire/<RPPS>` (mention « déclaré, non vérifié », date), portable 10 / jour +
  journal + purge à 12 mois, pas de Vercel Analytics sur ces pages.
- **2b — chaîne commune** : tables `ans_*` côté site + étapes d'export et d'import dans `lot8`
  (session messagerie) → l'annuaire du site montre tous les médecins, fiches comprises.
- **3 — application** : lecture des fiches (fichier) et du portable (fonction Supabase).

## Réponses de David (08/10)

A. **Localisation** : la ville ou le code postal saisi dans la recherche, à défaut celui de la fiche
   du lecteur, sert de point de départ — pas de géolocalisation dans ce cas. Si aucun n'est
   renseigné quand le médecin ouvre la carte ou « Autour de moi », le site **propose** la
   géolocalisation du navigateur (position arrondie à ~1 km avant envoi, jamais enregistrée).
   La ville saisie est géocodée par le service IGN depuis le navigateur → mention à ajouter à la
   charte le jour J (« la ville que vous saisissez est envoyée au service de géocodage de l'IGN »).
B. **Le script commun reste dans le dépôt messagerie** ; le site crée les tables et les fonctions.
C. **Ordre 2a puis 2b.**
