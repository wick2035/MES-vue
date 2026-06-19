<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PackageMinus, Search, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpConfirm from '@/components/common/SpConfirm.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { useTable } from '@/composables/useTable'
import { pageInventories, deleteInventory } from '@/api/modules/inventory'
import { notify } from '@/lib/toast'
import type { TableColumn } from '@/types/table'
import type { Inventory } from '@/types/domain'

defineOptions({ name: 'Inventory' })

const { loading, list, total, query, load, onPageChange, onSizeChange, search, reset } =
  useTable<Inventory>(pageInventories, { materielLike: '', locationCodeLike: '', batchNoLike: '' })
onMounted(load)

const columns: TableColumn[] = [
  { key: 'warehouseName', title: '库房' },
  { key: 'locationCode', title: '库位', width: '130px' },
  { key: 'materielCode', title: '物料编码', width: '140px' },
  { key: 'materielDesc', title: '物料名称' },
  { key: 'batchNo', title: '批号', width: '120px' },
  { key: 'qty', title: '数量', width: '90px', align: 'right' },
  { key: 'unit', title: '单位', width: '70px', align: 'center' },
  { key: 'stockStatus', title: '状态', slot: 'status', width: '100px', align: 'center' },
  { key: 'action', title: '操作', slot: 'action', width: '90px', align: 'center' },
]

const confirmOpen = ref(false)
const target = ref<Inventory | null>(null)
function askDelete(row: Inventory) {
  target.value = row
  confirmOpen.value = true
}
async function onDelete() {
  if (!target.value?.id) return
  await deleteInventory(target.value.id)
  notify.success('出库成功')
  confirmOpen.value = false
  load()
}
function onReset() {
  reset(['materielLike', 'locationCodeLike', 'batchNoLike'])
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sp">
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">物料</Label>
        <Input v-model="query.materielLike" placeholder="编码/名称" class="w-44" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">库位</Label>
        <Input v-model="query.locationCodeLike" placeholder="库位编码" class="w-36" @keyup.enter="search" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">批号</Label>
        <Input v-model="query.batchNoLike" placeholder="批号" class="w-32" @keyup.enter="search" />
      </div>
      <Button @click="search"><Search class="h-4 w-4" />查询</Button>
      <Button variant="outline" @click="onReset"><RotateCcw class="h-4 w-4" />重置</Button>
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
        <span class="text-sm font-medium">库存列表</span>
      </template>
      <template #status="{ value }">
        <SpStatusBadge :tone="value === '正常' || value === '0' ? 'success' : 'warning'" :text="value || '正常'" />
      </template>
      <template #action="{ row }">
        <Button variant="ghost" size="icon-sm" title="出库" @click="askDelete(row)">
          <PackageMinus class="h-4 w-4 text-destructive" />
        </Button>
      </template>
    </SpDataTable>

    <SpConfirm
      v-model:open="confirmOpen"
      title="库存出库"
      :description="`确定对物料「${target?.materielDesc ?? ''}」(库位 ${target?.locationCode ?? '-'}) 出库吗？`"
      @confirm="onDelete"
    />
  </div>
</template>
