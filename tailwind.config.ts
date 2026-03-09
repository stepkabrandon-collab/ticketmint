import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:     "#FFFFFF",
        "background-2": "#F8F9FA",
        "background-3": "#F1F5F9",
        foreground:     "#0F172A",
        "foreground-2": "#334155",
        muted:          "#64748B",
        primary:        "#E8315A",
        "primary-dark": "#C41E45",
        "primary-light":"#FFF0F3",
        border:         "#E2E8F0",
        "border-2":     "#CBD5E1",
        surface:        "#FFFFFF",
        "surface-2":    "#F8F9FA",
        success:        "#059669",
        "success-light":"#ECFDF5",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        xs:   "0 1px 2px rgba(15,23,42,0.05)",
        sm:   "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        md:   "0 4px 6px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)",
        lg:   "0 10px 25px rgba(15,23,42,0.08), 0 4px 8px rgba(15,23,42,0.04)",
        xl:   "0 20px 40px rgba(15,23,42,0.10), 0 8px 16px rgba(15,23,42,0.04)",
        card: "0 2px 8px rgba(15,23,42,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease forwards",
        shimmer:   "shimmer 1.5s infinite",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
