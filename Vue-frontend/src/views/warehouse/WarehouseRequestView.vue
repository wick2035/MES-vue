<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Search, RotateCcw, ArrowDownToLine, ArrowUpFromLine } from 'lucide-vue-next'
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
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { pageWarehouseRequests, pageWarehouseTransactions } from '@/api/modules/warehouse'
import type { TableColumn } from '@/types/table'
import type { Tone } from '@/lib/orderStatus'
import type { WarehouseRequest, WarehouseTransaction } from '@/types/domain'

defineOptions({ name: 'WarehouseRequest' })

const ALL = 'ALL'
const tab = ref<'request' | 'transaction'>('request')

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
          <span class="text-sm font-medium">出入库单据</span>
          <span class="hidden text-xs text-muted-foreground sm:inline"
            >手工/计划入库与手工/配套出库单据</span
          >
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
  </div>
</template>
