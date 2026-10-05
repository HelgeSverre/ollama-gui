import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier/flat'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: { parser: '@typescript-eslint/parser' },
      globals: {
        Blob: 'readonly',
        FileReader: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        ClipboardEvent: 'readonly',
        DragEvent: 'readonly',
        KeyboardEvent: 'readonly',
        setTimeout: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        indexedDB: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Array: 'readonly',
        BigInt: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        import: 'readonly',
      },
    },
  },
  {
    rules: {
      'semi': ['error', 'never'],
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'require-yield': 'warn',
      'no-empty': 'warn',
      'vue/multi-word-component-names': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  // Prettier owns formatting; turn off the stylistic rules that disagree with it
  prettier,
  {
    ignores: ['dist/', 'node_modules/', '*.config.*', 'e2e/', 'vitest.config.ts'],
  },
  {
    files: ['**/*.{test,spec}.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
