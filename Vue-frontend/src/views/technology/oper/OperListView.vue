<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Pencil, Trash2, Search, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import { useTable } from '@/composables/useTable'
import { pageOpers, saveOper, deleteOper } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Oper } from '@/types/domain'

defineOptions({ name: 'Oper' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Oper>(pageOpers, { operLike: '', operDescLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'oper', title: '工序编码', width: '160px' },
  { key: 'operDesc', title: '工序名称' },
  { key: 'operHours', title: '工时(h)', width: '100px', align: 'right' },
  { key: 'manuCycle', title: '制造周期', width: '100px', align: 'right' },
  {
    key: 'genPlan',
    title: '生成计划',
    width: '100px',
    align: 'center',
    formatter: (r) => (r.genPlan === 'Y' ? '是' : '否'),
  },
  { key: 'remark', title: '备注' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]
const formFields: FormField[] = [
  {
    field: 'oper',
    label: '工序编码',
    type: 'input',
    readonly: true,
    placeholder: '保存后自动生成',
  },
  { field: 'operDesc', label: '工序名称', type: 'input', required: true },
  { field: 'operHours', label: '工时(小时)', type: 'number', min: 0 },
  { field: 'manuCycle', label: '制造周期', type: 'number', min: 0 },
  {
    field: 'genPlan',
    label: '生成计划',
    type: 'select',
    options: [
      { label: '是', value: 'Y' },
      { label: '否', value: 'N' },
    ],
  },
  { field: 'remark', label: '备注', type: 'textarea', span: 2 },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑工序' : '新增工序'))

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

    <SpFormDialog
      v-model:open="dialogOpen"
      :title="dialogTitle"
      :fields="formFields"
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
