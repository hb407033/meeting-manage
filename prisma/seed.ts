import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据库种子数据...')

  try {
    // 创建系统管理员用户
    const adminPassword = await bcrypt.hash('admin123456', 10)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@meeting.local' },
      update: {},
      create: {
        email: 'admin@meeting.local',
        name: '系统管理员',
        password: adminPassword, // 需要在User模型中添加password字段
        role: 'ADMIN',
        isActive: true,
      },
    })

    console.log('✅ 创建系统管理员用户:', admin.email)

    // 创建测试部门经理
    const managerPassword = await bcrypt.hash('manager123456', 10)
    const manager = await prisma.user.upsert({
      where: { email: 'manager@meeting.local' },
      update: {},
      create: {
        email: 'manager@meeting.local',
        name: '部门经理',
        password: managerPassword,
        role: 'MANAGER',
        department: '技术部',
        isActive: true,
      },
    })

    console.log('✅ 创建部门经理用户:', manager.email)

    // 创建测试普通用户
    const userPassword = await bcrypt.hash('user123456', 10)
    const user = await prisma.user.upsert({
      where: { email: 'user@meeting.local' },
      update: {},
      create: {
        email: 'user@meeting.local',
        name: '普通用户',
        password: userPassword,
        role: 'USER',
        department: '技术部',
        isActive: true,
      },
    })

    console.log('✅ 创建普通用户:', user.email)

    // 创建默认组织架构
    const organization = await prisma.organization.upsert({
      where: { id: 'default-org' },
      update: {},
      create: {
        id: 'default-org',
        name: '智能会议室管理系统',
        description: '默认组织架构',
        level: 1,
        isActive: true,
      },
    })

    console.log('✅ 创建默认组织架构:', organization.name)

    // 创建示例会议室
    const rooms = [
      {
        name: '大会议室A',
        description: '适合大型会议，配备完整视频会议设备',
        capacity: 50,
        minCapacity: 10,
        floor: '3楼',
        building: '主楼',
        hasProjector: true,
        hasWhiteboard: true,
        hasVideoConf: true,
        hasAudioSystem: true,
        hasAirCondition: true,
        hasWifi: true,
        hasPower: true,
        hasWindows: true,
        isAccessible: true,
        organizationId: organization.id,
      },
      {
        name: '小会议室B',
        description: '适合小型团队讨论',
        capacity: 8,
        minCapacity: 2,
        floor: '2楼',
        building: '主楼',
        hasProjector: true,
        hasWhiteboard: true,
        hasVideoConf: false,
        hasAudioSystem: false,
        hasAirCondition: true,
        hasWifi: true,
        hasPower: true,
        hasWindows: false,
        isAccessible: false,
        organizationId: organization.id,
      },
      {
        name: '培训室C',
        description: '专门用于培训和研讨',
        capacity: 30,
        minCapacity: 5,
        floor: '4楼',
        building: '附楼',
        hasProjector: true,
        hasWhiteboard: true,
        hasVideoConf: true,
        hasAudioSystem: true,
        hasAirCondition: true,
        hasWifi: true,
        hasPower: true,
        hasWindows: true,
        isAccessible: true,
        organizationId: organization.id,
      },
    ]

    for (const roomData of rooms) {
      const room = await prisma.meetingRoom.upsert({
        where: { name: roomData.name },
        update: {},
        create: roomData,
      })
      console.log('✅ 创建会议室:', room.name)
    }

    // 创建系统配置
    const systemConfigs = [
      {
        key: 'system.name',
        value: '智能会议室管理系统',
        description: '系统名称',
        category: 'system',
      },
      {
        key: 'system.version',
        value: '1.0.0',
        description: '系统版本',
        category: 'system',
      },
      {
        key: 'booking.advance_days',
        value: 30,
        description: '提前预约天数',
        category: 'booking',
      },
      {
        key: 'booking.max_duration_hours',
        value: 8,
        description: '最长预约时长（小时）',
        category: 'booking',
      },
      {
        key: 'booking.auto_release_minutes',
        value: 15,
        description: '超时自动释放（分钟）',
        category: 'booking',
      },
      {
        key: 'notification.email_enabled',
        value: true,
        description: '邮件通知开关',
        category: 'notification',
      },
      {
        key: 'cache.ttl.user_info',
        value: 1800,
        description: '用户信息缓存时间（秒）',
        category: 'cache',
      },
      {
        key: 'cache.ttl.room_list',
        value: 600,
        description: '会议室列表缓存时间（秒）',
        category: 'cache',
      },
    ]

    for (const configData of systemConfigs) {
      const config = await prisma.systemConfig.upsert({
        where: { key: configData.key },
        update: {},
        create: configData,
      })
      console.log('✅ 创建系统配置:', config.key)
    }

    console.log('🎉 数据库种子数据初始化完成！')
    console.log('')
    console.log('📋 默认登录信息:')
    console.log('   系统管理员: admin@meeting.local / admin123456')
    console.log('   部门经理:   manager@meeting.local / manager123456')
    console.log('   普通用户:   user@meeting.local / user123456')
    console.log('')

  } catch (error) {
    console.error('❌ 数据库种子数据初始化失败:', error)
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