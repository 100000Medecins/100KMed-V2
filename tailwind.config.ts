import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#1B2A4A",
          dark: "#0F1B33",
          light: "#2A3F66",
        },
        accent: {
          yellow: "#F5A623",
          orange: "#E8734A",
          blue: "#4A90D9",
          pink: "#FF6B9D",
        },
        rating: {
          green: "#22C55E",
          star: "#F5C518",
        },
        surface: {
          light: "#F7F8FC",
          muted: "#EEF1F8",
        },
        hero: {
          pink: "#FDE8EF",
          blue: "#E0EAFF",
          orange: "#FFF0E6",
        },
      },
      borderRadius: {
        card: "16px",
        button: "12px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.10)",
        nav: "0 2px 12px rgba(0, 0, 0, 0.04)",
        soft: "0 2px 8px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
