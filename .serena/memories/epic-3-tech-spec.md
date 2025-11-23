# Epic 3 技术规范详细说明

## Epic 3: 预约系统核心技术规范

### 核心功能模块

#### 1. 预约服务层 (Reservation Service)
- **ReservationManager**: 核心预约业务逻辑
  - 创建、更新、取消预约
  - 预约验证和权限检查
  - 与会议室管理的集成

- **ConflictDetectionEngine**: 冲突检测引擎
  - 实时冲突检测算法 (< 100ms响应)
  - 完全冲突、部分重叠、容量冲突识别
  - 智能时间推荐和替代会议室

- **AvailabilityChecker**: 可用性检查
  - 多会议室批量查询
  - Redis缓存优化 (5分钟TTL)
  - 实时状态同步

- **RecurringReservationHandler**: 周期性预约
  - rrule格式解析和生成
  - 特殊日期处理 (节假日跳过)
  - 批量冲突检查

- **ReservationStateManager**: 状态机管理
  - PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
  - CANCELLED 状态转换
  - 状态变更审计日志

#### 2. 数据库设计扩展

```prisma
model Reservation {
  id           String             @id @default(cuid())
  title        String
  description  String?
  startTime    DateTime
  endTime      DateTime
  status       ReservationStatus  @default(PENDING)
  meetingType  String?
  attendeeCount Int?
  equipment    Json?              // 设备需求清单
  services     Json?              // 服务需求配置
  notes        String?
  isRecurring  Boolean            @default(false)
  recurringPattern Json?          // rrule格式的重复模式
  parentReservationId String?     // 父预约ID(用于周期性预约)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  // 关联关系
  userId       String
  user         User               @relation(fields: [userId], references: [id])
  roomId       String
  room         MeetingRoom        @relation(fields: [roomId], references: [id])
  checkIns     CheckIn[]

  // 索引优化
  @@index([roomId, startTime, endTime])
  @@index([userId, startTime])
  @@index([status])
  @@map("reservations")
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model ReservationConflict {
  id            String   @id @default(cuid())
  reservationId String
  conflictType  String   // TIME_CONFLICT, CAPACITY_CONFLICT, EQUIPMENT_CONFLICT
  conflictWithId String  // 冲突的预约ID
  resolution    String?  // 建议的解决方案
  createdAt     DateTime @default(now())
  
  @@map("reservation_conflicts")
}
```

#### 3. API设计规范

##### 核心预约API
```typescript
// 创建预约
POST /api/v1/reservations
{
  title: string
  roomId: string
  startTime: string  // ISO datetime
  endTime: string    // ISO datetime
  description?: string
  attendeeCount?: number
  equipment?: Record<string, any>
  services?: Record<string, any>
  isRecurring?: boolean
  recurringPattern?: RecurringPattern
}

// 检查可用性
POST /api/v1/reservations/availability
{
  roomIds?: string[]
  startTime: string
  endTime: string
  includeUnavailable?: boolean
}

// 冲突检测
POST /api/v1/reservations/conflict-check
{
  roomId: string
  startTime: string
  endTime: string
  excludeReservationId?: string
}

// 周期性预约
POST /api/v1/reservations/recurring
{
  title: string
  roomId: string
  recurringPattern: RecurringPattern
  // ... 其他字段
}
```

##### TypeScript接口定义
```typescript
interface RecurringPattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  interval: number
  endDate?: string
  count?: number
  daysOfWeek?: number[]
}

interface CreateReservationRequest {
  title: string
  roomId: string
  startTime: string
  endTime: string
  description?: string
  attendeeCount?: number
  equipment?: Record<string, any>
  services?: Record<string, any>
  notes?: string
  isRecurring?: boolean
  recurringPattern?: RecurringPattern
}

interface AvailabilityResponse {
  available: boolean
  conflicts?: Reservation[]
  suggestions?: TimeSlot[]
  alternativeRooms?: MeetingRoom[]
}
```

#### 4. 前端组件架构

##### 核心组件
```vue
<!-- 日历视图主组件 -->
<CalendarView 
  :rooms="rooms"
  :selectedRoom="selectedRoom"
  :reservations="reservations"
  @timeSlotSelect="handleTimeSlotSelect"
  @reservationCreate="handleReservationCreate"
/>

<!-- 快速预约对话框 -->
<QuickReservationDialog
  v-model="visible"
  :room="selectedRoom"
  :timeSlot="selectedTimeSlot"
  @confirm="handleQuickReservation"
/>

<!-- 详细预约向导 -->
<DetailedReservationWizard
  v-model="visible"
  :steps="['basic', 'equipment', 'attendees', 'confirm']"
  :room="selectedRoom"
  :timeSlot="selectedTimeSlot"
  @complete="handleDetailedReservation"
/>

<!-- 冲突检测和解决 -->
<ConflictDetector
  :roomId="roomId"
  :startTime="startTime"
  :endTime="endTime"
  @conflictDetected="handleConflictDetected"
/>

<ConflictResolutionDialog
  v-model="visible"
  :conflicts="conflicts"
  :suggestions="suggestions"
  @resolve="handleConflictResolution"
/>
```

