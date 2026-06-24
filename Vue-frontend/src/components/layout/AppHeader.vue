<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Moon, Sun, PanelLeftClose, PanelLeft, LogOut, UserCog } from 'lucide-vue-next'
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
import NotificationBell from './NotificationBell.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { useProfileDialog } from '@/composables/useProfileDialog'
import { notify } from '@/lib/toast'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { show: showPalette } = useCommandPalette()
const { show: showProfile } = useProfileDialog()

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
    <!-- 左：折叠 + 面包屑 -->
    <div class="flex flex-1 items-center gap-3 overflow-hidden">
      <button
        class="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        :title="collapsed ? '展开侧栏' : '折叠侧栏'"
        @click="appStore.toggleSidebar()"
      >
        <component :is="collapsed ? PanelLeft : PanelLeftClose" class="h-5 w-5" />
      </button>

      <AppBreadcrumb />
    </div>

    <!-- 中：全局搜索（居中） -->
    <div class="hidden flex-1 justify-center px-2 sm:flex">
      <button
        class="flex w-full max-w-md items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
        title="命令面板"
        @click="showPalette()"
      >
        <Search class="h-4 w-4 shrink-0" />
        <span class="flex-1 truncate text-left">搜索菜单 / 页面…</span>
        <kbd class="hidden rounded border bg-muted px-1.5 text-[10px] md:inline">Ctrl K</kbd>
      </button>
    </div>

    <!-- 右：通知 + 主题 + 用户 -->
    <div class="flex flex-1 items-center justify-end gap-1">
      <!-- 移动端搜索入口 -->
      <button
        class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
        title="命令面板"
        @click="showPalette()"
      >
        <Search class="h-5 w-5" />
      </button>

      <!-- 实时通知中心（WebSocket） -->
      <NotificationBell />

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
          <DropdownMenuItem class="cursor-pointer" @click="showProfile()">
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
