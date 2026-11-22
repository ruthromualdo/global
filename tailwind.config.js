/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TOKENS OFICIAIS — AJUSTE DE LUMINOSIDADE (DARK PREMIUM TECH)
        tech: {
          bg: '#071812',          // Fundo principal (manter)
          card: '#10271D',        // Cards e painéis (manter)
          cardHover: '#163527',   // Hover sutil de cards
          medium: '#397B55',      // Verde médio (manter)
          white: '#FFFFFF',       // Texto principal: Branco puro
          secondaryText: '#D0DED4', // Texto secundário: Cinza claro esverdeado
          highlight: '#DDF8E4',   // Destaques textuais: Verde menta claro
          mint: '#C8FFD2',        // Botões principais: Verde menta luminoso
          bright: '#E8FFF0',      // Botões de maior destaque: Verde menta ultraclaro
          btnText: '#071812',     // Texto dos botões: Escuro de alto contraste
        },
        // Compatibilidade semântica com o ecossistema existente
        tutu: {
          dark: '#071812',        // Fundo principal (#071812)
          secondary: '#10271D',   // Cards e containers (#10271D)
          blue: '#397B55',        // Verde médio (#397B55)
          lime: '#C8FFD2',        // Verde menta luminoso (#C8FFD2)
          bright: '#E8FFF0',      // Verde menta ultraclaro (#E8FFF0)
          light: '#FFFFFF',       // Texto principal branco puro (#FFFFFF)
          muted: '#D0DED4',       // Texto secundário cinza claro (#D0DED4)
          highlight: '#DDF8E4',   // Destaques textuais (#DDF8E4)
        }
      },
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'highlight-36': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      }
    },
  },
  plugins: [],
};
