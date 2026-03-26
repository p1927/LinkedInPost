/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#F2EFE9',
        surface: '#FFFCF8',
        'surface-muted': '#F7F3ED',
        ink: {
          DEFAULT: '#1C1917',
          hover: '#292524',
        },
        muted: '#57534E',
        border: '#E7E2DA',
        'border-strong': '#D4CEC3',
        primary: {
          DEFAULT: '#B45309',
          hover: '#9A3412',
          fg: '#FFFCF8',
        },
        secondary: '#78716C',
        cta: '#B45309',
        'deep-indigo': '#1C1917',
        'deep-purple': '#1C1917',
      },
      boxShadow: {
        card: '0 1px 0 rgba(28, 25, 23, 0.04), 0 14px 40px rgba(28, 25, 23, 0.07)',
        lift: '0 18px 50px rgba(28, 25, 23, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.35rem',
      },
    },
  },
  plugins: [],
}
