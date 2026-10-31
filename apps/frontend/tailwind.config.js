/** @type {import('tailwindcss').Config} */
import { colors, spacing, radius } from '@takt/design-tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors,
      spacing,
      borderRadius: radius,
    },
  },
  plugins: [],
};