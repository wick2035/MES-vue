import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { SysUser, SysRole, TreeNode } from '@/types/domain'

// ===== 用户 =====
export function pageUsers(params: Record<string, any>) {
  return http.post<IPage<SysUser>>('/admin/sys/user/page', params)
}
export function saveUser(data: Record<string, any>) {
  return http.post('/admin/sys/user/add-or-update', data)
}
export function deleteUser(id: string) {
  return http.post('/admin/sys/user/delete', { id })
}
export function disableUser(id: string, status: string) {
  return http.post('/admin/sys/user/disable', { id, status })
}
export function resetPassword(id: string, newPassword: string) {
  return http.post('/admin/sys/user/reset-password', { id, newPassword })
}
export function assignRole(userId: string, roleIds: string[]) {
  return http.post('/admin/sys/user/assign-role', { userId, roleIds })
}

// ===== 角色 =====
export function pageRoles(params: Record<string, any>) {
  return http.post<IPage<SysRole>>('/admin/sys/role/page', params)
}
export function saveRole(data: Record<string, any>) {
  return http.post('/admin/sys/role/add-or-update', data)
}
export function deleteRole(id: string) {
  return http.post('/admin/sys/role/delete', { id })
}
export function getRoleMenuTree(roleId: string) {
  return http.post<TreeNode[]>('/admin/sys/role/menu-tree', { roleId })
}
export function authMenu(roleId: string, menuIds: string[]) {
  return http.post('/admin/sys/role/auth-menu', { roleId, menuIds })
}

// ===== 菜单 / 部门 树 =====
export function getMenuTree() {
  return http.get<TreeNode[]>('/admin/sys/menu/tree')
}
export function getDeptTree() {
  return http.get<TreeNode[]>('/admin/sys/department/tree')
}
