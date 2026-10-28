import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: 'rgb(var(--fondo) / <alpha-value>)',
        tarjeta: 'rgb(var(--tarjeta) / <alpha-value>)',
        borde: 'rgb(var(--borde) / <alpha-value>)',
        texto: 'rgb(var(--texto) / <alpha-value>)',
        suave: 'rgb(var(--suave) / <alpha-value>)',
        marca: {
          50: 'rgb(var(--marca-50) / <alpha-value>)',
          100: 'rgb(var(--marca-100) / <alpha-value>)',
          500: 'rgb(var(--marca-500) / <alpha-value>)',
          600: 'rgb(var(--marca-600) / <alpha-value>)',
          700: 'rgb(var(--marca-700) / <alpha-value>)',
        },
        exito: 'rgb(var(--exito) / <alpha-value>)',
        alerta: 'rgb(var(--alerta) / <alpha-value>)',
        peligro: 'rgb(var(--peligro) / <alpha-value>)',
      },
      fontFamily: { sans: ['var(--fuente)', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: { suave: '0 1px 2px rgb(16 24 40 / 0.04), 0 4px 16px rgb(16 24 40 / 0.04)' },
      backgroundImage: { destacado: 'linear-gradient(135deg, #2dd4e8 0%, #8b7cff 55%, #e15bd8 100%)' },
      keyframes: {
        entrar: { '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: { entrar: 'entrar 0.45s cubic-bezier(.2,.8,.2,1) both' },
    },
  },
  plugins: [],
} satisfies Config;
