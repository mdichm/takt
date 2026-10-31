import js from '@eslint/js';
import globals from 'globals';
import parser from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';

export default [
  // Global ignores — doivent être dans un objet de config dédié
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': plugin,
    },
    rules: {
      // TypeScript gère lui-même les variables non définies (tsc) :
      // `no-undef` produit des faux positifs sur les types et le JSX.
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];