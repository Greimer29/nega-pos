import type { PaginationMeta } from '@/features/materials/types'

export type Account = {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AccountResumen = {
  id: number
  name: string
  isActive: boolean
}

export type AccountInput = {
  name: string
  description?: string
  is_active?: boolean
}

export type AccountListParams = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export type AccountListResponse = {
  data: {
    accounts: Account[]
    meta: PaginationMeta
  }
}

export type AccountResponse = {
  data: {
    account: Account
  }
}

export type AccountDeleteResponse = {
  data: {
    id: number
    eliminado: boolean
    modo: 'soft' | 'hard'
  }
}
