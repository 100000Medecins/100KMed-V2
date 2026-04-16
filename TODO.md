# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### Page d'accueil — remplacer "Les enjeux de l'e-santé" par les derniers articles blog
- **Quoi :** supprimer la section vidéos "Les enjeux de l'e-santé" de la page d'accueil et la remplacer par les 3 derniers articles de blog publiés
- **Où :** identifier le composant homepage concerné + récupérer les 3 derniers articles (`statut = 'publie'`, triés par `date_publication DESC`, limit 3) depuis Supabase

### Études cliniques & Questionnaires de recherche (espace utilisateur)
- **Quoi :** compléter les sections "Études cliniques avec le Digital Medica Hub" et "Questionnaires de recherche" dans la page Mes notifications — actuellement affichées avec "Plus d'informations prochainement"
- **À faire :** définir avec le partenaire le contenu exact (formulaire d'inscription, lien externe, flux d'envoi), puis implémenter

### Nettoyage schéma Supabase
- Supprimer les colonnes inutilisées héritées de la migration Firebase
- À faire quand le projet est stabilisé

### Module Vidéos — rubriques éditables
- **Quoi :** remplacer le champ `theme` (texte libre) par une FK vers une table `video_rubriques` (id, nom, ordre). Permettre de regrouper les vidéos par rubrique sur la page publique et dans l'admin
- **Admin :** CRUD des rubriques dans `/admin/videos` (comme les séparateurs de fonctionnalités), sélection via dropdown dans le formulaire vidéo
- **SQL :** créer table `video_rubriques`, ajouter colonne `rubrique_id` sur `videos`, migrer les données `theme` existantes

### Module Vidéos — admin enrichi
- **Quoi :** améliorer la liste admin `/admin/videos`
- **À faire :** aperçu miniature YouTube dans la liste, classement par glisser-déposer (ordre), toggle on/off publication sans quitter la page (comme `ToggleSolutionActif`)

### Admin utilisateurs — export emails CSV
- **Quoi :** ajouter un bouton dans la page admin utilisateurs pour exporter la liste des emails renseignés en CSV
- **Détail :** le bouton doit afficher le nombre d'emails disponibles, et déclencher un téléchargement CSV côté client

### PSC production
- Migrer ProSanté Connect de l'environnement BAS vers la production ANS
- Voir checklist dans `memory/project_psc_prod_deployment.md`

---

---

## Fait récemment
- Incrustation logo sur images réseaux sociaux ✅
- Longueur des articles IA (brève/article/dossier) ✅
- Régénération types Supabase + suppression `createServiceRoleClientUntyped` ✅
- Blog IA + publication Make.com (LinkedIn ✅, Facebook ✅, Instagram ✅)
- OG image articles blog pour vignettes Facebook
- Blocage envoi Instagram sans image de couverture
- Persistance messages réseaux sociaux dans localStorage
- Onglets conditionnels pages solutions
- Bouton "Modifier mon commentaire" dans Mes évaluations
- Espace éditeur (rôles, mon-compte/mon-espace-editeur, server actions sécurisées)
- Admin utilisateurs : pagination >1000, badge PSC via RPPS, pseudo/spécialité/RPPS colonnes, saisie directe de page
- Galerie vidéo (YouTube/Vimeo) dans pages solutions + admin
- Fix AbortError AuthProvider sur double événement auth
- Correction callback PSC : nom/prénom non écrasés si PSC renvoie null
