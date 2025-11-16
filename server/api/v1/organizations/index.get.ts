import { getOrganizationTree, getOrganizationStatistics } from '~~/server/services/organization-service'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '未认证，请先登录'
    })
  }

  try {
    const { includeInactive = false, includeUserCount = true } = getQuery(event)

    const organizations = await getOrganizationTree(null, {
      includeInactive: Boolean(includeInactive),
      includeUserCount: Boolean(includeUserCount)
    })

    const statistics = await getOrganizationStatistics()

    return {
      code: 200,
      message: 'success',
      data: {
        organizations,
        statistics
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('获取组织架构失败:', error)

    throw createError({
      statusCode: 500,
      statusMessage: '获取组织架构失败'
    })
  }
})