/** @type {import('tailwindcss').Config} */
export default {
  content:content: ["./index.html", "./*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "sans-serif"],
        display: ["Oswald", "sans-serif"],
      },
    },
  },
  plugins: [],
};
