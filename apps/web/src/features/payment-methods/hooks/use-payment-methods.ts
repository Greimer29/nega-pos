import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  updatePaymentMethod,
} from '@/features/payment-methods/services/payment-method-service'
import type { PaymentMethodInput, PaymentMethodUpdateInput } from '@/features/payment-methods/types'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const paymentMethodsQueryKey = ['payment-methods'] as const

export function usePaymentMethodsQuery(activeOnly = false) {
  return useAuthenticatedQuery({
    queryKey: [...paymentMethodsQueryKey, { activeOnly }],
    queryFn: () => listPaymentMethods(activeOnly),
  })
}

export function useActivePaymentMethodsQuery() {
  return usePaymentMethodsQuery(true)
}

export function useCreatePaymentMethodMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PaymentMethodInput) => createPaymentMethod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey })
    },
  })
}

export function useUpdatePaymentMethodMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: PaymentMethodUpdateInput }) =>
      updatePaymentMethod(code, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey })
    },
  })
}

export function useDeletePaymentMethodMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => deletePaymentMethod(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentMethodsQueryKey })
    },
  })
}
