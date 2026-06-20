<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Pencil, Trash2, Search, RotateCcw, ListTree, LoaderCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import SpTree from '@/components/common/SpTree.vue'
import { useTable } from '@/composables/useTable'
import { pageRoles, saveRole, deleteRole, getRoleMenuTree, authMenu } from '@/api/modules/system'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { SysRole, TreeNode } from '@/types/domain'

defineOptions({ name: 'Role' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<SysRole>(pageRoles, { nameLike: '', codeLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'name', title: '角色名称', width: '180px' },
  { key: 'code', title: '角色编码', width: '160px' },
  { key: 'remark', title: '备注' },
  { key: 'action', title: '操作', slot: 'action', width: '150px', align: 'center' },
]
const formFields: FormField[] = [
  { field: 'name', label: '角色名称', type: 'input', required: true },
  { field: 'code', label: '角色编码', type: 'input', required: true },
  { field: 'sortNum', label: '排序号', type: 'number', min: 0 },
  { field: 'remark', label: '备注', type: 'textarea', span: 2 },
]

const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑角色' : '新增角色'))
function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { sortNum: 0 }, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: SysRole) {
  resetModel({ ...row })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    await saveRole(formModel)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

const confirmOpen = ref(false)
const target = ref<SysRole | null>(null)
function askDelete(row: SysRole) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteRole(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}

// 菜单授权
const menuOpen = ref(false)
const menuSaving = ref(false)
const menuNodes = ref<TreeNode[]>([])
const checkedMenuIds = ref<string[]>([])
const menuRole = ref<SysRole | null>(null)
function collectChecked(nodes: TreeNode[], acc: string[]) {
  for (const n of nodes) {
    if (n.checked) acc.push(n.id)
    if (n.children?.length) collectChecked(n.children, acc)
  }
  return acc
}
async function openAuthMenu(row: SysRole) {
  menuRole.value = row
  menuOpen.value = true
  const res = await getRoleMenuTree(row.id!)
  menuNodes.value = res.data ?? []
  checkedMenuIds.value = collectChecked(menuNodes.value, [])
}
async function submitMenu() {
  if (!menuRole.value?.id) return
  menuSaving.value = true
  try {
    await authMenu(menuRole.value.id, checkedMenuIds.value)
    notify.success('菜单授权成功')
    menuOpen.value = false
  } finally {
    menuSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">角色名称</Label>
        <Input v-model="query.nameLike" placeholder="名称" class="w-36" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">角色编码</Label>
        <Input v-model="query.codeLike" placeholder="编码" class="w-36" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['nameLike', 'codeLike'])"
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
        <span class="text-sm font-medium">角色管理</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增角色</Button>
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="编辑" @click="openEdit(row)"
            ><Pencil class="h-4 w-4"
          /></Button>
          <Button variant="ghost" size="icon-sm" title="菜单授权" @click="openAuthMenu(row)"
            ><ListTree class="h-4 w-4 text-primary"
          /></Button>
          <Button variant="ghost" size="icon-sm" title="删除" @click="askDelete(row)"
            ><Trash2 class="h-4 w-4 text-destructive"
          /></Button>
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
      title="删除角色"
      :description="`确定删除角色「${target?.name ?? ''}」吗？`"
      @confirm="onDelete"
    />

    <!-- 菜单授权 -->
    <Dialog v-model:open="menuOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>菜单授权 - {{ menuRole?.name }}</DialogTitle>
          <DialogDescription>勾选该角色可访问的菜单</DialogDescription>
        </DialogHeader>
        <div class="max-h-[55vh] overflow-y-auto rounded-md border p-2">
          <SpTree v-model:checked="checkedMenuIds" :nodes="menuNodes" checkable />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="menuOpen = false">取消</Button>
          <Button :disabled="menuSaving" @click="submitMenu">
            <LoaderCircle v-if="menuSaving" class="h-4 w-4 animate-spin" />保存授权
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
