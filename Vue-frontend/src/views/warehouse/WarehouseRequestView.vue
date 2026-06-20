<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Eye,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import WarehouseManualRequestDialog from '@/components/warehouse/WarehouseManualRequestDialog.vue'
import { useTable } from '@/composables/useTable'
import {
  confirmKittingOutboundRequest,
  confirmWarehouseItem,
  pageWarehouseRequestItems,
  pageWarehouseRequests,
  pageWarehouseTransactions,
  planInboundForKittingShortage,
  precheckKittingOutbound,
  syncKittingOutboundRequests,
  syncPlanInboundRequests,
} from '@/api/modules/warehouse'
import { notify } from '@/lib/toast'
import type { TableColumn } from '@/types/table'
import type { Tone } from '@/lib/orderStatus'
import type { WarehouseRequest, WarehouseRequestItem, WarehouseTransaction } from '@/types/domain'

defineOptions({ name: 'WarehouseRequest' })

const ALL = 'ALL'
const tab = ref<'request' | 'transaction'>('request')
const detailOpen = ref(false)
const activeRequest = ref<WarehouseRequest | null>(null)
const actionLoading = ref('')
const manualRequestOpen = ref(false)
const manualRequestDirection = ref<'IN' | 'OUT'>('IN')

const bizMap: Record<string, string> = {
  MANUAL_IN: '手工入库',
  PLAN_IN: '计划入库',
  MANUAL_OUT: '手工出库',
  KITTING_OUT: '配套出库',
}
const bizOptions = [
  { label: '全部业务', value: ALL },
  ...Object.entries(bizMap).map(([value, label]) => ({ label, value })),
]
const statusMap: Record<string, string> = { WAIT_CONFIRM: '待确认', CONFIRMED: '已确认' }
function isInbound(biz?: string) {
  return (biz || '').endsWith('_IN')
}
function statusTone(s?: string): Tone {
  return s === 'CONFIRMED' ? 'success' : 'warning'
}

// 出入库单
const reqTable = reactive(
  useTable<WarehouseRequest>(pageWarehouseRequests, {
    businessType: '',
    status: '',
    requestNoLike: '',
  }),
)
const reqColumns: TableColumn[] = [
  { key: 'requestNo', title: '单据编号', width: '180px' },
  { key: 'direction', title: '方向', slot: 'direction', width: '90px', align: 'center' },
  {
    key: 'businessType',
    title: '业务类型',
    width: '110px',
    formatter: (r) => bizMap[r.businessType] || r.businessType || '—',
  },
  { key: 'warehouseName', title: '仓库', formatter: (r) => r.warehouseName || '—' },
  { key: 'sourceNo', title: '来源单号', formatter: (r) => r.sourceNo || '—' },
  { key: 'itemCount', title: '行数', width: '60px', align: 'right' },
  { key: 'totalQty', title: '总数量', width: '90px', align: 'right' },
  { key: 'status', title: '状态', slot: 'status', width: '90px', align: 'center' },
  {
    key: 'applyUsername',
    title: '申请人',
    width: '100px',
    formatter: (r) => r.applyUsername || '—',
  },
  { key: 'applyTime', title: '申请时间', width: '160px' },
  { key: 'action', title: '操作', slot: 'action', width: '190px', align: 'center' },
]

const itemTable = reactive(
  useTable<WarehouseRequestItem>(pageWarehouseRequestItems, {
    requestId: '',
  }),
)
const itemColumns: TableColumn[] = [
  { key: 'materialCode', title: '物料', slot: 'material' },
  { key: 'requestQty', title: '申请数量', width: '90px', align: 'right' },
  { key: 'confirmedQty', title: '确认数量', width: '90px', align: 'right' },
  { key: 'warehouseName', title: '仓库', formatter: (r) => r.warehouseName || '—' },
  { key: 'locationCode', title: '库位', formatter: (r) => r.locationCode || '—' },
  { key: 'status', title: '状态', slot: 'itemStatus', width: '90px', align: 'center' },
]

// 库存事务台账
const txTable = reactive(
  useTable<WarehouseTransaction>(pageWarehouseTransactions, {
    requestNoLike: '',
    materialLike: '',
  }),
)
const txColumns: TableColumn[] = [
  { key: 'transactionNo', title: '事务编号', width: '180px' },
  { key: 'direction', title: '方向', slot: 'direction', width: '90px', align: 'center' },
  { key: 'warehouseName', title: '仓库', formatter: (r) => r.warehouseName || '—' },
  { key: 'materialName', title: '物料', formatter: (r) => r.materialName || r.materialCode || '—' },
  { key: 'batchNo', title: '批次', width: '120px', formatter: (r) => r.batchNo || '—' },
  { key: 'qty', title: '数量', width: '90px', align: 'right' },
  { key: 'beforeQty', title: '变动前', width: '90px', align: 'right' },
  { key: 'afterQty', title: '变动后', width: '90px', align: 'right' },
  {
    key: 'operatorUsername',
    title: '操作人',
    width: '100px',
    formatter: (r) => r.operatorUsername || '—',
  },
  { key: 'operateTime', title: '操作时间', width: '160px' },
]

