<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RefreshCw, Plus, Pencil, Trash2, Building2, Building, Layers, Network } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import SpPageHeader from '@/components/common/SpPageHeader.vue'
import SpStatCard from '@/components/common/SpStatCard.vue'
import SpTreeTable from '@/components/common/SpTreeTable.vue'
import { getDeptTree, saveDept, deleteDept } from '@/api/modules/system'
import { treeStats } from '@/composables/useTreeStats'
import { notify } from '@/lib/toast'
import type { FormField, TableColumn } from '@/types/table'
import type { TreeNode } from '@/types/domain'

defineOptions({ name: 'Dept' })

type DeptNode = TreeNode & { level?: number; hasChildren?: boolean }

const nodes = ref<TreeNode[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await getDeptTree()
    nodes.value = res.data ?? []
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ===== 概览统计 =====
const stats = computed(() => {
  const s = treeStats(nodes.value)
  return [
    { label: '部门总数', value: s.total, icon: Building2, tone: 'primary' as const },
    { label: '一级部门', value: s.roots, icon: Building, tone: 'warning' as const },
    { label: '最大层级', value: s.maxDepth, icon: Layers, tone: 'success' as const },
    { label: '含子部门', value: s.withChildren, icon: Network, tone: 'muted' as const },
  ]
})

const columns: TableColumn[] = [
  { key: 'name', title: '名称' },
  { key: 'sortNum', title: '排序', width: '100px', align: 'center' },
  { key: 'childCount', title: '子部门数', slot: 'childCount', width: '110px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '140px', align: 'center' },
]

// --- CRUD ---
const formFields: FormField[] = [
  { field: 'name', label: '部门名称', type: 'input', required: true },
  { field: 'deptCode', label: '部门编码', type: 'input', placeholder: '可选，如：DEPT-001' },
  { field: 'sort', label: '排序号', type: 'number', min: 0 },
  { field: 'remark', label: '备注', type: 'textarea', span: 2 },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const dialogTitle = ref('新增部门')

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { sort: 100 }, data)
}
function openCreate(parentNode?: DeptNode) {
  resetModel({ parentId: parentNode?.id ?? null })
  dialogTitle.value = parentNode ? `新增「${parentNode.name}」的子部门` : '新增根部门'
  dialogOpen.value = true
}
function openEdit(node: DeptNode) {
  resetModel({ ...node })
  dialogTitle.value = `编辑「${node.name}」`
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveDept(formModel)
    notify.success(formModel.id ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const target = ref<DeptNode | null>(null)
function askDelete(node: DeptNode) {
  if (node.hasChildren) {
    notify.error('请先删除子部门')
    return
  }
  target.value = node
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteDept(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
</script>

<template>
  <div class="space-y-4">
    <SpPageHeader
      :icon="Building2"
      title="部门管理"
      subtitle="维护组织架构与部门层级"
    >
      <template #actions>
        <Button @click="openCreate()"><Plus class="h-4 w-4" />新增根部门</Button>
        <Button variant="outline" size="icon" title="刷新" @click="load">
          <RefreshCw class="h-4 w-4" />
        </Button>
      </template>
    </SpPageHeader>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SpStatCard
        v-for="(s, i) in stats"
        :key="s.label"
        :label="s.label"
        :value="s.value"
        :icon="s.icon"
        :tone="s.tone"
        :index="i"
      />
    </div>

    <SpTreeTable
      :nodes="nodes"
      :loading="loading"
      :columns="columns"
      :branch-icon="Building2"
      :leaf-icon="Layers"
    >
      <template #toolbar>
        <span class="text-sm font-medium">组织架构</span>
      </template>
      <template #childCount="{ node }">
        <span class="tabular-nums text-muted-foreground">{{ node.children?.length ?? 0 }}</span>
      </template>
      <template #action="{ node }">
        <div class="flex items-center justify-center gap-0.5">
          <Button variant="ghost" size="icon-sm" title="新增子部门" @click="openCreate(node)">
            <Plus class="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="编辑" @click="openEdit(node)">
            <Pencil class="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="删除" @click="askDelete(node)">
            <Trash2 class="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </template>
    </SpTreeTable>

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
      title="删除部门"
      :description="`确定删除部门「${target?.name ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
