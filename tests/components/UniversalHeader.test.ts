import { describe, it, expect, test } from 'vitest'

// 测试UniversalHeader组件的功能实现
describe('UniversalHeader组件改进测试', () => {

  test('应该验证dashboard主菜单已添加', () => {
    // 这是一个集成测试，验证修改后的组件包含dashboard菜单
    const fs = require('fs')
    const path = require('path')

    const componentPath = path.join(__dirname, '../../app/components/UniversalHeader.vue')
    const componentContent = fs.readFileSync(componentPath, 'utf8')

    // 验证dashboard菜单链接存在
    expect(componentContent).toContain('to="/dashboard"')
    expect(componentContent).toContain('首页')
  })

  test('应该验证菜单间距已调整', () => {
    const fs = require('fs')
    const path = require('path')

    const componentPath = path.join(__dirname, '../../app/components/UniversalHeader.vue')
    const componentContent = fs.readFileSync(componentPath, 'utf8')

    // 验证桌面端菜单间距从space-x-8改为space-x-10
    expect(componentContent).toContain('space-x-10')
  })

  test('应该验证移动端菜单包含dashboard选项', () => {
    const fs = require('fs')
    const path = require('path')

    const componentPath = path.join(__dirname, '../../app/components/UniversalHeader.vue')
    const componentContent = fs.readFileSync(componentPath, 'utf8')

    // 验证移动端菜单中有dashboard选项
    expect(componentContent).toContain('Dashboard 模块')
    expect(componentContent).toContain('i-heroicons-home')
  })

  test('应该验证路由激活状态处理', () => {
    const fs = require('fs')
    const path = require('path')

    const componentPath = path.join(__dirname, '../../app/components/UniversalHeader.vue')
    const componentContent = fs.readFileSync(componentPath, 'utf8')

    // 验证dashboard链接有激活状态样式
    expect(componentContent).toContain(':class="{ \'text-blue-600 dark:text-blue-400\': isRouteActive(\'/dashboard\') }"')
  })
})