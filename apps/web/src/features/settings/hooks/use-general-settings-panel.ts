import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { applyBusinessPalette } from '@/features/branding/apply-business-palette'
import {
  businessProfileQueryKey,
  useBusinessProfileQuery,
} from '@/features/branding/business-theme-provider'
import { useCanEditSettings } from '@/features/settings/hooks/use-can-edit-settings'
import {
  deleteBusinessLogo,
  saveBusinessProfile,
  uploadBusinessLogo,
} from '@/features/settings/services/general-settings-service'
import {
  DEFAULT_BUSINESS_PALETTE,
  DEFAULT_BUSINESS_PROFILE,
  type BusinessProfile,
  type BusinessProfileInput,
} from '@/features/settings/types/general-settings'
import { notifyApiError } from '@/features/notifications/query-error-state'

export function useGeneralSettingsPanel() {
  const canEdit = useCanEditSettings()
  const queryClient = useQueryClient()
  const {
    data: remoteProfile,
    isLoading: queryLoading,
    isError: queryIsError,
    error: queryError,
    refetch,
  } = useBusinessProfileQuery()

  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [logoVersion, setLogoVersion] = useState(0)

  useEffect(() => {
    if (remoteProfile) {
      setProfile(remoteProfile)
      applyBusinessPalette(remoteProfile)
    }
  }, [remoteProfile])

  useEffect(() => {
    if (queryIsError && queryError) {
      notifyApiError(queryError, 'No se pudo cargar la configuración general')
    }
  }, [queryIsError, queryError])

  async function handleSave() {
    setSaving(true)
    setMessage(null)

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
      queryClient.setQueryData(businessProfileQueryKey, saved)
      setMessage('Configuración general guardada.')
    } catch (saveError) {
      notifyApiError(saveError, 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true)
    setMessage(null)

    try {
      const saved = await uploadBusinessLogo(file)
      setProfile(saved)
      setLogoVersion(Date.now())
      queryClient.setQueryData(businessProfileQueryKey, saved)
      setMessage('Logo actualizado.')
    } catch (uploadError) {
      notifyApiError(uploadError, 'No se pudo subir el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleLogoDelete() {
    if (!profile.has_logo) return
    if (!window.confirm('¿Eliminar el logo del negocio?')) return

    setUploadingLogo(true)
    setMessage(null)

    try {
      const saved = await deleteBusinessLogo()
      setProfile(saved)
      setLogoVersion(Date.now())
      queryClient.setQueryData(businessProfileQueryKey, saved)
      setMessage('Logo eliminado.')
    } catch (deleteError) {
      notifyApiError(deleteError, 'No se pudo eliminar el logo')
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
    loading: queryLoading && !remoteProfile,
    saving,
    uploadingLogo,
    message,
    logoVersion,
    handleSave,
    handleLogoUpload,
    handleLogoDelete,
    resetPalette,
    refetch,
  }
}
