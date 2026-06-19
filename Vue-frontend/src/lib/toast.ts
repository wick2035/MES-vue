import { toast } from 'vue-sonner'

/** 统一的轻量提示封装（基于 vue-sonner），全局复用 */
export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast(msg),
  warning: (msg: string) => toast.warning(msg),
}

export { toast }
