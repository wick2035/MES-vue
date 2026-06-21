<script setup lang="ts">
import { ref } from 'vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { Search, RotateCcw, Eye, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { pageWorkOrderChanges } from '@/api/modules/workOrderChange'
import type { TableColumn } from '@/types/table'
import type { Tone } from '@/lib/orderStatus'
import type { WorkOrderChange } from '@/types/domain'

defineOptions({ name: 'WorkOrderChange' })

const ALL = 'ALL'
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<WorkOrderChange>(pageWorkOrderChanges, { workOrderCodeLike: '', status: '' })
useAutoRefresh(load)

const statusMap: Record<string, string> = {
  APPROVING: '审批中',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  APPLIED: '已应用',
}
function statusTone(s?: string): Tone {
  if (s === 'APPROVED' || s === 'APPLIED') return 'success'
  if (s === 'REJECTED') return 'danger'
  if (s === 'APPROVING') return 'warning'
  return 'muted'
}
function qtyDelta(r: WorkOrderChange): string {
  if (r.beforeQty == null && r.afterQty == null) return '—'
  return `${r.beforeQty ?? '—'} → ${r.afterQty ?? '—'}`
}

const columns: TableColumn[] = [
  { key: 'workOrderCode', title: '工单编号', width: '180px' },
  { key: 'qty', title: '数量变更', width: '130px', align: 'center', formatter: qtyDelta },
  {
    key: 'afterPlanStartTime',
    title: '计划开工(变更后)',
    formatter: (r) => r.afterPlanStartTime || '—',
  },
  {
    key: 'afterPlanEndTime',
    title: '计划完工(变更后)',
    formatter: (r) => r.afterPlanEndTime || '—',
  },
  { key: 'status', title: '状态', slot: 'status', width: '90px', align: 'center' },
  { key: 'applyTime', title: '申请时间', width: '160px' },
  { key: 'action', title: '操作', slot: 'action', width: '70px', align: 'center' },
]

const detailOpen = ref(false)
const current = ref<WorkOrderChange | null>(null)
function openDetail(row: WorkOrderChange) {
  current.value = row
  detailOpen.value = true
}

function onReset() {
  reset(['workOrderCodeLike', 'status'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工单编号</Label>
        <Input
          v-model="query.workOrderCodeLike"
          placeholder="编号"
          class="w-40"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">状态</Label>
        <Select
          :model-value="query.status || ALL"
          @update:model-value="query.status = $event && $event !== ALL ? String($event) : ''"
        >
          <SelectTrigger class="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">全部状态</SelectItem>
            <SelectItem value="APPROVING">审批中</SelectItem>
            <SelectItem value="APPROVED">已批准</SelectItem>
            <SelectItem value="REJECTED">已驳回</SelectItem>
            <SelectItem value="APPLIED">已应用</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="onReset"><RotateCcw class="h-4 w-4" />重置</Button>
    </div>

    <SpDataTable
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      :page="query.current"
      :page-size="query.size"
      @page-change="onPageChange"
      @size-change="onSizeChange"
    >
      <template #toolbar>
        <span class="text-sm font-medium">工单变更</span>
        <span class="hidden text-xs text-muted-foreground sm:inline"
          >已下达工单的数量/工艺/计划改动需经审批后生效</span
        >
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="statusTone(value)" :text="statusMap[value] || value || '—'" />
      </template>
      <template #action="{ row }">
        <Button variant="ghost" size="icon-sm" title="查看变更明细" @click="openDetail(row)">
          <Eye class="h-4 w-4" />
        </Button>
      </template>
    </SpDataTable>

    <!-- 变更明细 -->
    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>工单变更明细 · {{ current?.workOrderCode }}</DialogTitle>
          <DialogDescription class="sr-only">变更前后对比</DialogDescription>
        </DialogHeader>
        <div v-if="current" class="space-y-3 text-sm">
          <div class="grid grid-cols-[120px_1fr_24px_1fr] items-center gap-2">
            <span class="text-muted-foreground">数量</span>
            <span class="rounded bg-muted px-2 py-1 text-center tabular-nums">{{
              current.beforeQty ?? '—'
            }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span
              class="rounded bg-primary/10 px-2 py-1 text-center font-medium tabular-nums text-primary"
              >{{ current.afterQty ?? '—' }}</span
            >
          </div>
          <div class="grid grid-cols-[120px_1fr_24px_1fr] items-center gap-2">
            <span class="text-muted-foreground">计划开工</span>
            <span class="truncate rounded bg-muted px-2 py-1">{{
              current.beforePlanStartTime || '—'
            }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span class="truncate rounded bg-primary/10 px-2 py-1 font-medium text-primary">{{
              current.afterPlanStartTime || '—'
            }}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr_24px_1fr] items-center gap-2">
            <span class="text-muted-foreground">计划完工</span>
            <span class="truncate rounded bg-muted px-2 py-1">{{
              current.beforePlanEndTime || '—'
            }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span class="truncate rounded bg-primary/10 px-2 py-1 font-medium text-primary">{{
              current.afterPlanEndTime || '—'
            }}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr] items-start gap-2">
            <span class="text-muted-foreground">变更说明</span>
            <span>{{ current.afterRemark || '—' }}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
