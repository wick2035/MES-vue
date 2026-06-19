<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { UserCog, Mail, Phone, ShieldCheck, Palette, LogOut } from 'lucide-vue-next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { notify } from '@/lib/toast'

defineOptions({ name: 'Profile' })

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const user = computed(() => userStore.userInfo)
const initials = computed(() => (userStore.displayName || '用户').slice(0, 1))

async function handleLogout() {
  await userStore.logout()
  notify.success('已退出登录')
  router.replace('/login')
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <Card>
      <CardContent class="flex items-center gap-4 p-6">
        <Avatar class="h-16 w-16">
          <AvatarFallback class="bg-primary/10 text-xl text-primary">{{ initials }}</AvatarFallback>
        </Avatar>
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-semibold">{{ userStore.displayName }}</h2>
            <Badge variant="secondary">{{ user?.username }}</Badge>
          </div>
          <p class="flex items-center gap-1 text-sm text-muted-foreground">
            <ShieldCheck class="h-4 w-4" />
            {{ userStore.roles.join('、') || '无角色' }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <UserCog class="h-4 w-4" />基本信息
        </CardTitle>
        <CardDescription>当前登录账号的基础资料</CardDescription>
      </CardHeader>
      <CardContent class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex items-center gap-2 text-sm">
          <Mail class="h-4 w-4 text-muted-foreground" />
          <span class="text-muted-foreground">邮箱：</span>{{ user?.email || '—' }}
        </div>
        <div class="flex items-center gap-2 text-sm">
          <Phone class="h-4 w-4 text-muted-foreground" />
          <span class="text-muted-foreground">手机：</span>{{ user?.mobile || '—' }}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Palette class="h-4 w-4" />外观与操作
        </CardTitle>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-3">
        <Button variant="outline" @click="appStore.toggleTheme()">
          切换为{{ appStore.theme === 'dark' ? '亮色' : '暗色' }}主题
        </Button>
        <Button variant="destructive" @click="handleLogout">
          <LogOut class="h-4 w-4" />退出登录
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
