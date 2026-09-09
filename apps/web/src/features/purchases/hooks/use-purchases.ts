import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  confirmarPurchase,
  createPurchase,
  createPurchaseItem,
  deletePurchase,
  deletePurchaseItem,
  getPurchase,
  getPurchasesHubSummary,
  getPurchasesSummary,
  listPurchases,
  returnPurchase,
  updatePurchase,
  updatePurchaseItem,
  uploadFactura,
} from '@/features/purchases/services/purchase-service'
import type {
  ConfirmPurchaseInput,
  PurchaseInput,
  PurchaseItemInput,
  PurchaseListParams,
} from '@/features/purchases/types'
import { invalidatePurchasesFinancials, invalidatePurchasesHub } from '@/lib/query-invalidation'
import { useAuthenticatedQuery } from '@/lib/use-authenticated-query'

export const purchasesQueryKey = ['purchases'] as const
export const purchasesHubSummaryQueryKey = [...purchasesQueryKey, 'hub-summary'] as const

export function usePurchasesQuery(params: PurchaseListParams) {
  return useAuthenticatedQuery({
    queryKey: [...purchasesQueryKey, params],
    queryFn: () => listPurchases(params),
  })
}

export function usePurchasesSummaryQuery() {
  return useAuthenticatedQuery({
    queryKey: [...purchasesQueryKey, 'summary'],
    queryFn: getPurchasesSummary,
  })
}

/** KPIs del hub Compras: 1 request (compras + gastos/ingresos según permisos). */
export function usePurchasesHubSummaryQuery() {
  return useAuthenticatedQuery({
    queryKey: purchasesHubSummaryQueryKey,
    queryFn: getPurchasesHubSummary,
    staleTime: 60_000,
  })
}

export function usePurchaseQuery(id: number) {
  return useAuthenticatedQuery({
    queryKey: [...purchasesQueryKey, 'detail', id],
    queryFn: () => getPurchase(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreatePurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PurchaseInput) => createPurchase(payload),
    onSuccess: () => {
      invalidatePurchasesHub(queryClient)
    },
  })
}

export function useUpdatePurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PurchaseInput }) =>
      updatePurchase(id, payload),
    onSuccess: (_, { id }) => {
      invalidatePurchasesHub(queryClient)
      void queryClient.invalidateQueries({ queryKey: [...purchasesQueryKey, 'detail', id] })
    },
  })
}

export function useDeletePurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deletePurchase(id),
    onSuccess: () => {
      invalidatePurchasesHub(queryClient)
    },
  })
}

export function useConfirmarPurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ConfirmPurchaseInput }) =>
      confirmarPurchase(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [...purchasesQueryKey, 'detail', id] })
      invalidatePurchasesFinancials(queryClient)
    },
  })
}

export function useReturnPurchaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => returnPurchase(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: [...purchasesQueryKey, 'detail', id] })
      invalidatePurchasesFinancials(queryClient)
    },
  })
}

export function useUploadFacturaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ purchaseId, file }: { purchaseId: number; file: File }) =>
      uploadFactura(purchaseId, file),
    onSuccess: (_, { purchaseId }) => {
      void queryClient.invalidateQueries({ queryKey: [...purchasesQueryKey, 'detail', purchaseId] })
    },
  })
}

function invalidatePurchaseDetail(queryClient: ReturnType<typeof useQueryClient>, purchaseId: number) {
  invalidatePurchasesHub(queryClient)
  void queryClient.invalidateQueries({ queryKey: [...purchasesQueryKey, 'detail', purchaseId] })
}

export function useCreatePurchaseItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ purchaseId, payload }: { purchaseId: number; payload: PurchaseItemInput }) =>
      createPurchaseItem(purchaseId, payload),
    onSuccess: (_, { purchaseId }) => invalidatePurchaseDetail(queryClient, purchaseId),
  })
}

export function useUpdatePurchaseItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      purchaseId,
      itemId,
      payload,
    }: {
      purchaseId: number
      itemId: number
      payload: Partial<PurchaseItemInput>
    }) => updatePurchaseItem(purchaseId, itemId, payload),
    onSuccess: (_, { purchaseId }) => invalidatePurchaseDetail(queryClient, purchaseId),
  })
}

export function useDeletePurchaseItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ purchaseId, itemId }: { purchaseId: number; itemId: number }) =>
      deletePurchaseItem(purchaseId, itemId),
    onSuccess: (_, { purchaseId }) => invalidatePurchaseDetail(queryClient, purchaseId),
  })
}
