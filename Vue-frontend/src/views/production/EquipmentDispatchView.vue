<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { Cpu, RotateCcw, Save, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpCombobox, type ComboboxOption } from '@/components/ui/combobox'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { pageEquipments } from '@/api/modules/equipment'
import { pageEquipmentDispatch, saveEquipmentDispatch } from '@/api/modules/productionOrder'
import { notify } from '@/lib/toast'
import type { Equipment, ProductionDispatchTask } from '@/types/domain'
import type { TableColumn } from '@/types/table'

defineOptions({ name: 'EquipmentDispatch' })

const route = useRoute()
const table = reactive(
  useTable<ProductionDispatchTask>(pageEquipmentDispatch, {
    orderNoLike: String(route.query.orderNo || ''),
    productLike: '',
    operLike: '',
    assignStatus: '',
  }),
)
const saving = reactive<Record<string, boolean>>({})
const equipmentMap = reactive<Record<string, string>>({})
const equipments = reactive<Equipment[]>([])

const columns: TableColumn[] = [
  { key: 'orderNo', title: '生产订单', width: '150px' },
  { key: 'workOrderCode', title: '工单', width: '150px', formatter: (r) => r.workOrderCode || '—' },
  {
    key: 'productName',
    title: '产品',
    formatter: (r) => r.productName || r.productMateriel || '—',
  },
  { key: 'operDesc', title: '工序', slot: 'oper', width: '180px' },
  { key: 'unitName', title: '加工单元', width: '130px', formatter: (r) => r.unitName || '—' },
  {
    key: 'equipmentName',
    title: '当前设备',
    formatter: (r) => r.equipmentName || r.equipmentCode || '未派工',
  },
  { key: 'equipmentStatus', title: '状态', slot: 'status', width: '90px', align: 'center' },
  { key: 'action', title: '派工', slot: 'action', width: '260px' },
]

const equipmentOptions = computed<ComboboxOption[]>(() =>
  equipments.map((eq) => ({
    value: String(eq.id),
    label: eq.equipmentName || eq.equipmentCode || String(eq.id),
    description: eq.equipmentCode || undefined,
  })),
)

async function loadEquipments() {
  const res = await pageEquipments({ current: 1, size: 300 })
  equipments.splice(0, equipments.length, ...(res.data?.records ?? []))
}

async function save(row: ProductionDispatchTask) {
  if (!row.operPlanId) return
  const equipmentId = equipmentMap[row.operPlanId] || row.equipmentId
  if (!equipmentId) {
    notify.info('请选择设备')
    return
  }
  saving[row.operPlanId] = true
  try {
    await saveEquipmentDispatch({ operPlanId: row.operPlanId, equipmentId })
    notify.success('设备派工已保存')
    await table.load()
  } finally {
    saving[row.operPlanId] = false
  }
}

onMounted(async () => {
  await Promise.all([loadEquipments(), table.load()])
})
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
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工序</Label>
        <Input
          v-model="table.query.operLike"
          placeholder="工序编码/名称"
          class="w-44"
          @keyup.enter="table.search"
        />
      </div>
      <Button @click="table.search"><Search class="h-4 w-4" />查询</Button>
      <Button
        variant="outline"
        @click="table.reset(['orderNoLike', 'productLike', 'operLike', 'assignStatus'])"
      >
        <RotateCcw class="h-4 w-4" />重置
      </Button>
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
        <span class="text-sm font-medium">设备作业派工</span>
        <span class="hidden text-xs text-muted-foreground sm:inline"
          >审批完成后为每道工序绑定可用设备</span
        >
      </template>
      <template #oper="{ row }">
        <span class="block font-medium">{{ row.operDesc || row.oper || '—' }}</span>
        <span class="text-xs text-muted-foreground">序号 {{ row.sortNum || '—' }}</span>
      </template>
      <template #status="{ value }">
        <SpStatusBadge
          :tone="value === 'ASSIGNED' ? 'success' : 'warning'"
          :text="value === 'ASSIGNED' ? '已派工' : '待派工'"
        />
      </template>
      <template #action="{ row }">
        <div class="flex items-center gap-2">
          <SpCombobox
            :model-value="equipmentMap[row.operPlanId] || ''"
            :options="equipmentOptions"
            placeholder="选择设备"
            search-placeholder="搜索设备名称 / 编码"
            empty-text="无匹配设备"
            class="min-w-0 flex-1"
            @update:model-value="equipmentMap[row.operPlanId] = $event as string"
          />
          <Button size="sm" :disabled="saving[row.operPlanId]" @click="save(row)">
            <Save v-if="!saving[row.operPlanId]" class="h-4 w-4" />
            <Cpu v-else class="h-4 w-4 animate-spin" />
            保存
          </Button>
        </div>
      </template>
    </SpDataTable>
  </div>
</template>
