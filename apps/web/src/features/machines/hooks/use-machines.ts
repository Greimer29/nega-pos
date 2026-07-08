import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMachine,
  createMachineExpense,
  deleteMachine,
  getMachine,
  listMachines,
  updateMachine,
} from '@/features/machines/services/machine-service'
import type {
  MachineExpenseInput,
  MachineInput,
  MachineListParams,
} from '@/features/machines/types'
import { invalidateDashboardAndReports, invalidateMachineExpensesFinancials } from '@/lib/query-invalidation'

export const machinesQueryKey = ['machines'] as const

export function useMachinesQuery(params: MachineListParams) {
  return useQuery({
    queryKey: [...machinesQueryKey, params],
    queryFn: () => listMachines(params),
  })
}

export function useMachineQuery(id: number) {
  return useQuery({
    queryKey: [...machinesQueryKey, 'detail', id],
    queryFn: () => getMachine(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreateMachineMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MachineInput) => createMachine(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: machinesQueryKey })
    },
  })
}

export function useUpdateMachineMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MachineInput }) => updateMachine(id, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: machinesQueryKey })
      void queryClient.invalidateQueries({ queryKey: [...machinesQueryKey, 'detail', variables.id] })
    },
  })
}

export function useDeleteMachineMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMachine(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: machinesQueryKey })
      invalidateDashboardAndReports(queryClient)
    },
  })
}

export function useCreateMachineExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ machineId, payload }: { machineId: number; payload: MachineExpenseInput }) =>
      createMachineExpense(machineId, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...machinesQueryKey, 'detail', variables.machineId] })
      invalidateMachineExpensesFinancials(queryClient)
    },
  })
}
