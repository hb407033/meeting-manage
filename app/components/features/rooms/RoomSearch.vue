<template>
  <div class="room-search">
    <div class="search-container">
      <div class="search-input-group">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            :placeholder="$t('rooms.searchPlaceholder', '搜索会议室名称、位置、描述...')"
            class="w-full search-input"
            @input="handleSearchInput"
            @keyup.enter="performSearch"
          />
        </IconField>

        <Button
          :label="$t('common.search', '搜索')"
          icon="pi pi-search"
          class="search-button"
          @click="performSearch"
          :loading="loading"
        />

        <Button
          :label="$t('common.clear', '清除')"
          icon="pi pi-times"
          class="p-button-outlined clear-button"
          @click="clearSearch"
          :disabled="!hasSearchQuery"
        />
      </div>

      <!-- 搜索建议/历史 -->
      <div v-if="showSuggestions && searchSuggestions.length > 0" class="search-suggestions">
        <div
          v-for="(suggestion, index) in searchSuggestions"
          :key="index"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          <i class="pi pi-history mr-2"></i>
          {{ suggestion }}
        </div>
      </div>
    </div>

    <!-- 快速搜索标签 -->
    <div class="quick-search-tags">
      <span class="tag-label">{{ $t('rooms.quickSearch', '快速搜索:') }}</span>
      <Chip
        v-for="tag in quickSearchTags"
        :key="tag"
        :label="tag"
        class="search-tag"
        @click="searchByTag(tag)"
        removable
        @remove="removeTag(tag)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { debounce } from 'lodash-es'
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue?: string
  loading?: boolean
  suggestions?: string[]
  quickTags?: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
  (e: 'clear'): void
  (e: 'suggestion-select', suggestion: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  loading: false,
  suggestions: () => [],
  quickTags: () => []
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

// 响应式数据
const searchQuery = ref(props.modelValue)
const showSuggestions = ref(false)
const searchSuggestions = ref<string[]>(props.suggestions)
const quickSearchTags = ref<string[]>(props.quickTags)

// 计算属性
const hasSearchQuery = computed(() => !!searchQuery.value.trim())

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  searchQuery.value = newValue
})

watch(() => props.suggestions, (newSuggestions) => {
  searchSuggestions.value = newSuggestions
})

watch(() => props.quickTags, (newTags) => {
  quickSearchTags.value = newTags
})

// 防抖搜索输入处理
const debouncedSearchInput = debounce((value: string) => {
  emit('update:modelValue', value)

  if (value.trim()) {
    // 这里可以调用搜索建议API
    updateSuggestions(value)
    showSuggestions.value = true
  } else {
    showSuggestions.value = false
  }
}, 300)

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  debouncedSearchInput(target.value)
}

const performSearch = () => {
  const query = searchQuery.value.trim()
  if (query) {
    emit('search', query)
    showSuggestions.value = false

    // 添加到快速搜索标签
    if (!quickSearchTags.value.includes(query)) {
      quickSearchTags.value.unshift(query)
      // 限制标签数量
      if (quickSearchTags.value.length > 5) {
        quickSearchTags.value = quickSearchTags.value.slice(0, 5)
      }
    }
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  emit('update:modelValue', '')
  emit('clear')
  showSuggestions.value = false
}

const selectSuggestion = (suggestion: string) => {
  searchQuery.value = suggestion
  emit('update:modelValue', suggestion)
  emit('suggestion-select', suggestion)
  showSuggestions.value = false
  performSearch()
}

const searchByTag = (tag: string) => {
  searchQuery.value = tag
  emit('update:modelValue', tag)
  performSearch()
}

const removeTag = (tag: string) => {
  const index = quickSearchTags.value.indexOf(tag)
  if (index > -1) {
    quickSearchTags.value.splice(index, 1)
  }
}

const updateSuggestions = (query: string) => {
  // 这里可以实现搜索建议逻辑
  // 例如从本地存储或API获取相关建议
  const mockSuggestions = [
    `${query} 会议室`,
    `${query} 大型`,
    `${query} 小型`,
    `${query} 投影仪`
  ]

  searchSuggestions.value = mockSuggestions.filter(s =>
    s.toLowerCase().includes(query.toLowerCase()) && s !== query
  ).slice(0, 5)
}

// 点击外部关闭建议
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.room-search')) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.room-search {
  position: relative;
  width: 100%;
}

.search-container {
  position: relative;
  margin-bottom: 1rem;
}

.search-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  min-width: 300px;
}

.search-button {
  flex-shrink: 0;
}

.clear-button {
  flex-shrink: 0;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--surface-100);
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: var(--surface-100);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.quick-search-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tag-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-right: 0.5rem;
}

.search-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.search-tag:hover {
  background-color: var(--primary-color);
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    min-width: unset;
  }

  .search-button,
  .clear-button {
    width: 100%;
  }

  .quick-search-tags {
    justify-content: flex-start;
  }
}
</style>