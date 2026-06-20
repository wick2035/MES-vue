<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RefreshCw, Plus, Pencil, Trash2, ChevronRight, Folder, FileText } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import { getMenuTree, saveMenu, deleteMenu } from '@/api/modules/system'
import { notify } from '@/lib/toast'
import type { FormField } from '@/types/table'
import type { TreeNode } from '@/types/domain'

defineOptions({ name: 'MenuTree' })

interface FlatNode extends TreeNode {
  level: number
  hasChildren: boolean
}

const nodes = ref<TreeNode[]>([])
const expanded = ref<Set<string>>(new Set())
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await getMenuTree()
    nodes.value = res.data ?? []
    // 默认展开第一层
    nodes.value.forEach((n) => expanded.value.add(n.id))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

function flatten(list: TreeNode[], level = 0): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of list) {
    const hasChildren = !!node.children?.length
    result.push({ ...node, level, hasChildren })
    if (hasChildren && expanded.value.has(node.id)) {
      result.push(...flatten(node.children!, level + 1))
    }
  }
  return result
}
const flatList = computed(() => flatten(nodes.value))

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
function openCreate(parentNode?: FlatNode) {
  resetModel({ parentId: parentNode?.id ?? null })
  dialogTitle.value = parentNode ? `新增「${parentNode.name}」的子菜单` : '新增根菜单'
  dialogOpen.value = true
}
function openEdit(node: FlatNode) {
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
const target = ref<FlatNode | null>(null)
function askDelete(node: FlatNode) {
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
    <Card>
      <CardHeader class="flex flex-row items-center justify-between">
        <CardTitle class="text-base">菜单管理</CardTitle>
        <div class="flex items-center gap-2">
          <Button size="sm" @click="openCreate()"><Plus class="h-4 w-4" />新增根菜单</Button>
          <Button variant="ghost" size="icon-sm" title="刷新" @click="load"
            ><RefreshCw class="h-4 w-4"
          /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="loading" class="h-64 w-full" />
        <ul v-else class="space-y-0.5">
          <li v-for="node in flatList" :key="node.id">
            <div
              class="group flex items-center gap-1.5 rounded px-1 py-1.5 hover:bg-accent"
              :style="{ paddingLeft: `${node.level * 20 + 4}px` }"
            >
              <button class="shrink-0 text-muted-foreground" @click="toggle(node.id)">
                <ChevronRight
                  v-if="node.hasChildren"
                  class="h-4 w-4 transition-transform"
                  :class="expanded.has(node.id) ? 'rotate-90' : ''"
                />
                <span v-else class="inline-block w-4" />
              </button>
              <component
                :is="node.hasChildren ? Folder : FileText"
                class="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <span class="flex-1 text-sm">{{ node.name }}</span>
              <span class="mr-2 hidden text-xs text-muted-foreground group-hover:inline">{{
                node.url
              }}</span>
              <div class="hidden items-center gap-0.5 group-hover:flex">
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
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

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
