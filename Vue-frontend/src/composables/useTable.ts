import { reactive, ref, type Ref } from 'vue'
import type { IPage, Result } from '@/types/api'

type Fetcher<T> = (params: Record<string, any>) => Promise<Result<IPage<T>>>

/**
 * 列表分页通用逻辑：封装 loading、数据、总数、查询参数与分页/搜索/重置。
 * 各 CRUD 列表页复用，避免重复样板。
 */
export function useTable<T>(fetcher: Fetcher<T>, initialQuery: Record<string, any> = {}) {
  const loading = ref(false)
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const query = reactive<Record<string, any>>({ current: 1, size: 10, ...initialQuery })

  async function load() {
    loading.value = true
    try {
      const res = await fetcher({ ...query })
      list.value = res.data?.records ?? []
      total.value = res.data?.total ?? 0
    } catch {
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  function onPageChange(page: number) {
    query.current = page
    load()
  }
  function onSizeChange(size: number) {
    query.size = size
    query.current = 1
    load()
  }
  function search() {
    query.current = 1
    load()
  }
  function reset(searchKeys: string[]) {
    searchKeys.forEach((k) => (query[k] = undefined))
    query.current = 1
    load()
  }

  return { loading, list, total, query, load, onPageChange, onSizeChange, search, reset }
}
