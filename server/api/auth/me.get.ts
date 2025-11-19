import { successResponse, errorResponse } from '~~/server/utils/response'
import { verifyAccessToken } from '~~/server/utils/jwt'
import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  try {
    // 获取Authorization头
    const authorization = getHeader(event, 'authorization')

    if (!authorization) {
      throw createError({
        statusCode: 401,
        statusMessage: '缺少Authorization头'
      })
    }

    // 提取Bearer token
    const token = authorization.replace('Bearer ', '')

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: '无效的Authorization格式'
      })
    }

    // 验证JWT令牌
    let payload
    try {
      payload = verifyAccessToken(token)
    } catch (error) {
      throw createError({
        statusCode: 401,
        statusMessage: '令牌无效或已过期'
      })
    }

    if (!payload || !payload.userId) {
      throw createError({
        statusCode: 401,
        statusMessage: '无效的令牌'
      })
    }

    // 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        userRoles: {
          include: {
            role: {
              select: {
                name: true,
                code: true,
                level: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '用户不存在'
      })
    }

    // 检查用户是否激活
    if (!user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: '账户已被禁用'
      })
    }

    // 确定用户角色和权限 - 支持多角色
    let userRoles: string[] = []
    let primaryRole = 'USER' // 主要角色，向后兼容
    let permissions: Set<string> = new Set()

    if (user.userRoles && user.userRoles.length > 0) {
      // 收集所有角色（Role模型没有isActive字段，默认所有角色都是激活的）
      userRoles = user.userRoles.map((ur: any) => ur.role?.code || 'USER')

      // 确定主要角色（按级别排序后的最高级角色，用于向后兼容）
      const sortedRoles = user.userRoles
        .sort((a: any, b: any) => (b.role?.level || 0) - (a.role?.level || 0))

      if (sortedRoles.length > 0) {
        primaryRole = sortedRoles[0].role?.code || 'USER'
      }

      // 聚合所有角色的权限
      const allPermissions: string[] = []

      for (const userRole of user.userRoles) {
        const roleCode = userRole.role?.code
        if (!roleCode) continue

        // 根据每个角色分配权限
        if (roleCode === 'ADMIN') {
          // 管理员拥有所有权限
          const adminPermissions = [
            'user:read', 'user:create', 'user:update', 'user:delete',
            'role:read', 'role:create', 'role:update', 'role:delete', 'role:assign',
            'room:read', 'room:create', 'room:update', 'room:delete', 'room:manage-status',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel', 'reservation:approve', 'reservation:read-others',
            'analytics:read', 'analytics:export',
            'system:read', 'system:update', 'audit:read',
            'device:manage', 'device:read-data'
          ]
          allPermissions.push(...adminPermissions)
        } else if (roleCode === 'MANAGER') {
          // 部门经理拥有部门内权限
          const managerPermissions = [
            'user:read', 'user:create', 'user:update',
            'room:read', 'room:create', 'room:update', 'room:manage-status',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel', 'reservation:approve', 'reservation:read-others',
            'analytics:read', 'analytics:export',
            'device:read-data'
          ]
          allPermissions.push(...managerPermissions)
        } else {
          // 普通用户只有基础权限
          const userPermissions = [
            'room:read',
            'reservation:read', 'reservation:create', 'reservation:update', 'reservation:cancel'
          ]
          allPermissions.push(...userPermissions)
        }
      }

      // 使用Set去重权限
      permissions = new Set(allPermissions)
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: primaryRole,    // 主要角色，向后兼容
        roles: userRoles,    // 完整角色列表
        permissions: Array.from(permissions), // 聚合后的权限
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, '获取用户信息成功')

  } catch (error: any) {
    // 处理已知错误
    if (error.statusCode) {
      throw error
    }

    // 处理JWT验证错误
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw createError({
        statusCode: 401,
        statusMessage: '令牌无效或已过期'
      })
    }

    // 处理数据库错误
    if (error.code === 'P2025') {
      throw createError({
        statusCode: 401,
        statusMessage: '用户不存在'
      })
    }

    console.error('Get user info error:', error)

    // 处理其他错误
    throw createError({
      statusCode: 500,
      statusMessage: '获取用户信息失败'
    })
  }
})