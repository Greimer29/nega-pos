import { api } from '@/lib/api'
import type {
  Income,
  IncomeInput,
  IncomeListParams,
  IncomeSummary,
} from '@/features/purchases/types'
import type { PaginationMeta } from '@/features/materials/types'

type IncomeListResponse = {
  data: {
    incomes: Income[]
    meta: PaginationMeta
  }
}

type IncomeResponse = {
  data: {
    income: Income
  }
}

type IncomeSummaryResponse = {
  data: {
    summary: IncomeSummary
  }
}

export async function listIncomes(params: IncomeListParams = {}) {
  const { data } = await api.get<IncomeListResponse>('/incomes', {
    params: {
      page: params.page,
      per_page: params.perPage,
      account_id: params.account_id,
      unassigned: params.unassigned,
    },
  })
  return data.data
}

export async function getIncomesSummary() {
  const { data } = await api.get<IncomeSummaryResponse>('/incomes/summary')
  return data.data.summary
}

export async function createIncome(payload: IncomeInput) {
  const { data } = await api.post<IncomeResponse>('/incomes', payload)
  return data.data.income
}

export async function updateIncome(id: number, payload: IncomeInput) {
  const { data } = await api.put<IncomeResponse>(`/incomes/${id}`, payload)
  return data.data.income
}

export async function deleteIncome(id: number) {
  const { data } = await api.delete<{ data: { id: number; eliminado: boolean } }>(
    `/incomes/${id}`
  )
  return data.data
}
