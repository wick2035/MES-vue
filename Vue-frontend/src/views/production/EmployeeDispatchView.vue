<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { RotateCcw, Save, Search, UserCheck } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { pageEmployeeDispatch, saveEmployeeDispatch } from '@/api/modules/productionOrder'
import { notify } from '@/lib/toast'
import type { ProductionDispatchTask } from '@/types/domain'
import type { TableColumn } from '@/types/table'

defineOptions({ name: 'EmployeeDispatch' })

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
const form = reactive<Record<string, { userId: string; userName: string; teamName: string }>>({})

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
  { key: 'action', title: '派工', slot: 'action', width: '360px' },
]

function model(row: ProductionDispatchTask) {
  const key = row.operPlanId || ''
  if (!form[key]) {
    form[key] = {
      userId: row.userId || '',
      userName: row.userName || '',
      teamName: row.teamName || '',
    }
  }
  return form[key]
}

async function save(row: ProductionDispatchTask) {
  if (!row.operPlanId) return
  const data = model(row)
  if (!data.userId.trim()) {
    notify.info('请填写员工ID，多个员工用英文逗号分隔')
    return
  }
  saving[row.operPlanId] = true
  try {
    await saveEmployeeDispatch({
      operPlanId: row.operPlanId,
      userId: data.userId,
      userName: data.userName,
      teamName: data.teamName,
    })
    notify.success('员工作业派工已保存')
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
        <div class="grid min-w-[340px] grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <Input v-model="model(row).userId" placeholder="员工ID，逗号分隔" class="h-8" />
          <Input v-model="model(row).userName" placeholder="员工姓名" class="h-8" />
          <Input v-model="model(row).teamName" placeholder="班组" class="h-8" />
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
