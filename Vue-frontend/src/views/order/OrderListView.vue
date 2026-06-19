<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RotateCcw, Eye, CheckCircle2, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import { useTable } from '@/composables/useTable'
import { pageOrders, approveOrder, deleteOrder } from '@/api/modules/order'
import { notify } from '@/lib/toast'
import { statueTone, workTone, completeTone, deliveryTone, orderTypeName } from '@/lib/orderStatus'
import type { TableColumn } from '@/types/table'
import type { Order } from '@/types/domain'

defineOptions({ name: 'Order' })

const router = useRouter()
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Order>(pageOrders, { orderCodeLike: '', materielDescLike: '', statue: undefined })
onMounted(load)

const ALL = 'ALL'
const statueOptions = [
  { label: '全部状态', value: ALL },
  { label: '待审批', value: '1' },
  { label: '已审批', value: '2' },
  { label: '已下发', value: '5' },
  { label: '已结束', value: '3' },
  { label: '已终结', value: '4' },
]

const columns: TableColumn[] = [
  { key: 'orderCode', title: '工单编号', width: '170px' },
  { key: 'materielDesc', title: '物料' },
  { key: 'qty', title: '数量', width: '80px', align: 'right' },
  { key: 'orderType', title: '类型', width: '80px', align: 'center', formatter: (r) => orderTypeName(r.orderType) },
  { key: 'mainStatusName', title: '审批状态', slot: 'statue', width: '110px', align: 'center' },
  { key: 'workStatusName', title: '动工', slot: 'work', width: '90px', align: 'center' },
  { key: 'completeStatusName', title: '完工', slot: 'complete', width: '90px', align: 'center' },
  { key: 'deliveryStatusName', title: '交付', slot: 'delivery', width: '90px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '150px', align: 'center' },
]

function goDetail(row: Order) {
  router.push(`/production/order/${row.id}`)
}

async function onApprove(row: Order) {
  if (!row.id) return
  await approveOrder(row.id)
  notify.success('审批通过')
  load()
}

const confirmOpen = ref(false)
const target = ref<Order | null>(null)
function askDelete(row: Order) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteOrder(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}

function onReset() {
  reset(['orderCodeLike', 'materielDescLike', 'statue'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工单编号</Label>
        <Input v-model="query.orderCodeLike" placeholder="编号" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">物料</Label>
        <Input v-model="query.materielDescLike" placeholder="物料名称" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">状态</Label>
        <Select
          :model-value="query.statue != null ? String(query.statue) : ALL"
          @update:model-value="query.statue = $event && $event !== ALL ? Number($event) : undefined"
        >
          <SelectTrigger class="w-36"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="o in statueOptions" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
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
        <span class="text-sm font-medium">生产工单</span>
        <span class="text-xs text-muted-foreground">工单由生产订单下发产生，此处执行审批与全生命周期流转</span>
      </template>
      <template #statue="{ row }">
        <SpStatusBadge :tone="statueTone(row.statue)" :text="row.mainStatusName" />
      </template>
      <template #work="{ row }">
        <SpStatusBadge :tone="workTone(row.workStatus)" :text="row.workStatusName" />
      </template>
      <template #complete="{ row }">
        <SpStatusBadge :tone="completeTone(row.completeStatus)" :text="row.completeStatusName" />
      </template>
      <template #delivery="{ row }">
        <SpStatusBadge :tone="deliveryTone(row.deliveryStatus)" :text="row.deliveryStatusName" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="查看详情" @click="goDetail(row)">
            <Eye class="h-4 w-4" />
          </Button>
          <Button
            v-if="row.statue === 1"
            variant="ghost"
            size="icon-sm"
            title="审批通过"
            @click="onApprove(row)"
          >
            <CheckCircle2 class="h-4 w-4 text-success" />
          </Button>
          <Button
            v-if="row.statue === 1"
            variant="ghost"
            size="icon-sm"
            title="删除"
            @click="askDelete(row)"
          >
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <SpConfirm
      v-model:open="confirmOpen"
      title="删除工单"
      :description="`确定删除工单「${target?.orderCode ?? ''}」吗？仅待审批工单可删除。`"
      @confirm="onDelete"
    />
  </div>
</template>
