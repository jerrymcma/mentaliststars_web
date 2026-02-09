/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        midnight: '#0a0a0f',
        'deep-purple': '#1a1025',
        'mystic-purple': '#2d1b4e',
        gold: {
          DEFAULT: '#d4a853',
          light: '#e8c87a',
          dark: '#b8923f',
        },
        silver: '#c0c0c8',
        ghost: '#8888a0',
      },
    },
  },
  plugins: [],
}
