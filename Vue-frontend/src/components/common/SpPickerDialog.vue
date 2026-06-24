<script setup lang="ts">
import { ref, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import { Search, RotateCcw, Inbox, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TableColumn } from '@/types/table'
import { SPRING, staggerDelay } from '@/lib/motion'
import type { PickerFetcher } from '@/lib/picker'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    columns: TableColumn[]
    fetcher?: PickerFetcher | null
    pageSize?: number
    searchPlaceholder?: string
    emptyHint?: string
    rowKey?: string
  }>(),
  {
    description: '点击任意行即可选择',
    pageSize: 8,
    searchPlaceholder: '输入关键字搜索',
    emptyHint: '暂无可选数据',
    rowKey: 'id',
  },
)

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'select', row: any): void
}>()

const reduce = usePreferredReducedMotion()
const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')

const totalPages = () => Math.max(1, Math.ceil(total.value / props.pageSize))

async function load() {
  if (!props.fetcher) {
    rows.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const res = await props.fetcher({ keyword: keyword.value, page: page.value, size: props.pageSize })
    rows.value = res.records ?? []
    total.value = res.total ?? 0
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function doSearch() {
  page.value = 1
  load()
}
function prev() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
function next() {
  if (page.value < totalPages()) {
    page.value++
    load()
  }
}
function choose(row: any) {
  emit('select', row)
  emit('update:open', false)
}
function cellText(col: TableColumn, row: any) {
  const value = row[col.key]
  if (col.formatter) return col.formatter(row, value)
  return value === null || value === undefined || value === '' ? '—' : value
}

// 每次打开重置并加载
watch(
  () => props.open,
  (v) => {
    if (v) {
      keyword.value = ''
      page.value = 1
      load()
    }
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <!-- 搜索条 -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="keyword"
            :placeholder="searchPlaceholder"
            class="pl-8"
            @keyup.enter="doSearch"
          />
        </div>
        <Button size="sm" @click="doSearch"><Search class="h-4 w-4" />搜索</Button>
        <Button variant="outline" size="sm" @click="(keyword = ''), doSearch()">
          <RotateCcw class="h-4 w-4" />
        </Button>
      </div>

      <!-- 列表 -->
      <div class="relative min-h-[18rem] flex-1 overflow-y-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="sticky top-0 z-10 bg-muted/70 backdrop-blur">
            <tr>
              <th
                v-for="col in columns"
                :key="col.key"
                class="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                :style="col.width ? { width: col.width } : undefined"
                :class="{
                  'text-center': col.align === 'center',
                  'text-right': col.align === 'right',
                }"
              >
                {{ col.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              <Motion
                v-for="(row, idx) in rows"
                :key="row[rowKey] ?? idx"
                as="tr"
                :initial="reduce === 'reduce' ? false : { opacity: 0, y: 8 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ ...SPRING, delay: reduce === 'reduce' ? 0 : staggerDelay(idx, 0.025, 0.2) }"
                class="group cursor-pointer border-t transition-colors hover:bg-accent/60"
                @click="choose(row)"
              >
                <td
                  v-for="col in columns"
                  :key="col.key"
                  class="px-3 py-2"
                  :class="{
                    'text-center': col.align === 'center',
                    'text-right': col.align === 'right',
                  }"
                >
                  {{ cellText(col, row) }}
                </td>
              </Motion>
            </AnimatePresence>
          </tbody>
        </table>

        <!-- 空状态 -->
        <div
          v-if="!loading && rows.length === 0"
          class="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground"
        >
          <Inbox class="h-8 w-8" />
          <span class="text-sm">{{ emptyHint }}</span>
        </div>

        <!-- 加载遮罩 -->
        <div
          v-if="loading"
          class="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <LoaderCircle class="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <span>共 {{ total }} 条</span>
        <div class="flex items-center gap-1">
          <button
            class="rounded-md border p-1.5 disabled:opacity-40 hover:enabled:bg-accent"
            :disabled="page <= 1"
            @click="prev"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span class="px-2">{{ page }} / {{ totalPages() }}</span>
          <button
            class="rounded-md border p-1.5 disabled:opacity-40 hover:enabled:bg-accent"
            :disabled="page >= totalPages()"
            @click="next"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
