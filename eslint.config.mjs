export default [
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-imports': 'error',
      'no-constant-binary-expression': 'error',
    },
  },
];
