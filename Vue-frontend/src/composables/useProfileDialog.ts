import { ref } from 'vue'

// 模块级单例：头部入口、命令面板与个人中心弹窗共享同一开关
const open = ref(false)

export function useProfileDialog() {
  return {
    open,
    show: () => (open.value = true),
    close: () => (open.value = false),
  }
}
