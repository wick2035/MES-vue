import { http } from '@/api/request'
import type { SysUser } from '@/types/domain'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export interface LoginPayload {
  username: string
  password: string
  captcha: string
  rememberMe?: boolean
}

/** 当前登录用户（后端新增 /admin/sys/profile/current 返回，含角色） */
export interface CurrentUser extends SysUser {
  roleCodes?: string[]
}

/**
 * 验证码图片地址（带时间戳防缓存）。经 Vite 代理同源，
 * <img> 直接加载即可携带 Shiro 会话 Cookie，并把验证码写入会话。
 */
export function captchaUrl(): string {
  return `${API_BASE}/verification/code?t=${Date.now()}`
}

/** 登录：表单编码提交，成功后后端建立会话 Cookie */
export function login(payload: LoginPayload) {
  return http.post('/login', {
    username: payload.username,
    password: payload.password,
    captcha: payload.captcha,
    rememberMe: payload.rememberMe ? 'true' : 'false',
  })
}

/** 拉取当前登录用户与角色（后端该接口仅注册了 POST） */
export function getCurrentUser() {
  return http.post<CurrentUser>('/admin/sys/profile/current')
}

/** 按角色过滤的菜单树（用于侧栏与权限） */
export function getMenuTree() {
  return http.get('/admin/list/index/menu/tree')
}

/** 注销（后端新增 /client/logout，失效会话） */
export function logout() {
  return http.post('/client/logout')
}
