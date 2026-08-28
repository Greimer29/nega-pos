import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeSalesShift,
  getCurrentSalesShift,
  listSalesShifts,
  openSalesShift,
} from '@/features/ventas/services/sales-shift-service'

export const salesShiftQueryKey = ['sales-shifts'] as const
export const currentSalesShiftQueryKey = [...salesShiftQueryKey, 'current'] as const

export function useCurrentSalesShiftQuery() {
  return useQuery({
    queryKey: currentSalesShiftQueryKey,
    queryFn: getCurrentSalesShift,
  })
}

export function useSalesShiftsQuery(params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: [...salesShiftQueryKey, 'list', params],
    queryFn: () => listSalesShifts({ per_page: 50, ...params }),
  })
}

export function useOpenSalesShiftMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notes?: string) => openSalesShift(notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesShiftQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCloseSalesShiftMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => closeSalesShift(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesShiftQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'daily-closing'] })
    },
  })
}
