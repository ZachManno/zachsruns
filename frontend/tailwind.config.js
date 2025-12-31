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
        'basketball-black': '#1A1A1A',
        'wood-light': '#D4A574',
        'wood-medium': '#8B6F47',
        'wood-dark': '#5C4A37',
      },
    },
  },
  plugins: [],
}

