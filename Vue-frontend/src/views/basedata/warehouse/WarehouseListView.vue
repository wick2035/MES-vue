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
import { pageWarehouses, saveWarehouse, deleteWarehouse } from '@/api/modules/warehouse'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Warehouse } from '@/types/domain'

defineOptions({ name: 'Warehouse' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Warehouse>(pageWarehouses, { warehouseCodeLike: '', warehouseNameLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'warehouseCode', title: '库房编码', width: '150px' },
  { key: 'warehouseName', title: '库房名称' },
  { key: 'warehouseType', title: '类型', width: '110px' },
  { key: 'warehouseDesc', title: '描述' },
  {
    key: 'spec',
    title: '规格(组/排/层/列)',
    width: '160px',
    align: 'center',
    formatter: (row) =>
      [row.specGroup, row.specRow, row.specLayer, row.specColumn]
        .map((v) => v ?? '-')
        .join(' / '),
  },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]
const formFields: FormField[] = [
  { field: 'warehouseCode', label: '库房编码', type: 'input', required: true },
  { field: 'warehouseName', label: '库房名称', type: 'input', required: true },
  { field: 'warehouseType', label: '类型', type: 'input', placeholder: '如 原料库 / 成品库' },
  { field: 'warehouseDesc', label: '描述', type: 'input' },
  { field: 'specGroup', label: '组数', type: 'number', min: 0 },
  { field: 'specRow', label: '排数', type: 'number', min: 0 },
  { field: 'specLayer', label: '层数', type: 'number', min: 0 },
  { field: 'specColumn', label: '列数', type: 'number', min: 0 },
  { field: 'remark', label: '备注', type: 'textarea', span: 2 },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑库房' : '新增库房'))

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: Warehouse) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveWarehouse(formModel as Warehouse)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const deleteTarget = ref<Warehouse | null>(null)
function askDelete(row: Warehouse) {
  deleteTarget.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!deleteTarget.value?.id) return
  await deleteWarehouse(deleteTarget.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
function onReset() {
  reset(['warehouseCodeLike', 'warehouseNameLike'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">库房编码</Label>
        <Input v-model="query.warehouseCodeLike" placeholder="编码" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">库房名称</Label>
        <Input v-model="query.warehouseNameLike" placeholder="名称" class="w-40" @keyup.enter="search" />
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
        <span class="text-sm font-medium">库房列表</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增库房</Button>
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
      title="删除库房"
      :description="`确定删除库房「${deleteTarget?.warehouseName ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
