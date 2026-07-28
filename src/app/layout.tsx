import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import ScrollRestoration from "@/components/providers/ScrollRestoration";
import KonamiGame from "@/components/easter-egg/KonamiGame";
import AcronymPopover from "@/components/AcronymPopover";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

// Bretelle anti-indexation hors prod (en plus de robots.txt) : meta robots noindex
// injecté dans toutes les pages des environnements preview/dev. Couvre
// dev.100000medecins.org (VERCEL_ENV=preview) et toutes les URLs preview Vercel.
const IS_PROD = process.env.VERCEL_ENV === 'production'

export const metadata: Metadata = {
  title: {
    default: "100 000 Médecins — Mieux exercer, avec les bons outils",
    template: "%s | 100 000 Médecins",
  },
  description:
    "Trouvez les logiciels médicaux les plus adaptés à votre pratique grâce aux avis de vos confrères.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.100000medecins.org"),
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "100 000 Médecins",
  },
  // L'image de partage vient de src/app/opengraph-image.png (convention Next, appliquée à toutes
  // les pages sans image propre). On force la grande vignette Twitter/X.
  twitter: {
    card: "summary_large_image",
  },
  // Vérification du domaine pour Meta (Facebook Business → Domaines) → <meta name="facebook-domain-verification">
  verification: {
    other: {
      "facebook-domain-verification": "sljgihcnymnx9ht9jat6a543zdpbbz",
    },
  },
  ...(IS_PROD ? {} : {
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      googleBot: { index: false, follow: false },
    },
  }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // overflow-x: clip (et non hidden) sur html/body : coupe le débordement horizontal SANS
  // créer de conteneur de défilement — `overflow-x: hidden` force overflow-y à `auto` et
  // casse tous les `position: sticky` (bandeau de tri des comparatifs, etc.).
  return (
    <html lang="fr" className={`${poppins.variable} overflow-x-clip`}>
      <body className="overflow-x-clip">
        <ScrollRestoration />
        <AuthProvider>{children}</AuthProvider>
        <AcronymPopover />
        <KonamiGame />
        <Analytics />
      </body>
    </html>
  );
}
