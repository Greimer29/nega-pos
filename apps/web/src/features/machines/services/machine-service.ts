import { api } from '@/lib/api'
import type {
  MachineDeleteResponse,
  MachineExpenseInput,
  MachineExpenseResponse,
  MachineInput,
  MachineListParams,
  MachineListResponse,
  MachineResponse,
} from '@/features/machines/types'

export async function listMachines(params: MachineListParams = {}) {
  const { data } = await api.get<MachineListResponse>('/machines', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      type: params.type,
      status: params.status,
      active: params.active,
    },
  })

  return data.data
}

export async function getMachine(id: number) {
  const { data } = await api.get<MachineResponse>(`/machines/${id}`)
  return data.data.machine
}

export async function createMachine(payload: MachineInput) {
  const { data } = await api.post<MachineResponse>('/machines', payload)
  return data.data.machine
}

export async function updateMachine(id: number, payload: MachineInput) {
  const { data } = await api.put<MachineResponse>(`/machines/${id}`, payload)
  return data.data.machine
}

export async function deleteMachine(id: number) {
  const { data } = await api.delete<MachineDeleteResponse>(`/machines/${id}`)
  return data.data
}

export async function createMachineExpense(machineId: number, payload: MachineExpenseInput) {
  const { data } = await api.post<MachineExpenseResponse>(`/machines/${machineId}/expenses`, payload)
  return data.data.expense
}
