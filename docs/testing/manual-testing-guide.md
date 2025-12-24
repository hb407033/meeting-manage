# 手动测试指南 - DevTools 测试路径

## 概述

本文档定义了基于用户故事的手动测试路径，使用 Chrome DevTools 检查系统链接、布局和功能。

## 测试前置条件

1. **开发环境运行**
   ```bash
   npm run dev
   ```
   默认运行在 `http://localhost:3000`

2. **测试用户准备**
   - 管理员用户（拥有所有权限）
   - 普通用户（基础权限：reservation:read, reservation:readOwn, room:read）
   - 只读用户（仅 reservation:readOwn）

3. **Chrome DevTools 准备**
   - 打开 DevTools (F12 或 Cmd+Option+I)
   - 切换到 Console 标签页
   - 切换到 Network 标签页
   - 切换到 Elements 标签页

---

## 测试路径定义

### 路径 1: 登录流程 (Story 1-2a: 本地认证)

**用户故事**: 作为系统用户，我需要通过用户名和密码登录系统，以便访问受保护的资源。

**测试步骤**:

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 访问 `/` | Network: 查看 `/api/v1/auth/me` 请求 | 重定向到登录页或显示登录状态 |
| 2 | 输入用户名密码 | Network: 查看 POST `/api/v1/auth/login` | 返回 200，包含 token |
| 3 | 点击登录 | Console: 查看 `useAuthStore.user` | 用户信息正确加载 |
| 4 | 登录后 | Network: 检查后续请求的 Authorization header | 所有请求包含 Bearer token |

**DevTools 命令**:
```javascript
// Console 中检查用户状态
useAuthStore().user
useAuthStore().isAuthenticated
```

---

### 路径 2: 权限驱动的菜单显示 (Story 1-10: 布局重构)

**用户故事**: 作为系统架构师，我需要基于权限动态加载菜单，以便用户只看到有权限访问的功能。

**测试步骤**:

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 登录后查看顶部菜单 | Elements: 检查 `<nav>` 元素内的菜单项 | 只显示有权限的菜单 |
| 2 | Console: 检查菜单配置 | `document.querySelectorAll('[data-menu-item]')` | 菜单项数量与权限匹配 |
| 3 | 切换不同权限用户 | 重新登录，查看菜单变化 | 菜单动态更新 |
| 4 | 性能检查 | Performance: 记录菜单渲染时间 | 菜单渲染 < 100ms |

**DevTools 命令**:
```javascript
// 检查可见的菜单项数量
document.querySelectorAll('[data-menu-item]:not([style*="display: none"])').length

// 检查菜单 store 状态
useMenuStore().filteredMenu
```

---

### 路径 3: 主导航 - 首页 (所有已认证用户)

**路由**: `/dashboard`
**权限**: 所有已认证用户

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 点击"首页"菜单 | Network: 检查 API 调用 | 正确加载数据 |
| 2 | 检查页面布局 | Elements: 验证 UniversalHeader 存在 | 布局完整 |
| 3 | 检查响应式 | Device Mode: 切换移动端视图 | 菜单正常折叠 |

---

### 路径 4: 预约管理菜单

#### 4.1 快速预约 (`/reservations/create`)
**权限**: `reservation:create`

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 点击"快速预约" | Elements: 检查表单元素 | 表单正常显示 |
| 2 | 填写预约信息 | Network: 监控表单提交 | POST 到正确端点 |
| 3 | 提交预约 | Console: 检查成功消息 | 预约创建成功 |

#### 4.2 预约列表 (`/reservations`)
**权限**: `reservation:read`

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 点击"预约列表" | Network: GET `/api/v1/reservations` | 返回预约数据 |
| 2 | 检查列表渲染 | Elements: 检查表格/列表组件 | 数据正确显示 |
| 3 | 分页/筛选 | Network: 检查查询参数 | 正确传递参数 |

#### 4.3 详细预约配置 (`/reservations/detailed`)
**权限**: `reservation:create` OR `reservation:edit`

#### 4.4 我的预约 (`/reservations/my`)
**权限**: `reservation:readOwn`

#### 4.5 预约日历 (`/reservations/calendar`)
**权限**: `reservation:read`

---

### 路径 5: 会议室管理菜单

#### 5.1 会议室可用时间 (`/availability`)
**权限**: `room:read`

#### 5.2 会议室管理 (`/admin/rooms`)
**权限**: `room:manage`

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 点击"会议室管理" | Network: GET `/api/v1/admin/rooms` | 返回会议室列表 |
| 2 | 无权限用户访问 | Network: 检查响应状态 | 返回 403 或重定向 |

#### 5.3 会议室搜索 (`/rooms/search`)
**权限**: `room:read`

---

### 路径 6: 数据分析菜单

#### 6.1 预约仪表盘 (`/analytics`)
**权限**: `analytics:view`

#### 6.2 使用情况分析 (`/analytics/usage`)
**权限**: `analytics:advanced`

---

### 路径 7: 系统管理菜单

#### 7.1 用户管理 (`/admin/users`)
**权限**: `user:manage`

#### 7.2 权限管理 (`/admin/permissions`)
**权限**: `permission:manage`

#### 7.3 系统配置 (`/admin/settings`)
**权限**: `system:configure`

#### 7.4 审计日志 (`/admin/audit`)
**权限**: `audit:read`

| 步骤 | 操作 | DevTools 检查项 | 预期结果 |
|------|------|-----------------|----------|
| 1 | 点击"审计日志" | Network: GET `/api/v1/admin/audit-logs` | 返回日志数据 |
| 2 | 检查日志列表 | Elements: 验证表格渲染 | 日志正确显示 |
| 3 | 筛选/搜索 | Network: 检查查询参数 | 筛选正常工作 |

