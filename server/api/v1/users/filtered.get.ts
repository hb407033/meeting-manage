import { PrismaClient } from '@prisma/client'
import { filterByUserOrganization, getUserOrganizationPath } from '~~/server/services/organization-service'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '未认证，请先登录'
    })
  }

  try {
    const { page = 1, limit = 20, search, role, isActive } = getQuery(event)

    // 基础查询条件
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      whereClause.userRoles = {
        some: {
          role: { code: role }
        }
      }
    }

    if (typeof isActive === 'boolean') {
      whereClause.isActive = isActive
    }

    // 获取用户可访问的组织ID列表
    const accessibleOrgIds = await getUserOrganizationPath(user.id)

    if (accessibleOrgIds.length > 0) {
      whereClause.organizationId = { in: accessibleOrgIds }
    } else if (!isAdminUser(user)) {
      // 非管理员且无组织权限的用户，返回空结果
      return {
        code: 200,
        message: 'success',
        data: {
          users: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0
          }
        },
        timestamp: new Date().toISOString()
      }
    }

    // 分页参数
    const skip = (Number(page) - 1) * Number(limit)
    const take = Number(limit)

    // 查询用户数据
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  level: true
                }
              }
            }
          },
          _count: {
            select: {
              reservations: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip,
        take
      }),
      prisma.user.count({ where: whereClause })
    ])

    // 处理用户数据
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive,
      organization: user.organization,
      roles: user.userRoles.map(ur => ur.role),
      reservationCount: user._count.reservations,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))

    return {
      code: 200,
      message: 'success',
      data: {
        users: formattedUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)

    throw createError({
      statusCode: 500,
      statusMessage: '获取用户列表失败'
    })
  }
})

/**
 * 检查用户是否是管理员
 */
async function isAdminUser(user: any): Promise<boolean> {
  const prisma = new PrismaClient()
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      role: {
        code: 'ADMIN',
        isActive: true
      }
    }
  })
  return !!adminRole
}