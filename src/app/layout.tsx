import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import ScrollRestoration from "@/components/providers/ScrollRestoration";
import KonamiGame from "@/components/easter-egg/KonamiGame";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "10000médecins.org — Mieux exercer, avec les bons outils",
    template: "%s | 10000médecins.org",
  },
  description:
    "Trouvez les logiciels médicaux les plus adaptés à votre pratique grâce aux avis de vos confrères.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://10000medecins.org"),
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
    siteName: "10000médecins.org",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={poppins.variable}>
      <body className="overflow-x-hidden">
        <ScrollRestoration />
        <AuthProvider>{children}</AuthProvider>
        <KonamiGame />
      </body>
    </html>
  );
}
