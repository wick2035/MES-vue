<script setup lang="ts">
import { reactive } from 'vue'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { FormField } from '@/types/table'

/**
 * Schema 驱动的通用表单：按 fields 配置渲染输入并做必填/正则/范围校验。
 * 父组件传入 model（响应式对象），表单直接读写其字段；调用 validate() 触发校验。
 */
const props = defineProps<{ fields: FormField[]; model: Record<string, any> }>()
const emit = defineEmits<{
  (e: 'update:model', model: Record<string, any>): void
}>()

const errors = reactive<Record<string, string>>({})

function onUpdate(f: FormField, val: any) {
  const nextValue = f.type === 'number' ? (val === '' || val === null ? null : Number(val)) : val
  emit('update:model', { ...props.model, [f.field]: nextValue })
  if (errors[f.field]) errors[f.field] = ''
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => (errors[k] = ''))
  let ok = true
  for (const f of props.fields) {
    const v = props.model[f.field]
    const empty = v === undefined || v === null || v === ''
    if (f.required && empty) {
      errors[f.field] = `${f.label}不能为空`
      ok = false
      continue
    }
    if (empty) continue
    if (f.pattern && !f.pattern.test(String(v))) {
      errors[f.field] = f.patternMsg || `${f.label}格式不正确`
      ok = false
      continue
    }
    if (f.type === 'number') {
      const n = Number(v)
      if (f.min != null && n < f.min) {
        errors[f.field] = `${f.label}不能小于 ${f.min}`
        ok = false
      } else if (f.max != null && n > f.max) {
        errors[f.field] = `${f.label}不能大于 ${f.max}`
        ok = false
      }
    }
  }
  return ok
}

defineExpose({ validate })
</script>

<template>
  <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
    <div
      v-for="f in fields"
      :key="f.field"
      :class="cn('space-y-1.5', f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : '')"
    >
      <Label :class="f.required ? 'after:ml-0.5 after:text-destructive after:content-[\'*\']' : ''">
        {{ f.label }}
      </Label>

      <Textarea
        v-if="f.type === 'textarea'"
        :model-value="model[f.field]"
        :placeholder="f.placeholder"
        :disabled="f.readonly"
        @update:model-value="onUpdate(f, $event)"
      />
      <Select
        v-else-if="f.type === 'select'"
        :model-value="model[f.field] != null ? String(model[f.field]) : undefined"
        :disabled="f.readonly"
        @update:model-value="onUpdate(f, $event)"
      >
        <SelectTrigger><SelectValue :placeholder="f.placeholder || '请选择'" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in f.options" :key="opt.value" :value="String(opt.value)">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-else
        :type="f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : 'text'"
        :model-value="model[f.field]"
        :placeholder="f.placeholder"
        :readonly="f.readonly"
        :class="f.readonly ? 'bg-muted text-muted-foreground' : ''"
        @update:model-value="onUpdate(f, $event)"
      />

      <p v-if="errors[f.field]" class="text-xs text-destructive">{{ errors[f.field] }}</p>
    </div>
  </div>
</template>
