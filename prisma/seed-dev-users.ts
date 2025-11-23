/**
 * 开发用户种子数据
 * 仅在开发环境下创建和初始化开发测试用户
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function seedDevUsers() {
  try {
    console.log('🔧 开始创建开发用户...')

    // 开发用户配置
    const devUsers = [
      {
        email: 'dev@meeting-manage.local',
        name: '开发测试用户',
        password: 'dev123456', // 开发环境固定密码
        role: 'ADMIN',
        note: '开发环境自动登录用户，具备完整管理员权限'
      },
      {
        email: 'dev-manager@meeting-manage.local',
        name: '开发经理用户',
        password: 'dev123456',
        role: 'MANAGER',
        note: '开发环境经理角色用户，用于测试管理功能'
      },
      {
        email: 'dev-user@meeting-manage.local',
        name: '开发普通用户',
        password: 'dev123456',
        role: 'USER',
        note: '开发环境普通用户，用于测试基础功能'
      }
    ]

    for (const devUser of devUsers) {
      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: devUser.email }
      })

      if (existingUser) {
        console.log(`✅ 开发用户 ${devUser.email} 已存在，跳过创建`)
        continue
      }

      // 创建密码哈希
      const passwordHash = await bcrypt.hash(devUser.password, 10)

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email: devUser.email,
          name: devUser.name,
          password: passwordHash, // 存储哈希后的密码
          isDevUser: true,
          devUserNote: devUser.note,
          authMethod: 'LOCAL',
          isActive: true,
          organizationId: null, // 开发用户不指定组织
        }
      })

      // 确保角色存在
      let role = await prisma.role.findUnique({
        where: { name: devUser.role }
      })

      if (!role) {
        // 创建角色
        role = await prisma.role.create({
          data: {
            name: devUser.role,
            code: `${devUser.role}_DEV`, // 避免与现有角色冲突
            description: `${devUser.role} - 开发环境角色`,
            level: devUser.role === 'ADMIN' ? 3 : devUser.role === 'MANAGER' ? 2 : 1,
            isSystem: true,
            isActive: true
          }
        })
        console.log(`✅ 创建角色: ${devUser.role}`)
      }

      // 分配角色给用户
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          assignedBy: 'system-seed',
          assignedAt: new Date()
        }
      })

      console.log(`✅ 创建开发用户: ${devUser.email} (${devUser.role})`)
    }

    // 创建基本权限（如果不存在）
    await createBasicPermissions()

    // 为角色分配基本权限
    await assignPermissionsToRoles()

    console.log('🎉 开发用户种子数据创建完成!')

  } catch (error) {
    console.error('❌ 创建开发用户失败:', error)
    throw error
  }
}

/**
 * 创建基本权限
 */
async function createBasicPermissions() {
  const permissions = [
    // 用户管理权限
    { name: '用户查看', code: 'user:view', resource: 'user', action: 'view' },
    { name: '用户管理', code: 'user:manage', resource: 'user', action: 'manage' },

    // 会议室管理权限
    { name: '会议室查看', code: 'room:view', resource: 'room', action: 'view' },
    { name: '会议室管理', code: 'room:manage', resource: 'room', action: 'manage' },
    { name: '会议室预约', code: 'room:reserve', resource: 'room', action: 'reserve' },

    // 预约管理权限
    { name: '预约查看', code: 'reservation:view', resource: 'reservation', action: 'view' },
    { name: '预约管理', code: 'reservation:manage', resource: 'reservation', action: 'manage' },

    // 系统管理权限
    { name: '系统配置', code: 'system:config', resource: 'system', action: 'config' },
    { name: '审计日志', code: 'audit:view', resource: 'audit', action: 'view' },
  ]

  for (const permission of permissions) {
    const existing = await prisma.permission.findUnique({
      where: { code: permission.code }
    })

    if (!existing) {
      await prisma.permission.create({
        data: {
          ...permission,
          module: permission.resource,
          isActive: true
        }
      })
      console.log(`✅ 创建权限: ${permission.name}`)
    }
  }
}

/**
 * 为角色分配基本权限
 */
async function assignPermissionsToRoles() {
  // 获取所有权限
  const allPermissions = await prisma.permission.findMany()

  // 获取角色
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } })
  const userRole = await prisma.role.findUnique({ where: { name: 'USER' } })

  if (adminRole) {
    // 管理员拥有所有权限
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log('✅ 为管理员角色分配所有权限')
  }

  if (managerRole) {
    // 经理拥有大部分权限（除了系统配置）
    const managerPermissions = allPermissions.filter(p => p.code !== 'system:config')
    for (const permission of managerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log('✅ 为经理角色分配权限')
  }

  if (userRole) {
    // 普通用户只有基础权限
    const userPermissions = allPermissions.filter(p =>
      ['room:view', 'room:reserve', 'reservation:view'].includes(p.code)
    )
    for (const permission of userPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: permission.id
        }
      })
    }
    console.log('✅ 为普通用户角色分配基础权限')
  }
}

// 如果直接运行此文件，执行种子数据创建
if (require.main === module) {
  seedDevUsers()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}