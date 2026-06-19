import { defineStore } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'

export interface TabItem {
  /** 路由 name，用于 keep-alive include 匹配（须与组件 name 一致） */
  name: string
  /** 完整路径，作为 tab 唯一键与跳转目标 */
  path: string
  title: string
  /** 固定标签不可关闭（如看板） */
  affix?: boolean
  keepAlive?: boolean
}

/** 多页签 + keep-alive 缓存控制 */
export const useTabsStore = defineStore('tabs', {
  state: () => ({
    tabs: [] as TabItem[],
  }),
  getters: {
    /** keep-alive include 列表：仅缓存声明了 keepAlive 的页面 */
    cachedViews: (state) => state.tabs.filter((t) => t.keepAlive).map((t) => t.name),
  },
  actions: {
    addTab(route: RouteLocationNormalized) {
      if (!route.name || !route.meta?.title) return
      const path = route.fullPath
      if (this.tabs.some((t) => t.path === path)) return
      this.tabs.push({
        name: String(route.name),
        path,
        title: route.meta.title,
        affix: route.name === 'Dashboard',
        keepAlive: !!route.meta.keepAlive,
      })
    },
    /** 关闭某标签，返回应跳转到的相邻标签路径（若关闭的是当前标签） */
    removeTab(path: string): string | undefined {
      const index = this.tabs.findIndex((t) => t.path === path)
      if (index === -1) return undefined
      const removed = this.tabs[index]
      if (removed.affix) return undefined
      this.tabs.splice(index, 1)
      const neighbor = this.tabs[index] || this.tabs[index - 1]
      return neighbor?.path
    },
    closeOthers(path: string) {
      this.tabs = this.tabs.filter((t) => t.affix || t.path === path)
    },
    closeAll() {
      this.tabs = this.tabs.filter((t) => t.affix)
    },
    reset() {
      this.tabs = []
    },
  },
})
