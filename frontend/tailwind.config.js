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
        // Dark court surfaces, lightest to darkest surface elevation
        court: {
          500: '#45454F',
          600: '#31313B',
          700: '#26262F',
          750: '#1E1E25',
          800: '#17171D',
          850: '#121217',
          900: '#0D0D11',
          950: '#08080A',
        },
        // Primary basketball orange ramp
        ember: {
          50: '#FFF4EE',
          100: '#FFE4D5',
          200: '#FFC9AC',
          300: '#FFAA82',
          400: '#FF8C57',
          500: '#FF6B35',
          600: '#F0531A',
          700: '#C53F10',
          800: '#8F2D0B',
          900: '#5C1D07',
        },
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
        'court-fade': 'linear-gradient(180deg, #0D0D11 0%, #08080A 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.5), 0 10px 30px -14px rgba(0,0,0,0.8)',
        'card-hover': '0 2px 6px rgba(0,0,0,0.55), 0 20px 48px -20px rgba(0,0,0,0.95)',
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
  plugins: [],
}
