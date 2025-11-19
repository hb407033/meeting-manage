import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据库种子数据...')

  try {
    // 1. 创建组织架构
    console.log('\n📁 创建组织架构...')
    const rootOrg = await prisma.organization.upsert({
      where: { code: 'ROOT' },
      update: {},
      create: {
        name: '智能会议室管理系统',
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
        name: '技术部',
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

    console.log(`✅ 创建组织架构: ${rootOrg.name}, ${itDept.name}, ${adminDept.name}`)

    // 2. 创建角色
    console.log('\n👥 创建角色...')
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

    console.log(`✅ 创建角色: ${adminRole.name}, ${managerRole.name}, ${userRole.name}`)

    // 3. 创建权限
    console.log('\n🔐 创建权限...')
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

    console.log(`✅ 创建 ${permissions.length} 个权限`)

    // 4. 分配角色权限
    console.log('\n🔗 分配角色权限...')
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

    console.log(`✅ 管理员权限: ${allPermissions.length} 个`)
    console.log(`✅ 经理权限: ${managerPermissions.length} 个`)
    console.log(`✅ 用户权限: ${userPermissions.length} 个`)

    // 5. 创建用户
    console.log('\n👤 创建用户...')
    const adminPassword = await bcrypt.hash('admin123456', 10)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@meeting.local' },
      update: {},
      create: {
        email: 'admin@meeting.local',
        name: '系统管理员',
        password: adminPassword,
        isActive: true,
        organizationId: rootOrg.id
      }
    })

    const managerPassword = await bcrypt.hash('manager123456', 10)
    const manager = await prisma.user.upsert({
      where: { email: 'manager@meeting.local' },
      update: {},
      create: {
        email: 'manager@meeting.local',
        name: '部门经理',
        password: managerPassword,
        isActive: true,
        organizationId: itDept.id
      }
    })

    const userPassword = await bcrypt.hash('user123456', 10)
    const user = await prisma.user.upsert({
      where: { email: 'user@meeting.local' },
      update: {},
      create: {
        email: 'user@meeting.local',
        name: '普通用户',
        password: userPassword,
        isActive: true,
        organizationId: itDept.id
      }
    })

    console.log(`✅ 创建用户: ${admin.name}, ${manager.name}, ${user.name}`)

    // 6. 分配用户角色
    console.log('\n🔗 分配用户角色...')
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRole.id
        }
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: adminRole.id
      }
    })

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: manager.id,
          roleId: managerRole.id
        }
      },
      update: {},
      create: {
        userId: manager.id,
        roleId: managerRole.id
      }
    })

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userRole.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: userRole.id
      }
    })

    console.log(`✅ 分配用户角色完成`)

    // 7. 创建会议室
    console.log('\n🏢 创建会议室...')
    const rooms = [
      {
        name: '大会议室A',
        description: '适合大型会议，配备完整视频会议设备、投影仪、音响系统等',
        capacity: 50,
        location: '主楼3楼东侧',
        equipment: {
          projector: { name: '高清投影仪', quantity: 2, available: true },
          whiteboard: { name: '交互式白板', quantity: 1, available: true },
          videoConference: { name: '视频会议系统', quantity: 1, available: true },
          audioSystem: { name: '专业音响系统', quantity: 1, available: true },
          microphone: { name: '无线麦克风', quantity: 4, available: true },
          airCondition: { name: '中央空调', available: true },
          wifi: { name: '高速WiFi', available: true },
          power: { name: '电源插座', quantity: 20, available: true },
          windows: { name: '落地窗', available: true },
          podium: { name: '演讲台', quantity: 1, available: true }
        },
        images: [
          'https://example.com/room-a-1.jpg',
          'https://example.com/room-a-2.jpg'
        ],
        rules: {
          advanceBookingDays: 7,
          maxDurationHours: 4,
          requiresApproval: true,
          allowedTimeRange: { start: '08:00', end: '22:00' },
          cleaningTime: 30
        },
        requiresApproval: false
      },
      {
        name: '中会议室B',
        description: '适合中型团队会议，配备基础会议设备',
        capacity: 20,
        location: '主楼2楼西侧',
        equipment: {
          projector: { name: '高清投影仪', quantity: 1, available: true },
          whiteboard: { name: '普通白板', quantity: 2, available: true },
          videoConference: { name: '简易视频会议', quantity: 1, available: true },
          audioSystem: { name: '基础音响', quantity: 1, available: true },
          airCondition: { name: '空调', available: true },
          wifi: { name: 'WiFi', available: true },
          power: { name: '电源插座', quantity: 10, available: true },
          windows: { name: '窗户', available: true }
        },
        images: [
          'https://example.com/room-b-1.jpg'
        ],
        rules: {
          advanceBookingDays: 3,
          maxDurationHours: 3,
          requiresApproval: false,
          allowedTimeRange: { start: '09:00', end: '18:00' },
          cleaningTime: 15
        },
        requiresApproval: false
      },
      {
        name: '小会议室C',
        description: '适合小型团队讨论和面试',
        capacity: 8,
        location: '主楼2楼东侧',
        equipment: {
          whiteboard: { name: '白板', quantity: 1, available: true },
          videoConference: { name: '视频会议', quantity: 1, available: true },
          airCondition: { name: '空调', available: true },
          wifi: { name: 'WiFi', available: true },
          power: { name: '电源插座', quantity: 6, available: true }
        },
        images: [
          'https://example.com/room-c-1.jpg'
        ],
        rules: {
          advanceBookingDays: 1,
          maxDurationHours: 2,
          requiresApproval: false,
          allowedTimeRange: { start: '09:00', end: '18:00' },
          cleaningTime: 10
        },
        requiresApproval: false
      },
      {
        name: '培训室D',
        description: '专门用于培训和研讨会，容纳30人',
        capacity: 30,
        location: '附楼1楼',
        equipment: {
          projector: { name: '高清投影仪', quantity: 2, available: true },
          whiteboard: { name: '移动白板', quantity: 4, available: true },
          videoConference: { name: '录播系统', quantity: 1, available: true },
          audioSystem: { name: '专业音响', quantity: 1, available: true },
          microphone: { name: '领夹麦克风', quantity: 10, available: true },
          airCondition: { name: '中央空调', available: true },
          wifi: { name: '高速WiFi', available: true },
          power: { name: '电源插座', quantity: 30, available: true },
          windows: { name: '大面积采光窗', available: true },
          podium: { name: '培训讲台', quantity: 1, available: true }
        },
        images: [
          'https://example.com/room-d-1.jpg',
          'https://example.com/room-d-2.jpg'
        ],
        rules: {
          advanceBookingDays: 14,
          maxDurationHours: 8,
          requiresApproval: true,
          allowedTimeRange: { start: '08:30', end: '21:00' },
          cleaningTime: 60
        },
        requiresApproval: true
      },
      {
        name: '董事会议室E',
        description: '高级董事会议室，配备顶级会议设备',
        capacity: 15,
        location: '主楼4楼顶层',
        equipment: {
          projector: { name: '4K激光投影仪', quantity: 1, available: true },
          whiteboard: { name: '智能交互屏', quantity: 2, available: true },
          videoConference: { name: '高清视频会议系统', quantity: 1, available: true },
          audioSystem: { name: '环绕声音响系统', quantity: 1, available: true },
          microphone: { name: '桌面麦克风', quantity: 15, available: true },
          airCondition: { name: '独立空调系统', available: true },
          wifi: { name: '专用高速网络', available: true },
          power: { name: '智能电源管理', quantity: 15, available: true },
          windows: { name: '全景落地窗', available: true },
          controlSystem: { name: '智能控制系统', quantity: 1, available: true },
          coffeeMachine: { name: '咖啡机', quantity: 1, available: true }
        },
        images: [
          'https://example.com/room-e-1.jpg',
          'https://example.com/room-e-2.jpg',
          'https://example.com/room-e-3.jpg'
        ],
        rules: {
          advanceBookingDays: 30,
          maxDurationHours: 6,
          requiresApproval: true,
          allowedTimeRange: { start: '08:00', end: '20:00' },
          cleaningTime: 45,
          restrictedAccess: true,
          minimumRank: 'manager'
        },
        requiresApproval: true
      },
      {
        name: '创意讨论室F',
        description: '轻松的创意空间，适合头脑风暴',
        capacity: 12,
        location: '附楼3楼',
        equipment: {
          whiteboard: { name: '落地玻璃白板', quantity: 3, available: true },
          videoConference: { name: '移动视频会议设备', quantity: 1, available: true },
          audioSystem: { name: '蓝牙音响', quantity: 2, available: true },
          airCondition: { name: '空调', available: true },
          wifi: { name: 'WiFi', available: true },
          power: { name: '地插电源', quantity: 8, available: true },
          furniture: { name: '懒人沙发', quantity: 12, available: true },
          supplies: { name: '便签纸和彩笔', available: true }
        },
        images: [
          'https://example.com/room-f-1.jpg'
        ],
        rules: {
          advanceBookingDays: 2,
          maxDurationHours: 3,
          requiresApproval: false,
          allowedTimeRange: { start: '09:00', end: '19:00' },
          cleaningTime: 15
        },
        requiresApproval: false
      }
    ]

    for (const roomData of rooms) {
      const existingRoom = await prisma.meetingRoom.findFirst({
        where: { name: roomData.name }
      })

      let room
      if (existingRoom) {
        room = await prisma.meetingRoom.update({
          where: { id: existingRoom.id },
          data: roomData
        })
        console.log(`✅ 更新会议室: ${room.name} (容量: ${room.capacity}人)`)
      } else {
        room = await prisma.meetingRoom.create({
          data: roomData
        })
        console.log(`✅ 创建会议室: ${room.name} (容量: ${room.capacity}人)`)
      }
    }

    // 8. 创建系统配置
    console.log('\n⚙️ 创建系统配置...')
    const systemConfigs = [
      {
        key: 'system.name',
        value: '智能会议室管理系统',
        description: '系统名称',
        category: 'system'
      },
      {
        key: 'system.version',
        value: '2.0.0',
        description: '系统版本',
        category: 'system'
      },
      {
        key: 'booking.advance_days',
        value: 7,
        description: '普通用户提前预约天数',
        category: 'booking'
      },
      {
        key: 'booking.advance_days_manager',
        value: 14,
        description: '经理提前预约天数',
        category: 'booking'
      },
      {
        key: 'booking.advance_days_admin',
        value: 30,
        description: '管理员提前预约天数',
        category: 'booking'
      },
      {
        key: 'booking.max_duration_hours',
        value: 4,
        description: '最长预约时长（小时）',
        category: 'booking'
      },
      {
        key: 'booking.auto_release_minutes',
        value: 15,
        description: '超时自动释放（分钟）',
        category: 'booking'
      },
      {
        key: 'booking.buffer_minutes',
        value: 15,
        description: '预约间隔缓冲时间（分钟）',
        category: 'booking'
      },
      {
        key: 'notification.email_enabled',
        value: true,
        description: '邮件通知开关',
        category: 'notification'
      },
      {
        key: 'notification.reminder_hours',
        value: [1, 24],
        description: '提醒时间（小时）',
        category: 'notification'
      },
      {
        key: 'cache.ttl.user_info',
        value: 1800,
        description: '用户信息缓存时间（秒）',
        category: 'cache'
      },
      {
        key: 'cache.ttl.room_list',
        value: 600,
        description: '会议室列表缓存时间（秒）',
        category: 'cache'
      },
      {
        key: 'security.max_login_attempts',
        value: 5,
        description: '最大登录尝试次数',
        category: 'security'
      },
      {
        key: 'security.lockout_duration_minutes',
        value: 30,
        description: '账户锁定时长（分钟）',
        category: 'security'
      },
      {
        key: 'audit.log_retention_days',
        value: 90,
        description: '审计日志保留天数',
        category: 'audit'
      }
    ]

    for (const configData of systemConfigs) {
      const config = await prisma.systemConfig.upsert({
        where: { key: configData.key },
        update: {},
        create: configData
      })
      console.log(`✅ 创建系统配置: ${config.key}`)
    }

    // 输出统计信息
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.meetingRoom.count(),
      prisma.systemConfig.count(),
      prisma.organization.count()
    ])

    const [userCount, roleCount, permissionCount, roomCount, configCount, orgCount] = stats

    console.log('\n🎉 数据库种子数据初始化完成！')
    console.log('\n📊 初始化统计:')
    console.log(`   👥 用户: ${userCount}`)
    console.log(`   🎭 角色: ${roleCount}`)
    console.log(`   🔐 权限: ${permissionCount}`)
    console.log(`   🏢 会议室: ${roomCount}`)
    console.log(`   ⚙️ 系统配置: ${configCount}`)
    console.log(`   🏛️ 组织: ${orgCount}`)
    console.log('\n📋 默认登录信息:')
    console.log('   系统管理员: admin@meeting.local / admin123456')
    console.log('   部门经理:   manager@meeting.local / manager123456')
    console.log('   普通用户:   user@meeting.local / user123456')

  } catch (error) {
    console.error('\n❌ 数据库种子数据初始化失败:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })