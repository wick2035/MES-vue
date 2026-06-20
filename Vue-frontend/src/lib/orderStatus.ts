export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

/** 工单主状态(statue) 色调：1待审批 2已审批 5已下发 3已结束 4已终结 */
export function statueTone(statue?: number): Tone {
  switch (statue) {
    case 1:
      return 'warning'
    case 2:
    case 5:
      return 'info'
    case 3:
      return 'success'
    case 4:
      return 'muted'
    default:
      return 'muted'
  }
}

export function workTone(s?: string): Tone {
  return s === 'STARTED' ? 'info' : 'muted'
}
export function completeTone(s?: string): Tone {
  return s === 'COMPLETED' ? 'success' : 'warning'
}
export function deliveryTone(s?: string): Tone {
  return s === 'DELIVERED' ? 'success' : 'warning'
}

/** 订单类型：P 量产 / A 验证 / F 返工 */
export function orderTypeName(t?: string): string {
  return { P: '量产', A: '验证', F: '返工' }[t || ''] || t || '—'
}

export const orderTypeOptions = [
  { label: '量产', value: 'P' },
  { label: '验证', value: 'A' },
  { label: '返工', value: 'F' },
]
