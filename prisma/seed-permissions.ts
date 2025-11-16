import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedPermissions() {
  console.log('🌱 开始播种权限数据...')

  try {
    // 创建组织架构
    const rootOrg = await prisma.organization.upsert({
      where: { code: 'ROOT' },
      update: {},
      create: {
        name: '总公司',
        code: 'ROOT',
        level: 0,
        path: '/ROOT',
        isActive: true
      }
    })

    const itDept = await prisma.organization.upsert({
      where: { code: 'IT' },
      update: {},
      create: {
        name: 'IT部门',
        code: 'IT',
        parentId: rootOrg.id,
        level: 1,
        path: '/ROOT/IT',
        isActive: true
      }
    })

    const adminDept = await prisma.organization.upsert({
      where: { code: 'ADMIN' },
      update: {},
      create: {
        name: '行政部',
        code: 'ADMIN',
        parentId: rootOrg.id,
        level: 1,
        path: '/ROOT/ADMIN',
        isActive: true
      }
    })

    // 创建角色
    const adminRole = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      update: {},
      create: {
        name: '系统管理员',
        code: 'ADMIN',
        description: '拥有所有权限的系统管理员',
        level: 100,
        isSystem: true,
        isActive: true
      }
    })

    const managerRole = await prisma.role.upsert({
      where: { code: 'MANAGER' },
      update: {},
      create: {
        name: '部门经理',
        code: 'MANAGER',
        description: '部门经理，具有部门内的管理权限',
        level: 50,
        isSystem: true,
        isActive: true
      }
    })

    const userRole = await prisma.role.upsert({
      where: { code: 'USER' },
      update: {},
      create: {
        name: '普通用户',
        code: 'USER',
        description: '普通用户，基础使用权限',
        level: 10,
        isSystem: true,
        isActive: true
      }
    })

    // 创建权限
    const permissions = [
      // 用户管理权限
      { name: '查看用户列表', code: 'user:read', resource: 'user', action: 'read', module: '用户管理' },
      { name: '创建用户', code: 'user:create', resource: 'user', action: 'create', module: '用户管理' },
      { name: '编辑用户', code: 'user:update', resource: 'user', action: 'update', module: '用户管理' },
      { name: '删除用户', code: 'user:delete', resource: 'user', action: 'delete', module: '用户管理' },

      // 角色权限管理
      { name: '查看角色列表', code: 'role:read', resource: 'role', action: 'read', module: '权限管理' },
      { name: '创建角色', code: 'role:create', resource: 'role', action: 'create', module: '权限管理' },
      { name: '编辑角色', code: 'role:update', resource: 'role', action: 'update', module: '权限管理' },
      { name: '删除角色', code: 'role:delete', resource: 'role', action: 'delete', module: '权限管理' },

      // 权限分配
      { name: '分配用户角色', code: 'role:assign', resource: 'role', action: 'assign', module: '权限管理' },

      // 会议室管理权限
      { name: '查看会议室列表', code: 'room:read', resource: 'room', action: 'read', module: '会议室管理' },
      { name: '创建会议室', code: 'room:create', resource: 'room', action: 'create', module: '会议室管理' },
      { name: '编辑会议室', code: 'room:update', resource: 'room', action: 'update', module: '会议室管理' },
      { name: '删除会议室', code: 'room:delete', resource: 'room', action: 'delete', module: '会议室管理' },
      { name: '管理会议室状态', code: 'room:manage-status', resource: 'room', action: 'manage-status', module: '会议室管理' },

      // 预约管理权限
      { name: '查看预约列表', code: 'reservation:read', resource: 'reservation', action: 'read', module: '预约管理' },
      { name: '创建预约', code: 'reservation:create', resource: 'reservation', action: 'create', module: '预约管理' },
      { name: '编辑预约', code: 'reservation:update', resource: 'reservation', action: 'update', module: '预约管理' },
      { name: '取消预约', code: 'reservation:cancel', resource: 'reservation', action: 'cancel', module: '预约管理' },
      { name: '审批预约', code: 'reservation:approve', resource: 'reservation', action: 'approve', module: '预约管理' },
      { name: '查看他人预约', code: 'reservation:read-others', resource: 'reservation', action: 'read-others', module: '预约管理' },

      // 数据分析权限
      { name: '查看使用统计', code: 'analytics:read', resource: 'analytics', action: 'read', module: '数据分析' },
      { name: '导出数据', code: 'analytics:export', resource: 'analytics', action: 'export', module: '数据分析' },

      // 系统管理权限
      { name: '查看系统配置', code: 'system:read', resource: 'system', action: 'read', module: '系统管理' },
      { name: '编辑系统配置', code: 'system:update', resource: 'system', action: 'update', module: '系统管理' },
      { name: '查看审计日志', code: 'audit:read', resource: 'audit', action: 'read', module: '审计日志' },

      // 设备管理权限
      { name: '管理IoT设备', code: 'device:manage', resource: 'device', action: 'manage', module: '设备管理' },
      { name: '查看设备数据', code: 'device:read-data', resource: 'device', action: 'read-data', module: '设备管理' }
    ]

    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          ...perm,
          description: `${perm.module} - ${perm.name}`,
          isActive: true
        }
      })
    }

    // 获取所有权限
    const allPermissions = await prisma.permission.findMany()

    // 为管理员角色分配所有权限
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

    // 为部门经理角色分配权限（除了系统级管理权限）
    const managerPermissions = allPermissions.filter(p =>
      !p.code.startsWith('system:') &&
      !p.code.startsWith('audit:') &&
      !p.code.startsWith('role:') &&
      p.code !== 'user:delete'
    )

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

    // 为普通用户角色分配基础权限
    const userPermissions = allPermissions.filter(p =>
      p.code === 'room:read' ||
      p.code === 'reservation:read' ||
      p.code === 'reservation:create' ||
      p.code === 'reservation:update' ||
      p.code === 'reservation:cancel'
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

    // 创建示例管理员用户
    const adminPassword = await bcrypt.hash('admin123456', 10)
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@meeting-manage.com' },
      update: {},
      create: {
        email: 'admin@meeting-manage.com',
        name: '系统管理员',
        password: adminPassword,
        isActive: true,
        organizationId: rootOrg.id
      }
    })

    // 为管理员用户分配管理员角色
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    })

    console.log('✅ 权限数据播种完成!')
    console.log(`📊 创建了 ${allPermissions.length} 个权限`)
    console.log(`👥 创建了 3 个角色`)
    console.log(`🏢 创建了 3 个组织`)
    console.log(`👤 创建了管理员用户: admin@meeting-manage.com`)

  } catch (error) {
    console.error('❌ 权限数据播种失败:', error)
    throw error
  }
}

// 如果直接运行此文件
if (require.main === module) {
  seedPermissions()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export default seedPermissions