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
import { pageMaterials, saveMaterial, deleteMaterial } from '@/api/modules/material'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Material } from '@/types/domain'

defineOptions({ name: 'Material' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } = useTable<Material>(
  pageMaterials,
  { materielLike: '', materielDescLike: '', matType: '', matSource: '' },
)
onMounted(load)

const columns: TableColumn[] = [
  { key: 'materiel', title: '物料编码', width: '140px' },
  { key: 'materielDesc', title: '物料名称' },
  { key: 'matType', title: '类型', width: '90px' },
  { key: 'matSource', title: '来源', width: '90px' },
  { key: 'unit', title: '单位', width: '70px', align: 'center' },
  { key: 'model', title: '型号' },
  { key: 'leadTime', title: '提前期(天)', width: '100px', align: 'right' },
  { key: 'safetyStock', title: '安全库存', width: '100px', align: 'right' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]

const formFields: FormField[] = [
  { field: 'materielDesc', label: '物料名称', type: 'input', required: true, placeholder: '请输入物料名称' },
  { field: 'materiel', label: '物料编码', type: 'input', readonly: true, placeholder: '保存后自动生成' },
  { field: 'matType', label: '物料类型', type: 'input', placeholder: '如 零件 / 半成品 / 成品' },
  { field: 'matSource', label: '来源', type: 'input', placeholder: '如 外购 / 自制' },
  { field: 'unit', label: '单位', type: 'input', placeholder: '如 个 / 件' },
  { field: 'model', label: '型号', type: 'input' },
  { field: 'texture', label: '材质', type: 'input' },
  { field: 'leadTime', label: '提前期(天)', type: 'number', required: true, min: 1 },
  { field: 'safetyStock', label: '安全库存', type: 'number', min: 0 },
  { field: 'remark', label: '备注', type: 'textarea', span: 2 },
]

// 新增/编辑
const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑物料' : '新增物料'))

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { leadTime: 1, safetyStock: 0 }, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: Material) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveMaterial(formModel as Material)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

// 删除
const confirmOpen = ref(false)
const deleteTarget = ref<Material | null>(null)
function askDelete(row: Material) {
  deleteTarget.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!deleteTarget.value?.id) return
  await deleteMaterial(deleteTarget.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}

function onReset() {
  reset(['materielLike', 'materielDescLike', 'matType', 'matSource'])
}
</script>

<template>
  <div class="space-y-4">
    <!-- 搜索区 -->
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">物料编码</Label>
        <Input v-model="query.materielLike" placeholder="编码" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">物料名称</Label>
        <Input v-model="query.materielDescLike" placeholder="名称" class="w-40" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">类型</Label>
        <Input v-model="query.matType" placeholder="类型" class="w-32" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="onReset"><RotateCcw class="h-4 w-4" />重置</Button>
    </div>

    <!-- 表格 -->
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
        <span class="text-sm font-medium">物料列表</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增物料</Button>
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
      title="删除物料"
      :description="`确定删除物料「${deleteTarget?.materielDesc ?? ''}」吗？此操作不可恢复。`"
      @confirm="onDelete"
    />
  </div>
</template>
