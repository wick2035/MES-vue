import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

/** 应用级 UI 状态：主题、侧栏折叠。持久化到 localStorage。 */
export const useAppStore = defineStore('app', {
  state: () => ({
    theme: 'light' as ThemeMode,
    sidebarCollapsed: false,
  }),
  actions: {
    /** 把当前主题应用到 <html> 的 class，驱动 .dark 令牌切换 */
    applyTheme() {
      const root = document.documentElement
      if (this.theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      this.applyTheme()
    },
    setTheme(mode: ThemeMode) {
      this.theme = mode
      this.applyTheme()
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
  },
  persist: {
    key: 'mes-app',
    pick: ['theme', 'sidebarCollapsed'],
  },
})
