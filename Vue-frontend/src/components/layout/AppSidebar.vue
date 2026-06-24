<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronRight, Factory } from 'lucide-vue-next'
import { Motion, AnimatePresence } from 'motion-v'
import { getMenuTree, type MenuItem } from '@/router/menu'
import { resolveIcon } from '@/lib/icons'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { SPRING_SOFT } from '@/lib/motion'
import { cn } from '@/lib/utils'

const route = useRoute()
const appStore = useAppStore()
const userStore = useUserStore()
const reduce = usePreferredReducedMotion()
const collapsed = computed(() => appStore.sidebarCollapsed)

/** 按角色过滤菜单（管理员放行全部） */
function filterByRole(items: MenuItem[]): MenuItem[] {
  return items
    .filter((it) => userStore.hasAnyRole(it.roles))
    .map((it) => ({ ...it, children: it.children ? filterByRole(it.children) : undefined }))
    .filter((it) => !it.children || it.children.length > 0)
}
const menu = computed(() => filterByRole(getMenuTree()))

// 展开的分组（默认展开当前路由所在分组）
const openGroups = ref<Set<string>>(new Set())
function isGroupActive(item: MenuItem) {
  return item.children?.some((c) => route.path.startsWith(c.path))
}
watch(
  () => route.path,
  () => {
    menu.value.forEach((it) => {
      if (it.children && isGroupActive(it)) openGroups.value.add(it.path)
    })
  },
  { immediate: true },
)
function toggleGroup(path: string) {
  if (openGroups.value.has(path)) openGroups.value.delete(path)
  else openGroups.value.add(path)
}
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <!-- 品牌 -->
    <div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
      <Factory class="h-6 w-6 shrink-0 text-primary" />
      <span v-show="!collapsed" class="truncate text-base font-semibold">MES 智造执行系统</span>
    </div>

    <!-- 菜单 -->
    <nav class="flex-1 space-y-1 overflow-y-auto p-2">
      <template v-for="item in menu" :key="item.path">
        <!-- 叶子项 -->
        <RouterLink
          v-if="!item.children"
          :to="item.path"
          :class="
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent',
              route.path === item.path
                ? 'bg-sidebar-accent text-primary'
                : 'text-sidebar-foreground',
            )
          "
          :title="item.title"
        >
          <component
            :is="resolveIcon(item.icon)"
            v-if="resolveIcon(item.icon)"
            class="h-4 w-4 shrink-0"
          />
          <span v-show="!collapsed" class="truncate">{{ item.title }}</span>
        </RouterLink>

        <!-- 分组 -->
        <div v-else>
          <button
            class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent"
            :class="isGroupActive(item) ? 'text-primary' : 'text-sidebar-foreground'"
            :title="item.title"
            @click="toggleGroup(item.path)"
          >
            <component
              :is="resolveIcon(item.icon)"
              v-if="resolveIcon(item.icon)"
              class="h-4 w-4 shrink-0"
            />
            <span v-show="!collapsed" class="flex-1 truncate text-left">{{ item.title }}</span>
            <ChevronRight
              v-show="!collapsed"
              class="h-4 w-4 shrink-0 transition-transform"
              :class="openGroups.has(item.path) ? 'rotate-90' : ''"
            />
          </button>
          <AnimatePresence>
            <Motion
              v-if="!collapsed && openGroups.has(item.path)"
              :key="item.path"
              :initial="reduce === 'reduce' ? false : { height: 0, opacity: 0 }"
              :animate="{ height: 'auto', opacity: 1 }"
              :exit="reduce === 'reduce' ? undefined : { height: 0, opacity: 0 }"
              :transition="SPRING_SOFT"
              class="overflow-hidden"
            >
              <div class="mt-1 space-y-1 pl-4">
                <RouterLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  :class="
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent',
                      route.path === child.path
                        ? 'bg-sidebar-accent font-medium text-primary'
                        : 'text-muted-foreground',
                    )
                  "
                >
                  <component
                    :is="resolveIcon(child.icon)"
                    v-if="resolveIcon(child.icon)"
                    class="h-4 w-4 shrink-0"
                  />
                  <span class="truncate">{{ child.title }}</span>
                </RouterLink>
              </div>
            </Motion>
          </AnimatePresence>
        </div>
      </template>
    </nav>
  </aside>
</template>
