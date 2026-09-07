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
    data: { message: string; company: PlatformCompany }
  }>('/platform/companies', payload)
  return data.data.company
}

export async function retryCompanyProvision(
  companyId: number,
  payload: { admin_email: string; admin_password: string; admin_name?: string }
) {
  const { data } = await api.post<{
    data: { message: string; company: PlatformCompany }
  }>(`/platform/companies/${companyId}/retry`, payload)
  return data.data.company
}

export async function updateCompanyStatus(id: number, status: 'ACTIVE' | 'SUSPENDED') {
  const { data } = await api.patch<{ data: { company: PlatformCompany } }>(
    `/platform/companies/${id}/status`,
    { status }
  )
  return data.data.company
}

/** Irreversible: DROP tenant DB + directory + uploads. confirmSlug must match company.slug. */
export async function destroyCompany(id: number, confirmSlug: string) {
  const { data } = await api.delete<{
    data: {
      message: string
      deleted: { id: number; slug: string; dbName: string | null }
    }
  }>(`/platform/companies/${id}`, {
    data: { confirm_slug: confirmSlug },
  })
  return data.data
}
