<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { Factory, LoaderCircle, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useUserStore } from '@/stores/user'
import { captchaUrl } from '@/api/modules/auth'
import { notify } from '@/lib/toast'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 表单校验：必填 + 长度，错误即时反馈
const validationSchema = toTypedSchema(
  z.object({
    username: z.string().min(1, '请输入用户名'),
    password: z.string().min(1, '请输入密码'),
    captcha: z.string().min(1, '请输入验证码'),
  }),
)
const { handleSubmit, errors, defineField, isSubmitting } = useForm({ validationSchema })
const [username, usernameAttrs] = defineField('username')
const [password, passwordAttrs] = defineField('password')
const [captcha, captchaAttrs] = defineField('captcha')

const rememberMe = ref(true)
const captchaSrc = ref(captchaUrl())
function refreshCaptcha() {
  captchaSrc.value = captchaUrl()
}

const onSubmit = handleSubmit(async (values) => {
  try {
    await userStore.login({
      username: values.username,
      password: values.password,
      captcha: values.captcha,
      rememberMe: rememberMe.value,
    })
    notify.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch {
    // 验证码/密码错误等已由 axios 拦截器统一提示；刷新验证码以便重试
    refreshCaptcha()
    captcha.value = ''
  }
})
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4"
  >
    <!-- 背景装饰：工业网格 + 光晕 -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.15]"
      style="
        background-image:
          linear-gradient(to right, hsl(var(--primary) / 0.4) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--primary) / 0.4) 1px, transparent 1px);
        background-size: 36px 36px;
      "
    />
    <div
      class="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
    />

    <div class="relative w-full max-w-sm rounded-xl border bg-card p-8 shadow-sp-lg">
      <div class="mb-6 flex flex-col items-center text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Factory class="h-7 w-7 text-primary" />
        </div>
        <h1 class="mt-3 text-lg font-semibold">MES 智能制造执行系统</h1>
        <p class="mt-1 text-sm text-muted-foreground">登录以进入工业互联网控制台</p>
      </div>

      <form class="space-y-4" @submit="onSubmit">
        <div class="space-y-1.5">
          <Label for="username">用户名</Label>
          <Input
            id="username"
            v-model="username"
            v-bind="usernameAttrs"
            placeholder="请输入用户名"
            autocomplete="username"
          />
          <p v-if="errors.username" class="text-xs text-destructive">{{ errors.username }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="password">密码</Label>
          <Input
            id="password"
            v-model="password"
            v-bind="passwordAttrs"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
          <p v-if="errors.password" class="text-xs text-destructive">{{ errors.password }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="captcha">验证码</Label>
          <div class="flex gap-2">
            <Input
              id="captcha"
              v-model="captcha"
              v-bind="captchaAttrs"
              class="flex-1"
              placeholder="请输入验证码"
              autocomplete="off"
            />
            <button
              type="button"
              class="flex h-10 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
              title="点击刷新验证码"
              @click="refreshCaptcha"
            >
              <img :src="captchaSrc" alt="验证码" class="h-full w-full object-cover" />
            </button>
          </div>
          <p v-if="errors.captcha" class="text-xs text-destructive">{{ errors.captcha }}</p>
        </div>

        <div class="flex items-center justify-between">
          <label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox v-model="rememberMe" />
            记住我
          </label>
          <button
            type="button"
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            @click="refreshCaptcha"
          >
            <RefreshCw class="h-3 w-3" />换一张
          </button>
        </div>

        <Button type="submit" class="w-full" :disabled="isSubmitting">
          <LoaderCircle v-if="isSubmitting" class="animate-spin" />
          {{ isSubmitting ? '登录中…' : '登 录' }}
        </Button>
      </form>

      <p class="mt-4 text-center text-xs text-muted-foreground">
        演示账号：<span class="font-medium text-foreground">admin / 123</span>
      </p>
    </div>
  </div>
</template>