onMounted(() => reqTable.load())
function switchTab(t: 'request' | 'transaction') {
  if (tab.value === t) return
  tab.value = t
  if (t === 'request') reqTable.load()
  else txTable.load()
}

async function run(label: string, action: () => Promise<unknown>) {
  actionLoading.value = label
  try {
    await action()
    notify.success(`${label}完成`)
    await reqTable.load()
    if (detailOpen.value && activeRequest.value?.id) {
      const fresh = reqTable.list.find((item) => item.id === activeRequest.value?.id)
      if (fresh) activeRequest.value = fresh
      await itemTable.load()
    }
  } catch (e: any) {
    if (e?.message) notify.error(e.message)
  } finally {
    actionLoading.value = ''
  }
}

function openDetail(row: WarehouseRequest) {
  activeRequest.value = row
  itemTable.query.requestId = row.id
  detailOpen.value = true
  itemTable.load()
}

function syncPlanInbound() {
  run('同步计划入库', () => syncPlanInboundRequests())
}

function syncKitting() {
  run('同步配套出库', () => syncKittingOutboundRequests())
}

function openManualRequest(direction: 'IN' | 'OUT') {
  manualRequestDirection.value = direction
  manualRequestOpen.value = true
}

function onManualRequestSaved() {
  reqTable.load()
}

function precheck(row: WarehouseRequest) {
  if (!row.id) return
  run('配套出库预检', () => precheckKittingOutbound(row.id!))
}

function shortage(row: WarehouseRequest) {
  if (!row.id) return
  run('缺料转入库计划', () => planInboundForKittingShortage(row.id!))
}

