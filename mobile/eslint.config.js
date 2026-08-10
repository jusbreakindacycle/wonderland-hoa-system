// Flat ESLint config for the Expo application, run by `npm run lint`
// (`expo lint`). The root web bridge keeps its own separate config and ignores
// `mobile/**` — the two clients are linted independently (Guide §14.2).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'dist-ci/**', '.expo/**', 'coverage/**', 'node_modules/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]);
