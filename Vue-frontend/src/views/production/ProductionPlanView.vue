<script setup lang="ts">
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { SPRING, staggerDelay } from '@/lib/motion'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
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
  Package,
  ClipboardList,
  CalendarDays,
  FileText,
  Layers,
  Inbox,
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
  calculateMaterialPlan,
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
useAutoRefresh(load)

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
const reduce = usePreferredReducedMotion()
const totalQty = computed(() =>
  itemRows.value.reduce((s, it) => s + (Number(it.qty) || 0), 0),
)
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
  ask('删除订单', `确定删除订单「${row.orderNo}」吗？将同步清理生产工单、派工、MRP 与入库申请。`, async () => {
    await deleteProductionOrder(row.id!)
    notify.success('删除成功')
  })
}

// MRP：未运算过先运算，再跳转物料需求计划；已运算过直接跳转，避免覆盖已下发/出库状态
const mrpRunning = ref('')
async function goMaterialPlan(row: ProductionOrder) {
  if (!row.id) return
  if (!row.mrpStatus || row.mrpStatus === 'NONE') {
    mrpRunning.value = row.id
    try {
      await calculateMaterialPlan(row.id)
      notify.success('MRP运算完成')
    } finally {
      mrpRunning.value = ''
    }
  }
  router.push({
    path: '/production/material-plan',
    query: { orderId: row.id, orderNo: row.orderNo },
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
              :disabled="mrpRunning === row.id"
              @click="goMaterialPlan(row)"
            >
              <Boxes class="h-4 w-4 text-primary" :class="mrpRunning === row.id && 'animate-pulse'" />
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
      <DialogContent class="max-h-[80vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <ClipboardList class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <DialogTitle class="leading-tight">订单明细</DialogTitle>
              <DialogDescription class="mt-0.5 truncate text-xs">
                <span class="font-mono text-foreground/70">{{ itemsOrderNo || '—' }}</span>
                <span class="mx-1.5 text-border">·</span>{{ itemRows.length }} 项<span
                  class="mx-1.5 text-border"
                  >·</span
                >共 <span class="font-medium text-foreground/80 tabular-nums">{{ totalQty }}</span> 件
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <!-- 加载态 -->
        <div
          v-if="itemsLoading"
          class="flex items-center justify-center py-12 text-sm text-muted-foreground"
        >
          加载中…
        </div>

        <!-- 空态 -->
        <div
          v-else-if="itemRows.length === 0"
          class="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground"
        >
          <Inbox class="h-8 w-8" />
          <span class="text-sm">暂无明细</span>
        </div>

        <!-- 卡片列表 -->
        <div v-else class="space-y-3">
          <Motion
            v-for="(it, i) in itemRows"
            :key="i"
            :initial="reduce === 'reduce' ? false : { opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ ...SPRING, delay: reduce === 'reduce' ? 0 : staggerDelay(i) }"
            class="rounded-xl border bg-card p-4 shadow-sp transition-shadow hover:shadow-sp-lg"
          >
            <!-- 顶部：产品名 + 物料编码 -->
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <Cpu class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <div class="truncate font-semibold leading-tight">
                  {{ it.productName || it.productMateriel || '—' }}
                </div>
                <div class="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  {{ it.productMateriel || '—' }}
                </div>
              </div>
            </div>

            <div class="my-3 border-t" />

            <!-- meta 网格 -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers class="h-3.5 w-3.5" />BOM
                </div>
                <div class="truncate font-mono text-sm" :title="it.bomCode || ''">
                  {{ it.bomCode || '—'
                  }}<span v-if="it.bomVersion" class="text-muted-foreground"> / v{{ it.bomVersion }}</span>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Package class="h-3.5 w-3.5" />数量
                </div>
                <div class="font-medium tabular-nums">{{ it.qty ?? '—' }}</div>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays class="h-3.5 w-3.5" />计划交付
                </div>
                <div class="tabular-nums">{{ it.planDeliveryDate || '—' }}</div>
              </div>
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText class="h-3.5 w-3.5" />工单
                </div>
                <div class="break-all font-mono text-sm">{{ it.workOrderCode || '—' }}</div>
              </div>
            </div>
          </Motion>
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
