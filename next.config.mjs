import BundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Les types Supabase génèrent des faux positifs sur .eq() après régénération UTF-8.
    // Le code runtime est correct — les vraies erreurs sont détectées en dev.
    ignoreBuildErrors: true,
  },
  // Anti-indexation hors prod, niveau HTTP. Ceinture du <meta noindex> de
  // src/app/layout.tsx, qui a deux angles morts : (1) une route qui redéfinit `robots`
  // dans son generateMetadata n'hérite plus du layout racine — exactement le piège qui
  // avait fait sauter l'og:image des fiches solutions le 2026-07-28 ; (2) le meta ne
  // couvre que le HTML, pas les réponses non-HTML.
  // L'en-tête, lui, s'applique à TOUT. Vérifié en ligne le 2026-08-16 : VERCEL_ENV vaut
  // 'production' sur www uniquement (prod ne sert aucun noindex, dev en sert un) — donc
  // aucun risque de fuite de ce noindex vers la prod.
  async headers() {
    if (process.env.VERCEL_ENV === 'production') return [];
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  // Redirections 301 des anciennes URLs Quasar renommées sur le nouveau site Next.js.
  // Cas certains uniquement (renommage camelCase -> kebab-case + pages équivalentes).
  // Les fiches solutions/catégories/éditeurs gardent le même schéma d'URL (pas de redirect).
  async redirects() {
    return [
      { source: '/difficileDeChanger', destination: '/difficile-de-changer', permanent: true },
      { source: '/tousEnsemble', destination: '/tous-ensemble', permanent: true },
      { source: '/lancement100k', destination: '/lancement-100k', permanent: true },
      { source: '/presentation100k', destination: '/qui-sommes-nous', permanent: true },
      { source: '/monCompte', destination: '/mon-compte/profil', permanent: true },
      { source: '/monCompte/mesFavoris', destination: '/mon-compte/mes-favoris', permanent: true },
      { source: '/monCompte/mesPreferences', destination: '/mon-compte/mes-preferences', permanent: true },
      { source: '/monCompte/MesOutils', destination: '/mon-compte/profil', permanent: true },
      { source: '/monCompte/mesEvaluations', destination: '/mon-compte/mes-evaluations', permanent: true },
      { source: '/connexion/creationCompte/identifiants', destination: '/inscription', permanent: true },
      { source: '/connexion/creationCompte/donneesPerso', destination: '/inscription', permanent: true },

      // Anciens slugs catégories Quasar (CamelCase + renommages). Couvre la liste
      // catégorie ET les pages solutions imbriquées via :slug*.
      // La normalisation de casse pure est gérée dynamiquement dans
      // src/app/solutions/[idCategorie]/page.tsx — ces redirections ici couvrent
      // les renommages qui ne sont PAS une simple normalisation de casse
      // (ex. LogicielsMetiers → logiciel-medical).

      // Catégorie « Logiciels métier » renommée en « Logiciel médical » (2026-06-11).
      // 4 redirects nécessaires : (1-2) ancien CamelCase Quasar, (3-4) ancien slug kebab
      // pour préserver le SEO acquis sur logiciels-metiers.
      { source: '/solutions/LogicielsMetiers', destination: '/solutions/logiciel-medical', permanent: true },
      { source: '/solutions/LogicielsMetiers/:slug*', destination: '/solutions/logiciel-medical/:slug*', permanent: true },
      { source: '/solutions/logiciels-metiers', destination: '/solutions/logiciel-medical', permanent: true },
      { source: '/solutions/logiciels-metiers/:slug*', destination: '/solutions/logiciel-medical/:slug*', permanent: true },
      // URL zombie pré-migration : le slug Firebase était l'URL brute « www.weda.fr ».
      // Le vrai slug Supabase est « weda ». Cible le chemin catégorie canonique : le
      // wildcard logiciels-metiers ci-dessus y mène déjà via une 2e redirection.
      { source: '/solutions/logiciel-medical/www.weda.fr', destination: '/solutions/logiciel-medical/weda', permanent: true },
      // Ancienne fiche « Medaplix » : solution jamais migrée depuis Firebase (n'existe pas
      // en BDD → 404). Même pattern que www.weda.fr ci-dessus : le wildcard logiciels-metiers
      // convertit d'abord le slug catégorie, cette règle renvoie ensuite vers la liste
      // catégorie (pas de fiche de remplacement, donc on retombe sur /solutions/logiciel-medical).
      { source: '/solutions/logiciel-medical/Medaplix', destination: '/solutions/logiciel-medical', permanent: true },
      { source: '/solutions/AgendasMedicaux', destination: '/solutions/agendas-medicaux', permanent: true },
      { source: '/solutions/AgendasMedicaux/:slug*', destination: '/solutions/agendas-medicaux/:slug*', permanent: true },
      { source: '/solutions/IntelligenceArtificielleMedecine', destination: '/solutions/intelligence-artificielle-medecine', permanent: true },
      { source: '/solutions/IntelligenceArtificielleMedecine/:slug*', destination: '/solutions/intelligence-artificielle-medecine/:slug*', permanent: true },
      { source: '/solutions/IaDocumentaires', destination: '/solutions/ia-documentaires', permanent: true },
      { source: '/solutions/IaDocumentaires/:slug*', destination: '/solutions/ia-documentaires/:slug*', permanent: true },

      // Catégorie Firebase "Agendas" renommée en Supabase "agendas-medicaux"
      // (audit slugs Firebase ↔ Supabase 2026-06-11).
      { source: '/solutions/Agendas', destination: '/solutions/agendas-medicaux', permanent: true },
      { source: '/solutions/Agendas/:slug*', destination: '/solutions/agendas-medicaux/:slug*', permanent: true },
      { source: '/solutions/agendas', destination: '/solutions/agendas-medicaux', permanent: true },
      { source: '/solutions/agendas/:slug*', destination: '/solutions/agendas-medicaux/:slug*', permanent: true },

      // Fiche e-Agenda : slug raccourci e-agenda-prendreunrendezvous-fr → e-agenda
      // (2026-06-25). Préserve le SEO de l'ancienne URL indexée.
      { source: '/solutions/agendas-medicaux/e-agenda-prendreunrendezvous-fr', destination: '/solutions/agendas-medicaux/e-agenda', permanent: true },

      // Anciens slugs éditeurs Firebase renommés en Supabase (slugify du nom).
      // Inclut le préfixe Quasar /editeur/ ET le préfixe pré-Quasar /editeurs/
      // (audit 2026-06-11 : 12 éditeurs ont un firebaseId différent du slug Supabase).
      // ── cegedim → cegedim-sante
      { source: '/editeur/cegedim', destination: '/editeur/cegedim-sante', permanent: true },
      { source: '/editeurs/cegedim', destination: '/editeur/cegedim-sante', permanent: true },
      // ── cgm → compugroup-medical
      { source: '/editeur/cgm', destination: '/editeur/compugroup-medical', permanent: true },
      { source: '/editeurs/cgm', destination: '/editeur/compugroup-medical', permanent: true },
      // ── openxtrem → xtrem-sante
      { source: '/editeur/openxtrem', destination: '/editeur/xtrem-sante', permanent: true },
      { source: '/editeurs/openxtrem', destination: '/editeur/xtrem-sante', permanent: true },
      // ── adsion → a-d-sion
      { source: '/editeur/adsion', destination: '/editeur/a-d-sion', permanent: true },
      { source: '/editeurs/adsion', destination: '/editeur/a-d-sion', permanent: true },
      // ── eigsante → eig-sante
      { source: '/editeur/eigsante', destination: '/editeur/eig-sante', permanent: true },
      { source: '/editeurs/eigsante', destination: '/editeur/eig-sante', permanent: true },
      // ── rdservices → rd-services
      { source: '/editeur/rdservices', destination: '/editeur/rd-services', permanent: true },
      { source: '/editeurs/rdservices', destination: '/editeur/rd-services', permanent: true },
      // ── almaPro → alma-pro
      { source: '/editeur/almaPro', destination: '/editeur/alma-pro', permanent: true },
      { source: '/editeurs/almaPro', destination: '/editeur/alma-pro', permanent: true },
      // ── medextgroup → medext-group
      { source: '/editeur/medextgroup', destination: '/editeur/medext-group', permanent: true },
      { source: '/editeurs/medextgroup', destination: '/editeur/medext-group', permanent: true },
      // ── ICTSolutions → ict-solutions
      { source: '/editeur/ICTSolutions', destination: '/editeur/ict-solutions', permanent: true },
      { source: '/editeurs/ICTSolutions', destination: '/editeur/ict-solutions', permanent: true },
      // ── OuvrezLaBoite → ouvrez-la-boite
      { source: '/editeur/OuvrezLaBoite', destination: '/editeur/ouvrez-la-boite', permanent: true },
      { source: '/editeurs/OuvrezLaBoite', destination: '/editeur/ouvrez-la-boite', permanent: true },
      // ── sephira → orisha (fusion d'entités, confirmé par David 2026-06-11)
      { source: '/editeur/sephira', destination: '/editeur/orisha', permanent: true },
      { source: '/editeurs/sephira', destination: '/editeur/orisha', permanent: true },
      // ── odaiji : editeur racheté par MadeForMed (confirmé par David 2026-06-11)
      { source: '/editeur/odaiji', destination: '/editeur/madeformed', permanent: true },
      { source: '/editeurs/odaiji', destination: '/editeur/madeformed', permanent: true },

      // Catch-all pluriel → singulier pour les éditeurs (préfixe pré-Quasar /editeurs/:slug
      // → préfixe Quasar puis Next.js /editeur/:slug). Doit être APRÈS les renommages
      // explicites ci-dessus (sephira, cgm, etc.) sinon /editeurs/cegedim serait redirigé
      // ici vers /editeur/cegedim au lieu de /editeur/cegedim-sante.
      // À ne PAS confondre avec la page liste /editeurs (sans rien après) qui existe.
      { source: '/editeurs/:slug', destination: '/editeur/:slug', permanent: true },

      // Pages HTML pré-Quasar (encore antérieures au site Vue/Quasar).
      // URLs identifiées par David, source = liens externes (réseaux sociaux,
      // articles, mails) qui pointent encore vers ces .html.
      { source: '/manifeste.html', destination: '/tous-ensemble', permanent: true },
      { source: '/communique.html', destination: '/lancement-100k', permanent: true },
      // Fichier racine Firebase pré-Quasar — n'a jamais existé en Next.js (404 historique).
      { source: '/index.html', destination: '/', permanent: true },
      // URL numérique fantôme héritée de l'ancien site (ID Firebase/Quasar) — plus aucun
      // lien interne, signalée en 404 par GSC. Redirige vers l'accueil (cf. audit SEO 2026-07-19).
      { source: '/5', destination: '/', permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
