/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#F5F3FF',
        surface: '#FFFFFF',
        'surface-muted': '#EDE9FE',
        ink: {
          DEFAULT: '#1E1B4B',
          hover: '#312E81',
        },
        muted: '#5B5675',
        border: '#DDD6FE',
        'border-strong': '#C4B5FD',
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          fg: '#FFFFFF',
        },
        secondary: '#818CF8',
        cta: '#10B981',
        'deep-indigo': '#312E81',
        'deep-purple': '#4C1D95',
      },
      boxShadow: {
        card: '0 1px 0 rgba(30, 27, 75, 0.04), 0 14px 40px rgba(79, 70, 229, 0.08)',
        lift: '0 18px 50px rgba(79, 70, 229, 0.14)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.35rem',
      },
    },
  },
  plugins: [],
}
