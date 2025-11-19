/**
 * 会议相关类型定义
 */

// 会议材料文件类型
export interface MaterialFile {
  id: string
  name: string
  originalName: string
  type: string // MIME type
  size: number // bytes
  url: string
  uploadedBy: string
  uploadedAt: string
  reservationId?: string
  description?: string
  isPublic: boolean
}

// 文件上传选项
export interface UploadOptions {
  maxFileSize: number // bytes
  allowedTypes: string[]
  maxFiles: number
}

// 会议材料上传请求
export interface MaterialUploadRequest {
  file: File
  reservationId?: string
  description?: string
  isPublic?: boolean
}

// 会议材料预览信息
export interface MaterialPreview {
  id: string
  name: string
  type: string
  size: number
  url: string
  canPreview: boolean
  previewUrl?: string
  thumbnailUrl?: string
}

// 批量文件操作结果
export interface BatchUploadResult {
  success: MaterialFile[]
  failed: {
    file: string
    error: string
  }[]
}

// 会议材料存储配置
export interface MaterialStorageConfig {
  baseDir: string
  maxTotalSize: number // 总存储大小限制
  compressionEnabled: boolean
  virusScanningEnabled: boolean
}

// 会议材料统计信息
export interface MaterialStats {
  totalCount: number
  totalSize: number
  typeDistribution: Record<string, number>
  uploadTrend: {
    date: string
    count: number
    size: number
  }[]
}

// 会议材料搜索参数
export interface MaterialSearchParams {
  query?: string
  type?: string
  uploadedBy?: string
  dateFrom?: string
  dateTo?: string
  reservationId?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'size' | 'uploadedAt'
  sortOrder?: 'asc' | 'desc'
}

// 会议材料列表响应
export interface MaterialListResponse {
  items: MaterialFile[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: MaterialStats
}

// 会议材料下载记录
export interface MaterialDownloadRecord {
  id: string
  materialId: string
  userId: string
  downloadedAt: string
  ipAddress: string
  userAgent?: string
}

// 会议材料访问权限
export interface MaterialPermission {
  canView: boolean
  canDownload: boolean
  canDelete: boolean
  canShare: boolean
}

// 会议材料共享配置
export interface MaterialShareConfig {
  isPublic: boolean
  allowedUsers?: string[]
  allowedRoles?: string[]
  shareToken?: string
  expiresAt?: string
}

// 会议材料版本信息
export interface MaterialVersion {
  id: string
  materialId: string
  version: number
  name: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: string
  changeDescription?: string
}

// 会议材料转换任务
export interface MaterialConversionTask {
  id: string
  materialId: string
  targetFormat: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: string
  completedAt?: string
  error?: string
  resultUrl?: string
}

// 会议材料标签
export interface MaterialTag {
  id: string
  name: string
  color: string
  description?: string
  createdAt: string
}

// 会议材料分类
export interface MaterialCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  level: number
  children?: MaterialCategory[]
}

// 会议材料元数据
export interface MaterialMetadata {
  id: string
  materialId: string
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'json'
}

// 会议材料评论
export interface MaterialComment {
  id: string
  materialId: string
  userId: string
  content: string
  createdAt: string
  updatedAt?: string
  parentId?: string
  replies?: MaterialComment[]
}

// 会议材料活动日志
export interface MaterialActivity {
  id: string
  materialId: string
  userId: string
  action: 'upload' | 'download' | 'delete' | 'update' | 'share' | 'comment'
  details?: Record<string, any>
  createdAt: string
  ipAddress?: string
  userAgent?: string
}

// 会议材料批量操作
export interface MaterialBatchOperation {
  action: 'delete' | 'share' | 'move' | 'tag' | 'convert'
  materialIds: string[]
  parameters?: Record<string, any>
}

// 会议材料通知设置
export interface MaterialNotificationSettings {
  onUpload: boolean
  onDownload: boolean
  onDelete: boolean
  onComment: boolean
  onShare: boolean
  emailNotifications: boolean
  pushNotifications: boolean
}

// 会议材料导出配置
export interface MaterialExportConfig {
  format: 'zip' | 'pdf' | 'xlsx'
  includeMetadata: boolean
  includeComments: boolean
  includeVersions: boolean
  compressionLevel: number
}

// 会议材料导入配置
export interface MaterialImportConfig {
  sourceType: 'file' | 'url' | 'cloud'
  source: string
  extractArchives: boolean
  detectDuplicates: boolean
  preserveStructure: boolean
}