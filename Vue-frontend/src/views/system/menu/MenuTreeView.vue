<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Menu as MenuIcon,
  ListTree,
  Folder,
  FileText,
  MousePointerClick,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import SpPageHeader from '@/components/common/SpPageHeader.vue'
import SpStatCard from '@/components/common/SpStatCard.vue'
import SpTreeTable from '@/components/common/SpTreeTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { getMenuTree, saveMenu, deleteMenu } from '@/api/modules/system'
import { treeStats, countMenuType } from '@/composables/useTreeStats'
import { notify } from '@/lib/toast'
import type { FormField, TableColumn } from '@/types/table'
import type { TreeNode } from '@/types/domain'

defineOptions({ name: 'MenuTree' })

type MenuNode = TreeNode & { level?: number; hasChildren?: boolean }

const nodes = ref<TreeNode[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await getMenuTree()
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
    { label: '总菜单数', value: s.total, icon: ListTree, tone: 'primary' as const },
    { label: '目录数', value: countMenuType(s, 'DIR'), icon: Folder, tone: 'warning' as const },
    { label: '菜单数', value: countMenuType(s, 'MENU'), icon: FileText, tone: 'success' as const },
    {
      label: '按钮权限',
      value: countMenuType(s, 'BTN'),
      icon: MousePointerClick,
      tone: 'muted' as const,
    },
  ]
})

// ===== 表格列 + 类型徽章 =====
const columns: TableColumn[] = [
  { key: 'name', title: '名称' },
  { key: 'code', title: '编码', width: '150px' },
  { key: 'url', title: '路由路径', width: '200px' },
  { key: 'type', title: '类型', slot: 'type', width: '90px', align: 'center' },
  { key: 'sortNum', title: '排序', width: '80px', align: 'center' },
  { key: 'permission', title: '权限标识', slot: 'permission', width: '180px' },
  { key: 'action', title: '操作', slot: 'action', width: '130px', align: 'center' },
]
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted'
const TYPE_META: Record<string, { label: string; tone: Tone }> = {
  DIR: { label: '目录', tone: 'info' },
  '0': { label: '目录', tone: 'info' },
  MENU: { label: '菜单', tone: 'success' },
  '1': { label: '菜单', tone: 'success' },
  BTN: { label: '按钮', tone: 'muted' },
  '2': { label: '按钮', tone: 'muted' },
}
function typeMeta(t?: string) {
  return TYPE_META[t ?? ''] ?? { label: t || '—', tone: 'muted' as Tone }
}

// --- CRUD ---
const formFields: FormField[] = [
  { field: 'name', label: '菜单名称', type: 'input', required: true },
  { field: 'url', label: '路由路径', type: 'input', placeholder: '如：/system/user' },
  { field: 'icon', label: '图标代码', type: 'input', placeholder: '如：Users' },
  {
    field: 'type',
    label: '菜单类型',
    type: 'select',
    options: [
      { label: '目录', value: 'DIR' },
      { label: '菜单', value: 'MENU' },
      { label: '按钮', value: 'BTN' },
    ],
  },
  { field: 'sort', label: '排序号', type: 'number', min: 0 },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const dialogTitle = ref('新增菜单')

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { type: 'MENU', sort: 100 }, data)
}
function openCreate(parentNode?: MenuNode) {
  resetModel({ parentId: parentNode?.id ?? null })
  dialogTitle.value = parentNode ? `新增「${parentNode.name}」的子菜单` : '新增根菜单'
  dialogOpen.value = true
}
function openEdit(node: MenuNode) {
  resetModel({ ...node })
  dialogTitle.value = `编辑「${node.name}」`
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveMenu(formModel)
    notify.success(formModel.id ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const target = ref<MenuNode | null>(null)
function askDelete(node: MenuNode) {
  if (node.hasChildren) {
    notify.error('请先删除子菜单')
    return
  }
  target.value = node
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteMenu(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}
</script>

<template>
  <div class="space-y-4">
    <SpPageHeader
      :icon="MenuIcon"
      title="菜单管理"
      subtitle="维护系统导航菜单、目录与按钮权限"
    >
      <template #actions>
        <Button @click="openCreate()"><Plus class="h-4 w-4" />新增根菜单</Button>
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

    <SpTreeTable :nodes="nodes" :loading="loading" :columns="columns">
      <template #toolbar>
        <span class="text-sm font-medium">菜单结构</span>
      </template>
      <template #type="{ value }">
        <SpStatusBadge :tone="typeMeta(value).tone" :text="typeMeta(value).label" />
      </template>
      <template #permission="{ value }">
        <span class="block truncate text-xs text-muted-foreground">{{ value || '—' }}</span>
      </template>
      <template #action="{ node }">
        <div class="flex items-center justify-center gap-0.5">
          <Button variant="ghost" size="icon-sm" title="新增子菜单" @click="openCreate(node)">
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
      title="删除菜单"
      :description="`确定删除菜单「${target?.name ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