#### 7.5 审计测试 (`/admin/audit-test`)
**权限**: `audit:test`

---

### 路径 8: 用户菜单

#### 8.1 个人资料 (`/profile`)
**权限**: 所有已认证用户

#### 8.2 设置 (`/settings`)
**权限**: 所有已认证用户

---

## 权限矩阵测试

### 测试场景 1: 管理员用户

```yaml
用户: admin
权限: '*'
可见菜单: 全部
预期行为: 所有菜单项可见，所有页面可访问
```

**检查清单**:
- [ ] 所有主导航菜单可见
- [ ] 所有系统管理菜单可见
- [ ] 可创建/编辑预约
- [ ] 可管理会议室
- [ ] 可查看数据分析
- [ ] 可管理用户和权限

### 测试场景 2: 普通用户

```yaml
用户: user
权限: reservation:read, reservation:readOwn, reservation:create, room:read
可见菜单: 首页、预约管理（部分）、会议室（部分）
预期行为: 只显示基础功能，系统管理菜单隐藏
```

**检查清单**:
- [ ] 首页菜单可见
- [ ] 快速预约可见
- [ ] 预约列表可见
- [ ] 我的预约可见
- [ ] 预约日历可见
- [ ] 详细预约配置可见
- [ ] 会议室可用时间可见
- [ ] 会议室搜索可见
- [ ] 系统管理菜单隐藏
- [ ] 数据分析菜单隐藏
- [ ] 会议室管理隐藏

### 测试场景 3: 只读用户

```yaml
用户: readonly
权限: reservation:readOwn
可见菜单: 首页、我的预约
预期行为: 只能查看自己的预约，其他功能隐藏
```

**检查清单**:
- [ ] 首页菜单可见
- [ ] 我的预约可见
- [ ] 其他预约管理菜单隐藏
- [ ] 会议室管理菜单隐藏
- [ ] 系统管理菜单隐藏

---

## DevTools 检查清单

### 1. Network 面板检查

| 检查项 | 方法 | 预期结果 |
|--------|------|----------|
| API 调用 | Filter: `/api/v1/` | 只看到必要的 API 调用 |
| 违规调用 | 检查非预期的 API | 无多余或重复的 API 调用 |
| 响应状态 | 查看 Status codes | 2xx 成功，4xx 处理权限拒绝 |
| 请求头 | Request Headers | 包含正确的 Authorization |
| 响应时间 | Time 列 | API 响应 < 500ms |

### 2. Console 面板检查

| 检查项 | 方法 | 预期结果 |
|--------|------|----------|
| 错误信息 | Filter: Errors | 无未处理的错误 |
| 警告信息 | Filter: Warnings | 无关键警告 |
| Store 状态 | 输入 `useAuthStore()` | 用户信息正确 |
| 菜单状态 | 输入 `useMenuStore()` | 菜单正确过滤 |

### 3. Elements 面板检查

| 检查项 | 方法 | 预期结果 |
|--------|------|----------|
| UniversalHeader | 搜索 `<nav>` | 存在于所有登录页面 |
| 菜单项 | 搜索 `[data-menu-item]` | 数量与权限匹配 |
| 隐藏元素 | 检查 `display: none` | 无权限菜单正确隐藏 |
| 布局结构 | 检查 `.default-layout` | 结构完整 |

### 4. Performance 面板检查

| 检查项 | 方法 | 预期结果 |
|--------|------|----------|
| 菜单渲染 | Performance 记录 | < 100ms |
| 页面加载 | Lighthouse | Performance > 90 |
| FCP/LCP | Metrics | FCP < 1s, LCP < 2.5s |

---

## 测试记录模板

### 测试会话信息

```
日期: ___________
测试人员: ___________
环境: □ Development □ Staging □ Production
浏览器: Chrome _______
测试用户: ___________
```

### 测试执行记录

| 路径ID | 路径名称 | 状态 | 问题记录 | 截图/日志 |
|--------|----------|------|----------|-----------|
| 1 | 登录流程 | ☐ Pass ☐ Fail | | |
| 2 | 权限菜单 | ☐ Pass ☐ Fail | | |
| 3 | 首页 | ☐ Pass ☐ Fail | | |
| 4.1 | 快速预约 | ☐ Pass ☐ Fail | | |
| 4.2 | 预约列表 | ☐ Pass ☐ Fail | | |
| ... | ... | ... | | |

---

## 自动化测试建议

基于手动测试路径，建议创建自动化测试脚本：

1. **Playwright 端到端测试** - 覆盖主要用户流程
2. **Vitest 单元测试** - 测试权限和菜单逻辑
3. **API 测试** - 验证权限验证端点

---

## 附录: 快捷命令

### DevTools Console 快捷命令

```javascript
// 检查认证状态
useAuthStore().isAuthenticated

// 检查用户权限
useAuthStore().user?.permissions

// 检查过滤后的菜单
useMenuStore().filteredMenu

// 检查特定权限
useAuthStore().canAccess('room', 'manage')

// 模拟权限变更（开发环境）
useAuthStore().user.permissions = ['reservation:create']

// 刷新菜单
useMenuStore().updateMenu()
```

### Network Filter 快捷过滤

```
# 只看 API 调用
/api/v1/

# 只看 WebSocket
WS

# 只看错误
Status: 4xx OR Status: 5xx

# 只看慢请求
>500ms
```
