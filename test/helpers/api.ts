import { $fetch } from 'ohmyfetch'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export interface TestUser {
  id?: number
  email: string
  password: string
  name: string
  role?: string
  isActive?: boolean
  accessToken?: string
  refreshToken?: string
}

export interface TestRoom {
  id?: number
  name: string
  capacity: number
  location: string
  equipment: string[]
  isActive?: boolean
}

export interface TestReservation {
  id?: number
  userId: number
  roomId: number
  startTime: Date
  endTime: Date
  title: string
  description?: string
  status?: string
}

export class ApiTestHelper {
  private baseUrl: string

  constructor(baseUrl = process.env.TEST_API_URL || 'http://localhost:3000/api') {
    this.baseUrl = baseUrl
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await $fetch(url, {
        ...options,
        ignoreResponseError: true
      })

      return response as ApiResponse<T>
    } catch (error) {
      if (error instanceof Response) {
        const errorData = await error.json()
        return {
          success: false,
          error: errorData.error || 'Request failed',
          statusCode: error.status
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async registerUser(userData: Partial<TestUser>): Promise<ApiResponse<TestUser>> {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'USER'
    }

    const user = { ...defaultUser, ...userData }
    const response = await this.request<TestUser>('/auth/register', {
      method: 'POST',
      body: user
    })

    // 如果注册成功，提取token
    if (response.success && response.data) {
      const loginResponse = await this.loginUser({
        email: user.email,
        password: user.password
      })

      if (loginResponse.success && loginResponse.data) {
        response.data.accessToken = loginResponse.data.tokens?.accessToken
        response.data.refreshToken = loginResponse.data.tokens?.refreshToken
      }
    }

    return response
  }

  async loginUser(credentials: {
    email: string
    password: string
  }): Promise<ApiResponse<{ user: TestUser; tokens: any }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials
    })
  }

  async createRoom(
    roomData: Partial<TestRoom>,
    accessToken: string
  ): Promise<ApiResponse<TestRoom>> {
    const defaultRoom: TestRoom = {
      name: `Test Room ${Date.now()}`,
      capacity: 10,
      location: 'Test Building',
      equipment: ['Projector', 'Whiteboard'],
      isActive: true
    }

    const room = { ...defaultRoom, ...roomData }
    return this.request<TestRoom>('/rooms', {
      method: 'POST',
      body: room,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }

  async createReservation(
    reservationData: Partial<TestReservation>,
    accessToken: string
  ): Promise<ApiResponse<TestReservation>> {
    const defaultReservation: Omit<TestReservation, 'id'> = {
      userId: 0, // 需要从token中获取或传入
      roomId: 0, // 需要传入
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
      title: 'Test Meeting',
      description: 'Test meeting description',
      status: 'CONFIRMED'
    }

    const reservation = { ...defaultReservation, ...reservationData }
    return this.request<TestReservation>('/reservations', {
      method: 'POST',
      body: reservation,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }

  async getHealth(): Promise<ApiResponse> {
    return this.request('/health')
  }

  async getUserProfile(accessToken: string): Promise<ApiResponse<TestUser>> {
    return this.request<TestUser>('/auth/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }

  async getRooms(accessToken?: string): Promise<ApiResponse<TestRoom[]>> {
    const headers: Record<string, string> = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    return this.request<TestRoom[]>('/rooms', {
      headers
    })
  }

  async getReservations(
    accessToken: string,
    filters?: Record<string, any>
  ): Promise<ApiResponse<TestReservation[]>> {
    const url = filters ? `/reservations?${new URLSearchParams(filters)}` : '/reservations'
    return this.request<TestReservation[]>(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }

  async deleteRoom(roomId: number, accessToken: string): Promise<ApiResponse> {
    return this.request(`/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }

  async deleteReservation(
    reservationId: number,
    accessToken: string
  ): Promise<ApiResponse> {
    return this.request(`/reservations/${reservationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
  }

  // 生成测试数据
  generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'USER',
      isActive: true,
      ...overrides
    }
  }

  generateTestRoom(overrides: Partial<TestRoom> = {}): TestRoom {
    return {
      name: `Test Room ${Date.now()}`,
      capacity: 10,
      location: 'Test Building',
      equipment: ['Projector', 'Whiteboard'],
      isActive: true,
      ...overrides
    }
  }

  generateTestReservation(
    userId: number,
    roomId: number,
    overrides: Partial<TestReservation> = {}
  ): TestReservation {
    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1小时后

    return {
      userId,
      roomId,
      startTime,
      endTime,
      title: 'Test Meeting',
      description: 'Test meeting description',
      status: 'CONFIRMED',
      ...overrides
    }
  }
}

// 导出单例实例
export const apiTestHelper = new ApiTestHelper()