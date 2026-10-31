/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...require('@takt/design-tokens').colors,
      },
      spacing: {
        ...require('@takt/design-tokens').spacing,
      },
      borderRadius: {
        ...require('@takt/design-tokens').radius,
      },
    },
  },
  plugins: [],
};