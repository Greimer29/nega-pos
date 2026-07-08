import { parseAppUser } from '@/features/users/parse-app-user'
import type {
  AppUser,
  UserInput,
  UserListParams,
  UserListResponse,
  UserResponse,
} from '@/features/users/types'
import { api } from '@/lib/api'

export async function listUsers(params: UserListParams = {}) {
  const { data } = await api.get<UserListResponse>('/users', {
    params: {
      page: params.page,
      per_page: params.perPage,
      search: params.search || undefined,
      active: params.active,
    },
  })

  const payload = data.data

  return {
    ...payload,
    users: (payload.users ?? []).map(parseAppUser),
  }
}

export async function getUser(id: number) {
  const { data } = await api.get<UserResponse>(`/users/${id}`)
  return parseAppUser(data.data.user)
}

export async function createUser(payload: UserInput) {
  const { data } = await api.post<UserResponse>('/users', payload)
  return parseAppUser(data.data.user)
}

export async function updateUser(id: number, payload: Partial<UserInput>) {
  const { data } = await api.put<UserResponse>(`/users/${id}`, payload)
  return parseAppUser(data.data.user)
}

export async function setUserActive(id: number, active: boolean) {
  const { data } = await api.patch<UserResponse>(`/users/${id}/active`, { active })
  return parseAppUser(data.data.user)
}

export type { AppUser }
