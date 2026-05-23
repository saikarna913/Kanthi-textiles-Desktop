/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in-up': 'fadeInUp .35s ease forwards',
        'fade-in': 'fadeIn .25s ease forwards',
        'shimmer': 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
