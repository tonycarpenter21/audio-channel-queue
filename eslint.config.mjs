import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Shared rules for both source and test files
const commonRules = {
  // Length and formatting
  'max-len': ['error', { code: 100, ignoreComments: true, ignoreUrls: true }],
  
  // JS rules
  'comma-dangle': ['warn', 'never'],
  'comma-spacing': ['error', { after: true, before: false }],
  'key-spacing': ['error', { afterColon: true }],
  'keyword-spacing': 'error',
  'object-curly-spacing': ['error', 'always'],
  'sort-keys': ['warn', 'asc', { caseSensitive: true, minKeys: 2, natural: true }],
  'space-before-blocks': 'warn',
  
  // TypeScript rules
  '@typescript-eslint/explicit-function-return-type': 'warn',
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
};

const commonLanguageOptions = {
  ecmaVersion: 2020,
  sourceType: 'module'
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ...commonLanguageOptions,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      ...commonRules,
      // Source-specific rules
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  // Test files inherit common rules with specific relaxations
  {
    files: ['__tests__/**/*.ts'],
    languageOptions: {
      ...commonLanguageOptions,
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      ...commonRules,
      // Test-specific relaxations
      'no-console': 'off' // Allow console in tests for debugging
    }
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '!eslint.config.js']
  }
]; 