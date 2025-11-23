<template>
  <div class="meeting-materials-uploader" :class="{ 'compact-mode': compact }">
    <div :class="compact ? 'space-y-2' : 'space-y-4'">
      <!-- 文件上传区域 -->
      <div class="upload-section">
    
            <!-- 拖拽上传区域 -->
            <div
              class="upload-dropzone"
              :class="{
                'drag-over': isDragOver,
                'uploading': isUploading,
                'p-invalid': uploadErrors.length > 0
              }"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <input
                ref="fileInput"
                type="file"
                multiple
                :accept="allowedTypesString"
                :disabled="isUploading"
                class="hidden"
                @change="handleFileSelect"
              />

              <div class="upload-content">
                <div v-if="isUploading" class="upload-status">
                  <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="3" />
                  <p class="mt-3 text-center text-gray-600">正在上传文件...</p>
                  <div class="progress-info">
                    <ProgressBar
                      :value="uploadProgress"
                      class="mt-2"
                      :showValue="true"
                    />
                  </div>
                </div>

                <div v-else class="upload-prompt">
                  <i class="pi pi-cloud-upload text-4xl text-blue-500 mb-3"></i>
                  <h3 class="text-lg font-semibold mb-2">拖拽文件到此处上传</h3>
                  <p class="text-gray-600 mb-3">或者点击选择文件</p>
                  <p class="text-sm text-gray-500">
                    支持格式: {{ allowedTypesDescription }}
                  </p>
                  <p class="text-sm text-gray-500">
                    单个文件最大: {{ formatFileSize(maxFileSize) }}
                  </p>
                  <Button
                    label="选择文件"
                    icon="pi pi-folder-open"
                    class="mt-3"
                    @click.stop="triggerFileInput"
                  />
                </div>
              </div>
            </div>

            <!-- 错误信息显示 -->
            <Message
              v-if="uploadErrors.length > 0"
              severity="error"
              :closable="false"
              class="mt-3"
            >
              <ul class="list-disc list-inside">
                <li v-for="error in uploadErrors" :key="error">{{ error }}</li>
              </ul>
            </Message>

            <!-- 成功信息显示 -->
            <Message
              v-if="uploadSuccess.length > 0"
              severity="success"
              :closable="false"
              class="mt-3"
            >
              <ul class="list-disc list-inside">
                <li v-for="success in uploadSuccess" :key="success">{{ success }}</li>
              </ul>
            </Message>
      </div>

      <!-- 已上传文件列表 -->
      <div v-if="materials.length > 0" class="materials-list">
        <Card>
          <template #title>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-folder"></i>
                <span>已上传材料 ({{ materials.length }})</span>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  icon="pi pi-refresh"
                  size="small"
                  variant="text"
                  @click="$emit('refresh')"
                  v-tooltip="'刷新列表'"
                />
                <Button
                  icon="pi pi-download"
                  size="small"
                  variant="text"
                  @click="downloadAllMaterials"
                  v-tooltip="'下载全部'"
                  :disabled="materials.length === 0"
                />
              </div>
            </div>
          </template>
          <template #content>
            <DataTable
              :value="materials"
              :paginator="materials.length > 10"
              :rows="10"
              dataKey="id"
              responsiveLayout="scroll"
              :loading="isLoading"
            >
              <Column field="name" header="文件名">
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <div class="file-icon">
                      <i :class="getFileIcon(data)" class="text-2xl"></i>
                    </div>
                    <div class="file-info">
                      <div class="font-medium text-gray-900">{{ data.name }}</div>
                      <div class="text-sm text-gray-500">{{ formatFileSize(data.size) }}</div>
                    </div>
                  </div>
                </template>
              </Column>

              <Column field="type" header="类型">
                <template #body="{ data }">
                  <Tag
                    :value="getFileTypeLabel(data)"
                    :severity="getFileTypeSeverity(data)"
                    size="small"
                  />
                </template>
              </Column>

              <Column field="uploadedBy" header="上传者">
                <template #body="{ data }">
                  <div class="flex items-center gap-2">
                    <Avatar
                      :label="getUploaderInitial(data.uploadedBy)"
                      size="small"
                      class="bg-blue-100 text-blue-800"
                    />
                    <span>{{ data.uploadedBy }}</span>
                  </div>
                </template>
              </Column>

              <Column field="uploadedAt" header="上传时间">
                <template #body="{ data }">
                  {{ formatDateTime(data.uploadedAt) }}
                </template>
              </Column>

              <Column header="操作" :exportable="false">
                <template #body="{ data }">
                  <div class="flex items-center gap-1">
                    <Button
                      icon="pi pi-eye"
                      size="small"
                      variant="text"
                      @click="handlePreviewMaterial(data)"
                      v-tooltip="'预览'"
                      :disabled="!canPreview(data)"
                    />
                    <Button
                      icon="pi pi-download"
                      size="small"
                      variant="text"
                      @click="downloadMaterial(data)"
                      v-tooltip="'下载'"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      variant="text"
                      severity="danger"
                      @click="confirmDeleteMaterial(data)"
                      v-tooltip="'删除'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </div>
    </div>

    <!-- 文件预览对话框 -->
    <Dialog
      v-model:visible="previewVisible"
      modal
      :header="previewMaterial?.name"
      :style="{ width: '90vw', maxWidth: '800px' }"
      :dismissableMask="true"
    >
      <div v-if="previewMaterial" class="preview-container">
        <!-- PDF预览 -->
        <div v-if="isPDF(previewMaterial)" class="pdf-preview">
          <iframe
            :src="previewMaterial.url"
            style="width: 100%; height: 500px; border: none;"
          ></iframe>
        </div>

        <!-- 图片预览 -->
        <div v-else-if="isImage(previewMaterial)" class="image-preview">
          <img
            :src="previewMaterial.url"
            :alt="previewMaterial.name"
            class="max-w-full max-h-96 mx-auto"
          />
        </div>

        <!-- 文本预览 -->
        <div v-else-if="isText(previewMaterial)" class="text-preview">
          <div class="bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
            <pre class="text-sm">{{ textPreviewContent }}</pre>
          </div>
        </div>

        <!-- 不支持预览 -->
        <div v-else class="no-preview">
          <div class="text-center py-8">
            <i class="pi pi-file text-6xl text-gray-400 mb-4"></i>
            <p class="text-gray-600">该文件类型不支持预览</p>
            <Button
              label="下载文件"
              icon="pi pi-download"
              class="mt-3"
              @click="downloadMaterial(previewMaterial)"
            />
          </div>
        </div>
      </div>
    </Dialog>

    <!-- 删除确认对话框 -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      modal
      header="确认删除"
      :style="{ width: '400px' }"
    >
      <div class="flex items-center gap-3">
        <i class="pi pi-exclamation-triangle text-2xl text-yellow-500"></i>
        <span>确定要删除文件 "{{ materialToDelete?.name }}" 吗？此操作无法撤销。</span>
      </div>
      <template #footer>
        <Button
          label="取消"
          icon="pi pi-times"
          variant="text"
          @click="deleteDialogVisible = false"
        />
        <Button
          label="删除"
          icon="pi pi-check"
          severity="danger"
          @click="deleteMaterial"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { MaterialFile, UploadOptions } from '@/types/meeting'

