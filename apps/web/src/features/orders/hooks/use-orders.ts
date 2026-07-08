import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrder,
  createOrderMaterial,
  createOrderLine,
  deleteOrderMaterial,
  deleteOrder,
  getOrder,
  getOrderBudget,
  getOrderMaterialAvailability,
  listOrders,
  returnOrder,
  transicionarOrder,
  updateOrderMaterial,
  updateOrder,
  uploadReferencia,
} from '@/features/orders/services/order-service'
import type {
  OrderInput,
  OrderListParams,
  OrderMaterialInput,
  OrderMaterialUpdateInput,
  OrderReturnInput,
  OrderTransicionInput,
} from '@/features/orders/types'
import { customersQueryKey } from '@/features/customers/hooks/use-customers'
import { materialsQueryKey } from '@/features/materials/hooks/use-materials'
import { invalidateSalesFinancials } from '@/lib/query-invalidation'

export const ordersQueryKey = ['orders'] as const

export function useOrdersQuery(params: OrderListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...ordersQueryKey, params],
    queryFn: () => listOrders(params),
    enabled: options?.enabled ?? true,
  })
}

export function useOrderQuery(id: number) {
  return useQuery({
    queryKey: [...ordersQueryKey, 'detail', id],
    queryFn: () => getOrder(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OrderInput) => createOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
      void queryClient.invalidateQueries({ queryKey: customersQueryKey })
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
    },
  })
}

export function useUpdateOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrderInput }) =>
      updateOrder(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', id] })
    },
  })
}

export function useDeleteOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey })
      void queryClient.invalidateQueries({ queryKey: customersQueryKey })
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
    },
  })
}

export function useTransicionOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrderTransicionInput }) =>
      transicionarOrder(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', id] })
      invalidateSalesFinancials(queryClient)
    },
  })
}

export function useReturnOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: OrderReturnInput }) =>
      returnOrder(id, payload),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', id] })
      invalidateSalesFinancials(queryClient)
    },
  })
}

export function useUploadReferenciaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, file }: { orderId: number; file: File }) =>
      uploadReferencia(orderId, file),
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', orderId] })
    },
  })
}

export function useCreateOrderMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: OrderMaterialInput }) =>
      createOrderMaterial(orderId, payload),
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', orderId] })
    },
  })
}

export function useUpdateOrderMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      orderMaterialId,
      payload,
    }: {
      orderId: number
      orderMaterialId: number
      payload: OrderMaterialUpdateInput
    }) => updateOrderMaterial(orderId, orderMaterialId, payload),
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', orderId] })
    },
  })
}

export function useDeleteOrderMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, orderMaterialId }: { orderId: number; orderMaterialId: number }) =>
      deleteOrderMaterial(orderId, orderMaterialId),
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', orderId] })
    },
  })
}

export function useCreateOrderLineMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: number
      payload: { catalog_product_id: number; quantity: number }
    }) => createOrderLine(orderId, payload),
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: [...ordersQueryKey, 'detail', orderId] })
      void queryClient.invalidateQueries({ queryKey: materialsQueryKey })
    },
  })
}

export function useOrderBudgetQuery(orderId: number, enabled = true) {
  return useQuery({
    queryKey: [...ordersQueryKey, 'budget', orderId],
    queryFn: () => getOrderBudget(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0 && enabled,
  })
}

export function useOrderMaterialAvailabilityQuery(orderId: number, enabled = true) {
  return useQuery({
    queryKey: [...ordersQueryKey, 'material-availability', orderId],
    queryFn: () => getOrderMaterialAvailability(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0 && enabled,
  })
}
