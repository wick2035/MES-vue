<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Search, RotateCcw, Eye, Lock, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import { useTable } from '@/composables/useTable'
import { pageBoms, lockBom, deleteBom, saveBom } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Bom } from '@/types/domain'

defineOptions({ name: 'Bom' })

const router = useRouter()
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Bom>(pageBoms, { materielCodeLike: '' })
onMounted(load)

const isLocked = (s?: string) => s === '1' || s === 'Y'

const columns: TableColumn[] = [
  { key: 'bomCode', title: 'BOM 编码', width: '170px' },
  { key: 'materielCode', title: '产品物料', width: '150px' },
  { key: 'materielDesc', title: '产品名称' },
  { key: 'versionNumber', title: '版本', width: '90px', align: 'center' },
  { key: 'bomLevel', title: '层级', width: '70px', align: 'center' },
  { key: 'lockStatus', title: '锁定', slot: 'lock', width: '100px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '160px', align: 'center' },
]

const formFields: FormField[] = [
  {
    field: 'bomCode',
    label: 'BOM 编码',
    type: 'input',
    readonly: true,
    placeholder: '保存后自动生成',
  },
  { field: 'materielCode', label: '产品物料编码', type: 'input', required: true },
  { field: 'materielDesc', label: '产品名称', type: 'input', required: true },
  { field: 'versionNumber', label: '版本号', type: 'input', placeholder: '如：V1.0' },
  { field: 'bomLevel', label: 'BOM 层级', type: 'number', min: 1, placeholder: '1' },
  { field: 'factory', label: '工厂', type: 'input' },
  { field: 'remark', label: '备注', type: 'textarea', span: 2 },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑 BOM' : '新建 BOM'))

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { bomLevel: 1, versionNumber: 'V1.0' }, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: Bom) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveBom(formModel as Bom)
    notify.success(isEdit.value ? '修改成功' : '新建成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const target = ref<Bom | null>(null)
function askDelete(row: Bom) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteBom(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
async function onLock(row: Bom) {
  if (!row.id) return
  await lockBom(row.id)
  notify.success('已锁定')
  load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">产品物料编码</Label>
        <Input
          v-model="query.materielCodeLike"
          placeholder="物料编码"
          class="w-44"
          @keyup.enter="search"
        />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['materielCodeLike'])"
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
        <span class="text-sm font-medium">产品 BOM</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新建 BOM</Button>
      </template>
      <template #lock="{ value }">
        <SpStatusBadge
          :tone="isLocked(value) ? 'success' : 'muted'"
          :text="isLocked(value) ? '已锁定' : '未锁定'"
        />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="查看结构"
            @click="router.push(`/technology/bom/${row.id}`)"
          >
            <Eye class="h-4 w-4" />
          </Button>
          <Button
            v-if="!isLocked(row.lockStatus)"
            variant="ghost"
            size="icon-sm"
            title="编辑"
            @click="openEdit(row)"
          >
            <Pencil class="h-4 w-4" />
          </Button>
          <Button
            v-if="!isLocked(row.lockStatus)"
            variant="ghost"
            size="icon-sm"
            title="锁定"
            @click="onLock(row)"
          >
            <Lock class="h-4 w-4 text-warning" />
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
      title="删除 BOM"
      :description="`确定删除 BOM「${target?.bomCode ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