interface Props {
  materials?: MaterialFile[]
  isLoading?: boolean
  uploadOptions?: UploadOptions
  compact?: boolean
}

interface Emits {
  (e: 'upload', files: MaterialFile[]): void
  (e: 'delete', materialId: string): void
  (e: 'preview', material: MaterialFile): void
  (e: 'download', material: MaterialFile): void
  (e: 'refresh'): void
}

const props = withDefaults(defineProps<Props>(), {
  materials: () => [],
  isLoading: false,
  compact: false,
  uploadOptions: () => ({
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
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    maxFiles: 20
  })
})

const emit = defineEmits<Emits>()

const toast = useToast()

// 响应式数据
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadErrors = ref<string[]>([])
const uploadSuccess = ref<string[]>([])

const previewVisible = ref(false)
const previewMaterial = ref<MaterialFile | null>(null)
const textPreviewContent = ref('')

const deleteDialogVisible = ref(false)
const materialToDelete = ref<MaterialFile | null>(null)

// 计算属性
const allowedTypesString = computed(() => {
  return props.uploadOptions.allowedTypes.join(',')
})

const allowedTypesDescription = computed(() => {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'text/plain': '文本',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP'
  }

  return [...new Set(props.uploadOptions.allowedTypes.map(type => typeMap[type] || type))].join('、')
})

