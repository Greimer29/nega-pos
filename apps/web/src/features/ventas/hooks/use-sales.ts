import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmSale,
  createSale,
  deleteSale,
  getNextSaleCode,
  getSale,
  listSales,
  returnSale,
  transitionSale,
  updateSale,
} from '@/features/ventas/services/sales-service'
import type {
  ConfirmSaleInput,
  CreateSaleInput,
  SaleListParams,
  SaleOrderStatus,
  SaleReturnInput,
  UpdateSaleInput,
} from '@/features/ventas/types'
import { invalidateSalesFinancials } from '@/lib/query-invalidation'
import { isValidEntityId } from '@/lib/route-id'

export function useNextSaleCodeQuery() {
  return useQuery({
    queryKey: ['sales', 'next-code'],
    queryFn: getNextSaleCode,
    staleTime: 30_000,
  })
}

export function useSalesQuery(params: SaleListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => listSales(params),
    enabled: options?.enabled ?? true,
  })
}

export function useSaleQuery(id: number | undefined) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => getSale(id!),
    enabled: isValidEntityId(id),
  })
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateSaleInput) => createSale(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      invalidateSalesFinancials(queryClient)
    },
  })
}

export function useUpdateSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSaleInput }) =>
      updateSale(id, payload),
    onSuccess: (_sale, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['sales', variables.id] })
    },
  })
}

export function useDeleteSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteSale(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useConfirmSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ConfirmSaleInput }) =>
      confirmSale(id, payload),
    onSuccess: (_sale, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['sales', 'next-code'] })
      void queryClient.invalidateQueries({ queryKey: ['sales', variables.id] })
      invalidateSalesFinancials(queryClient)
    },
  })
}

export function useTransitionSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, orderStatus }: { id: number; orderStatus: SaleOrderStatus }) =>
      transitionSale(id, orderStatus),
    onSuccess: (_sale, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['sales', variables.id] })
    },
  })
}

export function useReturnSaleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: SaleReturnInput }) =>
      returnSale(id, payload),
    onSuccess: (_sale, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['sales', variables.id] })
      invalidateSalesFinancials(queryClient)
    },
  })
}

export function useVentasSummaryQuery() {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  return useQuery({
    queryKey: ['ventas-summary', monthStart],
    queryFn: async () => {
      const salesData = await listSales({
        date_from: monthStart,
        exclude_status: 'DRAFT',
        perPage: 1,
        page: 1,
      })
      const totalMonth = salesData.meta.total
      return { salesCountMonth: totalMonth }
    },
  })
}
