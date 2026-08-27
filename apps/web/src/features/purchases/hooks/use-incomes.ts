import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createIncome,
  deleteIncome,
  getIncomesSummary,
  listIncomes,
  updateIncome,
} from '@/features/purchases/services/income-service'
import type { IncomeInput, IncomeListParams } from '@/features/purchases/types'
import { invalidateExpensesFinancials } from '@/lib/query-invalidation'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const incomesQueryKey = ['incomes'] as const

export function useIncomesQuery(params: IncomeListParams) {
  return useAuthenticatedQuery({
    queryKey: [...incomesQueryKey, params],
    queryFn: () => listIncomes(params),
  })
}

export function useIncomesSummaryQuery(options?: { enabled?: boolean }) {
  return useAuthenticatedQuery({
    queryKey: [...incomesQueryKey, 'summary'],
    queryFn: getIncomesSummary,
    enabled: options?.enabled,
  })
}

export function useCreateIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IncomeInput) => createIncome(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incomesQueryKey })
      invalidateExpensesFinancials(queryClient)
    },
  })
}

export function useUpdateIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: IncomeInput }) =>
      updateIncome(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incomesQueryKey })
      invalidateExpensesFinancials(queryClient)
    },
  })
}

export function useDeleteIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteIncome(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incomesQueryKey })
      invalidateExpensesFinancials(queryClient)
    },
  })
}
