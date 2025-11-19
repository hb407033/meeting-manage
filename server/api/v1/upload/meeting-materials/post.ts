/**
 * 会议材料上传 API
 * POST /api/v1/upload/meeting-materials
 */

import prisma from '~~/server/services/database'
import { createHash } from 'crypto'
import { join } from 'path'
import fs from 'fs-extra'
import { type MaterialFile, type UploadOptions } from '~~/server/types/meeting'
import {
  createSuccessResponse,
  createErrorResponse,
  API_CODES,
  getClientIP
} from '~~/server/utils/response'
import { auditLogger } from '~~/server/utils/audit'

// 上传配置
const uploadConfig: UploadOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  maxFiles: 20
}

export default defineEventHandler(async (event) => {
  // 权限验证：需要 reservation:create 或 reservation:update 权限
  await requirePermission('reservation:create')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id
  const userName = user?.name || user?.email || 'Unknown'

  if (!userId) {
    return createErrorResponse(API_CODES.UNAUTHORIZED, '用户未认证')
  }

  try {
    // 验证表单数据
    const formData = await readFormData(event)
    const file = formData.get('file') as File | null

    if (!file) {
      return createErrorResponse('VALIDATION_ERROR', '请选择要上传的文件')
    }

    // 验证其他字段
    const reservationId = formData.get('reservationId') as string
    const description = formData.get('description') as string
    const isPublic = formData.get('isPublic') === 'true'

    // 验证文件类型
    if (!uploadConfig.allowedTypes.includes(file.type)) {
      return createErrorResponse(
        'INVALID_FILE_TYPE',
        `不支持的文件类型。支持的类型：${uploadConfig.allowedTypes.join(', ')}`
      )
    }

    // 验证文件大小
    if (file.size > uploadConfig.maxFileSize) {
      return createErrorResponse(
        'FILE_TOO_LARGE',
        `文件大小不能超过 ${formatFileSize(uploadConfig.maxFileSize)}`
      )
    }

    // 验证预约是否存在（如果提供了预约ID）
    if (reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: reservationId,
          deletedAt: null
        }
      })

      if (!reservation) {
        return createErrorResponse(API_CODES.NOT_FOUND, '预约不存在')
      }

      // 检查用户是否有权限上传到该预约
      if (reservation.userId !== userId) {
        await requirePermission('reservation:manage')(event)
      }
    }

    // 生成安全的文件名
    const fileExtension = getFileExtension(file.name)
    const fileHash = createHash('md5')
      .update(`${file.name}-${Date.now()}-${userId}`)
      .digest('hex')
    const safeFileName = `${fileHash}.${fileExtension}`

    // 创建目录结构: public/uploads/meeting-materials/YYYY/MM/
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const uploadDir = join(
      process.cwd(),
      'public',
      'uploads',
      'meeting-materials',
      year,
      month
    )

    await fs.ensureDir(uploadDir)

    // 保存文件
    const filePath = join(uploadDir, safeFileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, fileBuffer)

    // 构建文件URL
    const fileUrl = `/uploads/meeting-materials/${year}/${month}/${safeFileName}`

    // 保存文件信息到数据库
    const materialFile = await prisma.meetingMaterial.create({
      data: {
        name: file.name,
        originalName: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl,
        uploadedBy: userName,
        userId: userId,
        reservationId: reservationId || null,
        description: description || null,
        isPublic: isPublic,
        filePath: filePath,
        fileHash: fileHash,
        uploadedAt: new Date()
      }
    })

    // 记录操作日志
    auditLogger.log({
      userId,
      action: 'UPLOAD_MATERIAL',
      resourceType: 'meeting_material',
      resourceId: materialFile.id,
      details: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        reservationId
      },
      ipAddress: getClientIP(event),
      userAgent: getHeader(event, 'user-agent') || undefined
    })

    // 构建响应对象
    const materialResponse: MaterialFile = {
      id: materialFile.id,
      name: materialFile.name,
      originalName: materialFile.originalName,
      type: materialFile.type,
      size: materialFile.size,
      url: materialFile.url,
      uploadedBy: materialFile.uploadedBy,
      uploadedAt: materialFile.uploadedAt.toISOString(),
      reservationId: materialFile.reservationId || undefined,
      description: materialFile.description || undefined,
      isPublic: materialFile.isPublic
    }

    return createSuccessResponse(materialResponse, '文件上传成功')

  } catch (error: any) {
    console.error('会议材料上传失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse('VALIDATION_ERROR', '请求数据验证失败', error.errors)
    }

    // Prisma错误处理
    if (error.code === 'P2002') {
      return createErrorResponse(API_CODES.DUPLICATE_RESOURCE, '文件已存在')
    }

    return createErrorResponse(API_CODES.UPLOAD_FAILED, '文件上传失败')
  } finally {
    await prisma.$disconnect()
  }
})

// 工具函数
function getFileExtension(fileName: string): string {
  return fileName.split('.').pop() || ''
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}