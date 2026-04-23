/**
 * Theme: Glassmorphism (ui-ux-pro-max/data/styles.csv) + purple/violet accent.
 * - Frosted panels: bg-white/80+, backdrop-blur, subtle white borders (skill checklist).
 * - Canvas: vibrant violet mesh behind glass (styles.csv: layered depth + vibrant background).
 * - CTA: emerald kept for success/publish; primary actions use violet.
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
        heading: ['Plus Jakarta Sans', 'Poppins', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', '"Open Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Micro SaaS — exact CSV hex where specified */
        canvas: '#FAF5FF',
        surface: '#FFFFFF',
        'surface-muted': '#F3E8FF',
        ink: {
          DEFAULT: '#1E1B4B',
          hover: '#312E81',
        },
        /* UX guideline: muted body ≥ slate-600 contrast on light UI */
        muted: '#475569',
        border: '#E9D5FF',
        'border-strong': '#DDD6FE',
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          fg: '#FFFFFF',
        },
        secondary: '#A78BFA',
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
        card: '0 1px 0 rgba(255, 255, 255, 0.65) inset, 0 14px 48px rgba(109, 40, 217, 0.1)',
        lift: '0 20px 56px rgba(91, 33, 182, 0.16), 0 1px 0 rgba(255, 255, 255, 0.5) inset',
        glass: '0 8px 32px rgba(91, 33, 182, 0.11), 0 2px 12px rgba(124, 58, 237, 0.07)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.35rem',
      },
    },
  },
  plugins: [],
}
