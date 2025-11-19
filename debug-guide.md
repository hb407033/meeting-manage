# Nuxt 3 API 调试指南

## 1. 使用 VS Code 调试器 (推荐)

### 方法一：启动调试模式
1. 按 `F5` 或点击调试面板中的"Debug Nuxt Server"
2. 在代码中设置断点（点击行号左侧）
3. 发送API请求到 `http://localhost:3000/api/v1/rooms`
4. 程序会在断点处暂停，可以查看变量值

### 方法二：附加到现有进程
1. 先用 `npm run dev` 启动服务器
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 选择"Debug: Attach to Node Process"
4. 选择对应的 Node.js 进程

## 2. 使用 Debugger 语句

```typescript
export default defineEventHandler(async (event) => {
  debugger // 在这里设置断点

  const user = event.context.user
  console.log('🔍 Debug - 用户信息:', user)

  try {
    const body = await readValidatedBody(event, CreateRoomSchema.parse)
    console.log('🔍 Debug - 请求数据:', body)

    debugger // 检查数据库操作前的状态

    // ... 其他代码
  } catch (error) {
    console.error('🔍 Debug - 错误详情:', error)
  }
})
```

## 3. 使用 Console 日志

### 日志级别分类
```typescript
console.log('🔍 Debug - 调试信息')
console.info('ℹ️ Info - 一般信息')
console.warn('⚠️ Warn - 警告信息')
console.error('❌ Error - 错误信息')
```

### 结构化日志
```typescript
console.log('🔍 Debug - API 调用:', {
  method: event.node.req.method,
  url: event.node.req.url,
  userAgent: getHeader(event, 'user-agent'),
  timestamp: new Date().toISOString()
})
```

## 4. 使用浏览器开发者工具

### 检查网络请求
1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 发送API请求
4. 查看请求/响应详情

### 在前端代码中调试
```typescript
// 前端调用API时添加日志
const createRoom = async (roomData: any) => {
  console.log('🔍 Frontend - 发送数据:', roomData)

  const response = await $fetch('/api/v1/rooms', {
    method: 'POST',
    body: roomData
  })

  console.log('🔍 Frontend - 响应结果:', response)
  return response
}
```

## 5. 环境变量配置

在 `.env` 文件中添加调试配置：
```env
# 启用详细日志
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

## 6. 使用 Chrome DevTools

### 安装扩展
```bash
# 安装 node-inspect
npm install -g node-inspect
```

### 启动调试
```bash
# 方式一：使用 inspect 参数
node --inspect node_modules/.bin/nuxt dev

# 方式二：使用 inspect-brk (在第一行暂停)
node --inspect-brk node_modules/.bin/nuxt dev
```

然后在 Chrome 中打开 `chrome://inspect` 进行调试。

## 7. 数据库调试

### 查看 Prisma 查询
在 `nuxt.config.ts` 中启用查询日志：
```typescript
export default defineNuxtConfig({
  // 其他配置...
  hooks: {
    'prisma:query': (e) => {
      console.log('🔍 Prisma Query:', e.query)
      console.log('🔍 Prisma Params:', e.params)
      console.log('🔍 Prisma Duration:', `${e.duration}ms`)
    }
  }
})
```

### 手动数据库调试
```typescript
// 在API中添加数据库查询调试
console.log('🔍 Debug - 执行数据库查询前')
const result = await prisma.meetingRoom.findMany({
  where: { status: 'AVAILABLE' }
})
console.log('🔍 Debug - 查询结果:', result)
```

## 8. 错误处理和调试

### 捕获和记录详细错误
```typescript
export default defineEventHandler(async (event) => {
  try {
    // API 逻辑
  } catch (error) {
    // 详细的错误调试信息
    console.error('🔍 Debug - 错误类型:', error.constructor.name)
    console.error('🔍 Debug - 错误消息:', error.message)
    console.error('🔍 Debug - 错误堆栈:', error.stack)

    // 如果是 Prisma 错误
    if (error.code) {
      console.error('🔍 Debug - Prisma 错误代码:', error.code)
      console.error('🔍 Debug - Prisma 错误详情:', error.meta)
    }

    throw error
  }
})
```

## 9. 性能调试

### 添加性能计时
```typescript
export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  console.log('🔍 Debug - API 开始处理')

  try {
    // API 逻辑...

    const duration = Date.now() - startTime
    console.log(`🔍 Debug - API 处理完成，耗时: ${duration}ms`)

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    console.log(`🔍 Debug - API 处理失败，耗时: ${duration}ms`)

    throw error
  }
})
```

## 10. 测试API的最佳实践

### 使用 curl 测试
```bash
# POST 请求测试
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"name":"Test Room","capacity":10,"location":"Floor 1"}' \
  -v
```

### 使用 Postman 或 Insomnia
1. 设置请求方法和URL
2. 添加请求头（Content-Type, Authorization）
3. 设置请求体
4. 查看响应状态和内容

## 调试建议

1. **分层调试**: 从前端→路由→中间件→API→数据库，逐层检查
2. **日志过滤**: 使用 `console.group()` 和 `console.groupEnd()` 组织日志
3. **条件断点**: 在 VS Code 中设置条件断点，只在特定条件下暂停
4. **环境隔离**: 使用不同环境变量区分开发和生产环境

## 常见问题排查

### 1. API 404 错误
- 检查文件路径是否正确
- 确认 HTTP 方法匹配

### 2. 权限错误
- 检查中间件配置
- 验证 token 格式

### 3. 数据库连接错误
- 检查 DATABASE_URL 配置
- 确认数据库服务运行状态

### 4. 类型错误
- 查看 TypeScript 编译错误
- 检查接口定义