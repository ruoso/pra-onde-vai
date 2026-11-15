import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';

export default [
  {
    ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'vendor/**', 'lib/**', 'mockups/**',
      'tests/**', 'test-results/**', 'playwright-report/**', 'src/data/generated/**'],
  },
  js.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    plugins: { react },
    rules: {
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**', '*.config.js', 'scripts/**', 'e2e/**', 'research/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
