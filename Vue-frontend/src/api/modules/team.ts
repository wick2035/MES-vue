import { http } from '@/api/request'
import type { IPage } from '@/types/api'
import type { Team } from '@/types/domain'

const BASE = '/basedata/team'

export function pageTeams(params: Record<string, any>) {
  return http.post<IPage<Team>>(`${BASE}/page`, params)
}
export function saveTeam(data: Team) {
  return http.post(`${BASE}/add-or-update`, data as Record<string, any>)
}
export function deleteTeam(id: string) {
  return http.post(`${BASE}/delete`, { id })
}
