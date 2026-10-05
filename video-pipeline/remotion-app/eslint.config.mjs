// ESLint flat config for remotion-app
// Enables @remotion/eslint-plugin recommended rules via flat config API.
// ESLint 8.x: run with ESLINT_USE_FLAT_CONFIG=true (set in npm lint script).

import tsParser from '@typescript-eslint/parser';
import remotionPlugin from '@remotion/eslint-plugin';

export default [
  {
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: remotionPlugin.flatPlugin.plugins,
    rules: remotionPlugin.flatPlugin.rules,
  },
];
