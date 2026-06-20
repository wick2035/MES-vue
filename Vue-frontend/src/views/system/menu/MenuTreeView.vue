<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SpTree from '@/components/common/SpTree.vue'
import { getMenuTree } from '@/api/modules/system'
import type { TreeNode } from '@/types/domain'

defineOptions({ name: 'Menu' })

const nodes = ref<TreeNode[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    const res = await getMenuTree()
    nodes.value = res.data ?? []
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between">
      <CardTitle class="text-base">菜单结构</CardTitle>
      <Button variant="ghost" size="icon-sm" title="刷新" @click="load"><RefreshCw class="h-4 w-4" /></Button>
    </CardHeader>
    <CardContent>
      <Skeleton v-if="loading" class="h-64 w-full" />
      <SpTree v-else :nodes="nodes" />
    </CardContent>
  </Card>
</template>