function confirmRequest(row: WarehouseRequest) {
  if (!row.id) return
  if (row.businessType === 'KITTING_OUT') {
    run('配套出库确认', () => confirmKittingOutboundRequest(row.id!))
    return
  }
  run('单据明细确认', async () => {
    const res = await pageWarehouseRequestItems({ current: 1, size: 300, requestId: row.id })
    const items = res.data?.records ?? []
    if (!items.length) {
      throw new Error('当前单据没有可确认的明细')
    }
    const pendingItems = items.filter((item) => item.id && item.status !== 'CONFIRMED')
    if (!pendingItems.length) {
      throw new Error('当前单据明细已全部确认')
    }
    for (const item of pendingItems) {
      if (!item.warehouseId || !item.locationId) {
        throw new Error('单据存在未分配仓库/库位的明细，请先在仓储源单维护库位')
      }
      await confirmWarehouseItem({
        itemId: item.id,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        qty: item.requestQty || 0,
      })
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tab 切换 -->
    <div class="inline-flex rounded-lg border bg-card p-1 shadow-sp">
      <button
        :class="[
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          tab === 'request'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="switchTab('request')"
      >
        出入库单据
      </button>
      <button
        :class="[
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          tab === 'transaction'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="switchTab('transaction')"
      >
        库存事务台账
      </button>
    </div>

    <!-- 出入库单据 -->
    <template v-if="tab === 'request'">
      <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">单据编号</Label>
          <Input
            v-model="reqTable.query.requestNoLike"
            placeholder="编号"
            class="w-40"
            @keyup.enter="reqTable.search"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">业务类型</Label>
          <Select
            :model-value="reqTable.query.businessType || ALL"
            @update:model-value="
              reqTable.query.businessType = $event && $event !== ALL ? String($event) : ''
            "
          >
            <SelectTrigger class="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in bizOptions" :key="o.value" :value="o.value">{{
                o.label
              }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">状态</Label>
          <Select
            :model-value="reqTable.query.status || ALL"
            @update:model-value="
              reqTable.query.status = $event && $event !== ALL ? String($event) : ''
            "
          >
            <SelectTrigger class="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL">全部状态</SelectItem>
              <SelectItem value="WAIT_CONFIRM">待确认</SelectItem>
              <SelectItem value="CONFIRMED">已确认</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button @click="reqTable.search"><Search class="h-4 w-4" />查询</Button>
        <Button
          variant="outline"
          @click="reqTable.reset(['businessType', 'status', 'requestNoLike'])"
        >
          <RotateCcw class="h-4 w-4" />重置
        </Button>
      </div>

      <SpDataTable
        :columns="reqColumns"
        :data="reqTable.list"
        :loading="reqTable.loading"
        :total="reqTable.total"
        :page="reqTable.query.current"
        :page-size="reqTable.query.size"
        @page-change="reqTable.onPageChange"
        @size-change="reqTable.onSizeChange"
      >
        <template #toolbar>
          <div class="flex flex-col">
            <span class="text-sm font-medium">出入库单据</span>
            <span class="hidden text-xs text-muted-foreground sm:inline"
              >手工/计划入库与手工/配套出库单据</span
            >
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" :disabled="!!actionLoading" @click="openManualRequest('IN')">
              <PackagePlus class="h-4 w-4" />新建手工入库
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="!!actionLoading"
              @click="openManualRequest('OUT')"
            >
              <PackageMinus class="h-4 w-4" />新建手工出库
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="!!actionLoading"
              @click="syncPlanInbound"
            >
              <RefreshCw class="h-4 w-4" />同步计划入库
            </Button>
            <Button size="sm" variant="outline" :disabled="!!actionLoading" @click="syncKitting">
              <RefreshCw class="h-4 w-4" />同步配套出库
            </Button>
          </div>
        </template>
        <template #direction="{ row }">
          <SpStatusBadge
            :tone="isInbound(row.businessType) ? 'success' : 'warning'"
            :text="isInbound(row.businessType) ? '入库' : '出库'"
          />
        </template>
        <template #status="{ value }">
          <SpStatusBadge :tone="statusTone(value)" :text="statusMap[value] || value || '—'" />
        </template>
        <template #action="{ row }">
          <div class="flex items-center justify-center gap-1">
            <Button variant="ghost" size="icon-sm" title="查看明细" @click="openDetail(row)">
              <Eye class="h-4 w-4" />
            </Button>
            <Button
              v-if="row.businessType === 'KITTING_OUT'"
              variant="ghost"
              size="icon-sm"
              title="配套出库预检"
              :disabled="!!actionLoading"
              @click="precheck(row)"
            >
              <AlertTriangle class="h-4 w-4 text-warning" />
            </Button>
            <Button
              v-if="row.businessType === 'KITTING_OUT'"
              variant="ghost"
              size="icon-sm"
              title="缺料转入库计划"
              :disabled="!!actionLoading"
              @click="shortage(row)"
            >
              <ArrowDownToLine class="h-4 w-4 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="确认单据"
              :disabled="row.status === 'CONFIRMED' || !!actionLoading"
              @click="confirmRequest(row)"
            >
              <ClipboardCheck class="h-4 w-4 text-success" />
            </Button>
          </div>
        </template>
      </SpDataTable>
    </template>

    <!-- 库存事务台账 -->
    <template v-else>
      <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">单据编号</Label>
          <Input
            v-model="txTable.query.requestNoLike"
            placeholder="来源单号"
            class="w-40"
            @keyup.enter="txTable.search"
          />
        </div>
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">物料</Label>
          <Input
            v-model="txTable.query.materialLike"
            placeholder="物料编码/名称"
            class="w-44"
            @keyup.enter="txTable.search"
          />
        </div>
        <Button @click="txTable.search"><Search class="h-4 w-4" />查询</Button>
        <Button variant="outline" @click="txTable.reset(['requestNoLike', 'materialLike'])">
          <RotateCcw class="h-4 w-4" />重置
        </Button>
      </div>

      <SpDataTable
        :columns="txColumns"
        :data="txTable.list"
        :loading="txTable.loading"
        :total="txTable.total"
        :page="txTable.query.current"
        :page-size="txTable.query.size"
        @page-change="txTable.onPageChange"
        @size-change="txTable.onSizeChange"
      >
        <template #toolbar>
          <span class="text-sm font-medium">库存事务台账</span>
          <span class="hidden text-xs text-muted-foreground sm:inline"
            >每次确认出入库产生的库存变动流水</span
          >
        </template>
        <template #direction="{ row }">
          <SpStatusBadge
            :tone="row.direction === 'IN' ? 'success' : 'warning'"
            :text="row.direction === 'IN' ? '入库' : '出库'"
          >
            <component
              :is="row.direction === 'IN' ? ArrowDownToLine : ArrowUpFromLine"
              class="h-3 w-3"
            />
            {{ row.direction === 'IN' ? '入库' : '出库' }}
          </SpStatusBadge>
        </template>
      </SpDataTable>
    </template>

    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>出入库明细 {{ activeRequest?.requestNo || '' }}</DialogTitle>
          <DialogDescription>确认前检查物料、仓库、库位和数量。</DialogDescription>
        </DialogHeader>
        <SpDataTable
          :columns="itemColumns"
          :data="itemTable.list"
          :loading="itemTable.loading"
          :total="itemTable.total"
          :page="itemTable.query.current"
          :page-size="itemTable.query.size"
          @page-change="itemTable.onPageChange"
          @size-change="itemTable.onSizeChange"
        >
          <template #toolbar>
            <span class="text-sm font-medium">明细行</span>
            <Button
              v-if="activeRequest"
              size="sm"
              :disabled="activeRequest.status === 'CONFIRMED' || !!actionLoading"
              @click="confirmRequest(activeRequest)"
            >
              <ClipboardCheck class="h-4 w-4" />确认整单
            </Button>
          </template>
          <template #material="{ row }">
            <span class="block font-mono text-xs">{{ row.materialCode || '—' }}</span>
            <span class="block text-xs text-muted-foreground">{{
              row.materialName || '未维护名称'
            }}</span>
          </template>
          <template #itemStatus="{ value }">
            <SpStatusBadge
              :tone="value === 'CONFIRMED' ? 'success' : 'warning'"
              :text="statusMap[value] || value || '待确认'"
            />
          </template>
        </SpDataTable>
      </DialogContent>
    </Dialog>

    <WarehouseManualRequestDialog
      v-model:open="manualRequestOpen"
      :direction="manualRequestDirection"
      @saved="onManualRequestSaved"
    />
  </div>
</template>
