import type { PermissionKey } from '@/features/permissions/catalog'

export type AppUserRole = 'ADMIN' | 'OPERATOR'

export type AppUser = {
  id: number
  name: string
  email: string
  role: AppUserRole
  active: boolean
  permissions: PermissionKey[] | ['*']
  createdAt: string
  updatedAt: string
}

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type UserListResponse = {
  data: {
    users: AppUser[]
    meta: PaginationMeta
  }
}

export type UserResponse = {
  data: {
    user: AppUser
  }
}

export type UserInput = {
  name: string
  email: string
  password?: string
  role: AppUserRole
  permissions?: PermissionKey[]
  active?: boolean
}

export type UserListParams = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}
