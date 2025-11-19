/**
 * 周期性预约功能的种子数据
 * 运行: tsx prisma/seed-recurring.ts
 */

import { PrismaClient } from '@prisma/client'
import { RecurrenceRuleEngine, RecurrencePattern, WeekDay } from '../server/types/recurrence'

const prisma = new PrismaClient()

async function seedRecurringReservations() {
  console.log('🌱 开始初始化周期性预约种子数据...')

  try {
    // 获取现有用户和会议室
    const users = await prisma.user.findMany({
      where: { isActive: true }
    })

    const rooms = await prisma.meetingRoom.findMany({
      where: { status: 'AVAILABLE' }
    })

    if (users.length === 0) {
      console.log('❌ 没有找到用户，请先运行基础种子数据')
      return
    }

    if (rooms.length === 0) {
      console.log('❌ 没有找到会议室，请先运行基础种子数据')
      return
    }

    const demoUser = users[0]
    const demoRoom = rooms[0]

    console.log(`✅ 使用演示用户: ${demoUser.name}`)
    console.log(`✅ 使用演示会议室: ${demoRoom.name}`)

    // 示例1: 每日站会
    const dailyStandupPattern: RecurrencePattern = {
      type: 'daily',
      interval: 1,
      endCondition: 'count',
      endCount: 30, // 30次
      skipHolidays: true,
      holidayRegion: 'CN'
    }

    const dailyStandupRRule = RecurrenceRuleEngine.rruleToString(
      RecurrenceRuleEngine.patternToRRule(dailyStandupPattern)
    )

    const dailyStandup = await prisma.recurringReservation.create({
      data: {
        title: '每日站会',
        description: '团队每日同步会议',
        organizerId: demoUser.id,
        roomId: demoRoom.id,
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T09:30:00Z'),
        recurrenceRule: dailyStandupRRule,
        timezone: 'Asia/Shanghai',
        endCondition: 'COUNT',
        endAfterOccurrences: 30,
        status: 'ACTIVE',
        skipHolidays: true,
        holidayRegion: 'CN',
        bufferMinutes: 15,
        maxBookingAhead: 90
      }
    })

    console.log(`✅ 创建每日站会周期性预约: ${dailyStandup.id}`)

    // 示例2: 每周回顾会议
    const weeklyReviewPattern: RecurrencePattern = {
      type: 'weekly',
      interval: 1,
      weekDays: [WeekDay.FR],
      endCondition: 'never',
      skipHolidays: true,
      holidayRegion: 'CN'
    }

    const weeklyReviewRRule = RecurrenceRuleEngine.rruleToString(
      RecurrenceRuleEngine.patternToRRule(weeklyReviewPattern)
    )

    const weeklyReview = await prisma.recurringReservation.create({
      data: {
        title: '每周回顾会议',
        description: '团队每周工作回顾和计划',
        organizerId: demoUser.id,
        roomId: demoRoom.id,
        startTime: new Date('2024-01-12T16:00:00Z'),
        endTime: new Date('2024-01-12T17:00:00Z'),
        recurrenceRule: weeklyReviewRRule,
        timezone: 'Asia/Shanghai',
        endCondition: 'NEVER',
        status: 'ACTIVE',
        skipHolidays: true,
        holidayRegion: 'CN',
        bufferMinutes: 30,
        maxBookingAhead: 180
      }
    })

    console.log(`✅ 创建每周回顾周期性预约: ${weeklyReview.id}`)

    // 示例3: 每月技术分享
    const monthlyTechTalkPattern: RecurrencePattern = {
      type: 'monthly',
      interval: 1,
      monthlyPattern: 'weekday',
      monthlyWeek: 2, // 第二个星期
      monthlyWeekDay: WeekDay.TH, // 星期四
      endCondition: 'date',
      endDate: new Date('2024-12-31T23:59:59Z'),
      skipHolidays: true,
      holidayRegion: 'CN'
    }

    const monthlyTechTalkRRule = RecurrenceRuleEngine.rruleToString(
      RecurrenceRuleEngine.patternToRRule(monthlyTechTalkPattern)
    )

    const monthlyTechTalk = await prisma.recurringReservation.create({
      data: {
        title: '每月技术分享',
        description: '技术团队月度分享和讨论',
        organizerId: demoUser.id,
        roomId: demoRoom.id,
        startTime: new Date('2024-01-11T14:00:00Z'),
        endTime: new Date('2024-01-11T16:00:00Z'),
        recurrenceRule: monthlyTechTalkRRule,
        timezone: 'Asia/Shanghai',
        endCondition: 'DATE',
        endDate: new Date('2024-12-31T23:59:59Z'),
        status: 'ACTIVE',
        skipHolidays: true,
        holidayRegion: 'CN',
        bufferMinutes: 60,
        maxBookingAhead: 365
      }
    })

    console.log(`✅ 创建每月技术分享周期性预约: ${monthlyTechTalk.id}`)

    // 创建一些例外日期示例
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(9, 30, 0, 0)

    // 为每日站会创建一个例外（取消明天的会议）
    const dailyStandupException = await prisma.recurringException.create({
      data: {
        recurringReservationId: dailyStandup.id,
        exceptionType: 'CANCELLED',
        originalStartTime: tomorrow,
        originalEndTime: tomorrowEnd,
        reason: '因团队外出活动取消'
      }
    })

    console.log(`✅ 创建每日站会例外: ${dailyStandupException.id}`)

    // 为每周回顾创建一个修改例外
    const nextFriday = new Date()
    while (nextFriday.getDay() !== 5) { // 5 = Friday
      nextFriday.setDate(nextFriday.getDate() + 1)
    }
    nextFriday.setHours(16, 0, 0, 0)

    const nextFridayEnd = new Date(nextFriday)
    nextFridayEnd.setHours(17, 0, 0, 0)

    const nextFridayModified = new Date(nextFriday)
    nextFridayModified.setHours(15, 0, 0, 0)

    const nextFridayModifiedEnd = new Date(nextFridayModified)
    nextFridayModifiedEnd.setHours(16, 30, 0, 0)

    const weeklyReviewException = await prisma.recurringException.create({
      data: {
        recurringReservationId: weeklyReview.id,
        exceptionType: 'MODIFIED',
        originalStartTime: nextFriday,
        originalEndTime: nextFridayEnd,
        newStartTime: nextFridayModified,
        newEndTime: nextFridayModifiedEnd,
        reason: '提前一小时开始，因其他会议冲突'
      }
    })

    console.log(`✅ 创建每周回顾修改例外: ${weeklyReviewException.id}`)

    // 添加更多的节假日数据（2025年）
    const holidays2025 = [
      { name: '元旦', date: '2025-01-01' },
      { name: '春节', date: '2025-01-28' },
      { name: '春节', date: '2025-01-29' },
      { name: '春节', date: '2025-01-30' },
      { name: '春节', date: '2025-01-31' },
      { name: '春节', date: '2025-02-01' },
      { name: '春节', date: '2025-02-02' },
      { name: '春节', date: '2025-02-03' },
      { name: '清明节', date: '2025-04-05' },
      { name: '劳动节', date: '2025-05-01' },
      { name: '端午节', date: '2025-05-31' },
      { name: '中秋节', date: '2025-10-06' },
      { name: '国庆节', date: '2025-10-01' },
      { name: '国庆节', date: '2025-10-02' },
      { name: '国庆节', date: '2025-10-03' },
      { name: '国庆节', date: '2025-10-04' },
      { name: '国庆节', date: '2025-10-05' },
      { name: '国庆节', date: '2025-10-06' },
      { name: '国庆节', date: '2025-10-07' },
      { name: '国庆节', date: '2025-10-08' }
    ]

    for (const holiday of holidays2025) {
      await prisma.holiday.create({
        data: {
          name: holiday.name,
          date: new Date(holiday.date),
          region: 'CN',
          type: 'PUBLIC',
          description: `${holiday.name}假期`,
          isActive: true
        }
      })
    }

    console.log(`✅ 添加了 ${holidays2025.length} 个2025年节假日`)

    console.log('\n🎉 周期性预约种子数据初始化完成!')
    console.log('\n📋 创建的周期性预约:')
    console.log(`  1. ${dailyStandup.title} (每日)`)
    console.log(`  2. ${weeklyReview.title} (每周五)`)
    console.log(`  3. ${monthlyTechTalk.title} (每月第二个周四)`)
    console.log('\n📋 创建的例外日期:')
    console.log(`  1. ${dailyStandupException.reason}`)
    console.log(`  2. ${weeklyReviewException.reason}`)
    console.log('\n📋 添加的节假日:')
    console.log(`  2024年: 15个中国节假日`)
    console.log(`  2025年: ${holidays2025.length}个中国节假日`)

  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 如果直接运行此文件
seedRecurringReservations()
  .then(() => {
    console.log('\n✅ 种子数据脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 种子数据脚本执行失败:', error)
    process.exit(1)
  })

export default seedRecurringReservations