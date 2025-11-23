#!/usr/bin/env node

/**
 * API 调用规范检查脚本
 *
 * 检查项目中是否存在违反 API 调用规范的代码：
 * - 严禁在组件中直接使用 $fetch 或 useFetch
 * - 严禁在 composables 中直接调用 API
 * - 要求所有 API 调用通过 store 方法进行
 */

const fs = require('fs')
const path = require('path')

// 需要检查的目录
const CHECK_DIRECTORIES = [
  './app/components',
  './app/pages',
  './app/composables'
]

// 禁止的模式
const FORBIDDEN_PATTERNS = [
  {
    pattern: /\$fetch\(/g,
    description: '直接使用 $fetch'
  },
  {
    pattern: /useFetch\(/g,
    description: '直接使用 useFetch'
  },
  {
    pattern: /fetch\(/g,
    description: '直接使用 fetch'
  }
]

// 允许的文件路径模式（用于白名单）
const WHITELIST_PATTERNS = [
  /server\//,
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /\.nuxt\//
]

/**
 * 检查文件是否在白名单中
 */
function isWhitelisted(filePath) {
  return WHITELIST_PATTERNS.some(pattern => pattern.test(filePath))
}

/**
 * 检查单个文件
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const issues = []

    FORBIDDEN_PATTERNS.forEach(({ pattern, description }) => {
      const matches = content.match(pattern)
      if (matches && matches.length > 0) {
        // 查找匹配的行号
        const lines = content.split('\n')
        const lineNumbers = []

        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            lineNumbers.push(index + 1)
          }
        })

        issues.push({
          type: description,
          count: matches.length,
          lines: lineNumbers
        })
      }
    })

    return issues
  } catch (error) {
    console.warn(`警告: 无法读取文件 ${filePath}: ${error.message}`)
    return []
  }
}

/**
 * 检查目录
 */
function checkDirectory(dirPath) {
  const results = []

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)

      if (item.isDirectory()) {
        // 递归检查子目录
        results.push(...checkDirectory(fullPath))
      } else if (item.isFile() && shouldCheckFile(fullPath)) {
        // 检查文件
        const issues = checkFile(fullPath)
        if (issues.length > 0) {
          results.push({
            file: fullPath,
            issues
          })
        }
      }
    }
  } catch (error) {
    console.warn(`警告: 无法读取目录 ${dirPath}: ${error.message}`)
  }

  return results
}

/**
 * 判断是否需要检查文件
 */
function shouldCheckFile(filePath) {
  // 只检查 .vue 和 .ts 文件
  return /\.(vue|ts)$/.test(filePath) && !isWhitelisted(filePath)
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始检查 API 调用规范...\n')

  let totalIssues = 0
  const allResults = []

  CHECK_DIRECTORIES.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`检查目录: ${dir}`)
      const results = checkDirectory(dir)
      allResults.push(...results)
    } else {
      console.log(`目录不存在: ${dir}`)
    }
  })

  // 输出结果
  if (allResults.length === 0) {
    console.log('✅ API 调用规范检查通过！')
    console.log('未发现违规的 API 调用代码。')
    process.exit(0)
  } else {
    console.log('\n❌ 发现违规的 API 调用代码！\n')

    allResults.forEach(({ file, issues }) => {
      console.log(`📁 文件: ${file}`)
      issues.forEach(({ type, count, lines }) => {
        console.log(`   - ${type}: ${count} 处`)
        console.log(`     违规行号: ${lines.join(', ')}`)
        totalIssues += count
      })
      console.log('')
    })

    console.log(`\n📊 统计:`)
    console.log(`- 违规文件数: ${allResults.length}`)
    console.log(`- 违规调用数: ${totalIssues}`)

    console.log(`\n🔧 修复建议:`)
    console.log(`1. 将所有 $fetch 或 useFetch 调用移动到对应的 store 中`)
    console.log(`2. 在 store 中使用 getApiFetch() 工具函数`)
    console.log(`3. 在组件中通过 composables 调用 store 方法`)
    console.log(`4. 参考: docs/api-calling-guidelines.md`)

    console.log(`\n📚 相关文档:`)
    console.log(`- API 调用规范: docs/api-calling-guidelines.md`)
    console.log(`- 架构文档: docs/architecture.md`)

    process.exit(1)
  }
}

// 运行检查
if (require.main === module) {
  main()
}