/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        aniku: {
          bg: '#0A0A0F',
          card: '#15151C',
          border: '#26262F',
          red: '#E63946',
          gold: '#FFB800'
        }
      }
    }
  },
  plugins: []
};
