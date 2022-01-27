module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2021,
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
    mapboxgl: 'readonly',
    defineProps: 'readonly',
    defineEmits: 'readonly',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],

    'prettier/prettier': 1,

    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',

    'require-await': 'warn',

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
  },
};
