// @ts-check

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '.wxt/**',
      '.output/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.ts',
      'tailwind.config.js',
      'wxt.config.ts',
      'coverage/**',
      '*.log'
    ]
  },
  
  // Base configuration for all files
  js.configs.recommended,
  
  // TypeScript and React files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Chrome Extension APIs
        chrome: 'readonly',
        browser: 'readonly',
        
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        
        // Node.js globals for background script
        process: 'readonly',
        NodeJS: 'readonly',
        
        // DOM types
        Element: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLButtonElement: 'readonly',
        Event: 'readonly',
        MutationObserver: 'readonly',
        XMLHttpRequest: 'readonly',
        
        // WXT functions
        defineContentScript: 'readonly',
        defineBackground: 'readonly',
        
        // Google Analytics
        gtag: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // ESLint base rules
      'no-unused-vars': 'off',
      'prefer-const': 'error',
      'no-case-declarations': 'warn',
      'no-undef': 'error',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
]; 