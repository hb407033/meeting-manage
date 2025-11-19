/**
 * 删除会议材料 API
 * DELETE /api/v1/meeting-materials/[materialId]
 */

import prisma from '~~/server/services/database'
import fs from 'fs-extra'
import { join } from 'path'
import {
  createSuccessResponse,
  createErrorResponse,
  API_CODES,
  getClientIP
} from '~~/server/utils/response'
import { auditLogger } from '~~/server/utils/audit'

export default defineEventHandler(async (event) => {
  // 权限验证：需要 reservation:update 或 reservation:manage 权限
  await requirePermission('reservation:update')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id

  if (!userId) {
    return createErrorResponse('UNAUTHORIZED', '用户未认证')
  }

  try {
    // 获取材料ID
    const materialId = getRouterParam(event, 'materialId')

    if (!materialId) {
      return createErrorResponse('VALIDATION_ERROR', '材料ID不能为空')
    }

    // 查找材料
    const material = await prisma.meetingMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!material) {
      return createErrorResponse('NOT_FOUND', '会议材料不存在')
    }

    // 权限检查：只能删除自己的材料，除非有管理权限
    const hasManagePermission = await hasPermission('reservation:manage', event)
    if (material.userId !== userId && !hasManagePermission) {
      return createErrorResponse('FORBIDDEN', '没有权限删除该材料')
    }

    // 软删除：标记为已删除
    const deletedMaterial = await prisma.meetingMaterial.update({
      where: { id: materialId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        deletedReason: '用户删除'
      }
    })

    // 记录操作日志
    auditLogger.log({
      userId,
      action: 'DELETE_MATERIAL',
      resourceType: 'meeting_material',
      resourceId: materialId,
      details: {
        fileName: material.name,
        fileSize: material.size,
        fileType: material.type,
        reservationId: material.reservationId,
        softDelete: true
      },
      ipAddress: getClientIP(event),
      userAgent: getHeader(event, 'user-agent') || undefined
    })

    // 异步删除物理文件（不阻塞响应）
    setTimeout(async () => {
      try {
        if (material.filePath) {
          await fs.remove(material.filePath)
          console.log(`物理文件删除成功: ${material.filePath}`)
        }
      } catch (error) {
        console.error(`物理文件删除失败: ${material.filePath}`, error)
        // 不影响软删除的成功响应
      }
    }, 100)

    return createSuccessResponse(
      {
        id: deletedMaterial.id,
        name: deletedMaterial.name,
        deletedAt: deletedMaterial.deletedAt
      },
      '会议材料删除成功'
    )

  } catch (error: any) {
    console.error('删除会议材料失败:', error)
    return createErrorResponse('INTERNAL_ERROR', '删除会议材料失败')
  } finally {
    await prisma.$disconnect()
  }
})