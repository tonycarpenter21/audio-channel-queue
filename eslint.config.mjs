import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // Length and formatting
      'max-len': ['error', { code: 100, ignoreComments: true, ignoreUrls: true }],
      
      // JS rules
      'comma-dangle': ['warn', 'never'],
      'comma-spacing': ['error', { after: true, before: false }],
      'key-spacing': ['error', { afterColon: true }],
      'keyword-spacing': 'error',
      'no-console': 'warn',
      'object-curly-spacing': ['error', 'always'],
      'sort-keys': ['warn', 'asc', { caseSensitive: true, minKeys: 2, natural: true }],
      'space-before-blocks': 'warn',
      
      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { 
        ignorePrimitives: { string: true, boolean: true, number: true } 
      }],
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error'
    }
  },
  // Relaxed rules for test files
  {
    files: ['__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in test files for mocking
      'no-console': 'off' // Allow console in tests for debugging
    }
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '!eslint.config.js']
  }
]; 