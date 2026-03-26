/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        sans: ['Open Sans', 'sans-serif'],
      },
      colors: {
        primary: '#9333EA',
        secondary: '#A855F7',
        cta: '#10B981',
        'deep-purple': '#3B0764',
      }
    },
  },
  plugins: [],
}

