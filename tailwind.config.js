/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paroty: {
          50: '#fbf7f0',
          100: '#f4ead9',
          200: '#e6d0ae',
          300: '#d6b17d',
          400: '#c8934f',
          500: '#b97a35',
          600: '#96602a',
          700: '#744825',
          800: '#4a2f1c',
          900: '#2e1d13',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
