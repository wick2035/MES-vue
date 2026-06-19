import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Material } from '@/types/domain'

const BASE = '/basedata/materile'

export function pageMaterials(params: Record<string, any>) {
  return http.post<IPage<Material>>(`${BASE}/page`, params)
}
export function saveMaterial(data: Material) {
  return http.post(`${BASE}/add-or-update`, data as Record<string, any>)
}
export function deleteMaterial(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
