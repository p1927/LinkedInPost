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
        primary: '#6366F1',
        secondary: '#818CF8',
        cta: '#10B981',
        'deep-indigo': '#1E1B4B',
      }
    },
  },
  plugins: [],
}

