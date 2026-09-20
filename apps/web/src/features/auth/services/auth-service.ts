import axios from 'axios'
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
  company_slug?: string
}

export class CompanySelectionRequiredError extends Error {
  companies: AuthCompany[]

  constructor(companies: AuthCompany[]) {
    super('Elegí la empresa a la que querés entrar')
    this.name = 'CompanySelectionRequiredError'
    this.companies = companies
  }
}

function parseAuthSession(payload: AuthUserResponse['data']): AuthSession {
  return {
    user: parseAppUser(payload.user),
    company: payload.company ?? null,
  }
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  try {
    const { data } = await api.post<AuthUserResponse>('/auth/login', payload)
    return parseAuthSession(data.data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error?.code === 'COMPANY_SELECTION_REQUIRED') {
      const companies = (error.response.data.error.companies ?? []) as AuthCompany[]
      throw new CompanySelectionRequiredError(companies)
    }
    throw error
  }
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
