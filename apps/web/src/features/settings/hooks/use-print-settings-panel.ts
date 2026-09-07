import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isPrintingAvailable,
  listPrinters,
  loadPrintConfigWithMigration,
  printTestDocument,
  savePrintConfig,
} from '@/features/printing/services/printing-service'
import { sanitizeComandaRoutingRules } from '@/features/printing/utils/comanda-routing'
import {
  DEFAULT_PRINT_CONFIG,
  PRINT_DOCUMENT_LABELS,
  type PrintConfig,
  type PrintDocumentKind,
  type PrintFormatRecord,
  type PrinterInfo,
} from '@/features/printing/types'
import { upsertFormat } from '@/features/printing/utils/print-formats'
import { useCanEditSettings } from '@/features/settings/hooks/use-can-edit-settings'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'

/** Qué parte del print-config actualiza cada panel al guardar. */
export type PrintSaveScope = 'formats' | 'devices'

function buildSavePayload(scope: PrintSaveScope, draft: PrintConfig) {
  const sanitizedRouting = {
    ...draft.categoryRouting,
    comanda: {
      ...draft.categoryRouting.comanda,
      rules: sanitizeComandaRoutingRules(draft.categoryRouting.comanda.rules),
    },
  }

  if (scope === 'formats') {
    return {
      scope: 'formats' as const,
      formats: draft.formats,
      documents: draft.documents,
    }
  }

  return {
    scope: 'devices' as const,
    ticket: draft.ticket,
    documents: draft.documents,
    behavior: draft.behavior,
    categoryRouting: sanitizedRouting,
  }
}

export function usePrintSettingsPanel() {
  const canEdit = useCanEditSettings()
  const [electronAvailable, setElectronAvailable] = useState(() => isPrintingAvailable())
  const [refreshingPrinters, setRefreshingPrinters] = useState(false)

  const [config, setConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG)
  const configRef = useRef(config)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)

  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingKind, setTestingKind] = useState<PrintDocumentKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    setIsDirty(true)
  }, [])

  const clearDirty = useCallback(() => {
    dirtyRef.current = false
    setIsDirty(false)
  }, [])

  const updateConfig = useCallback(
    (updater: PrintConfig | ((current: PrintConfig) => PrintConfig), options?: { dirty?: boolean }) => {
      setConfig((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        configRef.current = next
        return next
      })
      if (options?.dirty !== false) {
        markDirty()
      }
    },
    [markDirty]
  )

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
      try {
        const [{ printConfig: loadedConfig }, loadedPrinters] = await Promise.all([
          loadPrintConfigWithMigration(),
          electronAvailable ? loadPrinters() : Promise.resolve([] as PrinterInfo[]),
        ])
        if (cancelled) {
          return
        }

        if (dirtyRef.current || savingRef.current) {
          setPrinters(loadedPrinters)
          return
        }

        const next: PrintConfig = {
          ...loadedConfig,
          categoryRouting: {
            ...loadedConfig.categoryRouting,
            comanda: {
              ...loadedConfig.categoryRouting.comanda,
              rules: sanitizeComandaRoutingRules(loadedConfig.categoryRouting.comanda.rules),
            },
          },
        }
        configRef.current = next
        setConfig(next)
        clearDirty()
        setPrinters(loadedPrinters)
      } catch (loadError) {
        if (!cancelled) {
          notifyApiError(loadError, 'No se pudo cargar la configuración de impresión')
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
  }, [clearDirty, electronAvailable, loadPrinters])

  async function handleRefreshPrinters() {
    setRefreshingPrinters(true)
    try {
      const loadedPrinters = await loadPrinters()
      if (loadedPrinters.length === 0) {
        setMessage(null)
        toast.warning(
          'Confirmá que estás en la app de escritorio (no en el navegador) y que Windows tiene impresoras instaladas.',
          'No se encontraron impresoras'
        )
      } else {
        setMessage(`${loadedPrinters.length} impresora(s) detectada(s).`)
      }
    } catch (refreshError) {
      notifyApiError(refreshError, 'No se pudieron listar las impresoras')
    } finally {
      setRefreshingPrinters(false)
    }
  }

  function updateDocument(
    kind: PrintDocumentKind,
    patch: Partial<PrintConfig['documents'][typeof kind]>
  ) {
    updateConfig((current) => ({
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

  async function persistDraft(scope: PrintSaveScope, draft: PrintConfig): Promise<PrintConfig> {
    savingRef.current = true
    const saved = await savePrintConfig(buildSavePayload(scope, draft))
    configRef.current = saved
    setConfig(saved)
    clearDirty()
    return saved
  }

  async function handleSave(scope: PrintSaveScope) {
    setSaving(true)
    setMessage(null)
    try {
      await persistDraft(scope, configRef.current)
      setMessage(
        scope === 'formats'
          ? 'Formatos guardados en el servidor.'
          : 'Configuración guardada en el servidor.'
      )
    } catch (saveError) {
      notifyApiError(saveError, 'No se pudo guardar la configuración')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function persistFormat(nextFormat: PrintFormatRecord): Promise<void> {
    setSaving(true)
    setMessage(null)
    try {
      const draft: PrintConfig = {
        ...configRef.current,
        formats: upsertFormat(configRef.current.formats, nextFormat),
        documents: {
          ...configRef.current.documents,
          [nextFormat.documentKind]: {
            ...configRef.current.documents[nextFormat.documentKind],
            paperWidthMm: nextFormat.paperWidthMm,
          },
        },
      }
      configRef.current = draft
      setConfig(draft)
      markDirty()

      await persistDraft('formats', draft)
      setMessage('Formato guardado en el servidor.')
    } catch (saveError) {
      notifyApiError(saveError, 'No se pudo guardar el formato')
      throw saveError
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function handleTestPrint(kind: PrintDocumentKind) {
    setTestingKind(kind)
    setMessage(null)
    try {
      await printTestDocument(kind)
      setMessage(`Impresión de prueba enviada (${PRINT_DOCUMENT_LABELS[kind]}).`)
    } catch (testError) {
      notifyApiError(testError, 'No se pudo imprimir la prueba')
    } finally {
      setTestingKind(null)
    }
  }

  return {
    canEdit,
    config,
    setConfig: updateConfig,
    printers,
    loading,
    saving,
    testingKind,
    message,
    isDirty,
    electronAvailable,
    refreshingPrinters,
    updateDocument,
    handleRefreshPrinters,
    handleSave,
    persistFormat,
    handleTestPrint,
  }
}
