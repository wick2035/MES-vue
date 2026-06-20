<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { HTMLAttributes } from 'vue'
import { computed, ref } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)

const selected = computed(() => {
  if (!props.modelValue) return undefined
  try {
    return parseDate(props.modelValue)
  } catch {
    return undefined
  }
})

const placeholderDate = computed(() => selected.value ?? today(getLocalTimeZone()))
const displayValue = computed(() => props.modelValue?.replace(/-/g, '/') || props.placeholder || '请选择日期')

function onSelect(value: DateValue | DateValue[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value
  emit('update:modelValue', next?.toString() ?? '')
  if (next) open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="
          cn(
            'h-10 w-full justify-between bg-white px-3 text-left font-normal hover:border-primary/40 hover:bg-white',
            !modelValue ? 'text-muted-foreground' : 'text-foreground',
            props.class,
          )
        "
        :disabled="disabled"
      >
        <span class="truncate">{{ displayValue }}</span>
        <CalendarDays class="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>

    <PopoverContent class="z-[80] w-auto bg-white p-3" align="start" :side-offset="6">
      <Calendar
        :model-value="selected"
        :placeholder="placeholderDate"
        prevent-deselect
        @update:model-value="onSelect"
      />
    </PopoverContent>
  </Popover>
</template>
