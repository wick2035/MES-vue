<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Boxes,
  Cpu,
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Eye,
  Send,
  CheckCircle2,
  Rocket,
  Trash2,
  Users,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import ProductionOrderEditDialog from './ProductionOrderEditDialog.vue'
import { useTable } from '@/composables/useTable'
import {
  pageProductionOrders,
  getProductionOrderItems,
  confirmProductionOrder,
  createWorkOrder,
  deleteProductionOrder,
} from '@/api/modules/productionOrder'
import { notify } from '@/lib/toast'
import { getProductionOrderActions } from '@/lib/productionOrderActions'
import type { TableColumn } from '@/types/table'
import type { ProductionOrder, ProductionOrderItem } from '@/types/domain'
import type { Tone } from '@/lib/orderStatus'

defineOptions({ name: 'ProductionPlan' })

const router = useRouter()
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<ProductionOrder>(pageProductionOrders, {
    orderNoLike: '',
    customerNameLike: '',
    productLike: '',
  })
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
  if (s === 'CONFIRMED' || s === 'WORK_ORDER_CREATED' || s === 'APPROVED' || s === 'DISPATCHED')
    return 'success'
  if (s === 'CANCELLED' || s === 'REJECTED') return 'danger'
  if (s === 'APPROVING') return 'warning'
  return 'muted'
}

