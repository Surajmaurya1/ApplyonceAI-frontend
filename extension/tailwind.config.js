/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0b",
        foreground: "#f4f4f5",
        card: "#111113",
        "card-foreground": "#f4f4f5",
        primary: {
          DEFAULT: "#e11d2a",
          dark: "#7a0009",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#1a1a1e",
          foreground: "#f4f4f5",
        },
        muted: {
          DEFAULT: "#1e1e22",
          foreground: "#71717a",
        },
        accent: {
          DEFAULT: "rgba(225,29,42,0.12)",
          foreground: "#ff4d5a",
        },
        border: "rgba(255,255,255,0.07)",
        input: "rgba(255,255,255,0.08)",
        ring: "rgba(225,29,42,0.5)",
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#f5f5f5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(225,29,42,0.35), 0 10px 40px -10px rgba(225,29,42,0.55)",
        elevated:
          "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -6px rgba(0,0,0,0.6)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 0 rgba(225, 29, 42, 0.55), 0 0 40px rgba(225, 29, 42, 0.35)",
          },
          "50%": {
            boxShadow:
              "0 0 0 8px rgba(225, 29, 42, 0), 0 0 60px rgba(225, 29, 42, 0.55)",
          },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
