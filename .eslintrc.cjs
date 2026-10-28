// Team standard (documents/standards/coding-standards.md): Airbnb style, enforced by ESLint,
// formatting owned by Prettier.
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['airbnb', 'airbnb/hooks', 'plugin:react/jsx-runtime', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: '19.0' },
    'import/resolver': { node: { extensions: ['.js', '.jsx'] } },
  },
  rules: {
    'react/prop-types': 'off', // plain JS project; shapes are documented with JSDoc
    'react/require-default-props': 'off',
    'react/jsx-props-no-spreading': 'off',
    'import/prefer-default-export': 'off',
    'import/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never' }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 3 }],
  },
  overrides: [
    {
      files: ['src/**/*.test.{js,jsx}', 'src/tests/**/*.{js,jsx}'],
      env: { node: true },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      rules: { 'import/no-extraneous-dependencies': ['error', { devDependencies: true }] },
    },
    {
      files: ['e2e/**/*.js', 'playwright.config.js'],
      env: { node: true },
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
        'no-await-in-loop': 'off', // e2e steps are sequential by design
        'no-restricted-syntax': 'off',
      },
    },
    {
      files: ['vite.config.js'],
      rules: { 'import/no-extraneous-dependencies': ['error', { devDependencies: true }] },
    },
  ],
};
