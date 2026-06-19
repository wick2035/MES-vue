<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Pencil, Trash2, Search, RotateCcw, KeyRound, ShieldCheck, Ban, CheckCircle2, LoaderCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import {
  pageUsers,
  saveUser,
  deleteUser,
  disableUser,
  resetPassword,
  assignRole,
  pageRoles,
} from '@/api/modules/system'
import { notify } from '@/lib/toast'
import type { TableColumn, FormField } from '@/types/table'
import type { SysUser, SysRole } from '@/types/domain'

defineOptions({ name: 'User' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<SysUser>(pageUsers, { nameLike: '', usernameLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'name', title: '姓名', width: '120px' },
  { key: 'username', title: '用户名', width: '140px' },
  { key: 'roleNames', title: '角色' },
  { key: 'mobile', title: '手机号', width: '130px' },
  { key: 'deptName', title: '部门', width: '120px' },
  { key: 'deleted', title: '状态', slot: 'status', width: '90px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '200px', align: 'center' },
]

const formFields: FormField[] = [
  { field: 'name', label: '姓名', type: 'input', required: true },
  {
    field: 'username',
    label: '用户名',
    type: 'input',
    required: true,
    pattern: /^[A-Za-z0-9_.@-]{3,32}$/,
    patternMsg: '3-32位，可含字母/数字/下划线/点/@/-',
  },
  {
    field: 'password',
    label: '密码',
    type: 'password',
    required: true,
    pattern: /^.{6,64}$/,
    patternMsg: '密码长度需 6-64 位',
  },
  {
    field: 'mobile',
    label: '手机号',
    type: 'input',
    required: true,
    pattern: /^1[3-9]\d{9}$/,
    patternMsg: '请输入正确的 11 位手机号',
  },
  {
    field: 'email',
    label: '邮箱',
    type: 'input',
    pattern: /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/,
    patternMsg: '邮箱格式不正确',
  },
  {
    field: 'sex',
    label: '性别',
    type: 'select',
    options: [
      { label: '男', value: '1' },
      { label: '女', value: '0' },
      { label: '保密', value: '2' },
    ],
  },
  {
    field: 'deleted',
    label: '状态',
    type: 'select',
    options: [
      { label: '正常', value: '0' },
      { label: '禁用', value: '2' },
    ],
  },
]

// 新增/编辑
const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)
const dialogTitle = computed(() => (isEdit.value ? '编辑用户' : '新增用户'))
function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { sex: '1', deleted: '0' }, data)
}
function openCreate() {
  resetModel()
  dialogOpen.value = true
}
function openEdit(row: SysUser) {
  resetModel({ ...row, password: '' })
  dialogOpen.value = true
}
async function onSubmit() {
  saving.value = true
  try {
    formModel.repassword = formModel.password
    await saveUser(formModel)
    notify.success(isEdit.value ? '修改成功' : '新增成功')
    dialogOpen.value = false
    load()
  } finally {
    saving.value = false
  }
}

// 删除
const confirmOpen = ref(false)
const target = ref<SysUser | null>(null)
function askDelete(row: SysUser) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteUser(target.value.id)
  notify.success('删除成功')
  confirmOpen.value = false
  load()
}

// 启用/禁用
async function toggleStatus(row: SysUser) {
  const next = row.deleted === '2' ? '0' : '2'
  await disableUser(row.id!, next)
  notify.success(next === '0' ? '已启用' : '已禁用')
  load()
}

// 重置密码
async function onReset(row: SysUser) {
  await resetPassword(row.id!, '123456')
  notify.success(`已重置 ${row.name} 的密码为 123456`)
}

// 分配角色
const roleOpen = ref(false)
const roleSaving = ref(false)
const allRoles = ref<SysRole[]>([])
const checkedRoleIds = ref<string[]>([])
const roleUser = ref<SysUser | null>(null)
async function openAssignRole(row: SysUser) {
  roleUser.value = row
  roleOpen.value = true
  if (allRoles.value.length === 0) {
    const res = await pageRoles({ current: 1, size: 200 })
    allRoles.value = res.data?.records ?? []
  }
  const names = (row.roleNames || '').split(/[、,]/).filter(Boolean)
  checkedRoleIds.value = allRoles.value.filter((r) => names.includes(r.name || '')).map((r) => r.id!)
}
function toggleRole(id: string, val: boolean | 'indeterminate') {
  const i = checkedRoleIds.value.indexOf(id)
  if (val === true && i === -1) checkedRoleIds.value.push(id)
  else if (val !== true && i !== -1) checkedRoleIds.value.splice(i, 1)
}
async function submitRoles() {
  if (!roleUser.value?.id) return
  roleSaving.value = true
  try {
    await assignRole(roleUser.value.id, checkedRoleIds.value)
    notify.success('角色分配成功')
    roleOpen.value = false
    load()
  } finally {
    roleSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">姓名</Label>
        <Input v-model="query.nameLike" placeholder="姓名" class="w-36" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">用户名</Label>
        <Input v-model="query.usernameLike" placeholder="用户名" class="w-36" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['nameLike', 'usernameLike'])"><RotateCcw class="h-4 w-4" />重置</Button>
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
        <span class="text-sm font-medium">用户管理</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新增用户</Button>
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="value === '2' ? 'muted' : 'success'" :text="value === '2' ? '禁用' : '正常'" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-0.5">
          <Button variant="ghost" size="icon-sm" title="编辑" @click="openEdit(row)"><Pencil class="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon-sm" title="分配角色" @click="openAssignRole(row)"><ShieldCheck class="h-4 w-4 text-primary" /></Button>
          <Button variant="ghost" size="icon-sm" title="重置密码" @click="onReset(row)"><KeyRound class="h-4 w-4 text-warning" /></Button>
          <Button variant="ghost" size="icon-sm" :title="row.deleted === '2' ? '启用' : '禁用'" @click="toggleStatus(row)">
            <CheckCircle2 v-if="row.deleted === '2'" class="h-4 w-4 text-success" />
            <Ban v-else class="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="删除" @click="askDelete(row)"><Trash2 class="h-4 w-4 text-destructive" /></Button>
        </div>
      </template>
    </SpDataTable>

    <SpFormDialog
      v-model:open="dialogOpen"
      :title="dialogTitle"
      :fields="formFields"
      :model="formModel"
      :loading="saving"
      description="用户名/手机号唯一；编辑时需重新设置密码"
      @submit="onSubmit"
    />
    <SpConfirm
      v-model:open="confirmOpen"
      title="删除用户"
      :description="`确定删除用户「${target?.name ?? ''}」吗？`"
      @confirm="onDelete"
    />

    <!-- 分配角色 -->
    <Dialog v-model:open="roleOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分配角色 - {{ roleUser?.name }}</DialogTitle>
          <DialogDescription>勾选该用户拥有的角色</DialogDescription>
        </DialogHeader>
        <div class="max-h-[50vh] space-y-2 overflow-y-auto">
          <label
            v-for="r in allRoles"
            :key="r.id"
            class="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent"
          >
            <Checkbox
              :model-value="checkedRoleIds.includes(r.id!)"
              @update:model-value="toggleRole(r.id!, $event)"
            />
            <span class="text-sm font-medium">{{ r.name }}</span>
            <span class="text-xs text-muted-foreground">{{ r.code }}</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="roleOpen = false">取消</Button>
          <Button :disabled="roleSaving" @click="submitRoles">
            <LoaderCircle v-if="roleSaving" class="h-4 w-4 animate-spin" />保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
