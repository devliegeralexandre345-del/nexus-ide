/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        lorica: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          panel: 'var(--color-panel)',
          border: 'var(--color-border)',
          accent: 'var(--color-accent)',
          accentDim: 'var(--color-accentDim)',
          danger: 'var(--color-danger)',
          warning: 'var(--color-warning)',
          success: 'var(--color-success)',
          text: 'var(--color-text)',
          textDim: 'var(--color-textDim)',
          spotify: '#1db954',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};