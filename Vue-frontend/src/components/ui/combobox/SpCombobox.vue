<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  /** 副标题/描述（如设备编码、班组名） */
  description?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string | string[]
    options: ComboboxOption[]
    multiple?: boolean
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    disabled?: boolean
    /** 触发按钮附加类（宽度等） */
    class?: string
    triggerClass?: string
  }>(),
  {
    multiple: false,
    placeholder: '请选择',
    searchPlaceholder: '搜索…',
    emptyText: '无匹配项',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | string[]): void
}>()

const open = ref(false)

/** 当前选中值数组（统一处理单选/多选） */
const selectedValues = computed<string[]>(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  return props.modelValue ? [props.modelValue] : []
})

const labelMap = computed(() => {
  const m = new Map<string, ComboboxOption>()
  for (const o of props.options) m.set(o.value, o)
  return m
})

/** 触发按钮上的展示文案 */
const displayText = computed(() => {
  const vals = selectedValues.value
  if (!vals.length) return props.placeholder
  const labels = vals.map((v) => labelMap.value.get(v)?.label ?? v)
  if (props.multiple && labels.length > 1) {
    return `${labels[0]} 等 ${labels.length} 项`
  }
  return labels.join('、')
})

const hasSelection = computed(() => selectedValues.value.length > 0)

function isSelected(value: string) {
  return selectedValues.value.includes(value)
}

function onSelect(option: ComboboxOption) {
  if (option.disabled) return
  if (props.multiple) {
    const next = isSelected(option.value)
      ? selectedValues.value.filter((v) => v !== option.value)
      : [...selectedValues.value, option.value]
    emit('update:modelValue', next)
  } else {
    emit('update:modelValue', isSelected(option.value) ? '' : option.value)
    open.value = false
  }
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child :disabled="disabled">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :disabled="disabled"
        :class="
          cn(
            'h-9 w-full justify-between gap-2 font-normal',
            !hasSelection && 'text-muted-foreground',
            props.class,
            props.triggerClass,
          )
        "
      >
        <span class="truncate">{{ displayText }}</span>
        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-[--reka-popover-trigger-width] p-0"
      align="start"
      :side-offset="4"
    >
      <Command>
        <CommandInput :placeholder="searchPlaceholder" />
        <CommandEmpty>{{ emptyText }}</CommandEmpty>
        <CommandList>
          <CommandItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
            class="gap-2"
            @select="onSelect(option)"
          >
            <Check
              :class="cn('h-4 w-4 shrink-0', isSelected(option.value) ? 'opacity-100' : 'opacity-0')"
            />
            <span class="min-w-0 flex-1 truncate">
              <span class="block truncate">{{ option.label }}</span>
              <span
                v-if="option.description"
                class="block truncate text-xs text-muted-foreground"
              >
                {{ option.description }}
              </span>
            </span>
          </CommandItem>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
