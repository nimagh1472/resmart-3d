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
        asphalt: "#0B0F12", // Deep Obsidian Slate — background + modal scrim tint
        neonCyan: "#00E5FF", // Electric Cyan
        gold: "#D4AF37", // Brushed Gold — secondary accent
        darkGlass: "#0F172A", // Translucent Dark Cyber-Glass base — use with /85 opacity, e.g. bg-darkGlass/85
      },
    },
  },
  plugins: [],
};
export default config;
