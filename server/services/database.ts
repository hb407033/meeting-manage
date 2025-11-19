import { PrismaClient } from '@prisma/client'

// 声明一个全局变量来缓存Prisma Client实例
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// 使用全局缓存的实例，或者创建一个新实例
// 这是为了防止在开发环境中，因热模块重载（HMR）而创建多个Prisma Client实例
const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  errorFormat: 'pretty' as const,
})

// 在非生产环境中，将创建的实例存入全局变量
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

/**
 * 尝试连接数据库，以便在应用启动时快速失败并给出明确错误。
 * 使用 .catch() 来处理潜在的连接错误，避免未处理的Promise拒绝。
 */
prisma.$connect().catch((e) => {
  console.error('❌ 数据库初次连接失败:', e)
})

// 默认导出这个唯一的、经过处理的Prisma Client实例
export default prisma
