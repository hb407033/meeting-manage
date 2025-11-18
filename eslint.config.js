import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  ignores: [
    'node_modules',
    '.nuxt',
    '.output',
    'dist',
    'coverage',
    '*.min.js',
    'public/uploads',
    'prisma/migrations'
  ],
  rules: {
    // Vue关键规则
    'vue/multi-word-component-names': 'off',
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    'vue/no-unused-vars': 'error',

    // TypeScript关键规则
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false
    }],

    // 代码风格规则
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'never'],
    'indent': ['error', 2, { SwitchCase: 1 }],

    // 安全规则
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
})