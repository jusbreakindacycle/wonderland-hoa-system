import js from '@eslint/js'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  js.configs.recommended,

  // Application and test sources.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // TypeScript owns identifier resolution; core no-undef double-reports on types.
      'no-undef': 'off',
      ...tsPlugin.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Legacy prototype files kept only as reference under the Phase 3 decision
  // (Option C: controlled foundation rebuild). Phase 3 approved these surfaces
  // for replacement rather than in-place hardening, so the rules they violate
  // are disabled for these exact files and nothing else.
  //
  // This is an explicit file list, not a directory glob, so any newly added
  // file is linted in full. Delete each entry as its page is replaced; the
  // list is expected to shrink to nothing over Phase 4.
  {
    files: [
      'src/components/auth/LoginPage.tsx',
      'src/pages/announcements/AnnouncementsPage.tsx',
      'src/pages/complaints/ComplaintsPage.tsx',
      'src/pages/dashboard/DashboardPage.tsx',
      'src/pages/dues/DuesPage.tsx',
      'src/pages/units/UnitsPage.tsx',
    ],
    rules: {
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },

  // Build and tooling configuration that runs outside the browser.
  {
    files: ['*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: globals.node,
    },
    rules: {
      'no-undef': 'off',
    },
  },
]
