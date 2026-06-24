import type { TreeNode } from '@/types/domain'

/** 树统计结果（菜单/部门概览卡片用，纯前端递归，精确） */
export interface TreeStats {
  /** 节点总数 */
  total: number
  /** 一级（根）节点数 */
  roots: number
  /** 最大层级（根为 1 级） */
  maxDepth: number
  /** 含子节点的节点数 */
  withChildren: number
  /** 按原始 type 值分组的计数 */
  byType: Record<string, number>
}

/** 递归统计一棵树的概览指标 */
export function treeStats(nodes: TreeNode[]): TreeStats {
  const stats: TreeStats = {
    total: 0,
    roots: nodes.length,
    maxDepth: 0,
    withChildren: 0,
    byType: {},
  }
  const walk = (list: TreeNode[], depth: number) => {
    if (depth > stats.maxDepth) stats.maxDepth = depth
    for (const n of list) {
      stats.total++
      const t = n.type ?? ''
      stats.byType[t] = (stats.byType[t] ?? 0) + 1
      if (n.children?.length) {
        stats.withChildren++
        walk(n.children, depth + 1)
      }
    }
  }
  walk(nodes, 1)
  return stats
}

export type MenuKind = 'DIR' | 'MENU' | 'BTN'

/** 菜单类型按归一化口径计数：兼容 DIR/MENU/BTN 与历史值 0/1/2 */
export function countMenuType(stats: TreeStats, kind: MenuKind): number {
  const alias: Record<MenuKind, string[]> = {
    DIR: ['DIR', '0'],
    MENU: ['MENU', '1'],
    BTN: ['BTN', '2'],
  }
  return alias[kind].reduce((sum, k) => sum + (stats.byType[k] ?? 0), 0)
}
