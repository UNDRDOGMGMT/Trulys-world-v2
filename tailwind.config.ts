import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Palette tokens
        pink: {
          DEFAULT: "hsl(var(--pink))",
          vivid: "hsl(var(--pink-vivid))",
          deep: "hsl(var(--pink-deep))",
          light: "hsl(var(--pink-light))",
          glow: "hsl(var(--pink-glow))",
        },
        chrome: {
          light: "hsl(var(--chrome-light))",
          mid: "hsl(var(--chrome-mid))",
          dark: "hsl(var(--chrome-dark))",
        },
        "dark-surface": "hsl(var(--dark-surface))",
        cream: "hsl(var(--cream))",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        whimsy: ["var(--font-whimsy)"],
        sans: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
