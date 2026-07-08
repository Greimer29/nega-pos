import { useCallback, useEffect, useState } from 'react'
import {
  getPrintConfig,
  isPrintingAvailable,
  listPrinters,
  printTestDocument,
  savePrintConfig,
} from '@/features/printing/services/printing-service'
import {
  DEFAULT_PRINT_CONFIG,
  PRINT_DOCUMENT_LABELS,
  type PrintConfig,
  type PrintDocumentKind,
  type PrinterInfo,
} from '@/features/printing/types'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { businessProfileToPrintBusiness } from '@/features/branding/business-theme-provider'
import { fetchBusinessProfile } from '@/features/settings/services/general-settings-service'
import { getApiErrorMessage } from '@/lib/api-error'

export function usePrintSettingsPanel() {
  const { can } = useAuth()
  const canEdit = can('settings.edit')
  const [electronAvailable, setElectronAvailable] = useState(false)
  const [refreshingPrinters, setRefreshingPrinters] = useState(false)

  const [config, setConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingKind, setTestingKind] = useState<PrintDocumentKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPrinters = useCallback(async () => {
    if (!isPrintingAvailable()) {
      setPrinters([])
      return []
    }
    const loadedPrinters = await listPrinters()
    setPrinters(loadedPrinters)
    return loadedPrinters
  }, [])

  useEffect(() => {
    setElectronAvailable(isPrintingAvailable())
  }, [])

  useEffect(() => {
    if (!electronAvailable) {
      return
    }

    function refreshOnReturn() {
      if (document.visibilityState === 'visible') {
        void loadPrinters()
      }
    }

    document.addEventListener('visibilitychange', refreshOnReturn)
    window.addEventListener('focus', refreshOnReturn)

    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn)
      window.removeEventListener('focus', refreshOnReturn)
    }
  }, [electronAvailable, loadPrinters])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [loadedConfig, profile] = await Promise.all([getPrintConfig(), fetchBusinessProfile()])
        const business = businessProfileToPrintBusiness(profile)
        const loadedPrinters = electronAvailable ? await loadPrinters() : []
        if (!cancelled) {
          setConfig({
            ...loadedConfig,
            business,
          })
          setPrinters(loadedPrinters)
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
  }, [electronAvailable, loadPrinters])

  async function handleRefreshPrinters() {
    setRefreshingPrinters(true)
    setError(null)
    try {
      const loadedPrinters = await loadPrinters()
      if (loadedPrinters.length === 0) {
        setMessage(null)
        setError(
          'No se encontraron impresoras. Confirmá que estás en la app de escritorio (no en el navegador) y que Windows tiene impresoras instaladas.'
        )
      } else {
        setMessage(`${loadedPrinters.length} impresora(s) detectada(s).`)
      }
    } catch (refreshError) {
      setError(getApiErrorMessage(refreshError))
    } finally {
      setRefreshingPrinters(false)
    }
  }

  function updateDocument(
    kind: PrintDocumentKind,
    patch: Partial<PrintConfig['documents'][typeof kind]>
  ) {
    setConfig((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [kind]: {
          ...current.documents[kind],
          ...patch,
        },
      },
    }))
  }

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const profile = await fetchBusinessProfile()
      const business = businessProfileToPrintBusiness(profile)
      const saved = await savePrintConfig({ ...config, business })
      setConfig(saved)
      setMessage('Configuración guardada.')
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  async function handleTestPrint(kind: PrintDocumentKind) {
    setTestingKind(kind)
    setMessage(null)
    setError(null)
    try {
      await printTestDocument(kind)
      setMessage(`Impresión de prueba enviada (${PRINT_DOCUMENT_LABELS[kind]}).`)
    } catch (testError) {
      setError(getApiErrorMessage(testError))
    } finally {
      setTestingKind(null)
    }
  }

  return {
    canEdit,
    config,
    setConfig,
    printers,
    loading,
    saving,
    testingKind,
    message,
    error,
    electronAvailable,
    refreshingPrinters,
    updateDocument,
    handleRefreshPrinters,
    handleSave,
    handleTestPrint,
  }
}
