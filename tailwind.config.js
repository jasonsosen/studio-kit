/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f3',
          100: '#fce7e4',
          200: '#fad3ce',
          300: '#f5b4ab',
          400: '#ed8a7b',
          500: '#e16652',
          600: '#cd4a36',
          700: '#ac3c2a',
          800: '#8e3526',
          900: '#773225',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
