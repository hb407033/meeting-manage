/**
 * API调试测试脚本
 * 用于演示如何调试 Nuxt 3 API
 */

const API_BASE_URL = 'http://localhost:3002/api/v1'

// 测试数据
const testRoomData = {
  name: '调试测试会议室',
  description: '这是一个用于调试的会议室',
  capacity: 20,
  location: '测试楼层',
  equipment: {
    projector: true,
    whiteboard: true,
    videoConference: false
  },
  images: [],
  rules: ['禁止吸烟', '保持安静'],
  requiresApproval: false,
  status: 'AVAILABLE'
}

/**
 * 发送POST请求创建会议室
 */
async function testCreateRoom() {
  console.log('🚀 开始测试创建会议室API...')

  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 注意：在实际使用中，你需要添加有效的认证token
        // 'Authorization': 'Bearer your-token-here'
      },
      body: JSON.stringify(testRoomData)
    })

    console.log('📡 响应状态:', response.status, response.statusText)
    console.log('📡 响应头:', Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log('📡 响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 会议室创建成功!')
      return data.data
    } else {
      console.log('❌ 会议室创建失败:', data.message)
      return null
    }
  } catch (error) {
    console.error('💥 请求失败:', error.message)
    console.error('💥 错误详情:', error)
    return null
  }
}

/**
 * 测试GET请求获取会议室列表
 */
async function testGetRooms() {
  console.log('\n🚀 开始测试获取会议室列表API...')

  try {
    const response = await fetch(`${API_BASE_URL}/rooms?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer your-token-here'
      }
    })

    console.log('📡 响应状态:', response.status, response.statusText)

    const data = await response.json()
    console.log('📡 响应数据:', JSON.stringify(data, null, 2))

    return data.data
  } catch (error) {
    console.error('💥 请求失败:', error.message)
    return null
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('\n🚀 开始测试错误处理...')

  try {
    // 发送无效数据
    const invalidData = {
      // 缺少必需的字段
      capacity: -1, // 无效的容量
      location: ''   // 空位置
    }

    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    })

    console.log('📡 错误响应状态:', response.status, response.statusText)

    const data = await response.json()
    console.log('📡 错误响应数据:', JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('💥 错误测试失败:', error.message)
  }
}

/**
 * 运行所有测试
 */
async function runDebugTests() {
  console.log('🔍 开始API调试测试...')
  console.log('🔍 API基础URL:', API_BASE_URL)
  console.log('=' * 50)

  // 1. 测试创建会议室
  const createdRoom = await testCreateRoom()

  // 2. 测试获取会议室列表
  await testGetRooms()

  // 3. 测试错误处理
  await testErrorHandling()

  console.log('\n✅ 调试测试完成!')
  console.log('💡 提示: 查看服务器控制台输出以查看调试信息')
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runDebugTests().catch(console.error)
}

export { testCreateRoom, testGetRooms, testErrorHandling, runDebugTests }