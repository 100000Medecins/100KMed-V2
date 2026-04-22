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

export type ButtonVariant = "primary" | "outline" | "ghost" | "white" | "cta";
