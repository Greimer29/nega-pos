import { api } from '@/lib/api'
import type {
  Expense,
  ExpenseInput,
  ExpenseListParams,
  ExpenseSummary,
} from '@/features/purchases/types'
import type { PaginationMeta } from '@/features/materials/types'

type ExpenseListResponse = {
  data: {
    expenses: Expense[]
    meta: PaginationMeta
  }
}

type ExpenseResponse = {
  data: {
    expense: Expense
  }
}

type ExpenseSummaryResponse = {
  data: {
    summary: ExpenseSummary
  }
}

export async function listExpenses(params: ExpenseListParams = {}) {
  const { data } = await api.get<ExpenseListResponse>('/expenses', {
    params: {
      page: params.page,
      per_page: params.perPage,
      account_id: params.account_id,
      unassigned: params.unassigned,
    },
  })
  return data.data
}

export async function getExpensesSummary() {
  const { data } = await api.get<ExpenseSummaryResponse>('/expenses/summary')
  return data.data.summary
}

export async function createExpense(payload: ExpenseInput) {
  const { data } = await api.post<ExpenseResponse>('/expenses', payload)
  return data.data.expense
}

export async function updateExpense(id: number, payload: ExpenseInput) {
  const { data } = await api.put<ExpenseResponse>(`/expenses/${id}`, payload)
  return data.data.expense
}

export async function deleteExpense(id: number) {
  const { data } = await api.delete<{ data: { id: number; eliminado: boolean } }>(
    `/expenses/${id}`
  )
  return data.data
}
