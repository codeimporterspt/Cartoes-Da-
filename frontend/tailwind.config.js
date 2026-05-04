/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          light: 'var(--brand-light)',
        },
        // kept for reference — no longer used in source
        hyundai: {
          blue: '#002C5F',
          'blue-light': '#00AAD2',
          silver: '#B4B4B4',
          dark: '#1A1A1A',
        },
      },
    },
  },
  plugins: [],
};
