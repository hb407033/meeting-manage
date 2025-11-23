/**
 * 会议室种子数据
 * 创建一些基础会议室用于测试
 */

import Prisma from './server/services/database'

const rooms = [
  {
    name: '会议室A',
    description: '小型会议室，适合团队讨论',
    capacity: 6,
    location: '1楼',
    equipment: ['投影仪', '白板', '电话会议'],
    status: 'AVAILABLE',
    requiresApproval: false
  },
  {
    name: '会议室B',
    description: '中型会议室，适合部门会议',
    capacity: 12,
    location: '2楼',
    equipment: ['投影仪', '音响系统', '视频会议'],
    status: 'AVAILABLE',
    requiresApproval: true
  },
  {
    name: '会议室C',
    description: '大型会议室，适合全员会议',
    capacity: 30,
    location: '3楼',
    equipment: ['投影仪', '音响系统', '视频会议', '录播设备'],
    status: 'AVAILABLE',
    requiresApproval: true
  }
]

async function seedRooms() {
  try {
    console.log('🏢 开始创建会议室数据...')

    for (const room of rooms) {
      const existingRoom = await Prisma.meetingRoom.findFirst({
        where: { name: room.name }
      })

      if (existingRoom) {
        console.log(`✅ 会议室 ${room.name} 已存在，跳过创建`)
        continue
      }

      await Prisma.meetingRoom.create({
        data: {
          ...room,
          equipment: room.equipment
        }
      })

      console.log(`✅ 创建会议室: ${room.name}`)
    }

    console.log('🎉 会议室数据创建完成!')

    // 查看创建的会议室
    const totalRooms = await Prisma.meetingRoom.count()
    console.log(`📊 当前总会议室数: ${totalRooms}`)

  } catch (error) {
    console.error('❌ 创建会议室失败:', error)
    throw error
  } finally {
    await Prisma.$disconnect()
  }
}

// 如果直接运行此文件
seedRooms()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

export { seedRooms }