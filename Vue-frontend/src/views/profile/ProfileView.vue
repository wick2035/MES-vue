<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserCog, Mail, Phone, ShieldCheck, Palette, LogOut, Pencil, KeyRound } from 'lucide-vue-next'
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
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { updateProfile, changePassword } from '@/api/modules/system'
import { notify } from '@/lib/toast'
import type { FormField } from '@/types/table'

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

// --- 编辑资料 ---
const profileFields: FormField[] = [
  { field: 'name', label: '姓名', type: 'input', required: true },
  { field: 'email', label: '邮箱', type: 'input', placeholder: 'user@example.com' },
  {
    field: 'mobile',
    label: '手机号',
    type: 'input',
    placeholder: '11位手机号',
    pattern: /^1[3-9]\d{9}$/,
    patternMsg: '请输入正确的手机号',
  },
]
const profileOpen = ref(false)
const profileSaving = ref(false)
const profileModel = reactive<Record<string, any>>({})

function openProfile() {
  Object.keys(profileModel).forEach((k) => delete profileModel[k])
  Object.assign(profileModel, {
    name: user.value?.name,
    email: user.value?.email,
    mobile: user.value?.mobile,
  })
  profileOpen.value = true
}
async function onProfileSubmit() {
  profileSaving.value = true
  try {
    await updateProfile(profileModel)
    // 更新本地 store 中的用户信息
    if (userStore.userInfo) {
      userStore.userInfo.name = profileModel.name
      userStore.userInfo.email = profileModel.email
      userStore.userInfo.mobile = profileModel.mobile
    }
    notify.success('资料已更新')
    profileOpen.value = false
  } finally {
    profileSaving.value = false
  }
}

// --- 修改密码 ---
const pwdFields: FormField[] = [
  { field: 'oldPassword', label: '当前密码', type: 'password', required: true },
  { field: 'newPassword', label: '新密码', type: 'password', required: true, placeholder: '6-32 位', pattern: /^.{6,32}$/, patternMsg: '密码长度需为 6-32 位' },
  { field: 'confirmPassword', label: '确认新密码', type: 'password', required: true },
]
const pwdOpen = ref(false)
const pwdSaving = ref(false)
const pwdModel = reactive<Record<string, any>>({})

function openPwd() {
  Object.keys(pwdModel).forEach((k) => delete pwdModel[k])
  pwdOpen.value = true
}
async function onPwdSubmit() {
  if (pwdModel.newPassword !== pwdModel.confirmPassword) {
    notify.error('两次密码不一致')
    return
  }
  if ((pwdModel.newPassword?.length ?? 0) < 6) {
    notify.error('新密码长度至少 6 位')
    return
  }
  pwdSaving.value = true
  try {
    await changePassword({ oldPassword: pwdModel.oldPassword, newPassword: pwdModel.newPassword })
    notify.success('密码修改成功，请重新登录')
    pwdOpen.value = false
    setTimeout(async () => {
      await userStore.logout()
      router.replace('/login')
    }, 1500)
  } finally {
    pwdSaving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-4">
    <Card>
      <CardContent class="flex items-center gap-4 p-6">
        <Avatar class="h-16 w-16">
          <AvatarFallback class="bg-primary/10 text-xl text-primary">{{ initials }}</AvatarFallback>
        </Avatar>
        <div class="flex-1 space-y-1">
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
      <CardHeader class="flex flex-row items-start justify-between">
        <div>
          <CardTitle class="flex items-center gap-2 text-base">
            <UserCog class="h-4 w-4" />基本信息
          </CardTitle>
          <CardDescription>当前登录账号的基础资料</CardDescription>
        </div>
        <Button size="sm" variant="outline" @click="openProfile">
          <Pencil class="h-4 w-4" />编辑资料
        </Button>
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
        <Button variant="outline" @click="openPwd">
          <KeyRound class="h-4 w-4" />修改密码
        </Button>
        <Button variant="destructive" @click="handleLogout">
          <LogOut class="h-4 w-4" />退出登录
        </Button>
      </CardContent>
    </Card>

    <!-- 编辑资料 -->
    <SpFormDialog
      v-model:open="profileOpen"
      title="编辑资料"
      :fields="profileFields"
      :model="profileModel"
      :loading="profileSaving"
      @submit="onProfileSubmit"
    />

    <!-- 修改密码 -->
    <SpFormDialog
      v-model:open="pwdOpen"
      title="修改密码"
      :fields="pwdFields"
      :model="pwdModel"
      :loading="pwdSaving"
      @submit="onPwdSubmit"
    />
  </div>
</template>
