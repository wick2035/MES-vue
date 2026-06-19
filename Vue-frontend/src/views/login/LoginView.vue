<script setup lang="ts">
import { Factory } from 'lucide-vue-next'
// M0 占位登录页：完整的验证码登录表单与鉴权流程在 M1 接入。
</script>

<template>
  <div class="flex h-full min-h-screen items-center justify-center bg-background p-4">
    <div class="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sp-lg">
      <Factory class="mx-auto h-10 w-10 text-primary" />
      <h1 class="mt-4 text-lg font-semibold">MES 智能制造执行系统</h1>
      <p class="mt-2 text-sm text-muted-foreground">登录功能将在 M1 里程碑接入。</p>
    </div>
  </div>
</template>
