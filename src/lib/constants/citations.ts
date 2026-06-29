/**
 * Corpus de citations affichées en carrousel aléatoire en tête du catalogue
 * (page /solutions/[idCategorie]). Repris de l'ancien site Quasar — voir
 * docs/citations-ancien-site.md. Thèmes : qualité, changement, décision.
 *
 * `auteur` vide ('') = pas d'attribution affichée.
 */
export interface Citation {
  text: string
  auteur: string
}

export const CITATIONS: Citation[] = [
  // — Qualité —
  { text: `La qualité d'un logiciel ne se mesure pas au poids de sa documentation.`, auteur: `Anonyme` },
  { text: `Ce n'est pas ce qui est bon qui est cher, c'est ce qui est cher qui est bon.`, auteur: `Proverbe yiddish` },
  { text: `On se souvient de la qualité bien plus longtemps que du prix.`, auteur: `Gucci` },
  { text: `Le fait est que les qualités, toutes les qualités, réclament une constante vigilance, un esprit critique jamais en défaut, un travail continuel de l'intelligence et du cœur.`, auteur: `Francesco Alberoni` },
  { text: `Il est préférable d'avoir de très gros défauts que de toutes petites qualités.`, auteur: `Frédéric Dard` },
  { text: `Dans la course à la qualité, il n'y a pas de ligne d'arrivée.`, auteur: `David Kearns` },
  { text: `On voit les qualités de loin et les défauts de près.`, auteur: `Victor Hugo` },
  { text: `Seul celui qui n'a pas faim est à même de juger de la qualité de la nourriture.`, auteur: `Alessandro Morandotti` },
  { text: `Ce n'est pas assez d'avoir de grandes qualités ; il en faut avoir l'économie.`, auteur: `La Rochefoucauld` },
  { text: `La qualité n'est jamais un accident ; c'est toujours le résultat d'un effort intelligent.`, auteur: `John Ruskin` },
  { text: `La médiocrité vient sans qu'on l'appelle ; la qualité, il faut la vouloir.`, auteur: `F. Mayor` },
  { text: `La popularité n'est pas un critère de qualité.`, auteur: `Claude Brasseur` },
  { text: `Mais une des innombrables particularités qui distinguent l'homme de la bestiole, c'est qu'il en veut plus. Et même quand il a la quantité suffisante, c'est la qualité qu'il réclame.`, auteur: `Daniel Pennac` },
  { text: `Je n'ai jamais pondu un œuf de ma vie. Et pourtant je m'estime plus qualifié qu'une poule pour juger de la qualité d'une omelette.`, auteur: `Max Favalelli` },
  { text: `Il a choisi… judicieusement.`, auteur: `Le gardien du Graal` },
  { text: `Le prix s'oublie, la qualité reste.`, auteur: `` },
  // — Changement —
  { text: `Tout est changement, non pour ne plus être mais pour devenir ce qui n'est pas encore.`, auteur: `Épictète` },
  { text: `Mieux vaut prendre le changement par la main avant qu'il ne nous prenne par la gorge.`, auteur: `Winston Churchill` },
  { text: `Pour changer votre façon de vivre, vous devez changer votre façon de penser. Et pour changer votre façon de penser, vous devez changer vos croyances.`, auteur: `` },
  { text: `Les hommes n'acceptent le changement que dans la nécessité et ils ne voient la nécessité que dans la crise.`, auteur: `Jean Monnet` },
  { text: `Le changement, c'est maintenant.`, auteur: `François Hollande` },
  // — Décision —
  { text: `Quelle que soit la décision prise, que ce soit agir ou accepter, l'important est d'être bien avec sa décision, de l'assumer pleinement, d'en accueillir sereinement toutes les conséquences.`, auteur: `Anonyme` },
  { text: `On doit prendre les petites décisions avec sa tête et les grandes avec son cœur.`, auteur: `H. Jackson Brown` },
  { text: `Une décision parfaite est une décision qui ne se prend jamais. Au lieu de chercher à faire le choix parfait, faites un choix basé sur vos meilleures informations et instincts et allez de l'avant.`, auteur: `Marston` },
  { text: `Une décision n'existe qu'au moment où elle est mise en œuvre.`, auteur: `Alain Fernandez` },
  { text: `Réfléchis avec lenteur, mais exécute rapidement tes décisions.`, auteur: `Isocrate (À Démonicos)` },
  { text: `Les décisions représentent seulement le commencement de quelque chose.`, auteur: `Paulo Coelho` },
  { text: `Un ami sait te conseiller mais ne prend jamais les décisions à ta place.`, auteur: `Sulfanos` },
  { text: `Il ne faut pas toujours tourner la page, il faut parfois la déchirer.`, auteur: `Achille Chavée` },
  { text: `La plus grande difficulté n'est pas tant de prendre des décisions que de les assumer.`, auteur: `Serge Uzzan` },
  { text: `Rien n'est plus important et donc plus précieux que de savoir prendre des décisions.`, auteur: `Napoléon Bonaparte` },
  { text: `Dans toute décision, la meilleure chose que vous puissiez faire est ce qui est correct, la deuxième meilleure chose est ce qui est incorrect et la pire chose est de ne rien faire.`, auteur: `Theodore Roosevelt` },
  { text: `Lorsque nous prenons des décisions, nous réfléchissons généralement dans une large mesure sur les avantages et les inconvénients de chaque option, mais l'instinct finit généralement par imposer une option donnée.`, auteur: `Carl Gustav Jung` },
  { text: `Celui qui a le choix a aussi le tourment.`, auteur: `Proverbe allemand` },
  { text: `Avoir décidé guérit du vertige d'avoir à décider.`, auteur: `Claude Roy (Le malheur d'aimer, 1958)` },
  { text: `À l'hôtel de la décision bien réfléchie, les gens dorment paisiblement.`, auteur: `Anonyme` },
  { text: `La vie est faite de décisions et de circonstances. Personne n'a de pouvoir sur les circonstances, mais chacun prend ses propres décisions.`, auteur: `Anonyme` },
]
