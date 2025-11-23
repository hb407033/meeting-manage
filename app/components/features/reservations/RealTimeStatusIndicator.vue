<template>
  <!-- 实时状态指示器 -->
  <div class="fixed bottom-4 left-4 z-50">
    <div
      class="bg-white rounded-lg shadow-lg border border-gray-200 p-3"
      :class="{ 'bg-yellow-50': !isConnected, 'bg-green-50': isConnected }"
    >
      <div class="flex items-center space-x-2">
        <!-- 连接状态指示器 -->
        <div class="flex-shrink-0">
          <div
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500 animate-pulse': isConnected,
              'bg-yellow-500 animate-bounce': !isConnected
            }"
          ></div>
        </div>

        <!-- 状态文本 -->
        <div class="text-sm">
          <span
            :class="{
              'text-green-800': isConnected,
              'text-yellow-800': !isConnected
            }"
          >
            {{ statusText }}
          </span>
        </div>

        <!-- 重连按钮 -->
        <button
          v-if="!isConnected && reconnectAttempts < maxReconnectAttempts"
          @click="manuallyReconnect"
          class="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
        >
          重连
        </button>
      </div>

      <!-- 最后更新时间 -->
      <div v-if="lastUpdate" class="mt-1 text-xs text-gray-500">
        更新: {{ formatTime(lastUpdate) }}
      </div>

      <!-- 连接统计 -->
      <div v-if="showStats" class="mt-2 pt-2 border-t border-gray-200">
        <div class="text-xs text-gray-600">
          <div>重连次数: {{ reconnectAttempts }}</div>
          <div>消息数: {{ messageCount }}</div>
          <div>延迟: {{ latency }}ms</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 组件属性
interface Props {
  showStats?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  showStats: false,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000, // 3秒
  heartbeatInterval: 30000 // 30秒
})

// 组件事件
interface Emits {
  connected: []
  disconnected: [error: Error]
  messageReceived: [message: any]
  reconnected: []
}

const emit = defineEmits<Emits>()

// 响应式数据
const isConnected = ref(false)
const reconnectAttempts = ref(0)
const lastUpdate = ref<Date | null>(null)
const messageCount = ref(0)
const latency = ref(0)

let socket: any = null
let reconnectTimer: NodeJS.Timeout | null = null
let heartbeatTimer: NodeJS.Timeout | null = null
let heartbeatTimeout: NodeJS.Timeout | null = null

// 计算属性
const statusText = computed(() => {
  if (isConnected.value) {
    return '实时连接'
  } else if (reconnectAttempts.value === 0) {
    return '连接中...'
  } else if (reconnectAttempts.value >= props.maxReconnectAttempts) {
    return '连接失败'
  } else {
    return '重连中...'
  }
})

// 方法
const connect = () => {
  try {
    // 这里需要集成实际的WebSocket连接
    // 暂时使用模拟连接
    simulateConnection()
  } catch (error) {
    console.error('WebSocket连接失败:', error)
    handleDisconnect(error as Error)
  }
}

const disconnect = () => {
  if (socket) {
    socket.close()
    socket = null
  }
  clearTimers()
  isConnected.value = false
}

const clearTimers = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout)
    heartbeatTimeout = null
  }
}

const handleConnect = () => {
  isConnected.value = true
  reconnectAttempts.value = 0
  lastUpdate.value = new Date()

  emit('connected')

  // 启动心跳检测
  startHeartbeat()
}

const handleDisconnect = (error: Error) => {
  isConnected.value = false
  clearTimers()

  emit('disconnected', error)

  // 尝试重连
  if (reconnectAttempts.value < props.maxReconnectAttempts) {
    scheduleReconnect()
  }
}

const scheduleReconnect = () => {
  reconnectAttempts.value++

  reconnectTimer = setTimeout(() => {
    console.log(`尝试重连 (${reconnectAttempts.value}/${props.maxReconnectAttempts})`)
    connect()
  }, props.reconnectInterval)
}

const manuallyReconnect = () => {
  reconnectAttempts.value = 0
  connect()
}

const startHeartbeat = () => {
  heartbeatTimer = setInterval(() => {
    sendHeartbeat()
  }, props.heartbeatInterval)
}

const sendHeartbeat = () => {
  const startTime = Date.now()

  try {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'ping', timestamp: startTime }))

      // 设置心跳超时
      heartbeatTimeout = setTimeout(() => {
        console.warn('心跳超时，可能连接已断开')
        handleDisconnect(new Error('心跳超时'))
      }, 5000)
    }
  } catch (error) {
    console.error('发送心跳失败:', error)
    handleDisconnect(error as Error)
  }
}

const handleHeartbeatResponse = (timestamp: number) => {
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout)
    heartbeatTimeout = null
  }

  latency.value = Date.now() - timestamp
  lastUpdate.value = new Date()
}

const handleMessage = (message: any) => {
  messageCount.value++
  lastUpdate.value = new Date()

  // 处理心跳响应
  if (message.type === 'pong') {
    handleHeartbeatResponse(message.timestamp)
    return
  }

  // 处理其他消息
  emit('messageReceived', message)
}

// 模拟连接（用于演示）
const simulateConnection = () => {
  console.log('模拟WebSocket连接...')

  // 模拟连接延迟
  setTimeout(() => {
    handleConnect()

    // 模拟接收消息
    const messageInterval = setInterval(() => {
      if (isConnected.value) {
        const mockMessage = {
          type: 'update',
          data: {
            reservationCount: Math.floor(Math.random() * 100),
            availableRooms: Math.floor(Math.random() * 20),
            timestamp: Date.now()
          }
        }
        handleMessage(mockMessage)
      } else {
        clearInterval(messageInterval)
      }
    }, 10000) // 每10秒模拟一条消息

  }, 1000)
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  connect()
})

onUnmounted(() => {
  disconnect()
})

// 页面可见性变化处理
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面隐藏时暂停心跳
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  } else {
    // 页面显示时恢复心跳
    if (isConnected.value) {
      startHeartbeat()
    }
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
/* 固定定位样式 */
.fixed {
  position: fixed;
}

/* 状态指示器动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* 阴影效果 */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>