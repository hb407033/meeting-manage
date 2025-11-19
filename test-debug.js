#!/usr/bin/env node

/**
 * 测试修复后的调试配置
 */

console.log('🧪 测试修复后的调试配置...\n')

// 测试1: 验证nuxt命令
console.log('1️⃣ 测试nuxt命令...')
try {
  const { execSync } = await import('child_process')
  const help = execSync('node node_modules/nuxt/bin/nuxt.mjs dev --help', { encoding: 'utf8' })
  console.log('✅ nuxt命令工作正常')
} catch (error) {
  console.log('❌ nuxt命令错误:', error.message)
}

// 测试2: 验证node inspect
console.log('\n2️⃣ 测试Node inspect选项...')
try {
  const help = execSync('node --help', { encoding: 'utf8' })
  if (help.includes('--inspect')) {
    console.log('✅ Node inspect选项可用')
  } else {
    console.log('❌ Node inspect选项不可用')
  }
} catch (error) {
  console.log('❌ Node inspect检查失败:', error.message)
}

// 测试3: 验证API服务器状态
console.log('\n3️⃣ 测试API服务器状态...')
try {
  const response = await fetch('http://localhost:3002/api/v1/rooms')
  console.log('✅ API服务器运行正常 (状态:', response.status, ')')

  const data = await response.json()
  console.log('✅ API返回数据:', {
    hasMessage: !!data.message,
    message: data.message
  })
} catch (error) {
  console.log('❌ API服务器测试失败:', error.message)
  console.log('💡 请确保服务器在端口3002运行')
}

// 测试4: 调试配置文件
console.log('\n4️⃣ 测试调试配置文件...')
try {
  const fs = await import('fs/promises')
  const config = await fs.readFile('./.vscode/launch.json', 'utf8')
  const launchConfig = JSON.parse(config)

  console.log('✅ launch.json配置存在')
  console.log('📋 配置项数量:', launchConfig.configurations.length)

  launchConfig.configurations.forEach((config, index) => {
    console.log(`   ${index + 1}. ${config.name}`)
  })

} catch (error) {
  console.log('❌ 调试配置文件错误:', error.message)
}

console.log('\n🎯 调试建议:')
console.log('1. 在VS Code中按F5启动调试')
console.log('2. 选择 "Debug with npm run dev" 或 "Debug Nuxt Server"')
console.log('3. 在API文件中设置断点')
console.log('4. 发送API请求触发断点')

console.log('\n🌐 API调试URL:')
console.log('- GET: http://localhost:3002/api/v1/rooms')
console.log('- POST: http://localhost:3002/api/v1/rooms')

testDebug().catch(console.error)

async function testDebug() {
  console.log('\n🚀 完成调试配置测试！')
}