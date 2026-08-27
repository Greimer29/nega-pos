import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCurrency,
  deleteCurrency,
  getBaseCurrencyCode,
  listCurrencies,
  updateBaseCurrencyCode,
  updateCurrency,
} from '@/features/currencies/services/currency-service'
import type { Currency, CurrencyInput, CurrencyUpdateInput } from '@/features/currencies/types'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const currenciesQueryKey = ['currencies'] as const
export const baseCurrencyQueryKey = ['currencies', 'base'] as const

/** Preferencia de visualización en header (misma key que DisplayCurrencyProvider). */
const DISPLAY_CURRENCY_STORAGE_KEY = 'nega-pos-display-currency-v2'

export function useCurrenciesQuery(activeOnly = false) {
  return useAuthenticatedQuery({
    queryKey: [...currenciesQueryKey, { activeOnly }],
    queryFn: () => listCurrencies(activeOnly),
    staleTime: 15_000,
  })
}
export function useActiveCurrenciesQuery() {
  return useCurrenciesQuery(true)
}

export function useBaseCurrencyQuery() {
  return useAuthenticatedQuery({
    queryKey: baseCurrencyQueryKey,
    queryFn: () => getBaseCurrencyCode(),
    staleTime: 15_000,
  })
}

function isCurrencyList(value: unknown): value is Currency[] {
  return Array.isArray(value)
}

/** Solo listas `['currencies', …]`, nunca `['currencies', 'base']` (string). */
function currencyListQueryFilter(query: { queryKey: readonly unknown[] }) {
  return query.queryKey[0] === 'currencies' && query.queryKey[1] !== 'base'
}

function patchCurrencyLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (list: Currency[]) => Currency[]
) {
  queryClient.setQueriesData<Currency[]>(
    { predicate: currencyListQueryFilter },
    (current) => {
      if (!isCurrencyList(current)) return current
      return updater(current)
    }
  )
}

export function useCreateCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CurrencyInput) => createCurrency(payload),
    onSuccess: (created) => {
      patchCurrencyLists(queryClient, (list) => {
        if (list.some((item) => item.code === created.code)) {
          return list.map((item) => (item.code === created.code ? created : item))
        }
        return [...list, created]
      })
      void queryClient.invalidateQueries({ predicate: currencyListQueryFilter })
    },
  })
}

export function useUpdateCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: CurrencyUpdateInput }) =>
      updateCurrency(code, payload),
    onMutate: async ({ code, payload }) => {
      await queryClient.cancelQueries({ predicate: currencyListQueryFilter })
      const previous = queryClient
        .getQueriesData<Currency[]>({ predicate: currencyListQueryFilter })
        .filter((entry): entry is [typeof entry[0], Currency[]] => isCurrencyList(entry[1]))

      patchCurrencyLists(queryClient, (list) =>
        list.map((item) =>
          item.code === code
            ? {
                ...item,
                name: payload.name ?? item.name,
                ratePerUsd:
                  payload.rate_per_usd !== undefined
                    ? payload.rate_per_usd.toFixed(4)
                    : item.ratePerUsd,
                isActive: payload.is_active ?? item.isActive,
              }
            : item
        )
      )

      return { previous }
    },
    onError: (_error, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSuccess: (updated) => {
      patchCurrencyLists(queryClient, (list) =>
        list.map((item) => (item.code === updated.code ? updated : item))
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ predicate: currencyListQueryFilter })
    },
  })
}

export function useDeleteCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => deleteCurrency(code),
    onMutate: async (code) => {
      await queryClient.cancelQueries({ predicate: currencyListQueryFilter })
      const previous = queryClient
        .getQueriesData<Currency[]>({ predicate: currencyListQueryFilter })
        .filter((entry): entry is [typeof entry[0], Currency[]] => isCurrencyList(entry[1]))
      patchCurrencyLists(queryClient, (list) => list.filter((item) => item.code !== code))
      return { previous }
    },
    onError: (_error, _code, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ predicate: currencyListQueryFilter })
    },
  })
}

export function useUpdateBaseCurrencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => updateBaseCurrencyCode(code),
    onMutate: async (code) => {
      await queryClient.cancelQueries({ queryKey: baseCurrencyQueryKey })
      const previousBase = queryClient.getQueryData<string>(baseCurrencyQueryKey)
      // UI inmediata: el select de moneda base no espera el round-trip a Railway.
      queryClient.setQueryData(baseCurrencyQueryKey, code)
      localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, code)
      return { previousBase }
    },
    onError: (_error, _code, context) => {
      if (context?.previousBase !== undefined) {
        queryClient.setQueryData(baseCurrencyQueryKey, context.previousBase)
        localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, context.previousBase)
      }
    },
    onSuccess: (code) => {
      queryClient.setQueryData(baseCurrencyQueryKey, code)
      localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, code)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: baseCurrencyQueryKey })
      void queryClient.invalidateQueries({ predicate: currencyListQueryFilter })
    },
  })
}
