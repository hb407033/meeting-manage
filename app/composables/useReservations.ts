/**
 * 预约相关功能的 Composable
 * 提供预约的增删改查和快捷操作功能
 * 这个composable作为store方法的代理，所有实际API请求都在store中处理
 */

import { computed } from 'vue'
import { useReservationStore } from '~/stores/reservations'
import type { Reservation } from '~/stores/reservations'

export interface QuickReservationData {
  title: string
  startTime: string
  endTime: string
  organizerId: string
  roomId?: string
  description?: string
  attendeeCount: number
}

export function useReservations() {
  const reservationStore = useReservationStore()

  /**
   * 创建快速预约
   */
  const createQuickReservation = async (data: QuickReservationData): Promise<Reservation> => {
    return await reservationStore.createQuickReservation(data)
  }

  /**
   * 取消预约
   */
  const cancelReservation = async (reservationId: string): Promise<void> => {
    return await reservationStore.deleteReservation(reservationId)
  }

  /**
   * 延长预约时间
   */
  const extendReservation = async (reservationId: string, additionalMinutes: number = 30): Promise<Reservation> => {
    return await reservationStore.extendReservation(reservationId, additionalMinutes)
  }

  /**
   * 获取用户当前和即将开始的预约
   */
  const getCurrentUserReservation = async (userId: string): Promise<Reservation[]> => {
    return await reservationStore.fetchCurrentUserReservations(userId)
  }

  /**
   * 查找可用会议室
   */
  const findAvailableRoom = async (startTime: string, endTime: string, attendeeCount?: number) => {
    return await reservationStore.findAvailableRoom(startTime, endTime, attendeeCount)
  }

  /**
   * 获取会议室列表
   */
  const getAvailableRooms = async (filters?: {
    startTime?: string
    endTime?: string
    capacity?: number
    location?: string
  }) => {
    return await reservationStore.fetchAvailableRooms(filters)
  }

  /**
   * 获取预约统计信息
   */
  const getUserReservationStats = async (userId: string) => {
    return await reservationStore.fetchUserReservationStats(userId)
  }

  /**
   * 检查时间冲突
   */
  const checkTimeConflict = async (roomId: string, startTime: string, endTime: string, excludeId?: string) => {
    return await reservationStore.checkTimeConflict(roomId, startTime, endTime, excludeId)
  }

  /**
   * 格式化预约时间
   */
  const formatReservationTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()

    const isToday = start.toDateString() === now.toDateString()
    const isTomorrow = start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()

    const dateStr = isToday ? '今天' : isTomorrow ? '明天' : start.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })

    const timeStr = start.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })

    const endTimeStr = end.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })

    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    return {
      date: dateStr,
      startTime: timeStr,
      endTime: endTimeStr,
      duration: `${duration}分钟`,
      fullDateTime: `${dateStr} ${timeStr}-${endTimeStr}`
    }
  }

  /**
   * 获取预约状态文本
   */
  const getReservationStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': '待确认',
      'CONFIRMED': '已确认',
      'IN_PROGRESS': '进行中',
      'COMPLETED': '已完成',
      'CANCELLED': '已取消'
    }
    return statusMap[status] || status
  }

  /**
   * 获取预约状态颜色
   */
  const getReservationStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'PENDING': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'CONFIRMED': 'text-green-600 bg-green-50 border-green-200',
      'IN_PROGRESS': 'text-blue-600 bg-blue-50 border-blue-200',
      'COMPLETED': 'text-gray-600 bg-gray-50 border-gray-200',
      'CANCELLED': 'text-red-600 bg-red-50 border-red-200'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return {
    // 状态 - 来自store的响应式状态
    loading: computed(() => reservationStore.loading),
    error: computed(() => reservationStore.error),
    reservations: computed(() => reservationStore.reservations),
    currentReservation: computed(() => reservationStore.currentReservation),

    // 方法 - 直接调用store方法
    createQuickReservation,
    cancelReservation,
    extendReservation,
    getCurrentUserReservation,
    findAvailableRoom,
    getAvailableRooms,
    getUserReservationStats,
    checkTimeConflict,
    formatReservationTime,
    getReservationStatusText,
    getReservationStatusColor,

    // 直接暴露常用的store getters
    confirmedReservations: computed(() => reservationStore.confirmedReservations),
    pendingReservations: computed(() => reservationStore.pendingReservations),
    cancelledReservations: computed(() => reservationStore.cancelledReservations),
    completedReservations: computed(() => reservationStore.completedReservations),
    todayReservations: computed(() => reservationStore.todayReservations),
    upcomingReservations: computed(() => reservationStore.upcomingReservations),
    ongoingReservations: computed(() => reservationStore.ongoingReservations)
  }
}