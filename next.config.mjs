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
      { source: '/connexion/creationCompte/identifiants', destination: '/inscription', permanent: true },
      { source: '/connexion/creationCompte/donneesPerso', destination: '/inscription', permanent: true },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
