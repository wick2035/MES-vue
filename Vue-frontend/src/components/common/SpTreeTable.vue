<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { ChevronRight, Inbox, FileText, Folder } from 'lucide-vue-next'
import { Motion } from 'motion-v'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import SpSkeletonTable from './SpSkeletonTable.vue'
import { SPRING, staggerDelay } from '@/lib/motion'
import type { TableColumn } from '@/types/table'
import type { TreeNode } from '@/types/domain'

// 整宽树形表格：把一棵树渲染成铺满宽度的表格，名称列带树形缩进/展开箭头/图标，
// 其余列定宽。彻底消除「窄列表 + 右侧大片留白」的空洞感。菜单/部门共用。
interface FlatNode extends TreeNode {
  level: number
  hasChildren: boolean
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    nodes: TreeNode[]
    loading?: boolean
    /** 额外列（不含名称列由 treeKey 指定的那一列除外，名称列内置渲染树形装饰） */
    columns: TableColumn[]
    /** 哪一列渲染树形缩进/展开/图标 */
    treeKey?: string
    branchIcon?: Component
    leafIcon?: Component
    animated?: boolean
    defaultExpandRoots?: boolean
    rowKey?: string
  }>(),
  {
    loading: false,
    treeKey: 'name',
    animated: true,
    defaultExpandRoots: true,
    rowKey: 'id',
  },
)

const reduce = usePreferredReducedMotion()
const expanded = ref<Set<string>>(new Set())

// 节点变化时把根节点并入展开集合（默认展开第一层），保留已有展开状态。
watch(
  () => props.nodes,
  (list) => {
    if (props.defaultExpandRoots) list.forEach((n) => expanded.value.add(n.id))
  },
  { immediate: true, deep: false },
)

function toggle(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

function flatten(list: TreeNode[], level = 0): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of list) {
    const hasChildren = !!node.children?.length
    result.push({ ...node, level, hasChildren })
    if (hasChildren && expanded.value.has(node.id)) {
      result.push(...flatten(node.children!, level + 1))
    }
  }
  return result
}
const flatList = computed(() => flatten(props.nodes))

const nodeCount = computed(() => {
  let n = 0
  const walk = (list: TreeNode[]) => {
    for (const item of list) {
      n++
      if (item.children?.length) walk(item.children)
    }
  }
  walk(props.nodes)
  return n
})

const showSkeleton = computed(() => props.loading && props.nodes.length === 0)

function collectIds(list: TreeNode[], acc: string[] = []) {
  for (const n of list) {
    if (n.children?.length) {
      acc.push(n.id)
      collectIds(n.children, acc)
    }
  }
  return acc
}
function expandAll() {
  expanded.value = new Set(collectIds(props.nodes))
}
function collapseAll() {
  expanded.value = new Set()
}

function cellText(col: TableColumn, row: any) {
  const value = row[col.key]
  if (col.formatter) return col.formatter(row, value)
  return value === null || value === undefined || value === '' ? '—' : value
}
</script>

<template>
  <div class="flex flex-col rounded-lg border bg-card shadow-sp">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between gap-2 border-b p-3">
      <div class="flex min-w-0 items-center gap-2">
        <slot name="toolbar">
          <span class="text-sm text-muted-foreground">共 {{ nodeCount }} 项</span>
        </slot>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" class="text-muted-foreground" @click="expandAll">
          展开全部
        </Button>
        <Button variant="ghost" size="sm" class="text-muted-foreground" @click="collapseAll">
          折叠全部
        </Button>
      </div>
    </div>

    <!-- 骨架 -->
    <SpSkeletonTable v-if="showSkeleton" :cols="columns.length" />

    <!-- 表格 -->
    <div v-else class="relative overflow-x-auto" :class="{ 'opacity-60': loading }">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/40">
            <TableHead
              v-for="col in columns"
              :key="col.key"
              :style="col.width ? { width: col.width } : undefined"
              :class="{
                'text-center': col.align === 'center',
                'text-right': col.align === 'right',
              }"
            >
              {{ col.title }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="flatList.length === 0">
            <TableCell :colspan="columns.length" class="h-40">
              <div class="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Inbox class="h-8 w-8" />
                <span class="text-sm">暂无数据</span>
              </div>
            </TableCell>
          </TableRow>
          <component
            :is="animated ? Motion : TableRow"
            v-for="(node, idx) in flatList"
            :key="node[rowKey] ?? idx"
            :as="animated ? 'tr' : undefined"
            :initial="animated && reduce !== 'reduce' ? { opacity: 0, y: 6 } : undefined"
            :animate="animated ? { opacity: 1, y: 0 } : undefined"
            :transition="
              animated
                ? { ...SPRING, delay: reduce === 'reduce' ? 0 : staggerDelay(idx, 0.03, 0.25) }
                : undefined
            "
            class="group border-b transition-colors hover:bg-accent/40"
          >
            <TableCell
              v-for="col in columns"
              :key="col.key"
              :class="{
                'text-center': col.align === 'center',
                'text-right': col.align === 'right',
              }"
            >
              <!-- 名称列：展开箭头 + 缩进 + 图标 + 名称 -->
              <div
                v-if="col.key === treeKey"
                class="flex items-center gap-1.5"
                :style="{ paddingLeft: `${node.level * 20}px` }"
              >
                <button
                  class="shrink-0 rounded text-muted-foreground hover:text-foreground"
                  :class="node.hasChildren ? '' : 'pointer-events-none'"
                  @click.stop="toggle(node.id)"
                >
                  <ChevronRight
                    v-if="node.hasChildren"
                    class="h-4 w-4 transition-transform"
                    :class="expanded.has(node.id) ? 'rotate-90' : ''"
                  />
                  <span v-else class="inline-block h-4 w-4" />
                </button>
                <component
                  :is="
                    node.hasChildren ? (branchIcon ?? Folder) : (leafIcon ?? FileText)
                  "
                  class="h-4 w-4 shrink-0 text-muted-foreground"
                />
                <span class="truncate text-sm font-medium">{{ node[treeKey] }}</span>
              </div>
              <!-- 自定义插槽列（如类型徽章、操作） -->
              <slot v-else-if="col.slot" :name="col.slot" :node="node" :value="node[col.key]" />
              <!-- 普通文本列 -->
              <template v-else>{{ cellText(col, node) }}</template>
            </TableCell>
          </component>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
