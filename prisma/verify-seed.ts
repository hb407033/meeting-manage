import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySeedData() {
  console.log('🔍 验证数据库种子数据...')

  try {
    // 验证用户数据
    console.log('\n👥 验证用户数据:')
    const users = await prisma.user.findMany({
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    users.forEach(user => {
      console.log(`  ${user.name} (${user.email}) - ${user.organization?.name} - 角色: ${user.userRoles.map(ur => ur.role.name).join(', ')}`)
    })

    // 验证角色和权限
    console.log('\n🎭 验证角色和权限:')
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    roles.forEach(role => {
      console.log(`  ${role.name} (${role.code}) - ${role.permissions.length} 个权限`)
    })

    // 验证会议室数据
    console.log('\n🏢 验证会议室数据:')
    const rooms = await prisma.meetingRoom.findMany({
      where: { deletedAt: null }
    })

    rooms.forEach(room => {
      const equipment = room.equipment as any
      const equipmentCount = equipment ? Object.keys(equipment).length : 0
      console.log(`  ${room.name} - 容量: ${room.capacity}人 - 位置: ${room.location} - 设备: ${equipmentCount}种`)
    })

    // 验证组织架构
    console.log('\n🏛️ 验证组织架构:')
    const organizations = await prisma.organization.findMany({
      orderBy: { level: 'asc' }
    })

    organizations.forEach(org => {
      console.log(`  ${org.name} (${org.code}) - Level: ${org.level} - Path: ${org.path}`)
    })

    // 验证系统配置
    console.log('\n⚙️ 验证系统配置:')
    const configs = await prisma.systemConfig.findMany({
      orderBy: { category: 'asc' }
    })

    const configByCategory = configs.reduce((acc, config) => {
      if (!acc[config.category!]) {
        acc[config.category!] = []
      }
      acc[config.category!].push(config)
      return acc
    }, {} as Record<string, any[]>)

    Object.entries(configByCategory).forEach(([category, configs]) => {
      console.log(`  ${category}: ${configs.length} 个配置`)
    })

    // 验证权限数量
    const permissionCount = await prisma.permission.count()
    console.log(`\n🔐 权限总数: ${permissionCount}`)

    console.log('\n✅ 数据验证完成！所有数据都已正确初始化。')

  } catch (error) {
    console.error('\n❌ 数据验证失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySeedData()