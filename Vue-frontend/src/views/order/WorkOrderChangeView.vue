<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, ClipboardCheck, Eye, FileSearch, RotateCcw, Search } from 'lucide-vue-next'
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
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useTable } from '@/composables/useTable'
import { pageWorkOrderChanges } from '@/api/modules/workOrderChange'
import { getWorkOrderChangeStatusMeta } from '@/lib/workOrderChange'
import type { TableColumn } from '@/types/table'
import type { WorkOrderChange } from '@/types/domain'

const router = useRouter()
const ALL = 'ALL'
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<WorkOrderChange>(pageWorkOrderChanges, { workOrderCodeLike: '', status: '' })
useAutoRefresh(load)

const statusOptions = [
  { label: '全部状态', value: ALL },
  { label: '审批中', value: 'APPROVING' },
  { label: '已生效', value: 'APPLIED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已批准', value: 'APPROVED' },
]

function statusLabel(status?: string) {
  return getWorkOrderChangeStatusMeta(status).label
}
function statusTone(status?: string) {
  return getWorkOrderChangeStatusMeta(status).tone
}
function qtyDelta(r: WorkOrderChange): string {
  if (r.beforeQty == null && r.afterQty == null) return '-'
  return `${r.beforeQty ?? '-'} -> ${r.afterQty ?? '-'}`
}

const columns: TableColumn[] = [
  { key: 'workOrderCode', title: '工单编号', width: '180px' },
  { key: 'qty', title: '数量变更', width: '130px', align: 'center', formatter: qtyDelta },
  {
    key: 'afterPlanStartTime',
    title: '计划开始(变更后)',
    formatter: (r) => r.afterPlanStartTime || '-',
  },
  {
    key: 'afterPlanEndTime',
    title: '计划结束(变更后)',
    formatter: (r) => r.afterPlanEndTime || '-',
  },
  { key: 'status', title: '状态', slot: 'status', width: '100px', align: 'center' },
  { key: 'applyTime', title: '生效时间', width: '160px', formatter: (r) => r.applyTime || '-' },
  { key: 'createTime', title: '申请时间', width: '160px' },
  { key: 'action', title: '操作', slot: 'action', width: '130px', align: 'center' },
]

const detailOpen = ref(false)
const current = ref<WorkOrderChange | null>(null)
function openDetail(row: WorkOrderChange) {
  current.value = row
  detailOpen.value = true
}

function goOrder(row: WorkOrderChange) {
  if (row.workOrderId) {
    router.push(`/production/order/${row.workOrderId}`)
  }
}

function goApproval(row: WorkOrderChange) {
  router.push({
    path: '/production/approval',
    query: { keyword: row.workOrderCode || '', businessType: 'WORK_ORDER_CHANGE' },
  })
}

function onReset() {
  reset(['workOrderCodeLike', 'status'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-lg border bg-card p-4 shadow-sp">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold">工单变更记录</h2>
          <p class="text-xs text-muted-foreground">
            已下发工单的数量、工艺和计划调整在此留痕，审批主入口统一在审批中心。
          </p>
        </div>
        <Button variant="outline" @click="goApproval({} as WorkOrderChange)">
          <ClipboardCheck class="h-4 w-4" />进入审批中心
        </Button>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">工单编号</Label>
          <Input
            v-model="query.workOrderCodeLike"
            placeholder="输入工单编号"
            class="w-44"
            @keyup.enter="search"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">状态</Label>
          <Select
            :model-value="query.status || ALL"
            @update:model-value="query.status = $event && $event !== ALL ? String($event) : ''"
          >
            <SelectTrigger class="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in statusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button @click="search"><Search class="h-4 w-4" />查询</Button>
        <Button variant="outline" @click="onReset"><RotateCcw class="h-4 w-4" />重置</Button>
      </div>
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
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium">变更审计</span>
          <span class="text-xs text-muted-foreground">审批通过后自动写回工单，驳回则保留原值</span>
        </div>
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="statusTone(value)" :text="statusLabel(value)" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="查看变更明细" @click="openDetail(row)">
            <Eye class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="查看工单" @click="goOrder(row)">
            <FileSearch class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="查看审批" @click="goApproval(row)">
            <ClipboardCheck class="h-4 w-4" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>工单变更明细 · {{ current?.workOrderCode }}</DialogTitle>
          <DialogDescription>变更前后对比用于追溯审批依据和实际生效内容。</DialogDescription>
        </DialogHeader>
        <div v-if="current" class="space-y-4 text-sm">
          <div class="flex items-center gap-2">
            <SpStatusBadge :tone="statusTone(current.status)" :text="statusLabel(current.status)" />
            <span class="text-muted-foreground">申请时间：{{ current.createTime || '-' }}</span>
            <span class="text-muted-foreground">生效时间：{{ current.applyTime || '-' }}</span>
          </div>
          <div class="grid grid-cols-[120px_1fr_32px_1fr] items-center gap-2 rounded-lg border p-3">
            <span class="text-muted-foreground">数量</span>
            <span class="rounded bg-muted px-2 py-1 text-center tabular-nums">{{ current.beforeQty ?? '-' }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span class="rounded bg-primary/10 px-2 py-1 text-center font-medium tabular-nums text-primary">
              {{ current.afterQty ?? '-' }}
            </span>

            <span class="text-muted-foreground">工艺路线</span>
            <span class="truncate rounded bg-muted px-2 py-1">{{ current.beforeFlowId || '-' }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span class="truncate rounded bg-primary/10 px-2 py-1 font-medium text-primary">
              {{ current.afterFlowId || '-' }}
            </span>

            <span class="text-muted-foreground">计划开始</span>
            <span class="truncate rounded bg-muted px-2 py-1">{{ current.beforePlanStartTime || '-' }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span class="truncate rounded bg-primary/10 px-2 py-1 font-medium text-primary">
              {{ current.afterPlanStartTime || '-' }}
            </span>

            <span class="text-muted-foreground">计划结束</span>
            <span class="truncate rounded bg-muted px-2 py-1">{{ current.beforePlanEndTime || '-' }}</span>
            <ArrowRight class="h-4 w-4 text-muted-foreground" />
            <span class="truncate rounded bg-primary/10 px-2 py-1 font-medium text-primary">
              {{ current.afterPlanEndTime || '-' }}
            </span>
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="rounded-lg border bg-muted/30 p-3">
              <div class="mb-1 text-xs text-muted-foreground">变更前备注</div>
              <div>{{ current.beforeRemark || '-' }}</div>
            </div>
            <div class="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div class="mb-1 text-xs text-muted-foreground">变更后备注</div>
              <div class="font-medium text-primary">{{ current.afterRemark || '-' }}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
