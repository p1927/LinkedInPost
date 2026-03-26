/**
 * Color system aligned to ui-ux-pro-max/data/colors.csv for this product:
 * - Primary palette: "Micro SaaS" (row 2) — indigo brand + lavender canvas + emerald CTA.
 * - AI surfaces: "AI/Chatbot Platform" (row 19) — cyan accent for model-assisted flows.
 * - Content pattern from design-system search: Newsletter / Content First + vibrant blocks.
 */
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
        /* Micro SaaS — exact CSV hex where specified */
        canvas: '#F5F3FF',
        surface: '#FFFFFF',
        'surface-muted': '#EEF2FF',
        ink: {
          DEFAULT: '#1E1B4B',
          hover: '#312E81',
        },
        /* UX guideline: muted body ≥ slate-600 contrast on light UI */
        muted: '#475569',
        border: '#E0E7FF',
        'border-strong': '#C7D2FE',
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          fg: '#FFFFFF',
        },
        secondary: '#818CF8',
        cta: '#10B981',
        success: {
          DEFAULT: '#10B981',
          fg: '#FFFFFF',
          surface: '#ECFDF5',
          border: '#A7F3D0',
          ink: '#065F46',
        },
        /* AI / Chatbot Platform — cyan interactions (avoid Tailwind `accent-*` reserved for accent-color) */
        ai: {
          DEFAULT: '#06B6D4',
          hover: '#0891B2',
          fg: '#FFFFFF',
          surface: '#ECFEFF',
          border: '#A5F3FC',
          ink: '#155E75',
        },
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
