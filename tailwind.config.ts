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
          '"Plus Jakarta Sans"',
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          '"Outfit"',
          '"Plus Jakarta Sans"',
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
        "cyber-grid": "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 3s infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "glow": "glow 3s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%": { opacity: "0.4", filter: "blur(20px)" },
          "100%": { opacity: "0.8", filter: "blur(30px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
