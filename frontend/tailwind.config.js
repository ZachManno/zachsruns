const plugin = require('tailwindcss/plugin');
const defaultColors = require('tailwindcss/colors');

// The 200/300/400 steps of the status palettes are only ever used for text, which needs a
// darker step on a light background. Spread keeps the rest of each ramp (notably 500, used
// for fills and borders) at its literal value.
const statusTextShades = (family) => ({
  ...defaultColors[family],
  200: `rgb(var(--${family}-200) / <alpha-value>)`,
  300: `rgb(var(--${family}-300) / <alpha-value>)`,
  400: `rgb(var(--${family}-400) / <alpha-value>)`,
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'basketball-orange': '#FF6B35',
        'basketball-black': '#0B0B0E',
        'wood-light': '#D4A574',
        'wood-medium': '#8B6F47',
        'wood-dark': '#5C4A37',
        // Surface elevation ramp. These are semantic, not literal: 950 is always the page
        // background and 500 the most prominent edge, so the ramp inverts in light mode.
        // Values live in globals.css as `--court-*` channel triplets.
        court: {
          500: 'rgb(var(--court-500) / <alpha-value>)',
          600: 'rgb(var(--court-600) / <alpha-value>)',
          700: 'rgb(var(--court-700) / <alpha-value>)',
          750: 'rgb(var(--court-750) / <alpha-value>)',
          800: 'rgb(var(--court-800) / <alpha-value>)',
          850: 'rgb(var(--court-850) / <alpha-value>)',
          900: 'rgb(var(--court-900) / <alpha-value>)',
          950: 'rgb(var(--court-950) / <alpha-value>)',
        },
        // Body text ramp, 100 strongest to 600 faintest. Also inverts in light mode.
        zinc: {
          ...defaultColors.zinc,
          100: 'rgb(var(--zinc-100) / <alpha-value>)',
          200: 'rgb(var(--zinc-200) / <alpha-value>)',
          300: 'rgb(var(--zinc-300) / <alpha-value>)',
          400: 'rgb(var(--zinc-400) / <alpha-value>)',
          500: 'rgb(var(--zinc-500) / <alpha-value>)',
          600: 'rgb(var(--zinc-600) / <alpha-value>)',
        },
        // Headings and emphasised text. White on dark, near-black on light.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        // Primary basketball orange ramp. 400 is the accent text shade and darkens on light.
        ember: {
          50: '#FFF4EE',
          100: '#FFE4D5',
          200: '#FFC9AC',
          300: '#FFAA82',
          400: 'rgb(var(--ember-400) / <alpha-value>)',
          500: '#FF6B35',
          600: '#F0531A',
          700: '#C53F10',
          800: '#8F2D0B',
          900: '#5C1D07',
        },
        emerald: statusTextShades('emerald'),
        amber: statusTextShades('amber'),
        red: statusTextShades('red'),
        sky: statusTextShades('sky'),
        flame: '#FF3B2F',
        hardwood: '#C98A4B',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'var(--font-inter)', 'ui-sans-serif', 'sans-serif'],
      },
      backgroundImage: {
        'ember-gradient': 'linear-gradient(135deg, #FF8C57 0%, #FF6B35 48%, #F0531A 100%)',
        'ember-sheen': 'linear-gradient(135deg, rgba(255,140,87,0.18) 0%, rgba(255,107,53,0.06) 55%, rgba(255,107,53,0) 100%)',
        'court-fade': 'linear-gradient(180deg, rgb(var(--court-900)) 0%, rgb(var(--court-950)) 100%)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        glow: '0 10px 32px -10px rgba(255,107,53,0.5)',
        'glow-sm': '0 6px 18px -8px rgba(255,107,53,0.55)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'rise-in': 'rise-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-glow': 'pulse-glow 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // `light:` targets the opt-in light theme, for the few colors the token ramps can't cover
    // (accent and status shades that need a darker step on a light background).
    plugin(function ({ addVariant }) {
      addVariant('light', 'html.light &');
    }),
  ],
}
