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
import { pageEquipments, saveEquipment, deleteEquipment } from '@/api/modules/equipment'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Equipment } from '@/types/domain'

defineOptions({ name: 'Equipment' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Equipment>(pageEquipments, {
    equipmentCodeLike: '',
    equipmentNameLike: '',
    purposeLike: '',
  })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'equipmentCode', title: '设备编码', width: '150px' },
  { key: 'equipmentName', title: '设备名称' },
  { key: 'equipmentModel', title: '型号' },
  { key: 'purpose', title: '用途' },
  { key: 'spec', title: '规格' },
  { key: 'status', title: '状态', width: '100px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]
const formFields: FormField[] = [
  { field: 'equipmentCode', label: '设备编码', type: 'input', required: true },
  { field: 'equipmentName', label: '设备名称', type: 'input', required: true },
  { field: 'equipmentModel', label: '型号', type: 'input' },
  { field: 'purpose', label: '用途', type: 'input' },
  { field: 'spec', label: '规格', type: 'input' },
  { field: 'status', label: '状态', type: 'input', placeholder: '如 正常 / 停机 / 维修' },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑设备' : '新增设备'))

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, data)
}
function openCreate() {
  resetModel({ status: '正常' })
  dialogOpen.value = true
}
function openEdit(row: Equipment) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveEquipment(formModel as Equipment)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const deleteTarget = ref<Equipment | null>(null)
function askDelete(row: Equipment) {
  deleteTarget.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!deleteTarget.value?.id) return
  await deleteEquipment(deleteTarget.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
function onReset() {
  reset(['equipmentCodeLike', 'equipmentNameLike', 'purposeLike'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">设备编码</Label>
        <Input
          v-model="query.equipmentCodeLike"
          placeholder="编码"
          class="w-40"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">设备名称</Label>
        <Input
          v-model="query.equipmentNameLike"
          placeholder="名称"
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
        <span class="text-sm font-medium">设备列表</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增设备</Button>
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
      title="删除设备"
      :description="`确定删除设备「${deleteTarget?.equipmentName ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
