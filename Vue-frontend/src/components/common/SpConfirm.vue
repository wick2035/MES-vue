<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{ open: boolean; title?: string; description?: string; confirming?: boolean }>(),
  {
    title: '确认操作',
    description: '确定要执行此操作吗？',
    confirming: false,
  },
)
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button variant="outline" :disabled="confirming" @click="emit('update:open', false)">
          取消
        </Button>
        <Button
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="confirming"
          @click="emit('confirm')"
        >
          {{ confirming ? '处理中' : '确定' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
