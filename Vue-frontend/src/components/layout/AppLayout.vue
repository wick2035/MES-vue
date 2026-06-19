<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import {
  Factory,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

// M0 最小框架壳：侧栏 + 头部 + 内容区。完整导航/面包屑/多 Tab/命令面板在 M2 接入。
const appStore = useAppStore()
const collapsed = computed(() => appStore.sidebarCollapsed)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- 侧栏 -->
    <aside
      class="flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200"
      :class="collapsed ? 'w-16' : 'w-60'"
    >
      <div class="flex h-14 items-center gap-2 border-b px-4">
        <Factory class="h-6 w-6 shrink-0 text-primary" />
        <span v-show="!collapsed" class="truncate text-base font-semibold">MES 智造中心</span>
      </div>
      <nav class="flex-1 overflow-y-auto p-2">
        <RouterLink
          to="/dashboard"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
          active-class="bg-sidebar-accent text-primary"
        >
          <LayoutDashboard class="h-4 w-4 shrink-0" />
          <span v-show="!collapsed">数据看板</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- 右侧主区 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sp">
        <button
          class="rounded-md p-2 hover:bg-accent"
          title="折叠侧栏"
          @click="appStore.toggleSidebar()"
        >
          <component :is="collapsed ? PanelLeft : PanelLeftClose" class="h-5 w-5" />
        </button>
        <button class="rounded-md p-2 hover:bg-accent" title="切换主题" @click="appStore.toggleTheme()">
          <component :is="appStore.theme === 'dark' ? Sun : Moon" class="h-5 w-5" />
        </button>
      </header>

      <main class="flex-1 overflow-auto bg-background p-4">
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
  </div>
</template>
