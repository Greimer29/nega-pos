import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCustomer,
  createCustomerPayment,
  deleteCustomer,
  getCustomer,
  getCustomerAccountStatement,
  listCustomers,
  updateCustomer,
} from '@/features/customers/services/customer-service'
import type {
  CustomerInput,
  CustomerListParams,
  CustomerPaymentInput,
} from '@/features/customers/types'
import { invalidateCustomerPayments } from '@/lib/query-invalidation'

export const customersQueryKey = ['customers'] as const

export function useCustomersQuery(params: CustomerListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...customersQueryKey, params],
    queryFn: () => listCustomers(params),
    enabled: options?.enabled ?? true,
  })
}

export function useCustomerQuery(id: number) {
  return useQuery({
    queryKey: [...customersQueryKey, 'detail', id],
    queryFn: () => getCustomer(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CustomerInput) => createCustomer(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKey })
    },
  })
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerInput }) =>
      updateCustomer(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...customersQueryKey, 'detail', id] })
    },
  })
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKey })
    },
  })
}

export function useCustomerAccountStatementQuery(customerId: number) {
  return useQuery({
    queryKey: [...customersQueryKey, 'account-statement', customerId],
    queryFn: () => getCustomerAccountStatement(customerId),
    enabled: customerId > 0,
  })
}

export function useCreateCustomerPaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: number
      payload: CustomerPaymentInput
    }) => createCustomerPayment(customerId, payload),
    onSuccess: (_, { customerId }) => {
      void queryClient.invalidateQueries({ queryKey: [...customersQueryKey, 'detail', customerId] })
      void queryClient.invalidateQueries({
        queryKey: [...customersQueryKey, 'account-statement', customerId],
      })
      invalidateCustomerPayments(queryClient)
    },
  })
}
