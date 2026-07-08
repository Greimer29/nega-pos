import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { applyBusinessPalette } from '@/features/branding/apply-business-palette'
import { businessProfileQueryKey } from '@/features/branding/business-theme-provider'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  deleteBusinessLogo,
  fetchBusinessProfile,
  saveBusinessProfile,
  uploadBusinessLogo,
} from '@/features/settings/services/general-settings-service'
import {
  DEFAULT_BUSINESS_PALETTE,
  DEFAULT_BUSINESS_PROFILE,
  type BusinessProfile,
  type BusinessProfileInput,
} from '@/features/settings/types/general-settings'
import { getApiErrorMessage } from '@/lib/api-error'
import { getPrintConfig, isPrintingAvailable, savePrintConfig } from '@/features/printing/services/printing-service'
import { businessProfileToPrintBusiness } from '@/features/branding/business-theme-provider'

export function useGeneralSettingsPanel() {
  const { can } = useAuth()
  const canEdit = can('settings.edit')
  const queryClient = useQueryClient()

  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logoVersion, setLogoVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const loaded = await fetchBusinessProfile()
        if (!cancelled) {
          setProfile(loaded)
          applyBusinessPalette(loaded)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function syncPrintConfigBusiness(next: BusinessProfile) {
    if (!isPrintingAvailable()) {
      return
    }

    const config = await getPrintConfig()
    const business = businessProfileToPrintBusiness(next)
    await savePrintConfig({
      ...config,
      business: {
        name: business.name,
        subtitle: business.subtitle,
        footer: business.footer,
        legalName: business.legalName,
        rif: business.rif,
        address: business.address,
        phone: business.phone,
        email: business.email,
        website: business.website,
        hasLogo: business.hasLogo,
        logoUrl: business.logoUrl,
      },
    })
  }

  async function handleSave() {
    if (!canEdit) return

    setSaving(true)
    setMessage(null)
    setError(null)

    const payload: BusinessProfileInput = {
      trade_name: profile.trade_name.trim(),
      tagline: profile.tagline.trim(),
      ticket_footer: profile.ticket_footer.trim(),
      legal_name: profile.legal_name.trim(),
      rif: profile.rif.trim(),
      address: profile.address.trim(),
      phone: profile.phone.trim(),
      email: profile.email.trim(),
      website: profile.website.trim(),
      use_custom_palette: profile.use_custom_palette,
      palette: profile.palette,
    }

    try {
      const saved = await saveBusinessProfile(payload)
      setProfile(saved)
      applyBusinessPalette(saved)
      await syncPrintConfigBusiness(saved)
      void queryClient.invalidateQueries({ queryKey: businessProfileQueryKey })
      setMessage('Configuración general guardada.')
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!canEdit) return

    setUploadingLogo(true)
    setMessage(null)
    setError(null)

    try {
      const saved = await uploadBusinessLogo(file)
      setProfile(saved)
      setLogoVersion(Date.now())
      await syncPrintConfigBusiness(saved)
      void queryClient.invalidateQueries({ queryKey: businessProfileQueryKey })
      setMessage('Logo actualizado.')
    } catch (uploadError) {
      setError(getApiErrorMessage(uploadError))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleLogoDelete() {
    if (!canEdit || !profile.has_logo) return
    if (!window.confirm('¿Eliminar el logo del negocio?')) return

    setUploadingLogo(true)
    setMessage(null)
    setError(null)

    try {
      const saved = await deleteBusinessLogo()
      setProfile(saved)
      setLogoVersion(Date.now())
      await syncPrintConfigBusiness(saved)
      void queryClient.invalidateQueries({ queryKey: businessProfileQueryKey })
      setMessage('Logo eliminado.')
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError))
    } finally {
      setUploadingLogo(false)
    }
  }

  function resetPalette() {
    setProfile((current) => ({
      ...current,
      palette: { ...DEFAULT_BUSINESS_PALETTE },
    }))
  }

  return {
    canEdit,
    profile,
    setProfile,
    loading,
    saving,
    uploadingLogo,
    message,
    error,
    logoVersion,
    handleSave,
    handleLogoUpload,
    handleLogoDelete,
    resetPalette,
  }
}
