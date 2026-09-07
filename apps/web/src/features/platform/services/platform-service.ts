import { api } from '@/lib/api'

export type PlatformAdmin = {
  id: number
  email: string
  name: string
}

export type PlatformCompany = {
  id: number
  slug: string
  name: string
  dbName: string
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED'
  createdAt: string | null
  updatedAt: string | null
}

export async function platformLogin(email: string, password: string) {
  const { data } = await api.post<{ data: { admin: PlatformAdmin } }>('/platform/auth/login', {
    email,
    password,
  })
  return data.data.admin
}

export async function platformLogout() {
  await api.post('/platform/auth/logout')
}

export async function getPlatformMe() {
  const { data } = await api.get<{ data: { admin: PlatformAdmin } }>('/platform/auth/me')
  return data.data.admin
}

export async function listCompanies() {
  const { data } = await api.get<{ data: { companies: PlatformCompany[] } }>('/platform/companies')
  return data.data.companies
}

export async function createCompany(payload: {
  slug: string
  name: string
  admin_email: string
  admin_password: string
  admin_name: string
}) {
  const { data } = await api.post<{
    data: {
      email: string
      slug: string
      message: string
      debugCode?: string
      emailDelivered?: boolean
      emailError?: string
    }
  }>('/platform/companies', payload)
  return data.data
}

export async function confirmCompany(email: string, code: string) {
  const { data } = await api.post<{ data: { company: PlatformCompany } }>(
    '/platform/companies/confirm',
    { email, code }
  )
  return data.data.company
}

export async function resendCompanyOtp(email: string) {
  const { data } = await api.post<{
    data: {
      email: string
      slug: string
      message: string
      debugCode?: string
      emailDelivered?: boolean
      emailError?: string
    }
  }>('/platform/companies/resend-otp', { email })
  return data.data
}

export async function retryCompanyOtp(companyId: number) {
  const { data } = await api.post<{
    data: {
      email: string
      slug: string
      message: string
      debugCode?: string
      emailDelivered?: boolean
      emailError?: string
    }
  }>(`/platform/companies/${companyId}/retry-otp`)
  return data.data
}

export async function updateCompanyStatus(id: number, status: 'ACTIVE' | 'SUSPENDED') {
  const { data } = await api.patch<{ data: { company: PlatformCompany } }>(
    `/platform/companies/${id}/status`,
    { status }
  )
  return data.data.company
}
