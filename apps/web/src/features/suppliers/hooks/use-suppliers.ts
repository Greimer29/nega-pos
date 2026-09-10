import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplier,
  createSupplierInvoice,
  createSupplierPayment,
  deleteSupplier,
  deleteSupplierImage,
  getSupplierAccountStatement,
  listSuppliers,
  updateSupplier,
  uploadSupplierImage,
} from '@/features/suppliers/services/supplier-service'
import type {
  SupplierInput,
  SupplierInvoiceInput,
  SupplierListParams,
  SupplierPaymentInput,
} from '@/features/suppliers/types'
import { invalidateExpensesFinancials, invalidateSupplierPayments } from '@/lib/query-invalidation'

export const suppliersQueryKey = ['suppliers'] as const

export function useSuppliersQuery(params: SupplierListParams) {
  return useQuery({
    queryKey: [...suppliersQueryKey, params],
    queryFn: () => listSuppliers(params),
  })
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SupplierInput) => createSupplier(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SupplierInput }) =>
      updateSupplier(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}

export function useSupplierAccountStatementQuery(supplierId: number) {
  return useQuery({
    queryKey: [...suppliersQueryKey, 'account-statement', supplierId],
    queryFn: () => getSupplierAccountStatement(supplierId),
    enabled: supplierId > 0,
  })
}

export function useCreateSupplierPaymentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      payload,
    }: {
      supplierId: number
      payload: SupplierPaymentInput
    }) => createSupplierPayment(supplierId, payload),
    onSuccess: (_, { supplierId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...suppliersQueryKey, 'account-statement', supplierId],
      })
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
      invalidateSupplierPayments(queryClient)
    },
  })
}

export function useCreateSupplierInvoiceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      supplierId,
      payload,
    }: {
      supplierId: number
      payload: SupplierInvoiceInput
    }) => createSupplierInvoice(supplierId, payload),
    onSuccess: (_, { supplierId }) => {
      void queryClient.invalidateQueries({
        queryKey: [...suppliersQueryKey, 'account-statement', supplierId],
      })
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
      invalidateSupplierPayments(queryClient)
      invalidateExpensesFinancials(queryClient)
    },
  })
}

export function useUploadSupplierImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadSupplierImage(id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}

export function useDeleteSupplierImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteSupplierImage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: suppliersQueryKey })
    },
  })
}
