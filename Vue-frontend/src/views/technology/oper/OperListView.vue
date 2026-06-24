<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Pencil, Trash2, Search, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import OperFormDialog from './OperFormDialog.vue'
import { useTable } from '@/composables/useTable'
import { pageOpers, saveOper, deleteOper } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import type { TableColumn } from '@/types/table'
import type { Oper } from '@/types/domain'

defineOptions({ name: 'Oper' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Oper>(pageOpers, { operLike: '', operDescLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'oper', title: '工序编码', width: '150px' },
  { key: 'operDesc', title: '工序名称', width: '140px' },
  { key: 'deptName', title: '归口部门', slot: 'dept', width: '130px' },
  { key: 'unitName', title: '加工单元', slot: 'unit', width: '150px' },
  { key: 'teamName', title: '执行班组', slot: 'team', width: '130px' },
  { key: 'operHours', title: '工时(h)', width: '90px', align: 'right' },
  { key: 'manuCycle', title: '制造周期', width: '90px', align: 'right' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { genPlan: 'Y', operHours: 1, manuCycle: 2 }, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: Oper) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveOper(formModel as Oper)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const target = ref<Oper | null>(null)
function askDelete(row: Oper) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteOper(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工序编码</Label>
        <Input v-model="query.operLike" placeholder="编码" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工序名称</Label>
        <Input v-model="query.operDescLike" placeholder="名称" class="w-40" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['operLike', 'operDescLike'])"
        ><RotateCcw class="h-4 w-4" />重置</Button
      >
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
        <span class="text-sm font-medium">工序定义</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增工序</Button>
      </template>
      <template #dept="{ value }">
        <span :class="value ? '' : 'text-muted-foreground'">{{ value || '—' }}</span>
      </template>
      <template #unit="{ row }">
        <div v-if="row.unitName" class="flex flex-col leading-tight">
          <span>{{ row.unitName }}</span>
          <span v-if="row.unitTypeName" class="text-xs text-muted-foreground">{{
            row.unitTypeName
          }}</span>
        </div>
        <span v-else class="text-muted-foreground">—</span>
      </template>
      <template #team="{ value }">
        <span :class="value ? '' : 'text-muted-foreground'">{{ value || '—' }}</span>
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="编辑" @click="openEdit(row)">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="删除" @click="askDelete(row)">
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <OperFormDialog
      v-model:open="dialogOpen"
      :model="formModel"
      :loading="saving"
      @submit="onSubmit"
    />
    <SpConfirm
      v-model:open="confirmOpen"
      title="删除工序"
      :description="`确定删除工序「${target?.operDesc ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
