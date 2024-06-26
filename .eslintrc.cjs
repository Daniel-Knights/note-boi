// @ts-check

/** @type {import("eslint").ESLint.ConfigData} */
const config = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'plugin:vue/strongly-recommended',
    'eslint:recommended',
    '@vue/typescript/recommended',
    'prettier',
    'airbnb-base',
  ],
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    CustomEventInit: 'readonly',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: ['**/node_modules/**', '**/dist/**', 'src-tauri'],
  rules: {
    'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],

    'prettier/prettier': 1,

    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-shadow': 'off',

    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',

    'vue/multi-word-component-names': 'off',

    'require-await': 'warn',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['scripts/**', 'src/__tests__/**', 'vite.config.ts'] },
    ],

    // Airbnb overrides
    'comma-dangle': 'off',
    'no-useless-escape': 'off',
    'object-curly-newline': 'off',
    'vue/no-multiple-template-root': 'off',
    'consistent-return': 'off',
    camelcase: 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'operator-linebreak': 'off',
    'lines-between-class-members': 'off',
    'no-use-before-define': ['error', { functions: false }],
    'arrow-body-style': 'off',
    'no-param-reassign': ['error', { props: false }],
    'max-classes-per-file': 'off',
    'default-case': 'off',
  },
};

module.exports = config;
