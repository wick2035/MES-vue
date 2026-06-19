<script setup lang="ts">
import { onMounted } from 'vue'
import { Search, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { pageProductionOrders } from '@/api/modules/productionOrder'
import type { TableColumn } from '@/types/table'
import type { ProductionOrder } from '@/types/domain'
import type { Tone } from '@/lib/orderStatus'

defineOptions({ name: 'ProductionPlan' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<ProductionOrder>(pageProductionOrders, { orderNoLike: '', customerNameLike: '', productLike: '' })
onMounted(load)

const sourceMap: Record<string, string> = { DEMAND: '需求', FORECAST: '预测' }
const statusMap: Record<string, string> = {
  DRAFT: '草稿',
  CONFIRMED: '已确认',
  WORK_ORDER_CREATED: '已生成工单',
  CANCELLED: '已取消',
}
const approvalMap: Record<string, string> = {
  DRAFT: '草稿',
  APPROVING: '审批中',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  CANCELLED: '已取消',
}
const opMap: Record<string, string> = {
  NONE: '未处理',
  WAIT_CALC: '待计算',
  WAIT_ASSIGN: '待派工',
  ASSIGNED: '已派工',
  DISPATCHED: '已下发',
}
function statusTone(s?: string): Tone {
  if (s === 'CONFIRMED' || s === 'WORK_ORDER_CREATED' || s === 'APPROVED' || s === 'DISPATCHED') return 'success'
  if (s === 'CANCELLED' || s === 'REJECTED') return 'danger'
  if (s === 'APPROVING') return 'warning'
  return 'muted'
}

const columns: TableColumn[] = [
  { key: 'orderNo', title: '订单编号', width: '170px' },
  { key: 'sourceType', title: '来源', width: '80px', align: 'center', formatter: (r) => sourceMap[r.sourceType] || r.sourceType || '—' },
  { key: 'customerName', title: '客户' },
  { key: 'firstProductName', title: '主产品' },
  { key: 'itemCount', title: '行数', width: '70px', align: 'right' },
  { key: 'totalQty', title: '总数量', width: '90px', align: 'right' },
  { key: 'status', title: '订单状态', slot: 'status', width: '110px', align: 'center' },
  { key: 'approvalStatus', title: '审批', slot: 'approval', width: '90px', align: 'center' },
  { key: 'operationStatus', title: '运营', slot: 'op', width: '90px', align: 'center' },
  { key: 'orderDate', title: '下单日期', width: '120px' },
]

function onReset() {
  reset(['orderNoLike', 'customerNameLike', 'productLike'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">订单编号</Label>
        <Input v-model="query.orderNoLike" placeholder="编号" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">客户</Label>
        <Input v-model="query.customerNameLike" placeholder="客户名称" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">产品</Label>
        <Input v-model="query.productLike" placeholder="产品名称" class="w-40" @keyup.enter="search" />
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
        <span class="text-sm font-medium">生产订单</span>
        <span class="text-xs text-muted-foreground">销售/预测来源的生产订单，确认后下发为生产工单</span>
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="statusTone(value)" :text="statusMap[value] || value || '—'" />
      </template>
      <template #approval="{ value }">
        <SpStatusBadge :tone="statusTone(value)" :text="approvalMap[value] || value || '—'" />
      </template>
      <template #op="{ value }">
        <SpStatusBadge :tone="statusTone(value)" :text="opMap[value] || value || '—'" />
      </template>
    </SpDataTable>
  </div>
</template>
