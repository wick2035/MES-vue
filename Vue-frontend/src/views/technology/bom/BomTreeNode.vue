<script setup lang="ts">
import { ref } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import { ChevronRight, Boxes, Puzzle, Package } from 'lucide-vue-next'
import SpStatusBadge from '@/components/common/SpStatusBadge.vue'
import { SPRING } from '@/lib/motion'
import { matTypeTone, matTypeLabel } from './constants'
import type { BomTreeNode as TreeNode } from '@/types/domain'

defineOptions({ name: 'BomTreeNode' })

const props = withDefaults(defineProps<{ node: TreeNode; depth?: number }>(), { depth: 0 })
const reduce = usePreferredReducedMotion()
const open = ref(props.node.open !== false)

const hasChildren = () => !!(props.node.children && props.node.children.length)
function toggle() {
  if (hasChildren()) open.value = !open.value
}
function nodeIcon(t?: string) {
  return t === '产品' ? Boxes : t === '物料' ? Package : Puzzle
}
</script>

<template>
  <div>
    <!-- 节点行 -->
    <div
      class="group relative flex items-center gap-2 rounded-md py-1.5 pr-2 transition-colors hover:bg-accent/40"
      :class="depth === 0 ? 'bg-primary/5 font-semibold' : ''"
      :style="{ paddingLeft: depth * 22 + 8 + 'px' }"
    >
      <button
        type="button"
        class="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent"
        :class="hasChildren() ? '' : 'pointer-events-none opacity-0'"
        @click="toggle"
      >
        <ChevronRight
          class="h-4 w-4 transition-transform duration-200"
          :class="open && hasChildren() ? 'rotate-90' : ''"
        />
      </button>

      <span
        class="flex h-7 w-7 items-center justify-center rounded-md"
        :class="depth === 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
      >
        <component :is="nodeIcon(node.nodeType)" class="h-4 w-4" />
      </span>

      <span class="font-medium">{{ node.nodeCode || node.materielCode || '—' }}</span>
      <span class="text-sm text-muted-foreground">{{ node.materielDesc }}</span>

      <SpStatusBadge
        v-if="node.matType"
        :tone="matTypeTone(node.matType)"
        :text="matTypeLabel(node.matType)"
      />

      <span
        v-if="node.itemNum != null && depth > 0"
        class="ml-auto whitespace-nowrap text-xs font-medium text-muted-foreground"
      >
        × {{ node.itemNum }} {{ node.itemUnit }}
      </span>
    </div>

    <!-- 子节点 -->
    <AnimatePresence>
      <Motion
        v-if="open && hasChildren()"
        :initial="reduce === 'reduce' ? false : { opacity: 0, y: -4 }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="reduce === 'reduce' ? undefined : { opacity: 0, y: -4 }"
        :transition="SPRING"
        class="relative"
      >
        <!-- 层级连接线 -->
        <span
          class="absolute top-0 block w-px bg-border"
          :style="{ left: depth * 22 + 18 + 'px', bottom: '0.75rem', height: 'calc(100% - 0.75rem)' }"
        />
        <BomTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
        />
      </Motion>
    </AnimatePresence>
  </div>
</template>
