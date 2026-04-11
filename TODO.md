# TODO — 100 000 Médecins

Liste des idées et fonctionnalités à implémenter, mise à jour au fil des sessions.

---

## En attente / Idées

### Incrustration logo sur images réseaux sociaux
- **Quoi :** avant l'envoi à Make.com, composer l'image de couverture de l'article avec le logo 100KM en haut à droite, via `sharp` (déjà installé)
- **Étapes :**
  1. Mettre le logo PNG fond transparent dans `public/logo-100km.png`
  2. Créer un endpoint `src/app/api/composer-image/route.ts` : télécharge l'image de couverture, superpose le logo, upload le résultat dans Supabase Storage, retourne l'URL publique
  3. Modifier `SocialPanel.tsx` : appeler cet endpoint avant `sendPost()` pour remplacer `image_url` par l'image composée
- **Prérequis :** logo PNG fond transparent (~300px) à placer dans `public/`

### Études cliniques & Questionnaires de recherche (espace utilisateur)
- **Quoi :** compléter les sections "Études cliniques avec le Digital Medica Hub" et "Questionnaires de recherche" dans la page Mes notifications — actuellement affichées avec "Plus d'informations prochainement"
- **À faire :** définir avec le partenaire le contenu exact (formulaire d'inscription, lien externe, flux d'envoi), puis implémenter

### Longueur des articles générés par IA
- **Quoi :** permettre à l'admin de choisir la longueur cible de l'article avant génération (ex : Court ~400 mots / Moyen ~700 mots / Long ~1200 mots)
- **Où :** `src/components/admin/ArticleForm.tsx` (ajout d'un sélecteur) + `src/app/api/generer-article/route.ts` (passer la longueur dans le prompt)

### Régénération des types Supabase
- Supprimer le workaround `createServiceRoleClientUntyped()` une fois les types régénérés
- Commande : `npx supabase gen types typescript --project-id qnspmlskzgqrqtuvsbuo > src/types/database.ts`
- **Attention :** écrire ce fichier en UTF-16 LE avec BOM sur Windows (ne pas utiliser le Write tool directement)

### Nettoyage schéma Supabase
- Supprimer les colonnes inutilisées héritées de la migration Firebase
- À faire quand le projet est stabilisé

### PSC production
- Migrer ProSanté Connect de l'environnement BAS vers la production ANS
- Voir checklist dans `memory/project_psc_prod_deployment.md`

---

## Fait récemment
- Blog IA + publication Make.com (LinkedIn ✅, Facebook ✅, Instagram ✅)
- OG image articles blog pour vignettes Facebook
- Blocage envoi Instagram sans image de couverture
- Persistance messages réseaux sociaux dans localStorage
- Onglets conditionnels pages solutions
- Bouton "Modifier mon commentaire" dans Mes évaluations
