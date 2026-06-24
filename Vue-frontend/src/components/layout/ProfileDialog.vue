<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from 'reka-ui'
import { Motion, AnimatePresence } from 'motion-v'
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Pencil,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  X,
} from 'lucide-vue-next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import SpFormDialog from '@/components/common/SpFormDialog.vue'
import { useProfileDialog } from '@/composables/useProfileDialog'
import { useUserStore } from '@/stores/user'
import { useAppStore, type ThemeMode } from '@/stores/app'
import { updateProfile, changePassword } from '@/api/modules/system'
import { notify } from '@/lib/toast'
import { SPRING, SPRING_SOFT } from '@/lib/motion'
import type { FormField } from '@/types/table'

defineOptions({ name: 'ProfileDialog' })

const router = useRouter()
const { open, close } = useProfileDialog()
const userStore = useUserStore()
const appStore = useAppStore()
const reduce = usePreferredReducedMotion()

const user = computed(() => userStore.userInfo)
const initials = computed(() => (userStore.displayName || '用户').slice(0, 1))
const roleLabel = computed(() => {
  const u = userStore.userInfo
  const fromDtos = u?.sysRoleDTOs?.map((r) => r.name).filter(Boolean).join('、')
  return u?.roleNames || fromDtos || userStore.roles.join('、') || '普通用户'
})

// --- 分段标签 ---
type TabKey = 'profile' | 'security' | 'prefs'
const tabs: { key: TabKey; label: string }[] = [
  { key: 'profile', label: '资料' },
  { key: 'security', label: '安全' },
  { key: 'prefs', label: '偏好' },
]
const active = ref<TabKey>('profile')
const activeIndex = computed(() => tabs.findIndex((t) => t.key === active.value))
// 每次打开都回到「资料」页
watch(open, (v) => {
  if (v) active.value = 'profile'
})

function onOpenChange(v: boolean) {
  if (!v) close()
}

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]

async function handleLogout() {
  close()
  await userStore.logout()
  notify.success('已退出登录')
  router.replace('/login')
}

// --- 编辑资料（二级弹窗，叠在本弹窗之上） ---
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

