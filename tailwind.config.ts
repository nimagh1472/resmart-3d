import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Dubai Cyber-Luxury brand palette — use these instead of ad-hoc
        // neutral-950/rgba(...) literals for HUD chrome and modal surfaces,
        // so every glass panel/scrim in the app shares one source of truth.
        asphalt: "#1E252B", // Deep Slate Asphalt
        neonCyan: "#00E5FF", // Neon Cyan
        desertGold: "#E5DAC3", // Dubai Warm Desert Gold
        darkGlass: "#0F172A", // Translucent Dark Glass base — use with /75 opacity, e.g. bg-darkGlass/75
      },
    },
  },
  plugins: [],
};
export default config;
