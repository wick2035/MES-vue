<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import SpForm from './SpForm.vue'
import type { FormField } from '@/types/table'

const props = defineProps<{
  open: boolean
  title: string
  fields: FormField[]
  model: Record<string, any>
  loading?: boolean
  description?: string
}>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'update:model', v: Record<string, any>): void
  (e: 'submit'): void
}>()

const formRef = ref<InstanceType<typeof SpForm>>()
function onSubmit() {
  if (formRef.value?.validate()) emit('submit')
}

function onModelUpdate(next: Record<string, any>) {
  Object.assign(props.model, next)
  emit('update:model', next)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription :class="description ? '' : 'sr-only'">
          {{ description || '填写表单信息' }}
        </DialogDescription>
      </DialogHeader>

      <SpForm ref="formRef" :fields="fields" :model="model" @update:model="onModelUpdate" />

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="loading" @click="onSubmit">
          <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />保存
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