const maxFileSize = computed(() => props.uploadOptions.maxFileSize)

// 方法
const triggerFileInput = () => {
  if (!isUploading.value) {
    fileInput.value?.click()
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    handleFiles(files)
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    handleFiles(files)
  }
}

const handleFiles = async (files: FileList) => {
  uploadErrors.value = []
  uploadSuccess.value = []

  // 验证文件数量
  if (props.materials.length + files.length > props.uploadOptions.maxFiles) {
    uploadErrors.value.push(`最多只能上传 ${props.uploadOptions.maxFiles} 个文件`)
    return
  }

  const validFiles: File[] = []

  // 验证每个文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    // 验证文件类型
    if (!props.uploadOptions.allowedTypes.includes(file.type)) {
      uploadErrors.value.push(`文件 "${file.name}" 类型不支持`)
      continue
    }

    // 验证文件大小
    if (file.size > props.uploadOptions.maxFileSize) {
      uploadErrors.value.push(`文件 "${file.name}" 大小超过限制`)
      continue
    }

    validFiles.push(file)
  }

  if (validFiles.length === 0) {
    return
  }

  // 上传有效文件
  await uploadFiles(validFiles)
}

const uploadFiles = async (files: File[]) => {
  isUploading.value = true
  uploadProgress.value = 0

  try {
    const uploadMaterials: MaterialFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadProgress.value = Math.round(((i + 1) / files.length) * 100)

      const material = await uploadFile(file)
      if (material) {
        uploadMaterials.push(material)
        uploadSuccess.value.push(`文件 "${file.name}" 上传成功`)
      }
    }

    if (uploadMaterials.length > 0) {
      emit('upload', uploadMaterials)
    }
  } catch (error) {
    console.error('文件上传失败:', error)
    uploadErrors.value.push('文件上传过程中发生错误')
  } finally {
    isUploading.value = false
    uploadProgress.value = 0

    // 清空文件输入
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const uploadFile = async (file: File): Promise<MaterialFile | null> => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await $fetch<MaterialFile>('/api/v1/upload/meeting-materials', {
      method: 'POST',
      body: formData
    })

    return response
  } catch (error) {
    console.error('文件上传失败:', error)
    uploadErrors.value.push(`文件 "${file.name}" 上传失败`)
    return null
  }
}

const handlePreviewMaterial = async (material: MaterialFile) => {
  previewMaterial.value = material

  if (isText(material)) {
    try {
      const response = await $fetch(material.url)
      textPreviewContent.value = response as string
    } catch (error) {
      textPreviewContent.value = '无法加载文件内容'
    }
  }

  previewVisible.value = true
  emit('preview', material)
}

const downloadMaterial = (material: MaterialFile) => {
  const link = document.createElement('a')
  link.href = material.url
  link.download = material.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  emit('download', material)
}

const downloadAllMaterials = () => {
  props.materials.forEach(material => {
    downloadMaterial(material)
  })
}

const confirmDeleteMaterial = (material: MaterialFile) => {
  materialToDelete.value = material
  deleteDialogVisible.value = true
}

const deleteMaterial = () => {
  if (materialToDelete.value) {
    emit('delete', materialToDelete.value.id)
    deleteDialogVisible.value = false
    materialToDelete.value = null

    toast.add({
      severity: 'success',
      summary: '删除成功',
      detail: '文件已删除',
      life: 3000
    })
  }
}

// 工具方法
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const getFileIcon = (material: MaterialFile): string => {
  if (material.type.startsWith('image/')) return 'pi pi-image text-green-500'
  if (material.type === 'application/pdf') return 'pi pi-file-pdf text-red-500'
  if (material.type.includes('word')) return 'pi pi-file-word text-blue-500'
  if (material.type.includes('excel') || material.type.includes('spreadsheet')) return 'pi pi-file-excel text-green-600'
  if (material.type.includes('powerpoint') || material.type.includes('presentation')) return 'pi pi-file text-orange-500'
  return 'pi pi-file text-gray-500'
}

