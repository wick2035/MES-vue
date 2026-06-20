<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import { getBomDetail, listBomItems, saveBomItem, deleteBomItem } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { Bom, BomItem } from '@/types/domain'

defineOptions({ name: 'BomDetail' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const bom = ref<Bom | null>(null)
const items = ref<BomItem[]>([])
const loading = ref(true)

const isLocked = (s?: string) => s === 'locked' || s === '1' || s === 'Y'
const locked = computed(() => isLocked(bom.value?.lockStatus))

const itemColumns: TableColumn[] = [
  { key: 'lineNo', title: '行号', width: '80px', align: 'center' },
  { key: 'materielItemCode', title: '子项物料', width: '160px' },
  { key: 'materielItemDesc', title: '子项名称' },
  { key: 'itemMatType', title: '类型', width: '90px', align: 'center' },
  { key: 'itemNum', title: '用量', width: '90px', align: 'right' },
  { key: 'itemUnit', title: '单位', width: '80px', align: 'center' },
  { key: 'childBomCode', title: '子 BOM', width: '150px' },
  { key: 'action', title: '操作', slot: 'action', width: '110px', align: 'center' },
]

const itemFormFields: FormField[] = [
  { field: 'lineNo', label: '行号', type: 'number', min: 1, required: true },
  { field: 'materielItemCode', label: '子项物料编码', type: 'input', required: true },
  { field: 'materielItemDesc', label: '子项名称', type: 'input', required: true },
  {
    field: 'itemMatType',
    label: '物料类型',
    type: 'select',
    options: [
      { label: '原材料', value: 'RAW' },
      { label: '半成品', value: 'SEMI' },
      { label: '成品', value: 'FIN' },
      { label: '外购件', value: 'BUY' },
    ],
  },
  { field: 'itemNum', label: '用量', type: 'number', min: 0, required: true },
  { field: 'itemUnit', label: '单位', type: 'input', placeholder: '如：个、kg、m' },
  { field: 'childBomCode', label: '子 BOM 编码', type: 'input', placeholder: '可选' },
]

async function load() {
  loading.value = true
  try {
    const [d, it] = await Promise.all([getBomDetail(id), listBomItems(id)])
    bom.value = d.data ?? null
    items.value = it.data ?? []
  } finally {
    loading.value = false
  }
}
onMounted(load)

// --- 子项 新增/编辑 ---
const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑子项' : '新增子项'))

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(
    formModel,
    { bomHeadId: id, itemNum: 1, itemUnit: '个', lineNo: items.value.length + 1 },
    data,
  )
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: BomItem) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveBomItem(formModel as BomItem)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

// --- 子项 删除 ---
const confirmOpen = ref(false)
const target = ref<BomItem | null>(null)
function askDelete(row: BomItem) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteBomItem(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/technology/bom')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="text-lg font-semibold">{{ bom?.bomCode || 'BOM 结构' }}</h2>
      <SpStatusBadge
        v-if="bom"
        :tone="locked ? 'success' : 'muted'"
        :text="locked ? '已锁定' : '未锁定'"
      />
      <Button variant="ghost" size="icon-sm" class="ml-auto" title="刷新" @click="load">
        <RefreshCw class="h-4 w-4" />
      </Button>
    </div>

    <Skeleton v-if="loading" class="h-24 w-full" />
    <Card v-else-if="bom">
      <CardHeader><CardTitle class="text-base">BOM 信息</CardTitle></CardHeader>
      <CardContent class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">产品物料</span
          ><span class="font-medium">{{ bom.materielCode || '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">产品名称</span
          ><span class="font-medium">{{ bom.materielDesc || '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">版本</span
          ><span class="font-medium">{{ bom.versionNumber || '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">层级</span
          ><span class="font-medium">{{ bom.bomLevel ?? '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">工厂</span
          ><span class="font-medium">{{ bom.factory || '—' }}</span>
        </div>
      </CardContent>
    </Card>

    <SpDataTable
      :columns="itemColumns"
      :data="items"
      :show-index="false"
      :total="items.length"
      :page-size="items.length || 10"
    >
      <template #toolbar>
        <span class="text-sm font-medium">子项清单</span>
        <span class="text-xs text-muted-foreground">共 {{ items.length }} 项</span>
        <Button v-if="!locked" size="sm" class="ml-auto" @click="openCreate">
          <Plus class="h-4 w-4" />新增子项
        </Button>
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button v-if="!locked" variant="ghost" size="icon-sm" title="编辑" @click="openEdit(row)">
            <Pencil class="h-4 w-4" />
          </Button>
          <Button
            v-if="!locked"
            variant="ghost"
            size="icon-sm"
            title="删除"
            @click="askDelete(row)"
          >
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
          <span v-if="locked" class="text-xs text-muted-foreground">已锁定</span>
        </div>
      </template>
    </SpDataTable>

    <SpFormDialog
      v-model:open="dialogOpen"
      :title="dialogTitle"
      :fields="itemFormFields"
      :model="formModel"
      :loading="saving"
      @submit="onSubmit"
    />
    <SpConfirm
      v-model:open="confirmOpen"
      title="删除 BOM 子项"
      :description="`确定删除子项「${target?.materielItemDesc ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
