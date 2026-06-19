<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { getMenuTree, type MenuItem } from '@/router/menu'
import { resolveIcon } from '@/lib/icons'
import { useUserStore } from '@/stores/user'
import { useCommandPalette } from '@/composables/useCommandPalette'

const router = useRouter()
const userStore = useUserStore()
const { open, toggle } = useCommandPalette()

// 扁平化所有可访问的叶子菜单作为命令项
function flatten(items: MenuItem[], acc: MenuItem[] = []): MenuItem[] {
  for (const it of items) {
    if (!userStore.hasAnyRole(it.roles)) continue
    if (it.children?.length) flatten(it.children, acc)
    else acc.push(it)
  }
  return acc
}
const commands = computed(() => flatten(getMenuTree()))

function go(path: string) {
  open.value = false
  router.push(path)
}

// Ctrl/Cmd + K 唤起
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    toggle()
  }
})
</script>

<template>
  <CommandDialog v-model:open="open">
    <CommandInput placeholder="搜索菜单 / 页面…" />
    <CommandList>
      <CommandEmpty>未找到相关页面</CommandEmpty>
      <CommandGroup heading="导航">
        <CommandItem
          v-for="cmd in commands"
          :key="cmd.path"
          :value="cmd.title"
          class="cursor-pointer"
          @select="go(cmd.path)"
        >
          <component :is="resolveIcon(cmd.icon)" v-if="resolveIcon(cmd.icon)" />
          <span>{{ cmd.title }}</span>
          <span class="ml-auto text-xs text-muted-foreground">{{ cmd.path }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
