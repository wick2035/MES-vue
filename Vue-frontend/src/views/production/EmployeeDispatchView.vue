<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { RotateCcw, Save, Search, UserCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpCombobox, type ComboboxOption } from '@/components/ui/combobox'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import {
  getEmployeeCandidates,
  pageEmployeeDispatch,
  saveEmployeeDispatch,
} from '@/api/modules/productionOrder'
import { notify } from '@/lib/toast'
import type { ProductionDispatchTask } from '@/types/domain'
import type { TableColumn } from '@/types/table'

defineOptions({ name: 'EmployeeDispatch' })

interface Candidate {
  userId: string
  userName: string
  teamId?: string
  teamName?: string
  currentLoad?: number
}

const route = useRoute()
const table = reactive(
  useTable<ProductionDispatchTask>(pageEmployeeDispatch, {
    orderNoLike: String(route.query.orderNo || ''),
    productLike: '',
    operLike: '',
    assignStatus: '',
  }),
)
const saving = reactive<Record<string, boolean>>({})
/** 加工单元候选员工缓存（按 unitId） */
const candidatesByUnit = reactive<Record<string, Candidate[]>>({})
/** 各工序已选员工 userId 列表（按 operPlanId） */
const selectedByPlan = reactive<Record<string, string[]>>({})

const columns: TableColumn[] = [
  { key: 'orderNo', title: '生产订单', width: '150px' },
  { key: 'workOrderCode', title: '工单', width: '150px', formatter: (r) => r.workOrderCode || '—' },
  {
    key: 'productName',
    title: '产品',
    formatter: (r) => r.productName || r.productMateriel || '—',
  },
  { key: 'operDesc', title: '工序', slot: 'oper', width: '180px' },
  {
    key: 'equipmentName',
    title: '设备',
    formatter: (r) => r.equipmentName || r.equipmentCode || '未派设备',
  },
  { key: 'userName', title: '当前员工', formatter: (r) => r.userName || '未派工' },
  { key: 'employeeStatus', title: '状态', slot: 'status', width: '90px', align: 'center' },
  { key: 'action', title: '派工', slot: 'action', width: '380px' },
]

async function loadCandidates(unitId?: string) {
  if (!unitId || candidatesByUnit[unitId]) return
  candidatesByUnit[unitId] = []
  const res = await getEmployeeCandidates(unitId)
  candidatesByUnit[unitId] = ((res.data ?? []) as Candidate[]).map((c) => ({
    userId: String(c.userId),
    userName: c.userName || String(c.userId),
    teamId: c.teamId != null ? String(c.teamId) : undefined,
    teamName: c.teamName || undefined,
    currentLoad: Number(c.currentLoad || 0),
  }))
}

/** 表格刷新后：预取各单元候选员工，并用服务端结果回填已选 */
watch(
  () => table.list,
  (rows) => {
    for (const row of rows) {
      if (!row.operPlanId) continue
      void loadCandidates(row.unitId)
      selectedByPlan[row.operPlanId] = row.userId
        ? row.userId
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    }
  },
  { immediate: true },
)

function optionsForRow(row: ProductionDispatchTask): ComboboxOption[] {
  const list = (row.unitId && candidatesByUnit[row.unitId]) || []
  return list.map((c) => ({
    value: c.userId,
    label: c.userName,
    description: [c.teamName, c.currentLoad ? `在派 ${c.currentLoad}` : null]
      .filter(Boolean)
      .join(' · '),
  }))
}

async function save(row: ProductionDispatchTask) {
  if (!row.operPlanId) return
  const picked = selectedByPlan[row.operPlanId] ?? []
  if (!picked.length) {
    notify.info('请选择至少一名员工')
    return
  }
  const pool = (row.unitId && candidatesByUnit[row.unitId]) || []
  const chosen = picked.map((id) => pool.find((c) => c.userId === id)).filter(Boolean) as Candidate[]
  saving[row.operPlanId] = true
  try {
    await saveEmployeeDispatch({
      operPlanId: row.operPlanId,
      userId: chosen.map((c) => c.userId).join(','),
      userName: chosen.map((c) => c.userName).join(','),
      teamId: chosen.map((c) => c.teamId || '').join(','),
      teamName: chosen.map((c) => c.teamName || '').join(','),
    })
    notify.success(`员工作业派工已保存，共 ${chosen.length} 人`)
    await table.load()
  } finally {
    saving[row.operPlanId] = false
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
        <span class="text-sm font-medium">员工作业派工</span>
        <span class="hidden text-xs text-muted-foreground sm:inline"
          >设备派工完成后为工序绑定员工或班组</span
        >
      </template>
      <template #oper="{ row }">
        <span class="block font-medium">{{ row.operDesc || row.oper || '—' }}</span>
        <span class="text-xs text-muted-foreground">{{ row.unitName || '未维护加工单元' }}</span>
      </template>
      <template #status="{ row }">
        <SpStatusBadge
          :tone="row.userId ? 'success' : 'warning'"
          :text="row.userId ? '已派工' : '待派工'"
        />
      </template>
      <template #action="{ row }">
        <div class="flex min-w-[340px] items-center gap-2">
          <SpCombobox
            :model-value="selectedByPlan[row.operPlanId] ?? []"
            :options="optionsForRow(row)"
            multiple
            placeholder="选择员工（可多选）"
            search-placeholder="搜索员工姓名"
            :empty-text="row.unitId ? '该单元暂无可选员工' : '未维护加工单元'"
            class="min-w-0 flex-1"
            @update:model-value="selectedByPlan[row.operPlanId] = $event as string[]"
          />
          <Button size="sm" :disabled="saving[row.operPlanId]" @click="save(row)">
            <Save v-if="!saving[row.operPlanId]" class="h-4 w-4" />
            <UserCheck v-else class="h-4 w-4 animate-spin" />
            保存
          </Button>
        </div>
      </template>
    </SpDataTable>
  </div>
</template>
