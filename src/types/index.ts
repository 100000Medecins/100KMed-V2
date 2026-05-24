export interface NavItem {
  label: string;
  href: string;
}

export interface SoftwareItem {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  color: string;
  initials: string;
}

export interface PartnerLogo {
  name: string;
  abbr: string;
  logo: string;
}

export interface MissionItem {
  title: string;
  description: string;
  color: string;
  href: string;
  image?: string;
}

export interface VideoItem {
  title: string;
  color: string;
  href: string;
  youtubeId: string;
}

export type ButtonVariant =
  | "primary"   // bg-navy / text-white — action principale
  | "secondary" // bg-accent-blue / text-white — action secondaire
  | "outline"   // border-navy / text-navy — bouton avec contour, sans fond
  | "ghost"     // transparent / text-navy — action tertiaire
  | "danger"    // bg-red-500 / text-white — action destructive
  | "white"     // border-white / text-white — pour les fonds sombres (hero)
  | "cta";      // bg-accent-yellow / text-navy — bouton mis en avant (landing)
