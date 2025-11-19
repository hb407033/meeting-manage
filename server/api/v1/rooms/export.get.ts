import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 权限验证 - 需要会议室读取权限
    const user = await requirePermission(event, 'room:read')

    // 只支持 GET 请求
    if (event.node.req.method !== 'GET') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // 获取查询参数
    const query = getQuery(event)
    const {
      status,
      location,
      minCapacity,
      maxCapacity,
      format = 'csv'
    } = query

    // 构建查询条件
    const where: any = {
      deletedAt: null // 只导出未删除的会议室
    }

    // 状态过滤
    if (status && status !== 'all') {
      where.status = status
    }

    // 位置过滤
    if (location) {
      where.location = {
        contains: location as string
      }
    }

    // 容量范围过滤
    if (minCapacity || maxCapacity) {
      where.capacity = {}
      if (minCapacity) {
        where.capacity.gte = parseInt(minCapacity as string)
      }
      if (maxCapacity) {
        where.capacity.lte = parseInt(maxCapacity as string)
      }
    }

    // 查询会议室数据
    const rooms = await prisma.meetingRoom.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        location: true,
        equipment: true,
        images: true,
        status: true,
        rules: true,
        requiresApproval: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (rooms.length === 0) {
      return createErrorResponse('没有找到符合条件的会议室数据', 404)
    }

    // 转换数据为CSV格式
    const csvData = rooms.map(room => ({
      name: room.name,
      description: room.description || '',
      capacity: room.capacity,
      location: room.location || '',
      equipment: room.equipment ? JSON.stringify(room.equipment) : '',
      images: room.images ? JSON.stringify(room.images) : '',
      status: room.status,
      rules: room.rules ? JSON.stringify(room.rules) : '',
      requiresApproval: room.requiresApproval ? 'true' : 'false',
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString()
    }))

    // 生成CSV内容
    const csvContent = generateCSV(csvData)

    // 记录操作日志
    await createAuditLog({
      userId: user.id,
      action: 'BATCH_EXPORT',
      resourceType: 'ROOM',
      resourceId: null, // 批量操作没有特定资源ID
      details: {
        method: 'CSV_EXPORT',
        filters: {
          status,
          location,
          minCapacity,
          maxCapacity
        },
        exportCount: rooms.length,
        format
      },
      ipAddress: getClientIP(event),
      userAgent: getHeader(event, 'user-agent')
    })

    // 设置响应头
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="meeting-rooms-export-${new Date().toISOString().split('T')[0]}.csv"`)

    return csvContent

  } catch (error) {
    console.error('CSV导出错误:', error)

    if (error.statusCode === 401 || error.statusCode === 403) {
      return createErrorResponse('权限验证失败', error.statusCode)
    }

    return createErrorResponse('服务器内部错误', 500)
  } finally {
    await prisma.$disconnect()
  }
})