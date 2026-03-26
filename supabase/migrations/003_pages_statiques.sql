-- Migration 003 : Table pages_statiques
-- Stocke le contenu éditable des pages articles/blog

CREATE TABLE pages_statiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  image_couverture TEXT,
  contenu TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pages_statiques_slug ON pages_statiques(slug);

ALTER TABLE pages_statiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pages statiques visibles par tous" ON pages_statiques FOR SELECT USING (true);

-- Trigger updated_at
CREATE TRIGGER update_pages_statiques_updated_at
  BEFORE UPDATE ON pages_statiques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════════
-- SEED DATA : 4 pages statiques
-- ══════════════════════════════════════════════════════════════════════

-- 1. Qui sommes-nous
INSERT INTO pages_statiques (slug, titre, image_couverture, contenu, meta_description) VALUES (
  'qui-sommes-nous',
  'Pourquoi 100000medecins.org ?',
  '/images/homempage/mg-meeting.jpg',
  '<p>La <strong>transformation numérique en santé</strong> est une formidable opportunité pour améliorer nos conditions d''exercice, l''accès et la qualité des soins. Ce secteur est si prometteur qu''il est devenu un nouveau «&nbsp;Far West numérique&nbsp;», dominé par des startups et des fonds d''investissements.</p>

<p>Pendant des années, nos logiciels informatiques se limitaient à nous fournir un outil de saisie, nos données cliniques et d''un carnet de rendez-vous. Aujourd''hui et plus médecins, nous réalisons que nous sommes devenus dépendants sur des <strong>sujets d''ergonomie, de fiabilité, et d''interopérabilité</strong>.</p>

<p>Car notre vraie le plus cher est que la e-santé nous permette enfin de nous décharger des tâches répétitives qui nous mobilisent chaque jour davantage, et nous permettre de consacrer plus de temps au dialogue humain qui fait toute la force d''un colloque singulier — le Face à Face médecin/patient. Bref, nous voulons faire une médecine des temps modernes, humaine, augmentée — et pas une médecine algorithmique ou dépersonnalisée. 100000médecins.org se place désormais comme l''intermédiaire privilégié entre médecins et acteurs de la e-santé, pour aider à l''émergence et au déploiement de logiciels qui nous permettront de répondre en qualité et quantité aux besoins de santé de la population.</p>

<p>Notre métier consiste en grande partie à aider les patients à faire les bons choix, en leur apportant les bonnes informations. Montrons-leur que nous savons faire les nôtres.</p>

<h2>L''association</h2>

<div style="padding: 1.5rem; background: #F7F8FC; border-radius: 0.75rem; border: 1px solid #f3f4f6; margin-bottom: 2rem;">
<p style="margin: 0;">«&nbsp;100&nbsp;000 Médecins.org&nbsp;» est une association Loi 1901,<br>composée de syndicats nationaux représentant les médecins libéraux français.</p>
</div>

<h2>Nos statuts</h2>

<h3>Préambule</h3>

<p>En raison de l''accélération des changements dans l''exercice des différentes spécialités de santé et en particulier de la médecine libérale, notamment liée à&nbsp;:</p>

<ul>
<li>l''introduction de logiciels métier et d''outils numériques de plus en plus performants et complexes,</li>
<li>la nécessité de créer et de maintenir un réseau de correspondants via des messageries sécurisées, plateformes sociales ou applications,</li>
<li>l''essor de la télémédecine.</li>
</ul>

<p>Les représentations syndicales nationales des médecins libéraux français, en dehors de toute considération de représentativité ou de statut conventionnel, ont décidé de se mobiliser et de créer une association régie par la loi du 1er juillet 1901, dans un souci d''efficience, de confort d''exercice, et d''amélioration de la qualité des soins prodigués à la population.</p>

<h3>Principaux objets de l''association</h3>

<ul>
<li>Constituer un registre de réflexion et de communication commune sur le thème de la santé numérique et de ses bonnes pratiques.</li>
<li>Créer, développer et gérer un système de notation des outils numériques disponibles pour les médecins.</li>
<li>Informer sur les outils numériques existants.</li>
<li>Favoriser l''émergence de toute autre initiative pouvant aller dans le sens de la bonne utilisation d''outils numériques par les professionnels de santé.</li>
</ul>

<h2>Nos membres fondateurs</h2>

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-top: 1.5rem;">

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/csmf.png" alt="Logo CSMF" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">En quelques années, le numérique est entré dans l''environnement des médecins libéraux. L''intelligence artificielle ayant vite à l''évidence modifié nos exercices professionnels. Participer à 100 000 Médecins.org, c''est s''intéresser et s''investir sur un sujet important dont nous aurons besoin pour nous guider dans l''univers du numérique en santé.</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #4A90D9; line-height: 1.4;">Dr Franck Devulder</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Président</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/fmf.png" alt="Logo FMF" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">« 100 000 Médecins.org » ? Un outil adapté à notre pratique pour faire votre choix en toute indépendance.</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #E8734A; line-height: 1.4;">Dr Patricia Lefébure</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Présidente</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/sml.png" alt="Logo SML" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">Depuis décembre 2022, le SML affirme et porte une nouvelle politique : Toujours un temps d''avance ! Halte à la destruction du système de santé c''est pas une fatalité. Nous devons imposer une politique de santé où le médecin libéral aura une place prépondérante et notamment l''Intelligence Artificielle (IA) et les nouvelles technologies vont en être l''argent tout en conservant une médecine individualisée et humaniste.</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #8B5CF6; line-height: 1.4;">Dr Sophie Bauer</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Présidente</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/mg-france.png" alt="Logo MG France" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">On ne soigne plus aujourd''hui comme on soignait absurde. Nous estimons à la fois mieux nombreux et de plus en plus sollicités. Gagner du temps médical bénéficier d''un confort d''exercice accru, communiquer rapidement et facilement avec les autres soignants, sont des éléments primordiaux sur tous les médecins généralistes. Dans la multitude des logiciels numériques disponibles pour nous apporter des services, « 100 000 Médecins.org » a l''ambition de nous aider à nous orienter. Bienvenue « 100 000 médecins ».</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #22C55E; line-height: 1.4;">Dr Agnès Giannotti</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Présidente</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/jeunes-medecins.png" alt="Logo Jeunes Médecins" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">Les Jeunes Médecins, acteurs de leur vie professionnelle, savent que pour rester maîtres de leur outil de travail, il faut que la profession s''organise. Ils soutiennent donc « 100 000 Médecins.org » !</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #F5A623; line-height: 1.4;">Dr Emmanuel Loeb</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Président</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/le-bloc.png" alt="Logo Le Bloc" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">Structure syndicale conçue pour tester les outils numériques, « 100 000 Médecins.org » pourra permettre à la profession de choisir parmi les multiples logiciels proposés. Au-delà ce panel permettra aussi d''influer auprès de la conception même de ses outils, et limiter une dépendance à des logiciels dont la maîtrise fut développée.</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #EF4444; line-height: 1.4;">Dr Xavier Guyon Beauchamps,<br>Dr Philippe Cuq,<br>Dr Bertrand De Rochambeau</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Présidents</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/snjmg.png" alt="Logo SNJMG" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">Notre génération a l''immense responsabilité de construire l''horizon au côté d''algorithmes et plans de soins. Il nous en incombe aux futurs les outils de travail entre les mains des géants privés du numérique, nous devons nous en emparer !</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #6366F1; line-height: 1.4;">Dr Bayaska Oguchi</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Président</p>
</div>

<div style="background: #F7F8FC; border-radius: 1rem; padding: 2rem; display: flex; flex-direction: column;">
<div style="text-align: center; height: 6rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;"><img src="/images/syndicats/avenir-spe.png" alt="Logo Avenir Spé" style="height: 4rem; max-width: 180px; object-fit: contain;"></div>
<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.6; font-style: italic; flex: 1; margin-bottom: 2rem;">Attaché aux valeurs de solidarité et d''équité, le syndicat Avenir Spé soutient l''initiative de 100 000 médecins. Cet outil collaboratif à l''empreinte vertical des médecins spécialistes, permettra de réellement évaluer les logiciels destinés aux médecins en répondant clairement aux interrogations légitimes des professionnels (interopérabilité, fiabilité, adéquation à sa pratique, etc...).</p>
<p style="font-size: 1.125rem; font-weight: 700; color: #14B8A6; line-height: 1.4;">Dr Patrick Gasser</p>
<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Président</p>
</div>

</div>',
  'Découvrez l''association 100 000 Médecins.org, ses statuts, ses membres fondateurs et son engagement pour la e-santé.'
);

