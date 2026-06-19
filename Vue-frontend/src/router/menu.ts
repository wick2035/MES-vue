import type { RouteRecordRaw } from 'vue-router'
import { constantRoutes } from './routes'

export interface MenuItem {
  title: string
  path: string
  icon?: string
  roles?: string[]
  children?: MenuItem[]
}

function joinPath(parent: string, path: string): string {
  if (path.startsWith('/')) return path
  return `${parent}/${path}`.replace(/\/+/g, '/')
}

function build(records: RouteRecordRaw[], parentPath: string): MenuItem[] {
  const items: MenuItem[] = []
  for (const r of records) {
    if (r.meta?.hidden || !r.meta?.title) continue
    const fullPath = joinPath(parentPath, r.path)
    const children = r.children ? build(r.children, fullPath) : []
    items.push({
      title: r.meta.title,
      path: fullPath,
      icon: r.meta.icon,
      roles: r.meta.roles,
      children: children.length ? children : undefined,
    })
  }
  return items
}

/**
 * 从路由表派生侧栏菜单树（单一数据源，模块新增路由即自动出现在菜单）。
 * 取主框架布局('/')下的子路由构建。
 */
export function getMenuTree(): MenuItem[] {
  const layout = constantRoutes.find((r) => r.path === '/')
  if (!layout?.children) return []
  return build(layout.children, '')
}
