import { requirePermission } from '~~/server/middleware/permission'
import { createErrorResponse } from '~~/server/utils/response'
import { generateCSVTemplate } from '~~/server/utils/csv'

export default defineEventHandler(async (event) => {
  try {
    // 权限验证 - 需要会议室创建权限
    await requirePermission('room:create')(event)

    // 只支持 GET 请求
    if (event.node.req.method !== 'GET') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // 生成CSV模板
    const template = generateCSVTemplate()

    // 设置响应头
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'attachment; filename="meeting-rooms-template.csv"')

    return template

  } catch (error) {
    console.error('CSV模板下载错误:', error)

    if (error.statusCode === 401 || error.statusCode === 403) {
      return createErrorResponse('权限验证失败', error.statusCode)
    }

    return createErrorResponse('服务器内部错误', 500)
  }
})