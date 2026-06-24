<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
            'h-9 w-full justify-between gap-2 bg-white px-3 text-left font-normal shadow-none transition-colors hover:bg-white hover:border-primary/40 data-[state=open]:border-primary/60',
            !hasSelection && 'text-muted-foreground',
            props.class,
            props.triggerClass,
          )
        "
      >
        <span class="min-w-0 flex-1 truncate text-left">{{ displayText }}</span>
        <ChevronsUpDown
          :class="
            cn(
              'h-4 w-4 shrink-0 text-muted-foreground opacity-70 transition-transform duration-150',
              open && 'rotate-180',
            )
          "
        />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-[--reka-popover-trigger-width] min-w-[220px] p-1 shadow-lg"
      align="start"
      :side-offset="6"
    >
      <Command class="rounded-md">
        <CommandInput :placeholder="searchPlaceholder" class="h-9 py-2" />
        <CommandEmpty>{{ emptyText }}</CommandEmpty>
        <CommandList class="max-h-64 py-1">
          <CommandGroup class="p-0">
            <CommandItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
              :class="
                cn(
                  'min-h-11 cursor-pointer gap-3 rounded-md px-2.5 py-2',
                  isSelected(option.value) && 'bg-accent/60',
                )
              "
              @select="onSelect(option)"
            >
              <Check
                :class="
                  cn(
                    'h-4 w-4 shrink-0 text-primary transition-opacity',
                    isSelected(option.value) ? 'opacity-100' : 'opacity-0',
                  )
                "
              />
              <span class="min-w-0 flex-1 truncate">
                <span :class="cn('block truncate leading-5', isSelected(option.value) && 'font-medium')">
                  {{ option.label }}
                </span>
                <span
                  v-if="option.description"
                  class="block truncate text-xs leading-4 text-muted-foreground"
                >
                  {{ option.description }}
                </span>
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
