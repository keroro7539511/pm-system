import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Theme-aware (driven by CSS variables) ──────────────────────────
        background:     "var(--color-background)",
        "card-bg":      "var(--color-card-bg)",
        border:         "var(--color-border)",
        "text-primary":   "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted":     "var(--color-text-muted)",
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          border:  "var(--color-sidebar-border)",
        },
        // Neutral layering (replaces bg-white/N hard-coded opacity)
        "layer-1": "var(--color-layer-1)",   // ~2-3%  very subtle bg
        "layer-2": "var(--color-layer-2)",   // ~5%    hover bg
        "layer-3": "var(--color-layer-3)",   // ~8-10% active / selected
        "layer-4": "var(--color-layer-4)",   // ~14%   switch unchecked
        // Surface tokens
        dropdown:    "var(--color-dropdown)",
        "dialog-bg": "var(--color-dialog-bg)",
        input:       "var(--color-input)",

        // ── Static (same in both themes) ───────────────────────────────────
        primary: {
          DEFAULT:    "#3B82F6",
          foreground: "#ffffff",
        },
        success:  "#10B981",
        warning:  "#F59E0B",
        danger:   "#EF4444",
        purple:   "#8B5CF6",
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
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
      animation: {
        "accordion-down":    "accordion-down 0.2s ease-out",
        "accordion-up":      "accordion-up 0.2s ease-out",
        "fade-in":           "fade-in 0.3s ease-out",
        "fade-in-delay-1":   "fade-in 0.3s ease-out 0.1s both",
        "fade-in-delay-2":   "fade-in 0.3s ease-out 0.2s both",
        "fade-in-delay-3":   "fade-in 0.3s ease-out 0.3s both",
        "fade-in-delay-4":   "fade-in 0.3s ease-out 0.4s both",
      },
    },
  },
  plugins: [animate],
};

export default config;
