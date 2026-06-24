<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  Plus,
  Pencil,
  Search,
  RotateCcw,
  Lock,
  Trash2,
  SquarePen,
  ListTree,
  Boxes,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import BomHeaderDialog from './BomHeaderDialog.vue'
import { useTable } from '@/composables/useTable'
import { pageBoms, lockBom, deleteBom, saveBom } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import { SPRING_SOFT } from '@/lib/motion'
import { bomLevelLabel, isLockedStatus, toBomHeaderPayload } from './constants'
import type { TableColumn } from '@/types/table'
import type { Bom } from '@/types/domain'

defineOptions({ name: 'Bom' })

const router = useRouter()
const reduce = usePreferredReducedMotion()
const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Bom>(pageBoms, { materielCodeLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'bomCode', title: 'BOM 编码', width: '160px' },
  { key: 'materielCode', title: '产品物料', width: '150px' },
  { key: 'materielDesc', title: '产品名称' },
  { key: 'versionNumber', title: '版本', width: '90px', align: 'center' },
  { key: 'bomLevel', title: '层级', slot: 'level', width: '90px', align: 'center' },
  { key: 'lockStatus', title: '状态', slot: 'lock', width: '100px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '210px', align: 'center' },
]

// --- 头信息 新建/编辑 ---
const dialogOpen = ref(false)
const saving = ref(false)
const formModel = reactive<Record<string, any>>({})
const isEdit = computed(() => !!formModel.id)

function resetModel(data: Record<string, any> = {}) {
  Object.keys(formModel).forEach((k) => delete formModel[k])
  Object.assign(formModel, { bomLevel: 0, versionNumber: 'V1.0' }, data)
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
    await saveBom(toBomHeaderPayload(formModel))
    notify.success(isEdit.value ? '修改成功' : '新建成功')
    dialogOpen.value = false
    load()
  } catch {
    /* 错误信息已由请求拦截器统一提示 */
  } finally {
    saving.value = false
  }
}

// --- 删除 ---
const confirmOpen = ref(false)
const target = ref<Bom | null>(null)
const deleting = ref(false)
function askDelete(row: Bom) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  deleting.value = true
  try {
    await deleteBom(target.value.id)
    notify.success('删除成功')
    confirmOpen.value = false
    load()
  } catch {
    /* 已定版等错误由拦截器提示 */
  } finally {
    deleting.value = false
  }
}

// --- 定版 ---
async function onLock(row: Bom) {
  if (!row.id) return
  try {
    await lockBom(row.id)
    notify.success('已定版')
    load()
  } catch {
    /* 校验失败信息由拦截器提示 */
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 查询条 -->
    <Motion
      :initial="reduce === 'reduce' ? false : { opacity: 0, y: -8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="SPRING_SOFT"
      class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp"
    >
      <div class="mr-1 flex items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Boxes class="h-5 w-5" />
        </span>
        <div class="leading-tight">
          <div class="text-sm font-semibold">产品 BOM</div>
          <div class="text-xs text-muted-foreground">物料清单管理</div>
        </div>
      </div>
      <div class="ml-auto space-y-1">
        <Label class="text-xs text-muted-foreground">产品物料编码</Label>
        <Input
          v-model="query.materielCodeLike"
          placeholder="输入编码前缀"
          class="w-44"
          @keyup.enter="search"
        />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['materielCodeLike'])">
        <RotateCcw class="h-4 w-4" />重置
      </Button>
    </Motion>

    <SpDataTable
      animated
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
        <span class="text-sm font-medium">BOM 列表</span>
        <Button size="sm" @click="openCreate"><Plus class="h-4 w-4" />新建 BOM</Button>
      </template>

      <template #level="{ value }">
        <span class="text-sm">{{ bomLevelLabel(value) }}</span>
      </template>

      <template #lock="{ value }">
        <SpStatusBadge
          :tone="isLockedStatus(value) ? 'success' : 'muted'"
          :text="isLockedStatus(value) ? '已定版' : '草稿'"
        />
      </template>

      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="结构明细"
            @click="router.push(`/technology/bom/${row.id}`)"
          >
            <SquarePen class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="结构树"
            @click="router.push(`/technology/bom/${row.id}/tree`)"
          >
            <ListTree class="h-4 w-4" />
          </Button>
          <Button
            v-if="!isLockedStatus(row.lockStatus)"
            variant="ghost"
            size="icon-sm"
            title="编辑头信息"
            @click="openEdit(row)"
          >
            <Pencil class="h-4 w-4" />
          </Button>
          <Button
            v-if="!isLockedStatus(row.lockStatus)"
            variant="ghost"
            size="icon-sm"
            title="定版"
            @click="onLock(row)"
          >
            <Lock class="h-4 w-4 text-warning" />
          </Button>
          <Button
            v-if="!isLockedStatus(row.lockStatus)"
            variant="ghost"
            size="icon-sm"
            title="删除"
            @click="askDelete(row)"
          >
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <BomHeaderDialog v-model:open="dialogOpen" :model="formModel" :loading="saving" @submit="onSubmit" />

    <SpConfirm
      v-model:open="confirmOpen"
      title="删除 BOM"
      :confirming="deleting"
      :description="`确定删除 BOM「${target?.bomCode ?? ''}」吗？此操作为软删除。`"
      @confirm="onDelete"
    />
  </div>
</template>
