<template>
  <div class="permission-denied-page">
    <div class="page-container">
      <PermissionDenied
        :message="denyMessage"
        :requiredPermissions="requiredPermissions"
        :requiredRoles="requiredRoles"
        :showRequestAccess="true"
        :showContactAdmin="true"
        :showBackButton="true"
        :redirectPath="redirectPath"
        @request-submitted="handleRequestSubmitted"
        @back-clicked="handleBackClicked"
        @contact-admin="handleContactAdmin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 页面参数
const route = useRoute()
const router = useRouter()

// 从查询参数获取权限信息
const requiredPermissions = computed(() => {
  const permissions = route.query.required as string
  return permissions ? permissions.split(',').filter(Boolean) : []
})

const requiredRoles = computed(() => {
  const roles = route.query.roles as string
  return roles ? roles.split(',').filter(Boolean) : []
})

const denyMessage = computed(() => {
  const customMessage = route.query.message as string
  if (customMessage) return customMessage

  if (requiredPermissions.value.length > 0) {
    return `您需要以下权限才能访问此页面：${requiredPermissions.value.join(', ')}`
  }

  if (requiredRoles.value.length > 0) {
    return `您需要以下角色才能访问此页面：${requiredRoles.value.join(', ')}`
  }

  return '您没有足够的权限访问此页面。'
})

const redirectPath = computed(() => {
  const redirect = route.query.redirect as string
  return redirect || '/'
})

// 事件处理
const handleRequestSubmitted = (request: any) => {
  console.log('权限申请已提交:', request)
  // 可以选择跳转到申请状态页面或显示成功消息
  useToast().success('权限申请已提交，请等待审批')
}

const handleBackClicked = () => {
  router.back()
}

const handleContactAdmin = () => {
  // 联系管理员的逻辑已经在 PermissionDenied 组件中实现
}

// 页面标题
useHead({
  title: '权限不足 - 智能会议室管理系统'
})
</script>

<style scoped>
.permission-denied-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.page-container {
  width: 100%;
  max-width: 800px;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .permission-denied-page {
    padding: 1rem;
  }
}
</style>