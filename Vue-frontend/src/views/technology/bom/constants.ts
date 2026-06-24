/**
 * BOM 模块共享枚举与小工具：层级、子项物料类型、锁定判断、动效弹簧参数。
 * 列表 / 结构编辑 / 结构树三处共用，保证与后端契约一致（FG/PG/COMP/PART、层级 0/1/2）。
 */

export type MatType = 'FG' | 'PG' | 'COMP' | 'PART'
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

/** BOM 层级：0 产品 / 1 半成品 / 2 组件 */
export const BOM_LEVELS = [
  { value: 0, label: '产品 BOM', short: '产品' },
  { value: 1, label: '半成品 BOM', short: '半成品' },
  { value: 2, label: '组件 BOM', short: '组件' },
] as const

export function bomLevelLabel(level?: number | null): string {
  return BOM_LEVELS.find((l) => l.value === Number(level))?.short ?? '—'
}

export const BOM_LEVEL_OPTIONS = BOM_LEVELS.map((l) => ({ label: l.label, value: l.value }))

/** 子项物料类型元信息 */
export interface MatTypeMeta {
  value: MatType
  label: string
  tone: BadgeTone
}

export const MAT_TYPES: MatTypeMeta[] = [
  { value: 'FG', label: '成品', tone: 'info' },
  { value: 'PG', label: '半成品', tone: 'warning' },
  { value: 'COMP', label: '组件', tone: 'success' },
  { value: 'PART', label: '零件', tone: 'muted' },
]

export function matTypeMeta(t?: string): MatTypeMeta | undefined {
  return MAT_TYPES.find((m) => m.value === t)
}
export function matTypeLabel(t?: string): string {
  return matTypeMeta(t)?.label ?? (t || '—')
}
export function matTypeTone(t?: string): BadgeTone {
  return matTypeMeta(t)?.tone ?? 'muted'
}

/** 该类型子项是否需要/可关联子 BOM（半成品 / 组件） */
export function needsChildBom(t?: string): boolean {
  return t === 'PG' || t === 'COMP'
}

/** 锁定判断（兼容历史多种取值） */
export function isLockedStatus(s?: string): boolean {
  return s === 'locked' || s === '1' || s === 'Y'
}

/**
 * 不同 BOM 层级下，子项允许的物料类型：
 * - 产品(0)：只能挂 半成品/组件（PG/COMP），来源于「零部件定义」；
 * - 半成品(1)/组件(2)：可挂 零件(PART) 或 下级半成品/组件。
 */
export function allowedItemTypes(bomLevel?: number | null): MatType[] {
  return Number(bomLevel) === 0 ? ['PG', 'COMP'] : ['PART', 'PG', 'COMP']
}

/** 是否产品 BOM（子项必须来自零部件定义） */
export function isProductBom(bomLevel?: number | null): boolean {
  return Number(bomLevel) === 0
}

/**
 * BOM 头提交字段白名单。
 * 关键：必须剔除 createTime/updateTime 等审计字段——它们以字符串形式回传会让后端
 * @ModelAttribute 绑定 LocalDateTime 失败，导致保存接口 400。
 */
export const BOM_HEADER_KEYS = [
  'id',
  'bomCode',
  'materielCode',
  'materielDesc',
  'versionNumber',
  'state',
  'factory',
  'bomLevel',
  'lockStatus',
  'validity',
  'remark',
] as const

export function toBomHeaderPayload(m: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k of BOM_HEADER_KEYS) {
    if (m[k] !== undefined && m[k] !== null) out[k] = m[k]
  }
  return out
}
