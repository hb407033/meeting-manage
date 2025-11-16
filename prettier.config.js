export default {
  // 基础格式化设置
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  trailingComma: 'none',
  printWidth: 100,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',

  // 插件配置
  plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-prisma'],

  // Tailwind CSS插件配置
  tailwindConfig: './tailwind.config.js',

  // Vue模板配置
  vueIndentScriptAndStyle: true,

  // 覆盖规则
  overrides: [
    {
      files: '*.vue',
      options: {
        parser: 'vue',
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        trailingComma: 'none',
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'always',
        printWidth: 80,
      },
    },
    {
      files: '*.yml',
      options: {
        parser: 'yaml',
        singleQuote: false,
      },
    },
    {
      files: '*.yaml',
      options: {
        parser: 'yaml',
        singleQuote: false,
      },
    },
    {
      files: 'prisma/schema.prisma',
      options: {
        parser: 'prisma',
        singleQuote: false,
        tabWidth: 2,
      },
    },
  ],
}
