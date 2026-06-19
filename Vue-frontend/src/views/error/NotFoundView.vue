<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Compass } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <div class="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-background">
    <Compass class="h-16 w-16 text-primary" />
    <h1 class="text-2xl font-semibold">404 · 页面不存在</h1>
    <p class="text-sm text-muted-foreground">您访问的页面走丢了。</p>
    <button
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      @click="router.replace('/')"
    >
      返回首页
    </button>
  </div>
</template>
