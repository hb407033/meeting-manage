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
    // Vue相关规则
    'vue/multi-word-component-names': 'off',
    'vue/no-reserved-component-names': 'off',
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    'vue/custom-event-name-casing': ['error', 'camelCase'],
    'vue/define-macros-order': ['error', {
      order: ['defineProps', 'defineEmits']
    }],
    'vue/html-self-closing': ['error', {
      html: {
        void: 'never',
        normal: 'always',
        component: 'always'
      }
    }],
    'vue/max-attributes-per-line': ['error', {
      singleline: 3,
      multiline: 1
    }],
    'vue/no-unused-vars': 'error',
    'vue/padding-line-between-blocks': ['error', 'always'],
    'vue/prefer-import-from-vue': 'error',

    // TypeScript相关规则
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/prefer-optional-chain': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false
    }],

    // 通用规则
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'generator-star-spacing': 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    'comma-dangle': 'off',
    'quotes': ['error', 'single', { avoidEscape: true }],
    'quote-props': ['error', 'as-needed'],
    'semi': ['error', 'never'],
    'indent': ['error', 2, { SwitchCase: 1 }],

    // Node.js规则
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',

    // 安全相关规则
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-void': 'error',
  },
  globals: {
    // Node.js globals
    process: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    globalThis: 'readonly',

    // Nuxt globals
    defineNuxtConfig: 'readonly',
    defineNuxtPlugin: 'readonly',
    defineNuxtRouteMiddleware: 'readonly',
    useNuxtApp: 'readonly',
    useRuntimeConfig: 'readonly',
    useLazyAsyncData: 'readonly',
    useAsyncData: 'readonly',
    useFetch: 'readonly',
    useCookie: 'readonly',
    useHead: 'readonly',
    useHeadSafe: 'readonly',
    useSeoMeta: 'readonly',
    navigateTo: 'readonly',
    createError: 'readonly',
    setHeader: 'readonly',
    getHeader: 'readonly',
    getQuery: 'readonly',
    getRouterParams: 'readonly',
    getRouteParams: 'readonly',
    readBody: 'readonly',

    // Prisma globals
    Prisma: 'readonly',

    // 测试 globals
    describe: 'readonly',
    it: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    vi: 'readonly',
  },
})
