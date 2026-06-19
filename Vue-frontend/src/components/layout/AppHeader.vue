<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Moon, Sun, PanelLeftClose, PanelLeft, Bell, LogOut, UserCog } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import AppBreadcrumb from './AppBreadcrumb.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { notify } from '@/lib/toast'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { show: showPalette } = useCommandPalette()

const collapsed = computed(() => appStore.sidebarCollapsed)
const initials = computed(() => (userStore.displayName || '用户').slice(0, 1))

async function handleLogout() {
  await userStore.logout()
  notify.success('已退出登录')
  router.replace('/login')
}
</script>

<template>
  <header class="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 shadow-sp">
    <button
      class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
      :title="collapsed ? '展开侧栏' : '折叠侧栏'"
      @click="appStore.toggleSidebar()"
    >
      <component :is="collapsed ? PanelLeft : PanelLeftClose" class="h-5 w-5" />
    </button>

    <AppBreadcrumb />

    <div class="ml-auto flex items-center gap-1">
      <!-- 命令面板 -->
      <button
        class="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
        title="命令面板"
        @click="showPalette()"
      >
        <Search class="h-4 w-4" />
        <span class="hidden sm:inline">搜索</span>
        <kbd class="hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      <!-- 通知（M9 接入 WebSocket） -->
      <button
        class="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="通知"
      >
        <Bell class="h-5 w-5" />
      </button>

      <!-- 主题切换 -->
      <button
        class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="切换主题"
        @click="appStore.toggleTheme()"
      >
        <component :is="appStore.theme === 'dark' ? Sun : Moon" class="h-5 w-5" />
      </button>

      <!-- 用户菜单 -->
      <DropdownMenu>
        <DropdownMenuTrigger class="ml-1 flex items-center gap-2 rounded-md p-1 hover:bg-accent">
          <Avatar class="h-8 w-8">
            <AvatarFallback class="bg-primary/10 text-primary">{{ initials }}</AvatarFallback>
          </Avatar>
          <span class="hidden text-sm font-medium md:inline">{{ userStore.displayName }}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-44">
          <DropdownMenuLabel>
            <div class="font-medium">{{ userStore.displayName }}</div>
            <div class="text-xs font-normal text-muted-foreground">
              {{ userStore.userInfo?.username }}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="cursor-pointer" @click="router.push('/profile')">
            <UserCog class="mr-2 h-4 w-4" />个人中心
          </DropdownMenuItem>
          <DropdownMenuItem class="cursor-pointer text-destructive" @click="handleLogout">
            <LogOut class="mr-2 h-4 w-4" />退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
