<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Boxes, Calculator, PackageCheck, RotateCcw, Search, Send } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import {
  applyKittingOutbound,
  calculateMaterialPlan,
  generateInboundRequest,
  generateKittingOutbound,
  pageMaterialPlans,
  releaseMaterialPlans,
} from '@/api/modules/productionOrder'
import { notify } from '@/lib/toast'
import type { MaterialRequirementPlan } from '@/types/domain'
import type { TableColumn } from '@/types/table'

defineOptions({ name: 'MaterialPlan' })

const route = useRoute()
const selected = ref<string[]>([])
const operating = ref('')

const table = reactive(
  useTable<MaterialRequirementPlan>(pageMaterialPlans, {
    productionOrderId: String(route.query.orderId || ''),
    orderNoLike: String(route.query.orderNo || ''),
    materialLike: '',
  }),
)

const columns: TableColumn[] = [
  { key: 'select', title: '选择', slot: 'select', width: '64px', align: 'center' },
  { key: 'productionOrderNo', title: '生产订单', width: '160px' },
  {
    key: 'productName',
    title: '产品',
    slot: 'product',
    width: '140px',
    formatter: (r) => r.productName || r.productMateriel || '—',
  },
  { key: 'materialCode', title: '需求物料', slot: 'material', width: '240px' },
  { key: 'grossRequirement', title: '毛需求', align: 'right', width: '90px' },
  { key: 'availableStock', title: '可用库存', align: 'right', width: '90px' },
  { key: 'netRequirement', title: '净需求', slot: 'net', align: 'right', width: '100px' },
  { key: 'requirementDate', title: '需求日期', width: '120px' },
  { key: 'deliveryStatus', title: '下发', slot: 'delivery', width: '90px', align: 'center' },
  { key: 'inboundStatus', title: '入库', slot: 'inbound', width: '90px', align: 'center' },
  { key: 'outboundStatus', title: '出库', slot: 'outbound', width: '90px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]

const hasOrderContext = computed(() => !!table.query.productionOrderId)
const statusText: Record<string, string> = {
  NONE: '未处理',
  RELEASED: '已下发',
  GENERATED: '已生成',
  CONFIRMED: '已确认',
  COMPLETED: '已完成',
}

function isSelected(id?: string) {
  return !!id && selected.value.includes(id)
}

function toggle(id: string | undefined, checked: boolean) {
  if (!id) return
  selected.value = checked
    ? Array.from(new Set([...selected.value, id]))
    : selected.value.filter((v) => v !== id)
}

function ids(row?: MaterialRequirementPlan) {
  if (row?.id) return [row.id]
  return selected.value
}

async function run(label: string, action: () => Promise<unknown>) {
  operating.value = label
  try {
    await action()
    notify.success(`${label}完成`)
    selected.value = []
    await table.load()
  } finally {
    operating.value = ''
  }
}

function ensureSelected(row?: MaterialRequirementPlan) {
  const values = ids(row)
  if (!values.length) {
    notify.info('请先选择物料需求计划')
    return null
  }
  return values
}

function release(row?: MaterialRequirementPlan) {
  const values = ensureSelected(row)
  if (!values) return
  run('MRP下发', () => releaseMaterialPlans(values))
}

function inbound(row?: MaterialRequirementPlan) {
  const values = ensureSelected(row)
  if (!values) return
  run('生成入库申请', () => generateInboundRequest(values))
}

function kitting(row?: MaterialRequirementPlan) {
  const values = ensureSelected(row)
  if (!values) return
  run('申请配套出库', () => applyKittingOutbound(values))
}

function kittingRequest(row?: MaterialRequirementPlan) {
  const values = ensureSelected(row)
  if (!values) return
  run('生成配套出库单', () => generateKittingOutbound(values))
}

function calculate() {
  if (!table.query.productionOrderId) {
    notify.info('从生产订单进入，或填写生产订单ID后再运算')
    return
  }
  run('MRP运算', () => calculateMaterialPlan(String(table.query.productionOrderId)))
}

onMounted(table.load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">生产订单</Label>
        <Input
          v-model="table.query.orderNoLike"
          placeholder="订单编号"
          class="w-40"
          @keyup.enter="table.search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">物料</Label>
        <Input
          v-model="table.query.materialLike"
          placeholder="物料编码/名称"
          class="w-44"
          @keyup.enter="table.search"
        />
      </div>
      <Button @click="table.search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="table.reset(['orderNoLike', 'materialLike'])">
        <RotateCcw class="h-4 w-4" />重置
      </Button>
      <Button :disabled="!hasOrderContext || !!operating" @click="calculate">
        <Calculator class="h-4 w-4" />MRP运算
      </Button>
    </div>

    <SpDataTable
      :columns="columns"
      :data="table.list"
      :loading="table.loading"
      :total="table.total"
      :page="table.query.current"
      :page-size="table.query.size"
      :show-index="false"
      @page-change="table.onPageChange"
      @size-change="table.onSizeChange"
    >
      <template #toolbar>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium">物料需求计划</span>
          <span class="text-xs text-muted-foreground">已选 {{ selected.length }} 项</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="!selected.length || !!operating"
            @click="release()"
          >
            <Send class="h-4 w-4" />批量下发
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="!selected.length || !!operating"
            @click="inbound()"
          >
            <PackageCheck class="h-4 w-4" />生成入库
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="!selected.length || !!operating"
            @click="kitting()"
          >
            <Boxes class="h-4 w-4" />配套出库
          </Button>
        </div>
      </template>
      <template #select="{ row }">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-input accent-primary"
          aria-label="选择当前物料计划"
          :checked="isSelected(row.id)"
          @change="toggle(row.id, ($event.target as HTMLInputElement).checked)"
        />
      </template>
      <template #product="{ row }">
        <span
          class="block max-w-[140px] truncate"
          :title="row.productName || row.productMateriel || ''"
        >
          {{ row.productName || row.productMateriel || '—' }}
        </span>
      </template>
      <template #material="{ row }">
        <div class="max-w-[240px] leading-tight">
          <span class="block truncate font-mono text-xs" :title="row.materialCode || ''">
            {{ row.materialCode || '—' }}
          </span>
          <span
            class="block truncate text-xs text-muted-foreground"
            :title="row.materialName || ''"
          >
            {{ row.materialName || '未维护名称' }}
          </span>
        </div>
      </template>
      <template #net="{ row, value }">
        <span :class="Number(value || 0) > 0 ? 'font-semibold text-warning' : 'text-success'">
          {{ value ?? 0 }} {{ row.unit || '' }}
        </span>
      </template>
      <template #delivery="{ value }">
        <SpStatusBadge
          :tone="value === 'RELEASED' ? 'success' : 'warning'"
          :text="statusText[value] || value || '未处理'"
        />
      </template>
      <template #inbound="{ value }">
        <SpStatusBadge
          :tone="value === 'COMPLETED' || value === 'CONFIRMED' ? 'success' : 'muted'"
          :text="statusText[value] || value || '未处理'"
        />
      </template>
      <template #outbound="{ value }">
        <SpStatusBadge
          :tone="value === 'COMPLETED' || value === 'CONFIRMED' ? 'success' : 'muted'"
          :text="statusText[value] || value || '未处理'"
        />
      </template>
      <template #action="{ row }">
        <Button
          size="sm"
          variant="ghost"
          class="h-8 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
          title="生成配套出库单"
          :disabled="!!operating"
          @click="kittingRequest(row)"
        >
          <Send class="h-4 w-4" />
          出库单
        </Button>
      </template>
    </SpDataTable>
  </div>
</template>
