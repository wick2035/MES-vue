<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
  ListTree,
  LoaderCircle,
  ShieldCheck,
  Shield,
  Crown,
  UserCog,
  FileText,
} from 'lucide-vue-next'
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
import SpPageHeader from '@/components/common/SpPageHeader.vue'
import SpStatCard from '@/components/common/SpStatCard.vue'
import { useTable } from '@/composables/useTable'
import { pageRoles, saveRole, deleteRole, getRoleMenuTree, authMenu } from '@/api/modules/system'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { SysRole, TreeNode } from '@/types/domain'

defineOptions({ name: 'Role' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<SysRole>(pageRoles, { nameLike: '', codeLike: '' })

// ===== 概览统计（独立取样）=====
const statsList = ref<SysRole[]>([])
const statsTotal = ref(0)
async function loadStats() {
  const res = await pageRoles({ current: 1, size: 200 })
  statsList.value = res.data?.records ?? []
  statsTotal.value = res.data?.total ?? 0
}
const stats = computed(() => {
  const sample = statsList.value
  const approx = statsTotal.value > sample.length
  const hint = approx ? '基于前 200 条统计' : undefined
  const admin = sample.filter((r) => r.code === '888888').length
  const custom = sample.length - admin
  const withRemark = sample.filter((r) => !!(r.remark && r.remark.trim())).length
  return [
    { label: '角色总数', value: statsTotal.value, icon: Shield, tone: 'primary' as const },
    { label: '系统管理员', value: admin, icon: Crown, tone: 'warning' as const, hint },
    { label: '自定义角色', value: custom, icon: UserCog, tone: 'success' as const, hint },
    { label: '含备注说明', value: withRemark, icon: FileText, tone: 'muted' as const, hint },
  ]
})

function reloadAll() {
  load()
  loadStats()
}
onMounted(reloadAll)

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
    reloadAll()
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
  reloadAll()
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
    <SpPageHeader
      :icon="ShieldCheck"
      title="角色管理"
      subtitle="维护角色及其菜单数据权限"
    >
      <template #actions>
        <Button @click="openCreate"><Plus class="h-4 w-4" />新增角色</Button>
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
        :hint="s.hint"
        :index="i"
      />
    </div>

    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="min-w-[160px] flex-1 space-y-1">
        <Label class="text-xs text-muted-foreground">角色名称</Label>
        <Input v-model="query.nameLike" placeholder="名称" class="w-full" @keyup.enter="search" />
      </div>
      <div class="min-w-[160px] flex-1 space-y-1">
        <Label class="text-xs text-muted-foreground">角色编码</Label>
        <Input v-model="query.codeLike" placeholder="编码" class="w-full" @keyup.enter="search" />
      </div>
      <div class="ml-auto flex items-end gap-2">
        <Button @click="search"><Search class="h-4 w-4" />查询</Button>
        <Button variant="outline" @click="reset(['nameLike', 'codeLike'])"
          ><RotateCcw class="h-4 w-4" />重置</Button
        >
      </div>
    </div>

    <SpDataTable
      :columns="columns"
      :data="list"
      :loading="loading"
      :total="total"
      :page="query.current"
      :page-size="query.size"
      animated
      @page-change="onPageChange"
      @size-change="onSizeChange"
    >
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
