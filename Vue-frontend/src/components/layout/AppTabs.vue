<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { X, ChevronDown } from 'lucide-vue-next'
import { Motion, AnimatePresence } from 'motion-v'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTabsStore, type TabItem } from '@/stores/tabs'
import { SPRING } from '@/lib/motion'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()
const reduce = usePreferredReducedMotion()

const isActive = (tab: TabItem) => route.fullPath === tab.path

function close(tab: TabItem) {
  const next = tabsStore.removeTab(tab.path)
  if (isActive(tab) && next) router.push(next)
}
function closeOthers() {
  tabsStore.closeOthers(route.fullPath)
}
function closeAll() {
  tabsStore.closeAll()
  const first = tabsStore.tabs[0]
  if (first && !isActive(first)) router.push(first.path)
}
</script>

<template>
  <div class="flex h-10 shrink-0 items-center gap-1 border-b bg-card px-2">
    <div class="flex flex-1 items-center gap-1 overflow-x-auto">
      <AnimatePresence>
        <Motion
          v-for="tab in tabsStore.tabs"
          :key="tab.path"
          as="button"
          :initial="reduce === 'reduce' ? false : { opacity: 0, scale: 0.95 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="reduce === 'reduce' ? undefined : { opacity: 0, scale: 0.95 }"
          :transition="SPRING"
          :class="
            cn(
              'group flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-colors',
              isActive(tab)
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-transparent text-muted-foreground hover:bg-accent',
            )
          "
          @click="router.push(tab.path)"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="isActive(tab) ? 'bg-primary' : 'bg-muted-foreground/40'"
          />
          {{ tab.title }}
          <X
            v-if="!tab.affix"
            class="h-3 w-3 rounded hover:bg-muted-foreground/20"
            @click.stop="close(tab)"
          />
        </Motion>
      </AnimatePresence>
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger
        class="flex items-center rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        title="标签操作"
      >
        <ChevronDown class="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem class="cursor-pointer" @click="closeOthers">关闭其他</DropdownMenuItem>
        <DropdownMenuItem class="cursor-pointer" @click="closeAll">关闭全部</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
