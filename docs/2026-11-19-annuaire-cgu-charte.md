# CGU et charte de l'annuaire — revue du 19/11/2026

*Rédaction Claude, d'après le code et la base au 19/11. **Pas un avis juridique** : à relire par la juriste
après validation de David.*

## Fichiers

- [annuaire-textes/cgu.html](annuaire-textes/cgu.html) → page `/cgu`
- [annuaire-textes/charte.html](annuaire-textes/charte.html) → page `/rgpd` (charte de confidentialité et cookies)

Ils **remplacent** les brouillons du 05/10 du dépôt messagerie (`docs/site-textes/cgu-annuaire.html`,
`rgpd-annuaire.html`), dont le mode d'emploi (`LISEZMOI.md`) reste valable pour coller : admin → Pages →
« </> HTML » → Appliquer → Mettre à jour. Remplacer `[date de mise en ligne]` (1re ligne de chacun).

**Texte de départ toujours valable** : `/cgu` (28/03) et `/rgpd` (30/09) n'ont pas été modifiés en base depuis
le 05/10 (relu le 19/11 : mêmes dates).

## Ce qui a changé depuis le 05/10

| Sujet | Avant (05/10) | Maintenant |
|---|---|---|
| Qui consulte | « tous les professionnels connectés par PSC » | médecins sur le Site ; tous les professionnels de santé dans l'application (décisions du 08/10 et du 17/11) |
| Qui publie une fiche | « les médecins inscrits » | médecins (Site ou application), autres professionnels (application seule, sans compte sur le Site) |
| Rubrique | « surspécialités et préférences de pratique », « intitulés » | « compétences », liste commune **propre à chaque profession** |
| Champ « disponibilités » | promis, n'existe pas | remplacé par la réponse « nouveaux patients » (généralistes) et sa date |
| Champs de la fiche | non détaillés | commune, téléphone du cabinet, adresse MSSanté (ajoutés le 08/10) |
| Identité PSC (`identites_psc`) | absente | ajoutée : RPPS, nom, prénom, profession, spécialité, dernière connexion, y compris pour un professionnel de l'application sans compte |
| Données ANS | « tous les professionnels » | **médecins seulement** (l'import ne prend que les médecins) |
| Carte | « corriger ou masquer » | masquer n'existe pas : texte limité à ce que fait le site (lieu ANS, ou centre de la commune choisie) |
| Géocodage | absent | la commune saisie part du navigateur vers l'IGN ; « Autour de moi » arrondi à ~1 km, jamais enregistré |
| Mention sur la fiche | « déclarées par le médecin » | « par le médecin » ou « par le professionnel », comme le site l'affiche |
| Droits | « depuis votre compte » | « depuis votre compte sur le Site ou depuis l'application » (l'application peut masquer et effacer) |
| CGU | sans date | ligne « Dernière mise à jour » (l'art. 2 promet un préavis de 15 jours) |
| Préambule | logiciels seulement | une phrase sur l'annuaire |

## Promesses vérifiées dans le code (19/11)

- Cases non cochées (fiche, portable), date et version de chaque accord enregistrées.
- Portable : hors des listes et des fichiers, affiché fiche par fiche, 10 par jour, chaque affichage tracé ;
  journal purgé à 12 mois (tâche `purge-donnees`).
- Mention « Informations déclarées par le médecin / le professionnel, non vérifiées par l'association » et date
  de mise à jour sur chaque fiche ; « Source : ANS, Annuaire Santé, données du … (Licence Ouverte) ».
- Pas de Vercel Analytics sur les pages de l'annuaire.
- Auteur d'une proposition effacé à l'acceptation, proposition supprimée au refus ou à la fusion.
- Ordre des résultats : distance, sinon nom et prénom.

## Points à trancher (David)

1. **Identité PSC sans compte ni fiche** (une infirmière qui consulte depuis l'application sans publier) :
   proposition, **effacée 36 mois après sa dernière connexion PSC** (même horizon que la fiche). Écrit dans la
   charte ; à programmer.
2. **Carte** : la promesse « masquer sa position » est retirée (proposition), plutôt que d'ajouter une case.
3. **Sauvegardes à 12 mois** : `scripts/backup-supabase.ps1` garde une archive par mois **sans fin**.
   Proposition : faire supprimer les archives de plus de 12 mois par le script. Sinon, retirer la dernière puce
   des durées.
4. **Règles d'usage pour les professionnels de l'application** : un non-médecin n'a pas de compte sur le Site,
   donc n'accepte pas ses CGU. Proposition : les conditions de l'application renvoient aux articles 4 bis et
   4 ter, acceptés dans l'application avant le premier accès à l'annuaire (à demander à la session messagerie).

## À faire avant de coller (conditions techniques)

- Fiche **masquée à 24 mois** sans connexion, **effacée à 36**, avec e-mail préalable : **non programmé**.
- Identité PSC effacée à 36 mois (point 1) : **non programmé**.
- Sauvegardes limitées à 12 mois (point 3) : **non fait**.
- Les autres conditions du `LISEZMOI.md` sont remplies (suppression de compte étendue, journal purgé, pas de
  mesure d'audience, mention et source ANS affichées).

## Pour la juriste

- Bases légales (consentement pour la fiche et le portable, intérêt légitime pour les données ANS et le
  journal, CGU pour l'identité PSC) ; information des médecins non inscrits qui figurent dans les données ANS.
- Un professionnel de l'application sans compte sur le Site : quelles conditions lui sont opposables (point 4).
- Supabase est une société américaine (serveurs en Irlande) : absente de la phrase sur les transferts.
- Art. 4 des CGU : « L'inscription est réservée aux professionnels de santé », alors que des éditeurs ont un
  compte (espace éditeur) ; la connexion par e-mail et mot de passe existe aussi.
- Questions déjà posées pour l'application (fiche du 22/10, dépôt messagerie) : durées B2, droit d'accès B4
  (« vous ne pouvez pas savoir qui a affiché votre portable »).