-- 2. Lancement 100K
INSERT INTO pages_statiques (slug, titre, image_couverture, contenu, meta_description) VALUES (
  'lancement-100k',
  'Lancement de « 100 000 Médecins.org », le premier mouvement intersyndical autour de la e-santé.',
  '/images/articles/cab-devices.jpg',
  '<div style="padding: 1.5rem; background: #F7F8FC; border-radius: 0.75rem; border: 1px solid #f3f4f6; margin-bottom: 2.5rem;">
<p style="margin: 0; font-size: 0.875rem; color: #4b5563; line-height: 1.6;">Les syndicats nationaux de médecins libéraux ont décidé de s''unir autour de la e-santé en lançant le premier mouvement intersyndical «&nbsp;100&nbsp;000 Médecins.org&nbsp;». Regroupant la CSMF, la FMF, le SML, Le Bloc, MG France, Jeunes Médecins et le SNJMG, l''objectif est de fédérer les médecins libéraux pour leur permettre d''être au premier plan de leur propre transformation numérique.</p>
</div>

<h2>Être au cœur des changements en e-santé</h2>

<p>Lors des négociations conventionnelles sur la télémédecine en 2018, les représentants des médecins libéraux se sont accordés sur le fait que la transformation numérique bouleversait déjà leurs pratiques, mais également l''organisation du système de santé et les relations patients-médecins.</p>

<p>Afin d''orienter la e-santé vers un avenir souhaitable et respectueux de tous les intérêts, les Présidents des syndicats nationaux de médecins libéraux ont décidé de s''unir afin de faire des médecins les principaux acteurs de leur transformation numérique. Ils ont créé «&nbsp;100&nbsp;000 Médecins.org&nbsp;», le mouvement intersyndical autour de la e-santé, regroupant la CSMF, la FMF, le SML, le Bloc, MG France, Jeunes Médecins et le SNJMG.</p>

<p>L''objectif de «&nbsp;100&nbsp;000 Médecins.org&nbsp;» est de fédérer les médecins libéraux pour leur permettre d''être au premier plan des changements qui s''opèrent en e-santé.</p>

<h2>Représenter un levier d''actions auprès des éditeurs de logiciels</h2>

<p>Avec un marché mondial évalué à 235 milliards d''euros pour 2023 par Frost &amp; Sullivan, les acteurs de la e-santé se multiplient et les financements privés affluent. Les Présidents des syndicats qui composent «&nbsp;100&nbsp;000 Médecins.org&nbsp;» ont noté les fortes réactions de la profession suite à des faits récents&nbsp;: le détournement de patientèle, la mise aux enchères de rendez-vous médicaux, ou encore la notation des médecins avec des plateformes de télémédecine.</p>

<p>«&nbsp;100&nbsp;000 Médecins.org&nbsp;» prône une autre vision de la transformation numérique&nbsp;: les acteurs de la e-santé doivent agir en collaboration avec les médecins, avec prudence et respect.</p>

<p>Les Présidents des syndicats appellent les médecins libéraux à se mobiliser en s''inscrivant sur le site internet <strong>10000médecins.org</strong>. Ils sont invités à exprimer leurs attentes et inquiétudes au sujet de la e-santé, ainsi que donner leur avis sur les outils numériques qu''ils utilisent au quotidien. Une forte mobilisation de la profession est attendue pour représenter un levier d''action auprès des éditeurs de logiciels. L''objectif souhaité est d''être impliqué dans la conception et l''évolution des nouveaux outils numériques.</p>

<p>Le Président de «&nbsp;100&nbsp;000 Médecins.org&nbsp;», le Dr David Azerad, exprime à ce sujet&nbsp;: «&nbsp;La transformation numérique en e-santé est une formidable opportunité pour améliorer l''accès et la qualité des soins. Ce secteur est si prometteur qu''il est devenu un Far West numérique, dominé par des fonds d''investissements. Pour éviter une déshumanisation des soins, il est urgent de s''approprier les initiatives d''aujourd''hui pour mieux maîtriser notre avenir.&nbsp;»</p>

<h2>Juger, soutenir et guider les outils numériques d''aujourd''hui et de demain</h2>

<p>«&nbsp;100&nbsp;000 Médecins.org&nbsp;» souhaite lancer en 2020 la première agence de notation des outils numériques des médecins. Elle permettra d''informer la profession sur les outils numériques d''aujourd''hui et de demain. «&nbsp;100&nbsp;000 Médecins.org&nbsp;» proposera une note globale reflétant des avis d''experts. Chaque médecin pourra également noter les différentes facettes de ses outils et partager son expérience avec ses confrères.</p>

<p>L''agence de notation des outils numériques des médecins permet de répondre à un triple objectif&nbsp;:</p>

<ul>
<li>Aider la profession à faire les bons choix d''outils numériques</li>
<li>Promouvoir des logiciels estimés bien conçus, respectueux des bonnes pratiques et pérennes</li>
<li>Orienter les éditeurs de logiciels vers les objectifs que les médecins souhaitent atteindre</li>
</ul>

<p>«&nbsp;100&nbsp;000 Médecins.org&nbsp;» se place comme l''intermédiaire privilégié entre médecins et acteurs de la e-santé, pour aider à l''émergence et au déploiement de logiciels qui permettront à la profession de répondre aux besoins de santé de la population, dont ils sont les premiers interlocuteurs en la matière.</p>

<div style="margin-top: 2.5rem; border-left: 3px solid #E8734A; padding-left: 1.25rem;">
<h3 style="font-size: 0.8125rem; font-weight: 700; color: #1B2A4A; margin-bottom: 0.75rem;">À propos de «&nbsp;100&nbsp;000 Médecins.org&nbsp;»</h3>
<p style="font-size: 0.8125rem; color: #4b5563; line-height: 1.7;">«&nbsp;100&nbsp;000 Médecins.org&nbsp;» est le premier mouvement intersyndical autour de la e-santé. Association de loi 1901, «&nbsp;100&nbsp;000 Médecins.org&nbsp;» est composé de syndicats nationaux représentant les médecins libéraux français&nbsp;: la CSMF, la FMF, le SML, Le Bloc, MG France, Jeunes Médecins et le SNJMG. L''ambition de «&nbsp;100&nbsp;000 Médecins.org&nbsp;» est de fédérer les médecins libéraux pour leur permettre d''être au premier plan de leur propre transformation numérique. En créant la première agence de notation des outils numériques des médecins, les syndicats vont permettre à la profession de juger, soutenir et guider les outils numériques d''aujourd''hui et de demain.</p>
<p style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.75rem;">Contact presse : <strong>presse@100000medecins.org</strong></p>
</div>',
  'Les syndicats nationaux de médecins libéraux ont décidé de s''unir autour de la e-santé en lançant le premier mouvement intersyndical.'
);

