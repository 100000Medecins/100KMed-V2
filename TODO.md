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

### PSC production
- Migrer ProSanté Connect de l'environnement BAS vers la production ANS
- Voir checklist dans `memory/project_psc_prod_deployment.md`

---

### Enrichissement profils PSC depuis la base RPPS publique
- **Quoi :** ~110 médecins ont un RPPS mais pas de nom/prénom (connectés le 26/02/2026, session BAS). Leur profil se remplit automatiquement à la prochaine connexion PSC (déjà implémenté). Pour les comptes qui ne reviennent jamais : enrichissement batch via le fichier RASS (data.gouv.fr)
- **Étapes :**
  1. Vérifier combien de comptes concernés : `SELECT COUNT(*) FROM users WHERE rpps IS NOT NULL AND nom IS NULL`
  2. Télécharger le fichier RASS sur data.gouv.fr
  3. Générer un script `UPDATE users SET nom=..., prenom=... WHERE rpps=... AND nom IS NULL`
- **Priorité :** faible — à faire si après quelques mois ces comptes n'ont toujours pas de nom

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
