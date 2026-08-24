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
        // Dubai Intelligent Luxury brand palette — use these instead of
        // ad-hoc neutral-950/rgba(...) literals for HUD chrome and modal
        // surfaces, so every material tier in the app shares one source of
        // truth. `gold` is restricted by convention to Investor/Founding
        // badges and CTAs only — never generic cards or gradients.
        asphalt: "#050709", // Obsidian Black — background + modal scrim tint
        intelTeal: "#00F5D4", // Intelligent Teal — AI/logistics data-stream accent
        gold: "#D4AF37", // Champagne Gold — Investor/Founding-badge accent ONLY
        darkGlass: "#0F172A", // Legacy translucent glass base — superseded by the .tier-* material classes in globals.css
        // The stock `cyan-*` scale is retuned to ramp around Intelligent
        // Teal (#00F5D4) so every existing `text-cyan-300`,
        // `border-cyan-400/60`, etc. across the app picks up the new brand
        // accent without a per-component find/replace.
        cyan: {
          200: "#7FFCE8",
          300: "#4DF9DE",
          400: "#00F5D4",
          500: "#00D9BB",
          950: "#032A24",
        },
      },
    },
  },
  plugins: [],
};
export default config;