-- 3. Difficile de changer
INSERT INTO pages_statiques (slug, titre, image_couverture, contenu, meta_description) VALUES (
  'difficile-de-changer',
  'Pourquoi est-ce si difficile de changer ?',
  NULL,
  '<div style="padding: 1.5rem; background: #F7F8FC; border-radius: 0.75rem; border: 1px solid #f3f4f6; margin-bottom: 2.5rem;">
<p style="margin: 0; font-size: 0.875rem; color: #4b5563; line-height: 1.6;">La base du problème réside dans le fait que nous avons tous acquis des parties habitudes, et que nous les aimons&nbsp;: qu''elles aient été décidées volontairement ou contraintes, ce sont elles qui nous ont permis d''atteindre une zone de confort dans laquelle nous nous complaisons quotidiennement. Et c''est paradoxalement l''attachement à ces mêmes habitudes qui nous empêche de conserver une dynamique d''évolution permanente, pourtant <strong>indispensable si l''on souhaite rester dans cette fameuse zone de confort&nbsp;!</strong></p>
</div>

<h2>Le changement…</h2>

<p>…&nbsp;est défini comme «&nbsp;une altération de la réalité dans laquelle évolue une personne&nbsp;». D''où le fait que certains vivent la nouveauté comme une découverte, quand pour d''autres il est source d''angoisse.</p>

<p>De façon assez simpliste, on peut considérer que la pensée humaine fonctionne selon deux systèmes, l''un rapide et inconscient, l''autre lent et conscient&nbsp;: mais surtout paresseuse… mais c''est surtout la pensée rapide (liée au paléocortex) qui détermine nos actions et nos décisions bien plus que nous ne le pensons. Bref, pour dire les choses simplement, il est contraire à la nature humaine de réagir positivement aux changements parce qu''ils nous poussent hors de notre zone de confort.</p>

<p>Et pourtant, le changement est indispensable pour «&nbsp;rester dans le coup&nbsp;», d''autant que nous sommes désormais dans un monde d''immédiateté, et dont les frontières sont de plus en plus poreuses.</p>

<p>Vous pourrez objecter que le secteur de la santé ne devrait pas se sentir concerné par ces notions de "compétition commerciale", mais force est de constater que nous ne sommes déjà plus dans ce monde depuis longtemps&nbsp;: si nous ne savons pas individuellement ce qui fait que Speciale nous adopte, d''autres intervenants sauront certainement emmener la compétition à nos portes, que ce soit via le fait de nouvelles technologies (départements HealthTech des GAFAM) ou de nouvelles organisations professionnelles (regroupements de cliniques voulant entrer sur le "marché" de la médecine extra-hospitalière).</p>

<p>Il faut donc apprendre (ou réapprendre) à changer&nbsp;! Et garder en tête que le changement régulier de nos organisations et de nos outils devra désormais faire partie intégrante de notre exercice, au même titre que le changement permanent de nos stratégies diagnostiques ou thérapeutiques.</p>

<h2>Les freins au changement</h2>

<p>Nous savons tous plus ou moins consciemment faire capoter un changement pourtant nécessaire, en recrutant des compétences insoupçonnées d''inertie ou de procrastination, en recherchant de nombreux avis complémentaires, en argumentant sur toutes les facettes du sujet jusqu''à épuisement. Dans des structures de groupe, certains cultivent des attitudes négatives, propagent des rumeurs, profèrent des menaces, voire parviennent au stade de révolte et de sabotage… ce qu''il faut savoir ou apprendre à gérer si l''on souhaite aller jusqu''au bout du processus.</p>

<p>Ces freins peuvent en particulier être en rapport avec des facteurs&nbsp;:</p>

<ul>
<li>individuels (éducation, personnalité, capacité d''adaptation…),</li>
<li>liés à la nature même du changement (surcoût inutile, complexification organisationnelle…),</li>
<li>liés à la stratégie du changement (absence de consultation, «&nbsp;guerre des chefs&nbsp;»…),</li>
<li>liés aux acteurs du changement (personnalité extérieure, intérêts personnels, implication émotionnelle, caractéristiques personnelles éloignées (âge, formation, statut socio-économique…)),</li>
<li>liés à des facteurs organisationnels et de groupes (organisation bureaucratique, routines, cohésion et solidarité…).</li>
</ul>

<p>Enfin, il faut savoir qu''il y a une relation directe entre le périmètre impacté par le changement et le niveau de résistance qui s''y oppose&nbsp;: il est plus simple d''acquérir de nouvelles compétences pour changer des processus simples, que d''aller — comme pour notre profession — pêcher sur le terrain des valeurs, d''autant que nous ne sommes plus aussi certains de l''adéquation entre la perception que nous avons de notre rôle, et celle de la population générale.</p>

<p style="font-size: 0.75rem; color: #9ca3af; text-align: center; font-style: italic; margin-top: 2rem;">Source&nbsp;: «&nbsp;Les facteurs de résistance au changement&nbsp;» — Christophe Poiffer</p>',
  'Comprendre les freins au changement de logiciel médical et les facteurs de résistance au changement.'
);

