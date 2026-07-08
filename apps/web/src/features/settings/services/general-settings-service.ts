import type {
  BusinessProfile,
  BusinessProfileInput,
} from '@/features/settings/types/general-settings'
import { api, getApiV1BaseUrl } from '@/lib/api'

type GeneralSettingsResponse = {
  data: {
    business_profile: BusinessProfile
  }
}

export async function fetchBusinessProfile(): Promise<BusinessProfile> {
  const { data } = await api.get<GeneralSettingsResponse>('/settings/general')
  return data.data.business_profile
}

export async function saveBusinessProfile(input: BusinessProfileInput): Promise<BusinessProfile> {
  const { data } = await api.put<GeneralSettingsResponse>('/settings/general', input)
  return data.data.business_profile
}

export async function uploadBusinessLogo(file: File): Promise<BusinessProfile> {
  const formData = new FormData()
  formData.append('logo', file)

  const { data } = await api.post<GeneralSettingsResponse>('/settings/general/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data.business_profile
}

export async function deleteBusinessLogo(): Promise<BusinessProfile> {
  const { data } = await api.delete<GeneralSettingsResponse>('/settings/general/logo')
  return data.data.business_profile
}

export function businessLogoUrl(cacheBust?: string | number): string {
  const base = `${getApiV1BaseUrl()}/settings/general/logo`
  return cacheBust != null ? `${base}?v=${cacheBust}` : base
}
