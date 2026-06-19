<script setup lang="ts">
import { onMounted } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SpDataTable from '@/components/common/SpDataTable.vue'
import { useTable } from '@/composables/useTable'
import { pageFlows } from '@/api/modules/technology'
import type { TableColumn } from '@/types/table'
import type { Flow } from '@/types/domain'

defineOptions({ name: 'Flow' })

const { loading, list, total, query, load, onPageChange, onSizeChange } = useTable<Flow>(pageFlows)
onMounted(load)

const columns: TableColumn[] = [
  { key: 'flow', title: '工艺路线编码', width: '200px' },
  { key: 'flowDesc', title: '工艺路线名称' },
  { key: 'process', title: '工序流程' },
]
</script>

<template>
  <div class="space-y-4">
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
        <span class="text-sm font-medium">工艺路线</span>
        <Button variant="ghost" size="sm" title="刷新" @click="load"><RotateCcw class="h-4 w-4" />刷新</Button>
      </template>
    </SpDataTable>
  </div>
</template>
