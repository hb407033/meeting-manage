import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('项目配置测试', () => {
  it('nuxt配置应包含必要的模块', () => {
    const nuxtConfigPath = resolve(__dirname, '../../nuxt.config.ts')
    const configContent = readFileSync(nuxtConfigPath, 'utf-8')

    expect(configContent).toContain('@nuxtjs/tailwindcss')
    expect(configContent).toContain('build:')
    expect(configContent).toContain('typescript:')
    expect(configContent).toContain('runtimeConfig:')
  })

  it('tailwind配置应存在且有效', async () => {
    const tailwindConfigPath = resolve(__dirname, '../../tailwind.config.js')
    const tailwindConfigModule = await import(tailwindConfigPath)
    const tailwindConfig = tailwindConfigModule.default

    expect(tailwindConfig.content).toBeDefined()
    expect(tailwindConfig.theme).toBeDefined()
    expect(tailwindConfig.plugins).toBeDefined()
  })

  it('eSLint配置应存在', () => {
    const eslintConfigPath = resolve(__dirname, '../../eslint.config.js')
    expect(() => require(eslintConfigPath)).not.toThrow()
  })

  it('prettier配置应存在', async () => {
    const prettierConfigPath = resolve(__dirname, '../../prettier.config.js')
    const prettierConfigModule = await import(prettierConfigPath)
    const prettierConfig = prettierConfigModule.default

    expect(prettierConfig.singleQuote).toBe(true)
    expect(prettierConfig.semi).toBe(false)
  })

  it('typeScript基础配置应存在', () => {
    const tsConfigPath = resolve(__dirname, '../../tsconfig.base.json')
    const tsConfig = require(tsConfigPath)

    expect(tsConfig.compilerOptions.strict).toBe(true)
    expect(tsConfig.compilerOptions.noUnusedLocals).toBe(true)
  })

  it('环境变量示例文件应存在', () => {
    const envExamplePath = resolve(__dirname, '../../.env.example')
    expect(() => readFileSync(envExamplePath, 'utf-8')).not.toThrow()
  })

  it('cSS文件应包含Tailwind指令', () => {
    const cssPath = resolve(__dirname, '../../app/assets/css/main.css')
    const cssContent = readFileSync(cssPath, 'utf-8')

    expect(cssContent).toContain('@tailwind base;')
    expect(cssContent).toContain('@tailwind components;')
    expect(cssContent).toContain('@tailwind utilities;')
  })

  it('primeVue插件应存在', () => {
    const primeVuePluginPath = resolve(__dirname, '../../plugins/primevue.client.ts')
    const pluginContent = readFileSync(primeVuePluginPath, 'utf-8')

    expect(pluginContent).toContain('PrimeVue')
    expect(pluginContent).toContain('Aura')
    expect(pluginContent).toContain('ripple: true')
  })
})