-- 4. Tous ensemble
INSERT INTO pages_statiques (slug, titre, image_couverture, contenu, meta_description) VALUES (
  'tous-ensemble',
  'Tous ensemble pour juger, soutenir et guider les outils que nous utilisons quotidiennement.',
  NULL,
  '<h2>Une profession essentielle et dévouée</h2>

<p>Au 1er janvier 2017, nous étions 116&nbsp;100 <strong>médecins libéraux</strong> en France, dont 60&nbsp;900 médecins généralistes et 55&nbsp;200 autres spécialistes.</p>

<p>Nous sommes donc nombreux, mais la charge de travail augmente pour un nombre de médecins libéraux qui diminue et vieillit, nous traitons des cas de plus en plus «&nbsp;complexes&nbsp;», et la profession, dans son ensemble, ne va pas si bien puisque près de la moitié d''entre nous déclare ressentir des signes de burnout.</p>

<p>Depuis de nombreuses années, nous subissons les choix de politique de santé, et continuons à négliger nos sommes conventionnelles pour avoir de quoi petit à petit notre indépendance, que nous considérons encore garante de notre qualité de service. Pourtant cette sensation d''avoir toujours un petit train de retard sur le Sécu, la Mutualité, les «&nbsp;marchés&nbsp;», persiste…</p>

<h2>En pleine transformation numérique</h2>

<p>Notre métier a bien changé. Même les jeunes générations n''exercent plus aujourd''hui de la même façon que lorsqu''elles ont commencé leur activité il y a quelques années seulement.</p>

<p>Depuis l''apparition de l''informatique, ces changements accélèrent et transforment le cœur même de notre pratique&nbsp;: de la disparition des dossiers papier à leur numérisation au sein de «&nbsp;logiciels métier&nbsp;», à l''apparition d''aides à la décision et à la prescription, la télétransmission, la conservation de nos données dans le «&nbsp;cloud&nbsp;», et plus récemment les messageries sécurisées et la télémédecine&nbsp;!</p>

<blockquote>En dehors de quelques résistants, la grande majorité d''entre nous a pris le train du numérique, certains passionnément, d''autres contraints et forcés pour ne pas rester à quai.</blockquote>

<p>Et en effet, grâce à ces nouveaux outils, c''est toute notre pratique quotidienne qui est bouleversée. Ils nous rendent souvent plus efficients, parfois plus efficaces, la qualité globale des soins s''améliore, mais une certaine dépendance à toute épreuve pour s''installer. Ils sont parfois bien choisis, adaptés et nous aident, et parfois le sont moins, nous font perdre du temps ou sont d''une inélégance informationnelle.</p>

<p>Mais la transition numérique n''est pas simple pour tout le monde. Et même pour ceux qui sont de la génération dite des «&nbsp;millenials&nbsp;», le choix du bon outil pour sa façon de pratiquer n''est pas forcément évident.</p>

<h2>Avec des outils pensés par autrui</h2>

<p>Ils sont d''ailleurs trop nombreux pour tous les connaître. Les choisissons le plus souvent grâce au bouche-à-oreille, en via les communications, au hasard d''une présentation sur un salon ou poussés par un syndicat. Certains d''entre eux sont le fruit de belles promesses, ont trouvé leur public nemi — ou tout choix par défaut — après une revue exhaustive de faisceaux, quand d''autres n''ont tout simplement jamais eu le choix.</p>

<p>Tout est… dans notre cas, les outils sont tellement complexes et interdépendants qu''on hésite longtemps à changer même si on souhaite vivement le faire par crainte de la mission impossible&nbsp;: le refaire d''autant plus que leur utilisation est enracinée dans nos petites habitudes. Cela prend du temps, de l''énergie, de l''argent, avec un risque de déstabilisation totale de notre pratique pendant la transition. Les éditeurs le savent que trop bien, et profitent d''ailleurs plus de cette «&nbsp;résistance au changement&nbsp;» à notre détriment face à cette problématique rend la prise de décision encore plus complexe et analgésique.</p>

<p>Quelle que soit la branche dans laquelle on travaille, tout professionnel vous le dira&nbsp;: il faut savoir choisir les bons outils pour travailler dans de bonnes conditions. Et en changer quand ils ne conviennent plus.</p>

<p>Et pour nos outils, qui les crée&nbsp;? Parfois un médecin en a été à l''origine, mais le plus souvent ce sont des éditeurs qui n''ont qu''un grand questionnaire d''utilisabilité «&nbsp;qui donne tout de plus en plus avec une interface ou une fonctionnalité&nbsp;». Nous ne participons pas aux évaluations stratégiques concernant les évolutions de nos propres outils, qui ne relèvent que des circonstances, déterminismes ou divergences des éditeurs. D''ailleurs les intérêts de nos données, au-delà de coquettes formules marketing bien tournées, ne sont pas toujours d''alimenter nos conditions d''exercice. Plus récemment, certains se sont même autorisés à revendre physiquement nos salles d''attente pour nous promettre plus de visibilité, au détriment de notre liberté et de notre indépendance.</p>

<h2>Que nous devons reprendre en main</h2>

<p>Ces outils que nous avons choisi d''utiliser font partie de notre pratique, de notre quotidien. Mais ils ont également un impact sur notre patientèle, sur leur parcours de soins, sur notre réseau, sur les informations médicales que nous souhaitons conserver ou transmettre.</p>

<blockquote>Dans par extension, les choix d''outils que nous faisons dans notre coin, au quotidien, sont structurants pour le système de santé dans son ensemble.</blockquote>

<p>Et lorsque l''on réalise qu''on peut changer ses habitudes pour plus de confort, d''efficacité, de qualité, une remise en question de ses outils doit se faire, et si possible en gardant ses données en toute sécurité.</p>

<p>Mais c''est parfois difficile de changer ses habitudes, et nous ne savons que trop bien… ne le demandent-on pas tous les jours à nos patients&nbsp;? Et pour un médecin, où trouver les bons conseils, les bonnes informations&nbsp;? Qui pour nous aider à changer&nbsp;? Le bouche-à-oreille, le commercial, une publicité&nbsp;? Les URPS&nbsp;? Nos syndicats&nbsp;?</p>

<p>Nous réunions.&nbsp;?</p>

<h2>Pour le bien de toute la profession</h2>

<p>Au 1er janvier 2017, nous étions 116&nbsp;100 médecins libéraux en France, dont 60&nbsp;900 médecins généralistes et 55&nbsp;200 autres spécialistes.</p>

<p>Nous sommes nombreux, nous ne sommes pas avares d''idées, alors pourquoi ne pas s''organiser pour recenser les outils que nous utilisons, rechercher à savoir pourquoi ils sont biens ou pas pour nous, si leurs intérêts sont en contradiction avec les nôtres&nbsp;? Pourquoi ne pas les évaluer, les guider, les soutenir&nbsp;? Mais pourquoi pas aussi créer un «&nbsp;laboratoire&nbsp;» des outils numériques pour aider nos consoeurs et frères à faire les bons choix pour leur exercice, leur pratique, leur quotidien&nbsp;?</p>

<blockquote>Et pourquoi pas, un jour, (re)devenir propriétaires de nos outils&nbsp;?</blockquote>

<p>N''oublions pas que notre métier c''est en grande partie d''aider les patients à faire les bons choix, en leur apportant les bonnes informations.</p>

<p>Montrons-leur que nous savons faire les nôtres.</p>

<p><strong>100&nbsp;000 Médecins.org</strong></p>',
  'Tous ensemble pour juger, soutenir et guider les outils que nous utilisons quotidiennement.'
);
