/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'media', // 关键：手动控制暗黑模式
  content: [
    './entrypoints/**/*.{vue,ts,html}',
    './components/**/*.{vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};