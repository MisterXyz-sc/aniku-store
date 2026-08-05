/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#140F20', // page background — deep aubergine-black, matches icon backdrop
          raised: '#1E1730', // card surface
          field: '#271E3D', // inputs, one step lighter than cards
          line: '#322847' // hairline borders
        },
        paper: {
          DEFAULT: '#F6F1FA', // primary text — warm white, faint violet tint
          muted: '#A398BE' // secondary text
        },
        brand: {
          DEFAULT: '#FF3E76',
          dark: '#D91F58',
          light: '#FF6FA0'
        },
        gold: {
          DEFAULT: '#FFB238',
          dark: '#DC8A16'
        },
        diamond: {
          DEFAULT: '#33D8F2',
          dark: '#14A9C4'
        },
        good: '#34D399',
        bad: '#FF5470'
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace']
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 30px -14px rgba(0,0,0,0.6)'
      },
      keyframes: {
        sheen: {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)' }
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        sheen: 'sheen 1.1s ease-out forwards',
        'rise-in': 'rise-in 0.4s ease-out both'
      }
    }
  },
  plugins: []
};
