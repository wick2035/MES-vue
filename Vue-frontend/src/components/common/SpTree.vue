<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight, Folder, FileText } from 'lucide-vue-next'
import { Checkbox } from '@/components/ui/checkbox'
import SpTree from './SpTree.vue'
import type { TreeNode } from '@/types/domain'

// 递归树：支持只读展示与勾选（checked 为受控的 id 数组，原地增删）
const props = defineProps<{ nodes: TreeNode[]; checkable?: boolean; checked?: string[] }>()

const expanded = ref<Set<string>>(new Set())
function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}
function isChecked(id: string) {
  return props.checked?.includes(id) ?? false
}
function toggleCheck(id: string, val: boolean | 'indeterminate') {
  if (!props.checked) return
  const i = props.checked.indexOf(id)
  if (val === true && i === -1) props.checked.push(id)
  else if (val !== true && i !== -1) props.checked.splice(i, 1)
}
</script>

<template>
  <ul class="space-y-0.5">
    <li v-for="node in nodes" :key="node.id">
      <div class="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-accent">
        <button
          v-if="node.children?.length"
          class="text-muted-foreground"
          @click="toggle(node.id)"
        >
          <ChevronRight
            class="h-4 w-4 transition-transform"
            :class="expanded.has(node.id) ? 'rotate-90' : ''"
          />
        </button>
        <span v-else class="inline-block w-4" />
        <Checkbox
          v-if="checkable"
          :model-value="isChecked(node.id)"
          @update:model-value="toggleCheck(node.id, $event)"
        />
        <component
          :is="node.children?.length ? Folder : FileText"
          class="h-4 w-4 shrink-0 text-muted-foreground"
        />
        <span class="text-sm">{{ node.name }}</span>
      </div>
      <div
        v-if="node.children?.length && expanded.has(node.id)"
        class="ml-5 border-l pl-2"
      >
        <SpTree :nodes="node.children" :checkable="checkable" :checked="checked" />
      </div>
    </li>
  </ul>
</template>
