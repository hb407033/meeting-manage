# 推荐命令列表

## 开发命令
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 生成静态文件
npm run generate
```

## 代码质量检查
```bash
# ESLint检查并自动修复
npm run lint

# 仅检查不修复
npm run lint:check

# Prettier格式化
npm run format

# 检查格式化
npm run format:check

# TypeScript类型检查
npm run type-check
```

## 测试命令
```bash
# 运行测试
npm run test

# 监视模式运行测试
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 测试UI界面
npm run test:ui

# 调试测试
npm run test:debug
```

## 数据库命令
```bash
# 生成Prisma客户端
npm run db:generate

# 运行数据库迁移
npm run db:migrate

# 生产环境迁移
npm run db:migrate:prod

# 重置数据库
npm run db:reset

# 打开Prisma Studio
npm run db:studio

# 执行种子数据
npm run db:seed

# 完整数据库设置
npm run db:setup
```

## Git相关
```bash
# Git提交 (会触发husky钩子)
git commit -m "feat(scope): add new feature"

# 创建管理员用户
node create-admin.js

# 创建测试用户
node create-user-prisma.js
```

## 调试命令
```bash
# 诊断Nuxt问题
./diagnose-nuxt.sh

# 清理缓存
./clear-cache.sh

# 查看当前Git状态
git status

# 查看最近提交
git log --oneline -10
```

## 环境管理
```bash
# 复制环境变量模板
cp .env.example .env.local

# 安装依赖
npm install

# 准备开发环境
npm run prepare
```

## 实用工具命令
```bash
# 查找文件
find . -name "*.vue" -type f

# 搜索代码内容
grep -r "pattern" --include="*.ts" --include="*.vue" .

# 查看端口占用
lsof -i :3000

# 强制删除node_modules
rm -rf node_modules package-lock.json
npm install
```