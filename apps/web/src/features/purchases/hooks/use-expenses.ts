import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createExpense,
  deleteExpense,
  getExpensesSummary,
  listExpenses,
  updateExpense,
} from '@/features/purchases/services/expense-service'
import type { ExpenseInput, ExpenseListParams } from '@/features/purchases/types'
import { invalidateExpensesFinancials } from '@/lib/query-invalidation'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const expensesQueryKey = ['expenses'] as const

export function useExpensesQuery(params: ExpenseListParams) {
  return useAuthenticatedQuery({
    queryKey: [...expensesQueryKey, params],
    queryFn: () => listExpenses(params),
  })
}

export function useExpensesSummaryQuery(options?: { enabled?: boolean }) {
  return useAuthenticatedQuery({
    queryKey: [...expensesQueryKey, 'summary'],
    queryFn: getExpensesSummary,
    enabled: options?.enabled,
  })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ExpenseInput) => createExpense(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesQueryKey })
      invalidateExpensesFinancials(queryClient)
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ExpenseInput }) =>
      updateExpense(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesQueryKey })
      invalidateExpensesFinancials(queryClient)
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expensesQueryKey })
      invalidateExpensesFinancials(queryClient)
    },
  })
}
