<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, Search, Send } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { dispatchProductionOrder, pageProductionDispatch } from '@/api/modules/productionOrder'
import { notify } from '@/lib/toast'
import type { DispatchBlocker, ProductionDispatchRow } from '@/types/domain'
import type { TableColumn } from '@/types/table'

defineOptions({ name: 'ProductionDispatch' })

type DispatchStatus = 'ASSIGNED' | 'DISPATCHED'

const router = useRouter()
const route = useRoute()
const activeStatus = ref<DispatchStatus>('ASSIGNED')
const statusTabs: Array<{ key: DispatchStatus; label: string; icon: typeof Clock }> = [
  { key: 'ASSIGNED', label: '待下发', icon: Clock },
  { key: 'DISPATCHED', label: '已下发', icon: CheckCircle2 },
]
const table = reactive(
  useTable<ProductionDispatchRow>(pageProductionDispatch, {
    orderNoLike: String(route.query.orderNo || ''),
    productLike: '',
    dispatchStatus: 'ASSIGNED',
  }),
)
const saving = ref('')
const blockers = ref<DispatchBlocker[]>([])

const columns: TableColumn[] = [
  { key: 'orderNo', title: '生产订单', width: '160px' },
  { key: 'customerName', title: '客户', formatter: (r) => r.customerName || '—' },
  {
    key: 'firstProductName',
    title: '产品',
    formatter: (r) => r.firstProductName || r.firstProductMateriel || '—',
  },
  { key: 'itemCount', title: '产品行', align: 'right', width: '80px' },
  { key: 'totalQty', title: '计划量', align: 'right', width: '90px' },
  {
    key: 'operationStatusName',
    title: '作业状态',
    slot: 'operation',
    width: '100px',
    align: 'center',
  },
  { key: 'mrpStatus', title: 'MRP', slot: 'mrp', width: '90px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '160px', align: 'center' },
]

function switchStatus(status: DispatchStatus) {
  if (activeStatus.value === status) return
  activeStatus.value = status
  table.query.dispatchStatus = status
  table.query.current = 1
  blockers.value = []
  table.load()
}

async function dispatch(row: ProductionDispatchRow) {
  if (!row.id) return
  saving.value = row.id
  blockers.value = []
  try {
    await dispatchProductionOrder(row.id)
    notify.success('生产计划已下发')
    await table.load()
  } catch (error: any) {
    blockers.value = error?.data?.blockers || []
  } finally {
    saving.value = ''
  }
}

useAutoRefresh(() => table.load())
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 rounded-lg border bg-card p-1 shadow-sp">
      <Button
        v-for="tab in statusTabs"
        :key="tab.key"
        :variant="activeStatus === tab.key ? 'default' : 'ghost'"
        class="h-9 flex-1 justify-center sm:flex-none sm:px-5"
        @click="switchStatus(tab.key)"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </Button>
    </div>

    <div class="flex flex-wrap items-end gap-3 border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">订单</Label>
        <Input
          v-model="table.query.orderNoLike"
          placeholder="生产订单"
          class="w-40"
          @keyup.enter="table.search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">产品</Label>
        <Input
          v-model="table.query.productLike"
          placeholder="产品物料/名称"
          class="w-44"
          @keyup.enter="table.search"
        />
      </div>
      <Button @click="table.search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="table.reset(['orderNoLike', 'productLike'])">
        <RotateCcw class="h-4 w-4" />重置
      </Button>
    </div>

    <div v-if="blockers.length" class="space-y-2 border border-warning/30 bg-warning/5 p-4">
      <div class="flex items-center gap-2 text-sm font-medium text-warning">
        <AlertTriangle class="h-4 w-4" />下发前置条件未满足
      </div>
      <div class="grid gap-2 md:grid-cols-2">
        <button
          v-for="b in blockers"
          :key="b.code"
          class="flex items-center justify-between gap-3 border bg-card px-3 py-2 text-left text-sm hover:bg-accent"
          @click="router.push(b.route)"
        >
          <span>{{ b.message }}</span>
          <span class="shrink-0 text-xs text-primary">{{ b.actionText }}</span>
        </button>
      </div>
    </div>

    <SpDataTable
      :columns="columns"
      :data="table.list"
      :loading="table.loading"
      :total="table.total"
      :page="table.query.current"
      :page-size="table.query.size"
      @page-change="table.onPageChange"
      @size-change="table.onSizeChange"
    >
      <template #toolbar>
        <span class="text-sm font-medium">生产计划下发</span>
        <span class="hidden text-xs text-muted-foreground sm:inline">
          {{
            activeStatus === 'ASSIGNED'
              ? '审批、派工、配套出库完成后正式下发工单'
              : '已完成下发的生产计划记录'
          }}
        </span>
      </template>
      <template #operation="{ value }">
        <SpStatusBadge
          :tone="value === '待下发' ? 'success' : 'warning'"
          :text="value || '待处理'"
        />
      </template>
      <template #mrp="{ value }">
        <SpStatusBadge
          :tone="value === 'COMPLETED' ? 'success' : 'warning'"
          :text="value || 'NONE'"
        />
      </template>
      <template #action="{ row }">
        <Button
          v-if="activeStatus === 'ASSIGNED'"
          size="sm"
          :disabled="saving === row.id"
          @click="dispatch(row)"
        >
          <Send class="h-4 w-4" :class="saving === row.id && 'animate-pulse'" />计划下发
        </Button>
        <SpStatusBadge v-else tone="success" text="已下发" />
      </template>
    </SpDataTable>
  </div>
</template>
