# Corpus de citations de l'ancien site (à réintégrer)

> **Date de récupération :** 2026-06-29
> **Source :** ancien front Quasar/Vue (`C:\Users\david\Documents\ancien-site-frontend`)
> - `src/pages/TrouverSolution/Solutions/initPageComponent.ts` (~l.79) — tableau `Citation[]` (`{ text, auteur }`)
> - `src/layouts/Header/initPageComponent.ts` (~l.49) — même corpus en `string[]` (bandeau header)
> **Firebase :** aucune citation en base (corpus 100 % hardcodé côté front).

## Fonctionnement d'origine

- Tableau **mélangé aléatoirement** au chargement (`shuffle`), puis affichage de la **première** entrée → une citation « aléatoire » par visite.
- Page Solutions (`Solutions.vue`) : `citation.text` en `text-h5` italique + `citation.auteur` en `text-h6` gras majuscules.
- Header : variante chaîne (texte + auteur concaténés).
- Une rotation temporisée existait mais était **commentée** (code mort) dans `initPageComponent.ts`.

## Les 36 citations (texte nettoyé, typos corrigées)

### Thème — Qualité
1. « La qualité d'un logiciel ne se mesure pas au poids de sa documentation. » — Anonyme
2. « Ce n'est pas ce qui est bon qui est cher, c'est ce qui est cher qui est bon. » — Proverbe yiddish
3. « On se souvient de la qualité bien plus longtemps que du prix. » — Gucci
4. « Le fait est que les qualités, toutes les qualités, réclament une constante vigilance, un esprit critique jamais en défaut, un travail continuel de l'intelligence et du cœur. » — Francesco Alberoni
5. « Il est préférable d'avoir de très gros défauts que de toutes petites qualités. » — Frédéric Dard
6. « Dans la course à la qualité, il n'y a pas de ligne d'arrivée. » — David Kearns
7. « On voit les qualités de loin et les défauts de près. » — Victor Hugo
8. « Seul celui qui n'a pas faim est à même de juger de la qualité de la nourriture. » — Alessandro Morandotti
9. « Ce n'est pas assez d'avoir de grandes qualités ; il en faut avoir l'économie. » — La Rochefoucauld
10. « La qualité n'est jamais un accident ; c'est toujours le résultat d'un effort intelligent. » — John Ruskin
11. « La médiocrité vient sans qu'on l'appelle ; la qualité, il faut la vouloir. » — F. Mayor
12. « La popularité n'est pas un critère de qualité. » — Claude Brasseur
13. « Mais une des innombrables particularités qui distinguent l'homme de la bestiole, c'est qu'il en veut plus. Et même quand il a la quantité suffisante, c'est la qualité qu'il réclame. » — Daniel Pennac
14. « Je n'ai jamais pondu un œuf de ma vie. Et pourtant je m'estime plus qualifié qu'une poule pour juger de la qualité d'une omelette. » — Max Favalelli
15. « Il a choisi… judicieusement. » — Le gardien du Graal

### Thème — Changement
16. « Tout est changement, non pour ne plus être mais pour devenir ce qui n'est pas encore. » — Épictète
17. « Mieux vaut prendre le changement par la main avant qu'il ne nous prenne par la gorge. » — Winston Churchill
18. « Pour changer votre façon de vivre, vous devez changer votre façon de penser. Et pour changer votre façon de penser, vous devez changer vos croyances. » — (auteur non précisé)
19. « Les hommes n'acceptent le changement que dans la nécessité et ils ne voient la nécessité que dans la crise. » — Jean Monnet
20. « Le changement, c'est maintenant. » — François Hollande

### Thème — Décision
21. « Quelle que soit la décision prise, que ce soit agir ou accepter, l'important est d'être bien avec sa décision, de l'assumer pleinement, d'en accueillir sereinement toutes les conséquences. » — Anonyme
22. « On doit prendre les petites décisions avec sa tête et les grandes avec son cœur. » — H. Jackson Brown
23. « Une décision parfaite est une décision qui ne se prend jamais. Au lieu de chercher à faire le choix parfait, faites un choix basé sur vos meilleures informations et instincts et allez de l'avant. » — Marston
24. « Une décision n'existe qu'au moment où elle est mise en œuvre. » — Alain Fernandez
25. « Réfléchis avec lenteur, mais exécute rapidement tes décisions. » — Isocrate (À Démonicos)
26. « Les décisions représentent seulement le commencement de quelque chose. » — Paulo Coelho
27. « Un ami sait te conseiller mais ne prend jamais les décisions à ta place. » — Sulfanos
28. « Il ne faut pas toujours tourner la page, il faut parfois la déchirer. » — Achille Chavée
29. « La plus grande difficulté n'est pas tant de prendre des décisions que de les assumer. » — Serge Uzzan
30. « Rien n'est plus important et donc plus précieux que de savoir prendre des décisions. » — Napoléon Bonaparte
31. « Dans toute décision, la meilleure chose que vous puissiez faire est ce qui est correct, la deuxième meilleure chose est ce qui est incorrect et la pire chose est de ne rien faire. » — Theodore Roosevelt
32. « Lorsque nous prenons des décisions, nous réfléchissons généralement dans une large mesure sur les avantages et les inconvénients de chaque option, mais l'instinct finit généralement par imposer une option donnée. » — Carl Gustav Jung
33. « Celui qui a le choix a aussi le tourment. » — Proverbe allemand
34. « Avoir décidé guérit du vertige d'avoir à décider. » — Claude Roy (Le malheur d'aimer, 1958)
35. « À l'hôtel de la décision bien réfléchie, les gens dorment paisiblement. » — Anonyme
36. « La vie est faite de décisions et de circonstances. Personne n'a de pouvoir sur les circonstances, mais chacun prend ses propres décisions. » — Anonyme

## Note

La phrase « Le prix s'oublie, la qualité reste » **n'existe pas telle quelle** dans ce corpus. La plus proche est la n°3 (Gucci). À ajouter manuellement si on veut la conserver.
