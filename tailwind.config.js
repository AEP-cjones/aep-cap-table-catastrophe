/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aep-navy': '#1a1f2e',
        'aep-dark': '#0f1420',
        'aep-red': '#AC2228',
        'aep-card': '#2d3748',
      },
      fontSize: {
        '9xl': ['8rem', { lineHeight: '1' }],
        '10xl': ['10rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}
