<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-vue-next'
import { Motion } from 'motion-v'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SPRING, staggerDelay } from '@/lib/motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SpSkeletonTable from './SpSkeletonTable.vue'
import type { TableColumn } from '@/types/table'

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    data: any[]
    loading?: boolean
    total?: number
    page?: number
    pageSize?: number
    pageSizes?: number[]
    showIndex?: boolean
    rowKey?: string
    /** 开启行逐项入场动效（motion-v） */
    animated?: boolean
  }>(),
  {
    loading: false,
    total: 0,
    page: 1,
    pageSize: 10,
    pageSizes: () => [10, 20, 50, 100],
    showIndex: true,
    rowKey: 'id',
    animated: false,
  },
)

const reduce = usePreferredReducedMotion()

const emit = defineEmits<{
  (e: 'page-change', page: number): void
  (e: 'size-change', size: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const showSkeleton = computed(() => props.loading && props.data.length === 0)

function prev() {
  if (props.page > 1) emit('page-change', props.page - 1)
}
function next() {
  if (props.page < totalPages.value) emit('page-change', props.page + 1)
}
function onSize(val: any) {
  emit('size-change', Number(val))
}
function cellText(col: TableColumn, row: any) {
  const value = row[col.key]
  if (col.formatter) return col.formatter(row, value)
  return value === null || value === undefined || value === '' ? '—' : value
}
</script>

<template>
  <div class="flex flex-col rounded-lg border bg-card shadow-sp">
    <!-- 工具栏 -->
    <div v-if="$slots.toolbar" class="flex items-center justify-between gap-2 border-b p-3">
      <slot name="toolbar" />
    </div>

    <!-- 骨架 -->
    <SpSkeletonTable v-if="showSkeleton" :cols="columns.length + 1" />

    <!-- 表格 -->
    <div v-else class="relative overflow-x-auto" :class="{ 'opacity-60': loading }">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/40">
            <TableHead v-if="showIndex" class="w-12 text-center">#</TableHead>
            <TableHead
              v-for="col in columns"
              :key="col.key"
              :style="col.width ? { width: col.width } : undefined"
              :class="{
                'text-center': col.align === 'center',
                'text-right': col.align === 'right',
              }"
            >
              <slot v-if="col.headSlot" :name="col.headSlot" />
              <template v-else>{{ col.title }}</template>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="data.length === 0">
            <TableCell :colspan="columns.length + (showIndex ? 1 : 0)" class="h-32">
              <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Inbox class="h-8 w-8" />
                <span class="text-sm">暂无数据</span>
              </div>
            </TableCell>
          </TableRow>
          <component
            :is="animated ? Motion : TableRow"
            v-for="(row, idx) in data"
            :key="row[rowKey] ?? idx"
            :as="animated ? 'tr' : undefined"
            :initial="animated && reduce !== 'reduce' ? { opacity: 0, y: 8 } : undefined"
            :animate="animated ? { opacity: 1, y: 0 } : undefined"
            :transition="
              animated
                ? { ...SPRING, delay: reduce === 'reduce' ? 0 : staggerDelay(idx, 0.03, 0.25) }
                : undefined
            "
            class="border-b transition-colors hover:bg-accent/40 data-[state=selected]:bg-muted"
          >
            <TableCell v-if="showIndex" class="text-center text-muted-foreground">
              {{ (page - 1) * pageSize + idx + 1 }}
            </TableCell>
            <TableCell
              v-for="col in columns"
              :key="col.key"
              :class="{
                'text-center': col.align === 'center',
                'text-right': col.align === 'right',
              }"
            >
              <slot v-if="col.slot" :name="col.slot" :row="row" :value="row[col.key]" />
              <template v-else>{{ cellText(col, row) }}</template>
            </TableCell>
          </component>
        </TableBody>
      </Table>
    </div>

    <!-- 分页 -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
      <span class="text-muted-foreground">共 {{ total }} 条</span>
      <div class="flex items-center gap-3">
        <Select :model-value="String(pageSize)" @update:model-value="onSize">
          <SelectTrigger class="h-8 w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="s in pageSizes" :key="s" :value="String(s)"
              >{{ s }} 条/页</SelectItem
            >
          </SelectContent>
        </Select>
        <div class="flex items-center gap-1">
          <button
            class="rounded-md border p-1.5 disabled:opacity-40 hover:enabled:bg-accent"
            :disabled="page <= 1"
            @click="prev"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <span class="px-2">{{ page }} / {{ totalPages }}</span>
          <button
            class="rounded-md border p-1.5 disabled:opacity-40 hover:enabled:bg-accent"
            :disabled="page >= totalPages"
            @click="next"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
