/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          bg:      '#313338',
          sidebar: '#2b2d31',
          servers: '#1e1f22',
          input:   '#383a40',
          hover:   '#35373c',
          accent:  '#5865f2',
          text:    '#dbdee1',
          muted:   '#949ba4',
        },
      },
    },
  },
  plugins: [],
};