const columns: TableColumn[] = [
  { key: 'orderNo', title: '订单编号', width: '170px' },
  {
    key: 'sourceType',
    title: '来源',
    width: '70px',
    align: 'center',
    formatter: (r) => sourceMap[r.sourceType] || r.sourceType || '—',
  },
  { key: 'customerName', title: '客户' },
  { key: 'firstProductName', title: '主产品' },
  { key: 'itemCount', title: '行数', width: '60px', align: 'right' },
  { key: 'totalQty', title: '总数量', width: '80px', align: 'right' },
  { key: 'status', title: '订单状态', slot: 'status', width: '100px', align: 'center' },
  { key: 'approvalStatus', title: '审批', slot: 'approval', width: '80px', align: 'center' },
  { key: 'operationStatus', title: '运营', slot: 'op', width: '80px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '210px', align: 'center' },
]

// 新建/编辑
const editOpen = ref(false)
const editTarget = ref<ProductionOrder | null>(null)
function openCreate() {
  editTarget.value = null
  editOpen.value = true
}
function openEdit(row: ProductionOrder) {
  editTarget.value = row
  editOpen.value = true
}

// 明细查看
const itemsOpen = ref(false)
const itemsLoading = ref(false)
const itemRows = ref<ProductionOrderItem[]>([])
const itemsOrderNo = ref('')
async function viewItems(row: ProductionOrder) {
  itemsOrderNo.value = row.orderNo || ''
  itemsOpen.value = true
  itemsLoading.value = true
  try {
    const res = await getProductionOrderItems(row.id!)
    itemRows.value = res.data ?? []
  } finally {
    itemsLoading.value = false
  }
}

// 生命周期动作 + 二次确认
const confirmOpen = ref(false)
const confirming = ref(false)
const confirmTitle = ref('')
const confirmDesc = ref('')
let confirmAction: (() => Promise<void>) | null = null
function ask(title: string, desc: string, action: () => Promise<void>) {
  confirmTitle.value = title
  confirmDesc.value = desc
  confirmAction = action
  confirmOpen.value = true
}
async function runConfirm() {
  if (!confirmAction || confirming.value) return
  confirming.value = true
  try {
    await confirmAction()
    confirmOpen.value = false
    confirmAction = null
    await load()
  } finally {
    confirming.value = false
  }
}

function askCreateWO(row: ProductionOrder) {
  ask(
    '提交并生成工单',
    `确定将订单「${row.orderNo}」提交生产主管审批并生成生产工单吗？`,
    async () => {
      await createWorkOrder(row.id!)
      notify.success('已提交审批并生成工单')
    },
  )
}
function askConfirm(row: ProductionOrder) {
  ask('确认订单', `确定确认订单「${row.orderNo}」吗？确认后进入待派工。`, async () => {
    await confirmProductionOrder(row.id!)
    notify.success('订单已确认')
  })
}
function askDelete(row: ProductionOrder) {
  ask('删除订单', `确定删除订单「${row.orderNo}」吗？此操作不可恢复。`, async () => {
    await deleteProductionOrder(row.id!)
    notify.success('删除成功')
  })
}

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
        <Input
          v-model="query.customerNameLike"
          placeholder="客户名称"
          class="w-40"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">产品</Label>
        <Input
          v-model="query.productLike"
          placeholder="产品名称"
          class="w-40"
          @keyup.enter="search"
        />
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
        <span class="hidden text-xs text-muted-foreground sm:inline"
          >销售/预测来源，确认后下发为生产工单</span
        >
        <Button size="sm" class="ml-auto" @click="openCreate"
          ><Plus class="h-4 w-4" />新建订单</Button
        >
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
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-0.5">
          <template v-for="action in getProductionOrderActions(row)" :key="action.key">
            <Button
              v-if="action.key === 'view'"
              variant="ghost"
              size="icon-sm"
              title="查看明细"
              @click="viewItems(row)"
            >
              <Eye class="h-4 w-4" />
            </Button>
            <Button
              v-else-if="action.key === 'edit'"
              variant="ghost"
              size="icon-sm"
              title="编辑"
              @click="openEdit(row)"
            >
              <Pencil class="h-4 w-4" />
            </Button>
            <Button
              v-else-if="action.key === 'confirm'"
              variant="ghost"
              size="icon-sm"
              title="确认订单"
              @click="askConfirm(row)"
            >
              <CheckCircle2 class="h-4 w-4 text-success" />
            </Button>
            <Button
              v-else-if="action.key === 'submit'"
              variant="ghost"
              size="icon-sm"
              title="提交并生成工单"
              @click="askCreateWO(row)"
            >
              <Send class="h-4 w-4 text-primary" />
            </Button>
            <Button
              v-else-if="action.key === 'materialPlan'"
              variant="ghost"
              size="icon-sm"
              title="MRP物料计划"
              @click="
                router.push({
                  path: '/production/material-plan',
                  query: { orderId: row.id, orderNo: row.orderNo },
                })
              "
            >
              <Boxes class="h-4 w-4 text-primary" />
            </Button>
            <Button
              v-else-if="action.key === 'equipmentDispatch'"
              variant="ghost"
              size="icon-sm"
              title="设备派工"
              @click="
                router.push({
                  path: '/production/equipment-dispatch',
                  query: { orderNo: row.orderNo },
                })
              "
            >
              <Cpu class="h-4 w-4 text-primary" />
            </Button>
            <Button
              v-else-if="action.key === 'employeeDispatch'"
              variant="ghost"
              size="icon-sm"
              title="员工派工"
              @click="
                router.push({
                  path: '/production/employee-dispatch',
                  query: { orderNo: row.orderNo },
                })
              "
            >
              <Users class="h-4 w-4 text-primary" />
            </Button>
            <Button
              v-else-if="action.key === 'dispatch'"
              variant="ghost"
              size="icon-sm"
              title="进入下发中心"
              @click="
                router.push({ path: '/production/dispatch', query: { orderNo: row.orderNo } })
              "
            >
              <Rocket class="h-4 w-4 text-warning" />
            </Button>
            <Button
              v-else-if="action.key === 'delete'"
              variant="ghost"
              size="icon-sm"
              title="删除"
              @click="askDelete(row)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </template>
        </div>
      </template>
    </SpDataTable>

    <ProductionOrderEditDialog v-model:open="editOpen" :order="editTarget" @saved="load" />

    <!-- 明细查看 -->
    <Dialog v-model:open="itemsOpen">
      <DialogContent class="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>订单明细 · {{ itemsOrderNo }}</DialogTitle>
          <DialogDescription class="sr-only">产品明细列表</DialogDescription>
        </DialogHeader>
        <div class="overflow-x-auto rounded-lg border">
          <table class="w-full text-sm">
            <thead class="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-2 text-left font-medium">产品物料</th>
                <th class="px-3 py-2 text-left font-medium">产品名称</th>
                <th class="px-3 py-2 text-left font-medium">BOM</th>
                <th class="px-3 py-2 text-right font-medium">数量</th>
                <th class="px-3 py-2 text-left font-medium">计划交付</th>
                <th class="px-3 py-2 text-left font-medium">工单</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="itemsLoading">
                <td colspan="6" class="px-3 py-6 text-center text-muted-foreground">加载中…</td>
              </tr>
              <tr v-else-if="itemRows.length === 0">
                <td colspan="6" class="px-3 py-6 text-center text-muted-foreground">暂无明细</td>
              </tr>
              <tr v-for="(it, i) in itemRows" :key="i" class="border-t">
                <td class="px-3 py-2">{{ it.productMateriel || '—' }}</td>
                <td class="px-3 py-2">{{ it.productName || '—' }}</td>
                <td class="px-3 py-2">
                  {{ it.bomCode || '—'
                  }}<span v-if="it.bomVersion" class="text-muted-foreground">
                    / {{ it.bomVersion }}</span
                  >
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{{ it.qty ?? '—' }}</td>
                <td class="px-3 py-2">{{ it.planDeliveryDate || '—' }}</td>
                <td class="px-3 py-2">{{ it.workOrderCode || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>

    <SpConfirm
      v-model:open="confirmOpen"
      :title="confirmTitle"
      :description="confirmDesc"
      :confirming="confirming"
      @confirm="runConfirm"
    />
  </div>
</template>
