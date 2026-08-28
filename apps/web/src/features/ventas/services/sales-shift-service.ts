import { api } from '@/lib/api'

export type SalesShift = {
  id: number
  opened_at: string
  closed_at: string | null
  opened_by_user_id: number
  closed_by_user_id: number | null
  status: 'OPEN' | 'CLOSED'
  notes: string | null
  created_at: string
  updated_at: string
}

type CurrentShiftResponse = {
  data: {
    sales_shift: SalesShift | null
  }
}

type ShiftListResponse = {
  data: {
    sales_shifts: SalesShift[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
}

type ShiftMutationResponse = {
  data: {
    sales_shift: SalesShift
  }
}

export async function getCurrentSalesShift() {
  const { data } = await api.get<CurrentShiftResponse>('/sales-shifts/current')
  return data.data.sales_shift
}

export async function listSalesShifts(
  params: { page?: number; per_page?: number; status?: 'OPEN' | 'CLOSED' } = {}
) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.per_page) search.set('per_page', String(params.per_page))
  if (params.status) search.set('status', params.status)
  const url = search.size > 0 ? `/sales-shifts?${search.toString()}` : '/sales-shifts'
  const { data } = await api.get<ShiftListResponse>(url)
  return data.data
}

export async function openSalesShift(notes?: string) {
  const { data } = await api.post<ShiftMutationResponse>(
    '/sales-shifts/open',
    notes ? { notes } : {}
  )
  return data.data.sales_shift
}

export async function closeSalesShift(id: number) {
  const { data } = await api.post<ShiftMutationResponse>(`/sales-shifts/${id}/close`)
  return data.data.sales_shift
}
