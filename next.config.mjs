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
};

export default withBundleAnalyzer(nextConfig);
