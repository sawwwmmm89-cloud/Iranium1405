import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1200px' } },
    extend: {
      colors: {
        primary: { DEFAULT: '#155EEF', deep: '#0B3FA8', soft: '#EFF6FF' },
        accent: { DEFAULT: '#FF7A00', soft: '#FFF4E8' },
        ink: '#111111',
      },
      fontFamily: { sans: ['"Vazirmatn Variable"', 'Vazirmatn', 'Tahoma', 'sans-serif'] },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '20px' },
      boxShadow: { soft: '0 1px 2px rgba(17,17,17,.04), 0 8px 24px rgba(17,17,17,.06)' },
    },
  },
  plugins: [],
};
export default config;
