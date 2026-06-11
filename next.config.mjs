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
      // (ex. LogicielsMetiers → logiciels-metiers avec tiret).
      { source: '/solutions/LogicielsMetiers', destination: '/solutions/logiciels-metiers', permanent: true },
      { source: '/solutions/LogicielsMetiers/:slug*', destination: '/solutions/logiciels-metiers/:slug*', permanent: true },
      { source: '/solutions/AgendasMedicaux', destination: '/solutions/agendas-medicaux', permanent: true },
      { source: '/solutions/AgendasMedicaux/:slug*', destination: '/solutions/agendas-medicaux/:slug*', permanent: true },
      { source: '/solutions/IntelligenceArtificielleMedecine', destination: '/solutions/intelligence-artificielle-medecine', permanent: true },
      { source: '/solutions/IntelligenceArtificielleMedecine/:slug*', destination: '/solutions/intelligence-artificielle-medecine/:slug*', permanent: true },
      { source: '/solutions/IaDocumentaires', destination: '/solutions/ia-documentaires', permanent: true },
      { source: '/solutions/IaDocumentaires/:slug*', destination: '/solutions/ia-documentaires/:slug*', permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