// --- 修改密码（二级弹窗） ---
const pwdFields: FormField[] = [
  { field: 'oldPassword', label: '当前密码', type: 'password', required: true },
  {
    field: 'newPassword',
    label: '新密码',
    type: 'password',
    required: true,
    placeholder: '6-32 位',
    pattern: /^.{6,32}$/,
    patternMsg: '密码长度需为 6-32 位',
  },
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
    close()
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
  <DialogRoot :open="open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[95] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-sp-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%] focus:outline-none"
      >
        <DialogTitle class="sr-only">个人中心</DialogTitle>
        <DialogDescription class="sr-only">查看与编辑你的个人资料、安全设置与外观偏好</DialogDescription>

        <!-- 渐变头图 + 身份 -->
        <div class="relative">
          <div
            class="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent"
          >
            <div
              class="pointer-events-none absolute -left-6 -top-8 h-28 w-28 rounded-full bg-primary/30 blur-3xl"
            />
            <div
              class="pointer-events-none absolute right-8 -top-2 h-24 w-24 rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-300/20"
            />
          </div>

          <DialogClose
            class="absolute right-3.5 top-3.5 rounded-full p-1.5 text-foreground/70 ring-offset-background transition hover:bg-background/60 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X class="h-4 w-4" />
            <span class="sr-only">关闭</span>
          </DialogClose>

          <div class="-mt-12 flex items-end gap-4 px-6">
            <Avatar size="base" class="ring-4 ring-card shadow-sp-lg">
              <AvatarFallback class="bg-primary/15 text-2xl font-semibold text-primary">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1 pb-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-xl font-semibold tracking-tight">
                  {{ userStore.displayName }}
                </h2>
                <Badge variant="secondary" class="shrink-0 gap-1">
                  <ShieldCheck class="h-3 w-3" />{{ roleLabel }}
                </Badge>
              </div>
              <p class="truncate text-sm text-muted-foreground">@{{ user?.username || '—' }}</p>
            </div>
          </div>
        </div>

        <!-- 分段切换 -->
        <div class="px-6 pt-5">
          <div class="relative grid grid-cols-3 rounded-xl bg-muted p-1 text-sm">
            <Motion
              as="div"
              class="absolute inset-y-1 left-1 rounded-lg bg-card shadow-sp"
              :style="{ width: 'calc((100% - 0.5rem) / 3)' }"
              :animate="{ x: `${activeIndex * 100}%` }"
              :transition="reduce === 'reduce' ? { duration: 0 } : SPRING"
            />
            <button
              v-for="t in tabs"
              :key="t.key"
              type="button"
              class="relative z-[1] rounded-lg px-3 py-1.5 font-medium transition-colors"
              :class="active === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="active = t.key"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- 标签内容 -->
        <div class="min-h-[184px] px-4 py-4">
          <AnimatePresence mode="wait">
            <Motion
              :key="active"
              as="div"
              :initial="reduce === 'reduce' ? false : { opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="reduce === 'reduce' ? undefined : { opacity: 0, y: -8 }"
              :transition="SPRING_SOFT"
            >
              <!-- 资料 -->
              <div v-if="active === 'profile'" class="space-y-0.5">
                <button
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  @click="openProfile"
                >
                  <User class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span class="w-12 shrink-0 text-sm text-muted-foreground">姓名</span>
                  <span class="flex-1 truncate text-sm">{{ user?.name || '未填写' }}</span>
                  <Pencil
                    class="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
                <button
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  @click="openProfile"
                >
                  <Mail class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span class="w-12 shrink-0 text-sm text-muted-foreground">邮箱</span>
                  <span class="flex-1 truncate text-sm">{{ user?.email || '未填写' }}</span>
                  <Pencil
                    class="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
                <button
                  type="button"
                  class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  @click="openProfile"
                >
                  <Phone class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span class="w-12 shrink-0 text-sm text-muted-foreground">手机</span>
                  <span class="flex-1 truncate text-sm">{{ user?.mobile || '未填写' }}</span>
                  <Pencil
                    class="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              </div>

              <!-- 安全 -->
              <div v-else-if="active === 'security'" class="px-1">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-accent"
                  @click="openPwd"
                >
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <KeyRound class="h-4 w-4" />
                  </span>
                  <span class="flex-1">
                    <span class="block text-sm font-medium">修改密码</span>
                    <span class="block text-xs text-muted-foreground">定期更换密码以保障账号安全</span>
                  </span>
                  <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </div>

              <!-- 偏好 -->
              <div v-else class="space-y-1 px-1">
                <div class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                  <div>
                    <div class="text-sm font-medium">主题外观</div>
                    <div class="text-xs text-muted-foreground">浅色 / 深色界面</div>
                  </div>
                  <div class="flex rounded-lg bg-muted p-1">
                    <button
                      v-for="opt in themeOptions"
                      :key="opt.value"
                      type="button"
                      class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
                      :class="
                        appStore.theme === opt.value
                          ? 'bg-card text-foreground shadow-sp'
                          : 'text-muted-foreground hover:text-foreground'
                      "
                      @click="appStore.setTheme(opt.value)"
                    >
                      <component :is="opt.icon" class="h-4 w-4" />{{ opt.label }}
                    </button>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                  <div>
                    <div class="text-sm font-medium">侧栏默认折叠</div>
                    <div class="text-xs text-muted-foreground">进入系统时收起左侧导航</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="appStore.sidebarCollapsed"
                    class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                    :class="appStore.sidebarCollapsed ? 'bg-primary' : 'bg-muted-foreground/30'"
                    @click="appStore.toggleSidebar()"
                  >
                    <span
                      class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                      :class="appStore.sidebarCollapsed ? 'left-[1.375rem]' : 'left-0.5'"
                    />
                  </button>
                </div>
              </div>
            </Motion>
          </AnimatePresence>
        </div>

        <!-- 底部操作 -->
        <div class="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
          <Button variant="ghost" class="text-destructive hover:text-destructive" @click="handleLogout">
            <LogOut class="h-4 w-4" />退出登录
          </Button>
          <Button variant="outline" @click="close()">关闭</Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!-- 二级弹窗：默认 z 100/110，自然盖在本弹窗(90/95)之上并完整遮挡 -->
  <SpFormDialog
    v-model:open="profileOpen"
    title="编辑资料"
    :fields="profileFields"
    :model="profileModel"
    :loading="profileSaving"
    @submit="onProfileSubmit"
  />
  <SpFormDialog
    v-model:open="pwdOpen"
    title="修改密码"
    :fields="pwdFields"
    :model="pwdModel"
    :loading="pwdSaving"
    @submit="onPwdSubmit"
  />
</template>
