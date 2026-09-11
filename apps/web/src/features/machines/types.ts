import type {
  MachineExpenseCategory,
  MachineStatus,
} from '@/features/machines/constants'

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

/** Gasto unificado o legacy en ficha de máquina. */
export type MachineExpense = {
  id: number
  machineId?: number | null
  date: string
  category?: MachineExpenseCategory | null
  description: string
  amount: string
  amountUsd?: string
  currencyCode?: string
  entryRate?: string | null
  accountId: number | null
  supplierId?: number | null
  tieneComprobante?: boolean
  notes?: string | null
  legacy?: boolean
  createdAt: string
  updatedAt: string
  supplier?: {
    id: number
    name: string
  }
  account?: {
    id: number
    name: string
    isActive: boolean
  }
  machine?: {
    id: number
    name: string
  }
}

export type Machine = {
  id: number
  name: string
  type: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  acquisitionDate: string | null
  acquisitionCost: string | null
  status: MachineStatus
  location: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  totalSpent?: string
  expenses?: MachineExpense[]
}

export type MachineListParams = {
  page?: number
  perPage?: number
  search?: string
  type?: string
  status?: MachineStatus
  active?: boolean
}

export type MachineListResponse = {
  data: {
    machines: Machine[]
    meta: PaginationMeta
  }
}

export type MachineResponse = {
  data: {
    machine: Machine
  }
}

export type MachineDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
    modo: 'soft' | 'hard'
  }
}

export type MachineInput = {
  name: string
  type: string
  brand?: string
  model?: string
  serialNumber?: string
  date_adquisicion?: string
  costo_adquisicion?: number
  status?: MachineStatus
  location?: string
  notes?: string
  active?: boolean
}

/** Payload unificado (POST /machines/:id/expenses → expenses). */
export type MachineExpenseInput = {
  date: string
  description?: string
  amount: number
  currency_code?: string
  entry_rate?: number
  account_id?: number | null
  category?: MachineExpenseCategory
  supplier_id?: number
  notes?: string
}

export type MachineExpenseResponse = {
  data: {
    expense: MachineExpense
  }
}
