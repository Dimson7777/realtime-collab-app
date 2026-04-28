import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      // Refined typographic scale — consistent rhythm, comfortable reading
      fontSize: {
        // [size, { lineHeight, letterSpacing }]
        xs:   ["0.75rem",  { lineHeight: "1rem",     letterSpacing: "0.01em" }],
        sm:   ["0.875rem", { lineHeight: "1.375rem", letterSpacing: "0" }],
        base: ["1rem",     { lineHeight: "1.625rem", letterSpacing: "-0.005em" }],
        lg:   ["1.125rem", { lineHeight: "1.75rem",  letterSpacing: "-0.01em" }],
        xl:   ["1.25rem",  { lineHeight: "1.875rem", letterSpacing: "-0.015em" }],
        "2xl":["1.5rem",   { lineHeight: "2rem",     letterSpacing: "-0.02em" }],
        "3xl":["1.875rem", { lineHeight: "2.375rem", letterSpacing: "-0.022em" }],
        "4xl":["2.5rem",   { lineHeight: "1.1",      letterSpacing: "-0.025em" }],
        "5xl":["3.25rem",  { lineHeight: "1.05",     letterSpacing: "-0.03em" }],
        "6xl":["4rem",     { lineHeight: "1.02",     letterSpacing: "-0.035em" }],
        "7xl":["4.75rem",  { lineHeight: "1",        letterSpacing: "-0.04em" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.015em",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        aurora: {
          DEFAULT: "hsl(var(--aurora))",
          foreground: "hsl(var(--aurora-foreground))",
        },
        iris: { DEFAULT: "hsl(var(--iris))" },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: { DEFAULT: "hsl(var(--success))" },
        warning: { DEFAULT: "hsl(var(--warning))" },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
