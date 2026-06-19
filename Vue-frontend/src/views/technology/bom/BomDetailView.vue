<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SpDataTable from '@/components/common/SpDataTable.vue'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { getBomDetail, listBomItems } from '@/api/modules/technology'
import type { TableColumn } from '@/types/table'
import type { Bom, BomItem } from '@/types/domain'

defineOptions({ name: 'BomDetail' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const bom = ref<Bom | null>(null)
const items = ref<BomItem[]>([])
const loading = ref(true)

const isLocked = (s?: string) => s === '1' || s === 'Y'

const itemColumns: TableColumn[] = [
  { key: 'lineNo', title: '行号', width: '80px', align: 'center' },
  { key: 'materielItemCode', title: '子项物料', width: '160px' },
  { key: 'materielItemDesc', title: '子项名称' },
  { key: 'itemMatType', title: '类型', width: '90px', align: 'center' },
  { key: 'itemNum', title: '用量', width: '90px', align: 'right' },
  { key: 'itemUnit', title: '单位', width: '80px', align: 'center' },
  { key: 'childBomCode', title: '子 BOM', width: '150px' },
]

async function load() {
  loading.value = true
  try {
    const [d, it] = await Promise.all([getBomDetail(id), listBomItems(id)])
    bom.value = d.data ?? null
    items.value = it.data ?? []
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/technology/bom')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="text-lg font-semibold">{{ bom?.bomCode || 'BOM 结构' }}</h2>
      <SpStatusBadge v-if="bom" :tone="isLocked(bom.lockStatus) ? 'success' : 'muted'" :text="isLocked(bom.lockStatus) ? '已锁定' : '未锁定'" />
      <Button variant="ghost" size="icon-sm" class="ml-auto" title="刷新" @click="load">
        <RefreshCw class="h-4 w-4" />
      </Button>
    </div>

    <Skeleton v-if="loading" class="h-24 w-full" />
    <Card v-else-if="bom">
      <CardHeader><CardTitle class="text-base">BOM 信息</CardTitle></CardHeader>
      <CardContent class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">产品物料</span><span class="font-medium">{{ bom.materielCode || '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">产品名称</span><span class="font-medium">{{ bom.materielDesc || '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">版本</span><span class="font-medium">{{ bom.versionNumber || '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">层级</span><span class="font-medium">{{ bom.bomLevel ?? '—' }}</span>
        </div>
        <div class="flex justify-between border-b pb-2 text-sm">
          <span class="text-muted-foreground">工厂</span><span class="font-medium">{{ bom.factory || '—' }}</span>
        </div>
      </CardContent>
    </Card>

    <SpDataTable :columns="itemColumns" :data="items" :show-index="false" :total="items.length" :page-size="items.length || 10">
      <template #toolbar>
        <span class="text-sm font-medium">子项清单</span>
        <span class="text-xs text-muted-foreground">共 {{ items.length }} 项</span>
      </template>
    </SpDataTable>
  </div>
</template>
