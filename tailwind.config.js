/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tutu: {
          dark: '#05001A',      // Azul Tutu - Fundos principais, menus e textos de destaque
          blue: '#3D5AFF',      // Azul Taxa Zero - Botões, links, ações e elementos interativos
          lime: '#D0FF00',      // Verdinho do Tutu - Pontuação, conquistas, indicadores e destaques
          secondary: '#3248C7', // Azul Zero Dívidas - Cards, elementos secundários e variações de fundo
          light: '#FFFAF5',     // Branco Paz de Espírito - Fundos claros, textos e áreas de conteúdo
        }
      },
      fontFamily: {
        display: ['"Bogart"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'highlight-36': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }], // ~36pt (48px)
      }
    },
  },
  plugins: [],
};
