import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import ScrollRestoration from "@/components/providers/ScrollRestoration";
import KonamiGame from "@/components/easter-egg/KonamiGame";
import AcronymPopover from "@/components/AcronymPopover";
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
  return (
    <html lang="fr" className={`${poppins.variable} overflow-x-hidden`}>
      <body className="overflow-x-hidden">
        <ScrollRestoration />
        <AuthProvider>{children}</AuthProvider>
        <AcronymPopover />
        <KonamiGame />
      </body>
    </html>
  );
}
