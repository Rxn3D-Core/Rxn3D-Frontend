


/*
  Combined Tailwind config from both sources.
  - Merges all color, content, and theme customizations.
  - Adds chart and sidebar color groups.
  - Keeps both blue/gray palettes and new color groups.
*/

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{ts,tsx}",
    "./*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist common classes to ensure they're always included
  // Using pattern matching to catch all variants
  safelist: [
    {
      pattern: /^(flex|grid|block|inline|hidden|visible)/,
    },
    {
      pattern: /^(items|justify|content|self|place)-(start|center|end|between|around|evenly|stretch)/,
    },
    {
      pattern: /^(w|h|min-w|min-h|max-w|max-h)-(full|screen|auto|\d+)/,
    },
    {
      pattern: /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-(\d+)/,
    },
    {
      pattern: /^(bg|text|border)-(background|foreground|primary|secondary|muted|accent|destructive|border|input|ring)/,
    },
    {
      pattern: /^(rounded|border|shadow)/,
    },
    'flex', 'items-center', 'justify-center', 'w-full', 'h-full',
    'min-h-screen', 'bg-background', 'text-foreground',
    'p-4', 'p-6', 'p-8', 'm-4', 'm-6', 'm-8',
    'rounded-lg', 'border', 'shadow',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
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
        blue: {
          50: "#f7fbff",
          100: "#dfeefb",
          200: "#d9e5f0",
          500: "#1162a8",
          600: "#1162a8",
          700: "#0f5497",
        },
        gray: {
          50: "#f9f9f9",
          100: "#f7fbff",
          200: "#e4e6ef",
          400: "#948d8d",
          500: "#b4b0b0",
          600: "#948d8d",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
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
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px',
        '4xl': '1920px',
        '5xl': '2560px',
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};