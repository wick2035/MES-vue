<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppTabs from './AppTabs.vue'
import CommandPalette from './CommandPalette.vue'
import { useTabsStore } from '@/stores/tabs'

// 主框架：侧栏 + 头部 + 多页签 + keep-alive 内容区 + 全局命令面板
const route = useRoute()
const tabsStore = useTabsStore()

watch(
  () => route.fullPath,
  () => tabsStore.addTab(route),
  { immediate: true },
)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppHeader />
      <AppTabs />
      <main class="flex-1 overflow-auto bg-background p-4">
        <RouterView v-slot="{ Component, route: r }">
          <KeepAlive :include="tabsStore.cachedViews">
            <component :is="Component" :key="r.path" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
    <CommandPalette />
  </div>
</template>
