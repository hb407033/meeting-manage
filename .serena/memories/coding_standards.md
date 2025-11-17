# 代码规范和约定

## 代码风格
- **TypeScript**: 严格模式，完整类型注解
- **Vue 3**: 使用组合式API (Composition API)
- **Nuxt 4**: App目录模式，遵循最新约定
- **ESLint**: 使用 @antfu/eslint-config 配置
- **Prettier**: 统一代码格式化

## 命名约定

### 文件命名
- **组件**: PascalCase (如 RoomManagement.vue)
- **页面**: kebab-case (如 admin/rooms.vue)
- **Composables**: use 开头的驼峰命名 (如 useAuth.ts)
- **Stores**: camelCase (如 auth.ts)
- **API路由**: RESTful风格，使用描述性命名

### 变量命名
- **变量**: camelCase
- **常量**: UPPER_SNAKE_CASE
- **函数**: camelCase，动词开头
- **类**: PascalCase
- **接口**: PascalCase，I前缀可选

### 数据库命名
- **表名**: snake_case，复数形式 (如 meeting_rooms)
- **字段**: snake_case
- **模型**: Prisma模型使用PascalCase

## 代码组织

### Vue组件结构
```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 导入
// 接口定义
// 响应式数据
// 计算属性
// 方法
// 生命周期
</script>

<style scoped>
/* 样式 */
</style>
```

### API结构
- 使用RESTful设计原则
- 统一的错误处理
- 请求验证 (Zod schemas)
- 响应格式统一
- 适当的HTTP状态码

### 类型安全
- 所有函数都有完整的类型注解
- 使用接口定义数据结构
- 利用Prisma生成的类型
- 避免使用any类型

## 注释规范
- 复杂逻辑必须添加注释
- 函数使用JSDoc格式
- TODO/FIXME注释格式规范
- 业务逻辑说明

## 提交规范
- 使用Conventional Commits
- 格式: type(scope): description
- 类型: feat, fix, docs, style, refactor, test, chore
- 必须通过commitlint检查