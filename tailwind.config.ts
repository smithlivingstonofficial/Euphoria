import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC", // Slate 50
        surface: "#FFFFFF", // Pure White
        "surface-raised": "#F1F5F9", // Slate 100
        "surface-border": "#E2E8F0", // Slate 200
        "surface-border-strong": "#CBD5E1", // Slate 300
        primary: {
          DEFAULT: "#4F46E5", // Indigo 600
          hover: "#4338CA", // Indigo 700
          light: "#EEF2FF", // Indigo 50
          border: "#C7D2FE", // Indigo 200
        },
        secondary: {
          DEFAULT: "#0284C7", // Sky 600
          hover: "#0369A1",
          light: "#F0F9FF",
        },
        accent: {
          DEFAULT: "#E11D48", // Rose 600
          hover: "#BE123C",
          light: "#FFF1F2",
        },
        success: {
          DEFAULT: "#059669", // Emerald 600
          hover: "#047857",
          light: "#ECFDF5",
        },
        warning: {
          DEFAULT: "#D97706", // Amber 600
          light: "#FFFBEB",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          '"JetBrains Mono"',
          '"Fira Code"',
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        "radial-glow": "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
        "mesh-gradient": "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 50%, rgba(244, 63, 94, 0.05) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
