import Prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔧 测试预约列表API调用')

    // 查询预约总数
    const total = await Prisma.reservation.count()

    // 查询前10条预约记录
    const reservations = await Prisma.reservation.findMany({
      take: 10,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📋 测试API查询结果: 共${total}条预约，返回前${reservations.length}条`)

    return {
      success: true,
      data: {
        reservations,
        pagination: {
          page: 1,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10),
          hasNext: total > 10,
          hasPrev: false
        }
      },
      meta: {
        queryTime: new Date().toISOString(),
        recordCount: reservations.length
      }
    }

  } catch (error) {
    console.error('❌ 测试预约列表API失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      data: null
    }
  }
})