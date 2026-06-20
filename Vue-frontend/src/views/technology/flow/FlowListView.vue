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
import { pageFlows, saveFlow, deleteFlow } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Flow } from '@/types/domain'

defineOptions({ name: 'Flow' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Flow>(pageFlows, { flowLike: '', flowDescLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'flow', title: '工艺路线编码', width: '200px' },
  { key: 'flowDesc', title: '工艺路线名称' },
  { key: 'process', title: '工序流程' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]

const formFields: FormField[] = [
  { field: 'flow', label: '工艺路线编码', type: 'input', readonly: true, placeholder: '保存后自动生成' },
  { field: 'flowDesc', label: '工艺路线名称', type: 'input', required: true },
  { field: 'process', label: '工序流程描述', type: 'textarea', span: 2, placeholder: '如：备料→冲压→焊接→检验' },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑工艺路线' : '新增工艺路线'))

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: Flow) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveFlow(formModel as Flow)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const target = ref<Flow | null>(null)
function askDelete(row: Flow) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteFlow(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工艺路线编码</Label>
        <Input v-model="query.flowLike" placeholder="编码" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">工艺路线名称</Label>
        <Input v-model="query.flowDescLike" placeholder="名称" class="w-40" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['flowLike', 'flowDescLike'])"><RotateCcw class="h-4 w-4" />重置</Button>
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
        <span class="text-sm font-medium">工艺路线</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增工艺路线</Button>
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
      title="删除工艺路线"
      :description="`确定删除工艺路线「${target?.flowDesc ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