const getFileTypeLabel = (material: MaterialFile): string => {
  if (material.type.startsWith('image/')) return '图片'
  if (material.type === 'application/pdf') return 'PDF'
  if (material.type.includes('word')) return 'Word'
  if (material.type.includes('excel') || material.type.includes('spreadsheet')) return 'Excel'
  if (material.type.includes('powerpoint') || material.type.includes('presentation')) return 'PowerPoint'
  if (material.type.startsWith('text/')) return '文本'
  return '其他'
}

const getFileTypeSeverity = (material: MaterialFile): 'success' | 'info' | 'warning' | 'danger' => {
  if (material.type.startsWith('image/')) return 'success'
  if (material.type === 'application/pdf') return 'danger'
  if (material.type.includes('word') || material.type.includes('excel') || material.type.includes('powerpoint')) return 'info'
  return 'warning'
}

const getUploaderInitial = (uploaderName: string): string => {
  return uploaderName.charAt(0).toUpperCase()
}

const canPreview = (material: MaterialFile): boolean => {
  return isImage(material) || isPDF(material) || isText(material)
}

const isImage = (material: MaterialFile): boolean => {
  return material.type.startsWith('image/')
}

const isPDF = (material: MaterialFile): boolean => {
  return material.type === 'application/pdf'
}

const isText = (material: MaterialFile): boolean => {
  return material.type.startsWith('text/') || material.type === 'application/json'
}
</script>

<style scoped>
.meeting-materials-uploader {
  @apply space-y-4;
}

.meeting-materials-uploader.compact-mode {
  @apply space-y-2;
}

.upload-dropzone {
  @apply border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-all duration-200;
  @apply hover:border-blue-400 hover:bg-blue-50;
}

.meeting-materials-uploader.compact-mode .upload-dropzone {
  @apply p-4;
}

.upload-dropzone.drag-over {
  @apply border-blue-500 bg-blue-50;
}

.upload-dropzone.uploading {
  @apply opacity-75 cursor-not-allowed;
}

.upload-dropzone.p-invalid {
  @apply border-red-300 bg-red-50;
}

.upload-content {
  @apply flex flex-col items-center justify-center min-h-[200px];
}

.meeting-materials-uploader.compact-mode .upload-content {
  @apply min-h-[120px];
}

.upload-prompt h3 {
  @apply text-lg font-semibold text-gray-900 mb-2;
}

.meeting-materials-uploader.compact-mode .upload-prompt h3 {
  @apply text-base font-medium mb-1;
}

.upload-prompt p {
  @apply text-gray-600;
}

.meeting-materials-uploader.compact-mode .upload-prompt p {
  @apply text-sm;
}

.file-icon {
  @apply flex-shrink-0;
}

.meeting-materials-uploader.compact-mode .file-icon i {
  @apply text-xl;
}

.file-info {
  @apply flex-1 min-w-0;
}

.preview-container {
  @apply max-h-[80vh] overflow-auto;
}

.meeting-materials-uploader.compact-mode .preview-container {
  @apply max-h-[60vh];
}

.no-preview {
  @apply flex items-center justify-center min-h-[200px];
}

.meeting-materials-uploader.compact-mode .no-preview {
  @apply min-h-[120px];
}

/* 紧凑模式下 DataTable 的样式 */
.meeting-materials-uploader.compact-mode :deep(.p-datatable .p-datatable-tbody > tr > td) {
  @apply py-2;
}

.meeting-materials-uploader.compact-mode :deep(.p-datatable .p-datatable-thead > tr > th) {
  @apply py-2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .upload-dropzone {
    @apply p-6;
  }

  .upload-content {
    @apply min-h-[150px];
  }

  .meeting-materials-uploader.compact-mode .upload-dropzone {
    @apply p-3;
  }

  .meeting-materials-uploader.compact-mode .upload-content {
    @apply min-h-[100px];
  }
}
</style>