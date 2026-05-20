import globals from 'globals'
import js from '@eslint/js'

export default [
  { ignores: ['coverage', 'dist', 'docs'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      sourceType: 'module'
    }
  }
]