##### 状态管理 (Pinia)
```typescript
export const useReservationsStore = defineStore('reservations', {
  state: () => ({
    reservations: [],
    loading: false,
    conflicts: [],
    selectedTimeSlot: null,
    calendarView: 'week' // 'day', 'week', 'month'
  }),

  actions: {
    async createReservation(data: CreateReservationRequest) {
      this.loading = true
      try {
        const response = await $fetch('/api/v1/reservations', {
          method: 'POST',
          body: data
        })
        this.reservations.push(response.data)
        return response.data
      } catch (error) {
        throw error
      } finally {
        this.loading = false
      }
    },

    async checkAvailability(roomId: string, startTime: string, endTime: string) {
      return await $fetch('/api/v1/reservations/availability', {
        method: 'POST',
        body: { roomId, startTime, endTime }
      })
    },

    async detectConflicts(roomId: string, startTime: string, endTime: string) {
      return await $fetch('/api/v1/reservations/conflict-check', {
        method: 'POST',
        body: { roomId, startTime, endTime }
      })
    }
  }
})
```

#### 5. 性能优化策略

##### 缓存策略
- **会议室可用性缓存**: Redis, 5分钟TTL
- **用户预约列表缓存**: Redis, 10分钟TTL  
- **预约详情缓存**: Redis, 30分钟TTL
- **冲突检测结果缓存**: Redis, 2分钟TTL

##### 数据库优化
```sql
-- 关键索引
CREATE INDEX idx_reservations_room_time ON reservations(roomId, startTime, endTime);
CREATE INDEX idx_reservations_user_time ON reservations(userId, startTime);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_recurring ON reservations(isRecurring, parentReservationId);

-- 查询优化示例
-- 检查会议室可用性
SELECT COUNT(*) as conflict_count
FROM reservations 
WHERE roomId = ? 
  AND status != 'CANCELLED'
  AND ((startTime <= ? AND endTime > ?) OR (startTime < ? AND endTime >= ?));
```

##### 前端性能
- 虚拟化滚动处理大量日历数据
- 预约列表分页加载
- 图片懒加载和CDN加速
- 组件级代码分割

#### 6. 安全考虑

##### 数据验证
```typescript
// Zod验证模式
const CreateReservationSchema = z.object({
  title: z.string().min(1).max(200),
  roomId: z.string().cuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  description: z.string().max(1000).optional(),
  attendeeCount: z.number().int().min(1).max(1000).optional()
})

// 时间范围验证
function validateTimeRange(startTime: Date, endTime: Date): boolean {
  const now = new Date()
  const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  
  return startTime >= now && 
         endTime > startTime && 
         diffHours <= 8 && // 最大8小时
         diffHours >= 0.5 // 最小30分钟
}
```

##### 权限控制
- 用户只能操作自己的预约 (管理员除外)
- 会议室访问权限验证
- 预约操作审计日志记录
- 防止并发预约冲突

#### 7. 错误处理和监控

##### 错误处理策略
```typescript
// 统一错误处理
export default defineEventHandler(async (event) => {
  try {
    // 业务逻辑
    return await processReservation(event)
  } catch (error) {
    console.error('Reservation API Error:', error)
    
    // 记录错误日志
    await logError(error, event)
    
    // 返回用户友好的错误信息
    return createErrorResponse(
      getReservationErrorCode(error),
      getReservationErrorMessage(error)
    )
  }
})
```

##### 监控指标
- 预约成功率
- 冲突检测准确率  
- 系统响应时间 (< 500ms)
- 缓存命中率 (> 80%)

#### 8. 测试策略

##### 单元测试
- ConflictDetectionEngine 算法测试
- RecurringReservationHandler 生成测试
- 时间范围验证测试
- 状态转换测试

##### 集成测试
- API端点完整流程测试
- 数据库事务一致性测试
- 并发预约冲突处理测试

##### E2E测试
- 完整预约流程测试
- 冲突解决流程测试
- 周期性预约管理测试

#### 9. 部署和维护

##### 数据库迁移
```sql
-- 预约表创建
CREATE TABLE reservations (
  id VARCHAR(25) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  userId VARCHAR(25) NOT NULL,
  roomId VARCHAR(25) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_room_time (roomId, startTime, endTime),
  INDEX idx_user_time (userId, startTime),
  INDEX idx_status (status),
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (roomId) REFERENCES meeting_rooms(id)
);
```

##### 备份和恢复策略
- 预约数据每日备份
- 状态变更日志归档
- 灾难恢复计划

这个技术规范为Epic 3预约系统核心提供了完整的技术实现指导，确保系统满足高性能、高可用和用户体验要求。