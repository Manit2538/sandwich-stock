import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#c2410c', dark: '#9a3412', light: '#fed7aa' },
        ok: '#16a34a', warn: '#ca8a04', danger: '#dc2626',
      },
      fontFamily: { sans: ['"Noto Sans Thai"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;