import type { NavItem, SoftwareItem, PartnerLogo, MissionItem, VideoItem } from "@/types";

export const navItems: NavItem[] = [
  { label: "Qui sommes-nous ?", href: "/qui-sommes-nous" },
  { label: "Comparatif LGC", href: "/solutions" },
  { label: "Comparatif Agenda", href: "/solutions/agenda-medical" },
  { label: "Comparatif IA", href: "/solutions/intelligence-artificielle-medecine" },
];

export const partnerLogos: PartnerLogo[] = [
  { name: "CSMF", abbr: "CSMF", logo: "/images/syndicats/csmf.png" },
  { name: "Avenir Spé", abbr: "AS", logo: "/images/syndicats/avenir-spe.png" },
  { name: "Jeunes Médecins", abbr: "JM", logo: "/images/syndicats/jeunes-medecins.png" },
  { name: "FMF", abbr: "FMF", logo: "/images/syndicats/fmf.png" },
  { name: "SML", abbr: "SML", logo: "/images/syndicats/sml.png" },
  { name: "MG France", abbr: "MGF", logo: "/images/syndicats/mg-france.png" },
  { name: "Le Bloc", abbr: "LB", logo: "/images/syndicats/le-bloc.png" },
  { name: "SNJMG", abbr: "SNJ", logo: "/images/syndicats/snjmg.png" },
];

export const softwareItems: SoftwareItem[] = [
  { id: "1", name: "Odaji", rating: 4.5, reviewCount: 8, color: "#4A90D9", initials: "OD" },
  { id: "2", name: "Mino Pro", rating: 4.3, reviewCount: 5, color: "#E8734A", initials: "MP" },
  { id: "3", name: "PharmaEyes", rating: 4.1, reviewCount: 7, color: "#22C55E", initials: "PE" },
  { id: "4", name: "Hosho", rating: 4.2, reviewCount: 2, color: "#8B5CF6", initials: "HO" },
  { id: "5", name: "Medimust", rating: 4.1, reviewCount: 7, color: "#F5A623", initials: "MM" },
];

export const missionItems: MissionItem[] = [
  {
    title: "La naissance d'un mouvement",
    description:
      "Découvrez comment 10000médecins.org est né de la volonté commune de médecins souhaitant reprendre le contrôle sur leurs outils numériques au quotidien.",
    color: "#E0EAFF",
    href: "/lancement-100k",
    image: "/images/homempage/mouvement.jpg",
  },
  {
    title: "Pourquoi est-ce si difficile de changer ?",
    description:
      "Comprendre les freins au changement de logiciel médical et les solutions pour les surmonter ensemble, pas à pas.",
    color: "#FDE8EF",
    href: "/difficile-de-changer",
    image: "/images/homempage/sketchs.jpg",
  },
  {
    title: "Juger, soutenir et guider",
    description:
      "Notre mission : vous aider à évaluer, choisir et maîtriser vos outils numériques pour une pratique médicale plus sereine.",
    color: "#FFF0E6",
    href: "/tous-ensemble",
    image: "/images/homempage/juger.jpg",
  },
];

export const videoItems: VideoItem[] = [
  { title: "INTRODUCTION", color: "#E0EAFF", href: "#", youtubeId: "vjF1TB_0cYs" },
  { title: "LA BOÎTE VOCALE", color: "#FDE8EF", href: "#", youtubeId: "sviVCS1xCfk" },
  { title: "LA DICTÉE VOCALE", color: "#FFF0E6", href: "#", youtubeId: "k0rwJqvEZus" },
];
