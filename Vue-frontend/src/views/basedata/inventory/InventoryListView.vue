<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PackageMinus, PackagePlus, Search, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import WarehouseManualRequestDialog from '@/components/warehouse/WarehouseManualRequestDialog.vue'
import { useTable } from '@/composables/useTable'
import { pageInventories } from '@/api/modules/inventory'
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

const stockStatusText: Record<string, string> = {
  AVAILABLE: '可用',
  '0': '可用',
  正常: '可用',
  可用: '可用',
}

function isAvailableStatus(value?: string) {
  return !value || stockStatusText[value] === '可用'
}

function statusText(value?: string) {
  return value ? stockStatusText[value] || value : '可用'
}

const requestOpen = ref(false)
const requestDirection = ref<'IN' | 'OUT'>('IN')
const requestInitial = ref<Partial<Inventory> | null>(null)

function openInbound() {
  requestDirection.value = 'IN'
  requestInitial.value = null
  requestOpen.value = true
}

function openOutbound(row: Inventory) {
  requestDirection.value = 'OUT'
  requestInitial.value = { ...row }
  requestOpen.value = true
}

function onRequestSaved() {
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
        <Input
          v-model="query.materielLike"
          placeholder="编码/名称"
          class="w-44"
          @keyup.enter="search"
        />
      </div>
      <div class="space-y-1">
        <Label class="text-xs text-muted-foreground">库位</Label>
        <Input
          v-model="query.locationCodeLike"
          placeholder="库位编码"
          class="w-36"
          @keyup.enter="search"
        />
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
        <Button size="sm" @click="openInbound">
          <PackagePlus class="h-4 w-4" />新建入库
        </Button>
      </template>
      <template #status="{ value }">
        <SpStatusBadge
          :tone="isAvailableStatus(value) ? 'success' : 'warning'"
          :text="statusText(value)"
        />
      </template>
      <template #action="{ row }">
        <Button variant="ghost" size="icon-sm" title="创建出库申请" @click="openOutbound(row)">
          <PackageMinus class="h-4 w-4 text-warning" />
        </Button>
      </template>
    </SpDataTable>

    <WarehouseManualRequestDialog
      v-model:open="requestOpen"
      :direction="requestDirection"
      :initial="requestInitial"
      @saved="onRequestSaved"
    />
  </div>
</template>
