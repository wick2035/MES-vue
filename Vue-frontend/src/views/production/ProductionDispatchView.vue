<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { AlertTriangle, RotateCcw, Search, Send } from 'lucide-vue-next'
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

const router = useRouter()
const route = useRoute()
const table = reactive(
  useTable<ProductionDispatchRow>(pageProductionDispatch, {
    orderNoLike: String(route.query.orderNo || ''),
    productLike: '',
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

onMounted(table.load)
</script>

<template>
  <div class="space-y-4">
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
        <span class="hidden text-xs text-muted-foreground sm:inline"
          >审批、派工、配套出库完成后正式下发工单</span
        >
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
        <Button size="sm" :disabled="saving === row.id" @click="dispatch(row)">
          <Send class="h-4 w-4" :class="saving === row.id && 'animate-pulse'" />计划下发
        </Button>
      </template>
    </SpDataTable>
  </div>
</template>
