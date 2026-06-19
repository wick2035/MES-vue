import { defineStore } from 'pinia'
import type { SysUser, SysMenu } from '@/types/domain'

/**
 * 用户/鉴权状态。
 * token 为登录态标记（真实凭证是后端 Shiro 会话 Cookie），持久化到 localStorage，
 * 满足“登录令牌存储、刷新不丢”，并作为路由守卫的登录判定依据。
 * 登录、登出、拉取当前用户与菜单的具体逻辑在 M1（api/auth）中接入。
 */
export const useUserStore = defineStore('user', {
  state: () => ({
    token: '' as string,
    userInfo: null as SysUser | null,
    /** 角色编码集合，如 admin / 888888 */
    roles: [] as string[],
    /** 后端按角色过滤后的菜单树 */
    menus: [] as SysMenu[],
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.roles.includes('admin') || state.roles.includes('888888'),
    displayName: (state) => state.userInfo?.name || state.userInfo?.username || '未登录',
  },
  actions: {
    setSession(token: string, user: SysUser, roles: string[]) {
      this.token = token
      this.userInfo = user
      this.roles = roles
    },
    setMenus(menus: SysMenu[]) {
      this.menus = menus
    },
    /** 是否拥有任一指定角色（空数组表示不限制） */
    hasAnyRole(required?: string[]) {
      if (!required || required.length === 0) return true
      if (this.isAdmin) return true
      return required.some((r) => this.roles.includes(r))
    },
    reset() {
      this.token = ''
      this.userInfo = null
      this.roles = []
      this.menus = []
    },
  },
  persist: {
    key: 'mes-user',
    pick: ['token', 'userInfo', 'roles', 'menus'],
  },
})
