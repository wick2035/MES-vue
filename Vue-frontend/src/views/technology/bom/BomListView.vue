<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, RotateCcw, Eye, Lock, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import { useTable } from '@/composables/useTable'
import { pageBoms, lockBom, deleteBom } from '@/api/modules/technology'
import { notify } from '@/lib/toast'
import type { TableColumn } from '@/types/table'
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
  { key: 'action', title: '操作', slot: 'action', width: '130px', align: 'center' },
]

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
        <Input v-model="query.materielCodeLike" placeholder="物料编码" class="w-44" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="reset(['materielCodeLike'])"><RotateCcw class="h-4 w-4" />重置</Button>
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
        <span class="text-xs text-muted-foreground">查看 BOM 层级结构与子项清单</span>
      </template>
      <template #lock="{ value }">
        <SpStatusBadge :tone="isLocked(value) ? 'success' : 'muted'" :text="isLocked(value) ? '已锁定' : '未锁定'" />
      </template>
      <template #action="{ row }">
        <div class="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon-sm" title="查看结构" @click="router.push(`/technology/bom/${row.id}`)">
            <Eye class="h-4 w-4" />
          </Button>
          <Button v-if="!isLocked(row.lockStatus)" variant="ghost" size="icon-sm" title="锁定" @click="onLock(row)">
            <Lock class="h-4 w-4 text-warning" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="删除" @click="askDelete(row)">
            <Trash2 class="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </template>
    </SpDataTable>

    <SpConfirm
      v-model:open="confirmOpen"
      title="删除 BOM"
      :description="`确定删除 BOM「${target?.bomCode ?? ''}」吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
