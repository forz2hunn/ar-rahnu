/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./ar_rahnu_dashboard.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}

