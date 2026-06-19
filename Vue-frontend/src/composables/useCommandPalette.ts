import { ref } from 'vue'

// 模块级单例：头部按钮、快捷键与面板共享同一开关
const open = ref(false)

export function useCommandPalette() {
  return {
    open,
    show: () => (open.value = true),
    toggle: () => (open.value = !open.value),
  }
}
