/**
 * SpPickerDialog 取数相关类型与工具。
 */

/** 取数上下文：关键字 + 分页 */
export interface PickerFetchCtx {
  keyword: string
  page: number
  size: number
}

export type PickerFetcher = (ctx: PickerFetchCtx) => Promise<{ records: any[]; total: number }>

/**
 * 把「一次性返回全部」的远程列表，包装成 SpPickerDialog 需要的分页/搜索取数函数。
 * 前端做关键字过滤与分页，适合零部件、可选子BOM等小数据量场景。
 */
export function makeClientFetcher<T extends Record<string, any>>(
  loadAll: () => Promise<T[]>,
  searchKeys: string[],
): PickerFetcher {
  return async ({ keyword, page, size }) => {
    const all = (await loadAll()) ?? []
    const kw = keyword.trim().toLowerCase()
    const filtered = kw
      ? all.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(kw)))
      : all
    const start = (page - 1) * size
    return { records: filtered.slice(start, start + size), total: filtered.length }
  }
}
