const js = require(’@eslint/js’);
const globals = require(‘globals’);

module.exports = [
// –––––––––––––––––––––––––
// 1. Global ignores
// –––––––––––––––––––––––––
{
ignores: [
‘/node_modules/’,
‘/coverage/’,
‘/dist/’,
‘/build/’,
‘/storage/’,
‘/uploads/’,
‘/public/vendor/’,
‘/*.min.js’,
’/vendor/**’,
],
},

// –––––––––––––––––––––––––
// 2. Default JavaScript rules
// –––––––––––––––––––––––––
{
files: [’**/*.js’],

languageOptions: {
  ecmaVersion: 'latest',
  sourceType: 'commonjs',
  globals: {
    ...globals.node,
  },
},
rules: {
  ...js.configs.recommended.rules,
  'no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'no-undef': 'error',
  'no-console': 'off',
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-duplicate-imports': 'error',
  'no-unreachable': 'error',
  'no-debugger': 'warn',
  'no-alert': 'warn',
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-prototype-builtins': 'error',
  'no-unsafe-finally': 'error',
  'valid-typeof': 'error',
},

},

// –––––––––––––––––––––––––
// 3. Browser-side JavaScript
// –––––––––––––––––––––––––
{
files: [
‘assets/js//*.js’,
’public//.js’,
’pages/**/.js’,
‘education//*.js’,
’career//.js’,
’account/**/.js’,
],

languageOptions: {
  sourceType: 'script',
  globals: {
    ...globals.browser,
  },
},

},

// –––––––––––––––––––––––––
// 4. Node.js backend and server-side scripts
// –––––––––––––––––––––––––
{
files: [
‘server.js’,
‘server//*.js’,
’src//.js’,
’scripts/**/.js’,
‘config//*.js’,
’controllers//.js’,
’models/**/.js’,
‘routes//*.js’,
’services//.js’,
’middleware/**/.js’,
‘workers//*.js’,
’jobs//*.js’,
],

languageOptions: {
  sourceType: 'commonjs',
  globals: {
    ...globals.node,
  },
},

},

// –––––––––––––––––––––––––
// 5. Jest tests
// –––––––––––––––––––––––––
{
files: [
‘/*.test.js’,
’/.spec.js’,
’tests/**/.js’,
],

languageOptions: {
  globals: {
    ...globals.node,
    ...globals.jest,
  },
},

},
];