<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { ArrowLeft, RefreshCw, ChevronsDownUp, ChevronsUpDown, SquarePen, Inbox } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import BomTreeNode from './BomTreeNode.vue'
import { getBomTree } from '@/api/modules/technology'
import { SPRING_SOFT } from '@/lib/motion'
import type { BomTreeNode as TreeNodeType } from '@/types/domain'

defineOptions({ name: 'BomTree' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string
const reduce = usePreferredReducedMotion()

const tree = ref<TreeNodeType | null>(null)
const loading = ref(true)
const treeKey = ref(0)

async function load() {
  loading.value = true
  try {
    const res = await getBomTree(id)
    tree.value = res.data ?? null
  } catch {
    tree.value = null
  } finally {
    loading.value = false
  }
}
onMounted(load)

function walk(n: TreeNodeType, fn: (n: TreeNodeType) => void) {
  fn(n)
  n.children?.forEach((c) => walk(c, fn))
}
function setAll(v: boolean) {
  if (!tree.value) return
  walk(tree.value, (n) => (n.open = v))
  treeKey.value++ // 重挂载，使各节点按新的 open 初始化
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" @click="router.push('/technology/bom')">
        <ArrowLeft class="h-4 w-4" />返回
      </Button>
      <h2 class="text-lg font-semibold">{{ tree?.nodeCode && tree?.nodeCode !== '0' ? tree?.nodeCode : tree?.materielCode || 'BOM 结构树' }}</h2>
      <span v-if="tree" class="text-sm text-muted-foreground">{{ tree.materielDesc }}</span>
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" @click="setAll(true)">
          <ChevronsUpDown class="h-4 w-4" />全部展开
        </Button>
        <Button variant="ghost" size="sm" @click="setAll(false)">
          <ChevronsDownUp class="h-4 w-4" />全部收起
        </Button>
        <Button variant="ghost" size="icon-sm" title="刷新" @click="load">
          <RefreshCw class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" @click="router.push(`/technology/bom/${id}`)">
          <SquarePen class="h-4 w-4" />结构明细
        </Button>
      </div>
    </div>

    <Skeleton v-if="loading" class="h-64 w-full" />

    <Motion
      v-else-if="tree"
      :key="treeKey"
      :initial="reduce === 'reduce' ? false : { opacity: 0, y: 8 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="SPRING_SOFT"
      class="rounded-lg border bg-card p-3 shadow-sp"
    >
      <BomTreeNode :node="tree" :depth="0" />
    </Motion>

    <div
      v-else
      class="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card py-20 text-muted-foreground shadow-sp"
    >
      <Inbox class="h-10 w-10" />
      <span class="text-sm">未获取到 BOM 结构数据</span>
    </div>
  </div>
</template>
