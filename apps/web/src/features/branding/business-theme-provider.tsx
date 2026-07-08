import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { applyBusinessPalette } from '@/features/branding/apply-business-palette'
import {
  businessLogoUrl,
  fetchBusinessProfile,
} from '@/features/settings/services/general-settings-service'
import { DEFAULT_BUSINESS_PROFILE } from '@/features/settings/types/general-settings'
import { useAuth } from '@/features/auth/hooks/use-auth'

export const businessProfileQueryKey = ['settings', 'general'] as const

export function useBusinessProfileQuery(enabled = true) {
  return useQuery({
    queryKey: businessProfileQueryKey,
    queryFn: fetchBusinessProfile,
    enabled,
    staleTime: 60_000,
    placeholderData: DEFAULT_BUSINESS_PROFILE,
  })
}

export function BusinessThemeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { data } = useBusinessProfileQuery(isAuthenticated)

  useEffect(() => {
    applyBusinessPalette(data ?? null)
  }, [data])

  return children
}

export function businessProfileToPrintBusiness(profile: {
  trade_name: string
  tagline: string
  ticket_footer: string
  legal_name?: string
  rif?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  has_logo?: boolean
}) {
  const hasLogo = profile.has_logo ?? false

  return {
    name: profile.trade_name,
    subtitle: profile.tagline,
    footer: profile.ticket_footer,
    legalName: profile.legal_name ?? '',
    rif: profile.rif ?? '',
    address: profile.address ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    website: profile.website ?? '',
    hasLogo,
    logoUrl: hasLogo ? businessLogoUrl() : undefined,
  }
}
