/**
 * 会议室图片上传 API
 * POST /api/v1/upload/rooms
 */

import prisma from '~~/server/services/database'

export default defineEventHandler(async (event) => {
  // 权限验证：需要 room:update 权限（上传文件属于更新操作）
  await requirePermission('room:update')(event)

  // 获取当前用户ID
  const user = event.context.user
  const userId = user?.id
  try {
    // 验证表单数据
    const formData = await readFormData(event)
    const file = formData.get('file') as File | null

    if (!file) {
      return createErrorResponse('VALIDATION_ERROR', '请选择要上传的文件')
    }

    // 验证其他字段
    const roomId = formData.get('roomId') as string
    const type = (formData.get('type') as string) || 'gallery'
    const caption = formData.get('caption') as string

    const validatedData = FileUploadSchema.parse({
      roomId,
      type,
      caption: caption || undefined
    })

    // 检查会议室是否存在
    const room = await prisma.meetingRoom.findFirst({
      where: {
        id: validatedData.roomId,
        deletedAt: null
      }
    })

    if (!room) {
      return createErrorResponse(ROOM_NOT_FOUND, '会议室不存在')
    }

    // 验证文件类型
    const allowedTypes = {
      main: ['image/jpeg', 'image/png', 'image/webp'],
      '360': ['image/jpeg', 'image/png', 'image/webp'],
      video: ['video/mp4', 'video/webm'],
      gallery: ['image/jpeg', 'image/png', 'image/webp']
    }

    const fileTypes = allowedTypes[validatedData.type as keyof typeof allowedTypes]
    if (!fileTypes.includes(file.type)) {
      return createErrorResponse(
        API_CODES.INVALID_FILE_TYPE,
        `不支持的文件类型。${validatedData.type}类型支持：${fileTypes.join(', ')}`
      )
    }

    // 验证文件大小（10MB限制）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return createErrorResponse(FILE_TOO_LARGE, '文件大小不能超过10MB')
    }

    // 生成安全的文件名
    const fileExtension = file.name.split('.').pop()
    const fileHash = createHash('md5').update(`${file.name}-${Date.now()}`).digest('hex')
    const safeFileName = `${fileHash}.${fileExtension}`

    // 创建目标目录
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'rooms', validatedData.roomId)
    await fs.ensureDir(uploadDir)

    // 保存文件
    const filePath = join(uploadDir, safeFileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, fileBuffer)

    // 构建文件URL
    const fileUrl = `/uploads/rooms/${validatedData.roomId}/${safeFileName}`

    // 构建图片信息对象
    const imageInfo = {
      url: fileUrl,
      type: validatedData.type,
      caption: validatedData.caption,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }

    // 更新会议室的图片列表
    const currentImages = (room.images as any[]) || []
    const updatedImages = [...currentImages, imageInfo]

    // 如果是主图片，替换现有的主图片
    if (validatedData.type === 'main') {
      updatedImages.forEach((img, index) => {
        if (img.type === 'main' && img.url !== fileUrl) {
          updatedImages[index] = { ...img, type: 'gallery' }
        }
      })
    }

    // 更新会议室信息
    await prisma.meetingRoom.update({
      where: { id: validatedData.roomId },
      data: {
        images: updatedImages,
        updatedAt: new Date()
      }
    })

    // 记录操作历史
    await prisma.roomHistory.create({
      data: {
        roomId: validatedData.roomId,
        action: 'UPDATE',
        field: 'images',
        oldValue: { images: currentImages },
        newValue: { images: updatedImages },
        userId: userId,
        ipAddress: getClientIP(event) || undefined,
        userAgent: getHeader(event, 'user-agent') || undefined
      }
    })

    return createSuccessResponse(imageInfo, '文件上传成功')

  } catch (error: any) {
    console.error('文件上传失败:', error)

    // 验证错误
    if (error.name === 'ZodError') {
      return createErrorResponse('VALIDATION_ERROR', '请求数据验证失败', error.errors)
    }

    return createErrorResponse(UPLOAD_FAILED, '文件上传失败')
  } finally {
    await prisma.$disconnect()
  }
})