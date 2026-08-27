import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCurrency,
  deleteCurrency,
  getBaseCurrencyCode,
  listCurrencies,
  updateBaseCurrencyCode,
  updateCurrency,
} from '@/features/currencies/services/currency-service'
import type { CurrencyInput, CurrencyUpdateInput } from '@/features/currencies/types'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const currenciesQueryKey = ['currencies'] as const
export const baseCurrencyQueryKey = ['currencies', 'base'] as const

export function useCurrenciesQuery(activeOnly = false) {
  return useAuthenticatedQuery({
    queryKey: [...currenciesQueryKey, { activeOnly }],
    queryFn: () => listCurrencies(activeOnly),
    staleTime: 60_000,
  })
}
export function useActiveCurrenciesQuery() {
  return useCurrenciesQuery(true)
}

export function useBaseCurrencyQuery() {
  return useAuthenticatedQuery({
    queryKey: baseCurrencyQueryKey,
    queryFn: () => getBaseCurrencyCode(),
    staleTime: 60_000,
  })
}

export function useCreateCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CurrencyInput) => createCurrency(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currenciesQueryKey })
    },
  })
}

export function useUpdateCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: CurrencyUpdateInput }) =>
      updateCurrency(code, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currenciesQueryKey })
    },
  })
}

export function useDeleteCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => deleteCurrency(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currenciesQueryKey })
    },
  })
}

export function useUpdateBaseCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => updateBaseCurrencyCode(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currenciesQueryKey })
      void queryClient.invalidateQueries({ queryKey: baseCurrencyQueryKey })
    },
  })
}
