/**
 * 会议室相关的组合式函数
 */
import { useRoomStore } from '../stores/rooms'

export function useRooms() {
  const roomStore = useRoomStore()

  return {
    // Store 实例
    store: roomStore,

    // 计算属性
    availableRooms: computed(() => roomStore.availableRooms),
    maintenanceRooms: computed(() => roomStore.maintenanceRooms),
    roomsByLocation: (location: string) => roomStore.roomsByLocation(location),
    roomsByCapacity: (minCapacity: number) => roomStore.roomsByCapacity(minCapacity),
    getMainImage: (room: any) => roomStore.getMainImage(room),
    getStatusText: (status: string) => roomStore.getStatusText(status),
    getStatusColor: (status: string) => roomStore.getStatusColor(status),

    // 方法
    fetchRooms: roomStore.fetchRooms.bind(roomStore),
    fetchRoom: roomStore.fetchRoom.bind(roomStore),
    createRoom: roomStore.createRoom.bind(roomStore),
    updateRoom: roomStore.updateRoom.bind(roomStore),
    deleteRoom: roomStore.deleteRoom.bind(roomStore),
    updateRoomStatus: roomStore.updateRoomStatus.bind(roomStore),
    uploadRoomImage: roomStore.uploadRoomImage.bind(roomStore),
    setLoading: roomStore.setLoading.bind(roomStore),
    setError: roomStore.setError.bind(roomStore),
    setCurrentRoom: roomStore.setCurrentRoom.bind(roomStore),
    setFilters: roomStore.setFilters.bind(roomStore),
    resetFilters: roomStore.resetFilters.bind(roomStore),

    // 响应式状态
    rooms: computed(() => roomStore.rooms),
    currentRoom: computed(() => roomStore.currentRoom),
    loading: computed(() => roomStore.loading),
    error: computed(() => roomStore.error),
    pagination: computed(() => roomStore.pagination),
    filters: computed(() => roomStore.filters)
  }
}