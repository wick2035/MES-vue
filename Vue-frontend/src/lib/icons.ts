import type { Component } from 'vue'
import {
  LayoutDashboard,
  Database,
  Package,
  Cpu,
  Users,
  Warehouse,
  Boxes,
  ClipboardList,
  Factory,
  GitBranch,
  ScanLine,
  Settings,
  UserCog,
  Bot,
  Activity,
  ShieldCheck,
  ListTree,
  Building2,
  Box,
} from 'lucide-vue-next'

/**
 * 菜单图标注册表：按需引入 lucide 图标，避免全量打包。
 * 新增模块时在此登记其 meta.icon 对应的组件。
 */
export const iconMap: Record<string, Component> = {
  LayoutDashboard,
  Database,
  Package,
  Cpu,
  Users,
  Warehouse,
  Boxes,
  ClipboardList,
  Factory,
  GitBranch,
  ScanLine,
  Settings,
  UserCog,
  Bot,
  Activity,
  ShieldCheck,
  ListTree,
  Building2,
  Box,
}

export function resolveIcon(name?: string): Component | undefined {
  return name ? iconMap[name] : undefined
}
