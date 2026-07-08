import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExchangeRate,
  getProfitMargin,
  updateExchangeRate,
  updateProfitMargin,
  applyProfitMargin,
} from '@/features/purchases/services/settings-service'
import { invalidateCatalogPricing } from '@/lib/query-invalidation'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const settingsQueryKey = ['settings'] as const

export function useExchangeRateQuery() {
  return useAuthenticatedQuery({
    queryKey: [...settingsQueryKey, 'exchange-rate'],
    queryFn: getExchangeRate,
  })
}

export function useUpdateExchangeRateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (usd_rate: number) => updateExchangeRate(usd_rate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey })
    },
  })
}

export function useProfitMarginQuery() {
  return useAuthenticatedQuery({
    queryKey: [...settingsQueryKey, 'profit-margin'],
    queryFn: getProfitMargin,
  })
}

export function useUpdateProfitMarginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (profit_margin_percent: number) => updateProfitMargin(profit_margin_percent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey })
    },
  })
}

export function useApplyProfitMarginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applyProfitMargin,
    onSuccess: () => {
      invalidateCatalogPricing(queryClient)
    },
  })
}
