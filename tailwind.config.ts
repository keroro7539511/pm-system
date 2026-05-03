import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0E1A",
        "card-bg": "rgba(255,255,255,0.04)",
        border: "rgba(255,255,255,0.08)",
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#ffffff",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        purple: "#8B5CF6",
        "text-primary": "#FFFFFF",
        "text-secondary": "rgba(255,255,255,0.6)",
        "text-muted": "rgba(255,255,255,0.4)",
        sidebar: {
          DEFAULT: "rgba(255,255,255,0.02)",
          border: "rgba(255,255,255,0.06)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-delay-1": "fade-in 0.3s ease-out 0.1s both",
        "fade-in-delay-2": "fade-in 0.3s ease-out 0.2s both",
        "fade-in-delay-3": "fade-in 0.3s ease-out 0.3s both",
        "fade-in-delay-4": "fade-in 0.3s ease-out 0.4s both",
      },
    },
  },
  plugins: [animate],
};

export default config;
