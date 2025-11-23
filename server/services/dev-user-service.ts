/**
 * 开发用户服务
 * 提供开发环境用户的自动创建、管理和验证功能
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getDevUserConfig, isDevAutoLoginEnabled, isDevAutoLoginSafe } from '~~/server/utils/environment'

const prisma = new PrismaClient()

export interface DevUser {
  id: string
  email: string
  name: string
  roles: string[]
  isDevUser: boolean
}

/**
 * 确保开发用户存在
 * 如果不存在则自动创建
 */
export async function ensureDevUserExists(): Promise<DevUser | null> {
  // 安全检查
  if (!isDevAutoLoginEnabled() || !isDevAutoLoginSafe()) {
    console.warn('⚠️ 开发自动登录未启用或不安全，跳过用户创建')
    return null
  }

  try {
    const devConfig = getDevUserConfig()

    // 查找现有开发用户
    let user = await prisma.user.findUnique({
      where: { email: devConfig.email },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (user) {
      // 确保用户标记为开发用户
      if (!user.isDevUser) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            isDevUser: true,
            devUserNote: user.devUserNote || '开发环境自动登录用户'
          },
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        })
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.userRoles.map(ur => ur.role.name),
        isDevUser: user.isDevUser
      }
    }

    // 创建新的开发用户
    return await createDevUser(devConfig)

  } catch (error) {
    console.error('确保开发用户存在失败:', error)
    return null
  }
}

/**
 * 创建开发用户
 */
export async function createDevUser(config: { email: string; name: string; role: string }): Promise<DevUser> {
  try {
    // 使用固定密码哈希（仅限开发环境）
    const devPassword = 'dev123456'
    const passwordHash = await bcrypt.hash(devPassword, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: config.email,
        name: config.name,
        password: devPassword,
        passwordHash,
        isDevUser: true,
        devUserNote: `开发环境自动登录用户 - 角色: ${config.role}`,
        authMethod: 'LOCAL',
        isActive: true,
        organizationId: null
      }
    })

    // 确保角色存在
    let role = await prisma.role.findUnique({
      where: { name: config.role }
    })

    if (!role) {
      role = await createRole(config.role)
    }

    // 分配角色给用户
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedBy: 'dev-auto-login',
        assignedAt: new Date()
      }
    })

    console.log(`✅ 创建开发用户: ${config.email} (${config.role})`)

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: [role.name],
      isDevUser: user.isDevUser
    }

  } catch (error) {
    console.error('创建开发用户失败:', error)
    throw error
  }
}

/**
 * 创建角色（如果不存在）
 */
async function createRole(roleName: string) {
  const roleData = {
    ADMIN: { level: 3, description: '系统管理员' },
    MANAGER: { level: 2, description: '部门经理' },
    USER: { level: 1, description: '普通用户' }
  }

  const config = roleData[roleName as keyof typeof roleData] || roleData.USER

  return await prisma.role.create({
    data: {
      name: roleName,
      code: roleName.toUpperCase(),
      description: config.description,
      level: config.level,
      isSystem: true,
      isActive: true
    }
  })
}

/**
 * 验证开发用户权限
 */
export async function validateDevUserPermissions(user: DevUser): Promise<boolean> {
  // 确保是开发用户
  if (!user.isDevUser) {
    return false
  }

  // 管理员拥有所有权限
  if (user.roles.includes('ADMIN')) {
    return true
  }

  // 经理拥有大部分权限
  if (user.roles.includes('MANAGER')) {
    return true
  }

  // 普通用户拥有基础权限
  return user.roles.includes('USER')
}

/**
 * 获取所有开发用户列表
 */
export async function getDevUsers(): Promise<DevUser[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        isDevUser: true
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.userRoles.map(ur => ur.role.name),
      isDevUser: user.isDevUser
    }))

  } catch (error) {
    console.error('获取开发用户列表失败:', error)
    return []
  }
}

/**
 * 清理开发用户（仅限开发环境）
 */
export async function cleanupDevUsers(): Promise<void> {
  if (!isDevAutoLoginSafe()) {
    throw new Error('仅限开发环境下才能执行清理操作')
  }

  try {
    const deletedCount = await prisma.user.deleteMany({
      where: {
        isDevUser: true
      }
    })

    console.log(`🧹 清理了 ${deletedCount.count} 个开发用户`)

  } catch (error) {
    console.error('清理开发用户失败:', error)
    throw error
  }
}

/**
 * 重置开发用户密码
 */
export async function resetDevUserPassword(email: string): Promise<void> {
  if (!isDevAutoLoginSafe()) {
    throw new Error('仅限开发环境下才能重置密码')
  }

  try {
    const newPassword = 'dev123456'
    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.updateMany({
      where: {
        email,
        isDevUser: true
      },
      data: {
        password: newPassword,
        passwordHash
      }
    })

    console.log(`🔒 重置开发用户密码: ${email}`)

  } catch (error) {
    console.error('重置开发用户密码失败:', error)
    throw error
  }
}