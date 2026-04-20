import type { Config } from "tailwindcss";

/** Tailwind CSS configuration ΓÇô extends the default theme with design tokens */
const config: Config = {
  /** Dark mode is toggled via a data attribute set on <html> */
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /** Brand colour palette derived from #F07F13 */
      colors: {
        brand: {
          DEFAULT: "#F07F13",
          50: "#FEF3E2",
          100: "#FDE7C5",
          200: "#FBCF8B",
          300: "#F9B751",
          400: "#F79F27",
          500: "#F07F13",
          600: "#C8680A",
          700: "#A05208",
          800: "#783D06",
          900: "#502804",
        },
      },
      /** System font stack ΓÇô no external fonts for optimal performance */
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      /** Border radii mapped to CSS custom property tokens */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      animation: {
        "slide-up": "slideUp 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
