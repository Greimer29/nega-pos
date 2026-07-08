import { parseAppUser } from '@/features/users/parse-app-user'
import { api } from '@/lib/api'
import type { AuthMessageResponse, AuthUserResponse } from '@/types/auth'

export type LoginPayload = {
  email: string
  password: string
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<AuthUserResponse>('/auth/login', payload)
  return parseAppUser(data.data.user)
}

export async function logout() {
  await api.post<AuthMessageResponse>('/auth/logout')
}

export async function getCurrentUser() {
  const { data } = await api.get<AuthUserResponse>('/auth/me')
  return parseAppUser(data.data.user)
}