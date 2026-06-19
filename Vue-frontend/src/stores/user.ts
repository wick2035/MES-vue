import { defineStore } from 'pinia'
import type { SysUser, SysMenu } from '@/types/domain'
import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  type LoginPayload,
} from '@/api/modules/auth'

/**
 * 用户/鉴权状态。
 * token 为登录态标记（真实凭证是后端 Shiro 会话 Cookie），持久化到 localStorage，
 * 满足“登录令牌存储、刷新不丢”，并作为路由守卫的登录判定依据。
 */
export const useUserStore = defineStore('user', {
  state: () => ({
    token: '' as string,
    userInfo: null as SysUser | null,
    /** 角色编码集合，如 admin / 888888 */
    roles: [] as string[],
    /** 后端按角色过滤的菜单树（M2 接入侧栏渲染） */
    menus: [] as SysMenu[],
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.roles.includes('admin') || state.roles.includes('888888'),
    displayName: (state) => state.userInfo?.name || state.userInfo?.username || '未登录',
  },
  actions: {
    /** 登录：校验通过后建立会话并拉取用户档案 */
    async login(payload: LoginPayload) {
      await apiLogin(payload)
      // 先拉取用户档案，成功后再标记登录态，避免“半登录”（有 token 无用户信息）
      await this.fetchProfile()
      this.token = `mes-${payload.username}-${Date.now()}`
    },

    /** 拉取当前用户与角色 */
    async fetchProfile() {
      const { data } = await getCurrentUser()
      this.userInfo = data
      const codes =
        data?.roleCodes ??
        (data?.sysRoleDTOs?.map((r) => r.code).filter(Boolean) as string[]) ??
        []
      this.roles = codes
    },

    setMenus(menus: SysMenu[]) {
      this.menus = menus
    },

    /** 是否拥有任一指定角色（空数组表示不限制；管理员放行全部） */
    hasAnyRole(required?: string[]) {
      if (!required || required.length === 0) return true
      if (this.isAdmin) return true
      return required.some((r) => this.roles.includes(r))
    },

    async logout() {
      try {
        await apiLogout()
      } catch {
        // 注销接口失败不阻断本地登出
      }
      this.reset()
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
