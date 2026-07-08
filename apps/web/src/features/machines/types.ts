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

export type MachineExpense = {
  id: number
  machineId: number
  date: string
  category: MachineExpenseCategory
  description: string
  amount: string
  currencyCode?: string
  accountId: number | null
  supplierId: number | null
  tieneComprobante: boolean
  notes: string | null
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

export type MachineExpenseInput = {
  date: string
  category: MachineExpenseCategory
  description: string
  amount: number
  currency_code?: string
  supplier_id?: number
  notes?: string
  account_id?: number | null
}

export type MachineExpenseResponse = {
  data: {
    expense: MachineExpense
  }
}
