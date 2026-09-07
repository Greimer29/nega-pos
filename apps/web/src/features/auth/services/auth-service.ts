import { parseAppUser } from '@/features/users/parse-app-user'
import { api } from '@/lib/api'
import type {
  AuthCompany,
  AuthMessageResponse,
  AuthSession,
  AuthUserResponse,
} from '@/types/auth'

export type LoginPayload = {
  email: string
  password: string
}

function parseAuthSession(payload: AuthUserResponse['data']): AuthSession {
  return {
    user: parseAppUser(payload.user),
    company: payload.company ?? null,
  }
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const { data } = await api.post<AuthUserResponse>('/auth/login', payload)
  return parseAuthSession(data.data)
}

export async function loginWithGoogle(idToken: string): Promise<AuthSession> {
  const { data } = await api.post<AuthUserResponse>('/auth/google', { id_token: idToken })
  return parseAuthSession(data.data)
}

export async function logout() {
  await api.post<AuthMessageResponse>('/auth/logout')
}

export async function getCurrentUser(): Promise<AuthSession> {
  const { data } = await api.get<AuthUserResponse>('/auth/me')
  return parseAuthSession(data.data)
}

export type { AuthCompany, AuthSession }
