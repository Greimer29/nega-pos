import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { api } from '@/lib/api'
import {
  createOfflineClientId,
  operationFileName,
  readOfflineCatalogSnapshot,
  writeOfflineOperationFile,
} from '@/features/offline/offline-storage'
import {
  countPendingOfflineOperations,
  listPendingOfflineSales,
  returnPendingOfflineSaleFully,
  returnPendingOfflineSalePartial,
  type PendingOfflineSale,
} from '@/features/offline/offline-queue'
import { refreshOfflineCatalog, syncPendingOfflineOperations } from '@/features/offline/offline-sync'
import type {
  OfflineCatalogSnapshot,
  OfflineSaleOperation,
  OfflineSalePaymentPayload,
} from '@/features/offline/types'

const LAST_SHIFT_KEY = 'nega-pos-offline-last-shift-id'
const STICKY_ENABLED_KEY = 'nega-pos-offline-sticky-enabled'

export type OfflineConnectivity = 'online' | 'offline' | 'checking'

function readStickyEnabled(): boolean {
  try {
    return localStorage.getItem(STICKY_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

function writeStickyEnabled(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.setItem(STICKY_ENABLED_KEY, '1')
    } else {
      localStorage.removeItem(STICKY_ENABLED_KEY)
    }
  } catch {
    // ignore
  }
}

export function useOfflinePos(options?: { salesShiftId?: number | null }) {
  const { company } = useAuth()
  const flagFromServer = Boolean(company?.offlineSalesEnabled)
  const [stickyEnabled, setStickyEnabled] = useState(() => readStickyEnabled())
  const [connectivity, setConnectivity] = useState<OfflineConnectivity>('checking')
  const [catalog, setCatalog] = useState<OfflineCatalogSnapshot | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingSales, setPendingSales] = useState<PendingOfflineSale[]>([])
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const offlineEnabled = flagFromServer || stickyEnabled

  const reloadCatalog = useCallback(async () => {
    const snapshot = await readOfflineCatalogSnapshot()
    setCatalog(snapshot)
  }, [])

  const reloadPending = useCallback(async () => {
    const [count, sales] = await Promise.all([
      countPendingOfflineOperations(),
      listPendingOfflineSales(),
    ])
    setPendingCount(count)
    setPendingSales(sales)
  }, [])

  const probeOnline = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectivity('offline')
      return false
    }
    try {
      await api.get('/auth/me', { timeout: 4000 })
      setConnectivity('online')
      return true
    } catch {
      setConnectivity('offline')
      return false
    }
  }, [])

  const refreshAndSync = useCallback(async () => {
    const pending = await countPendingOfflineOperations()
    if (!flagFromServer && !stickyEnabled && pending === 0) {
      return
    }
    const online = await probeOnline()
    if (!online) {
      await reloadCatalog()
      await reloadPending()
      return
    }

    try {
      const result = await syncPendingOfflineOperations()
      if (result.synced > 0) {
        setSyncMessage(`Sincronizadas ${result.synced} operación(es) offline.`)
      }
      if (result.failed.length > 0) {
        setSyncMessage(
          `No se pudieron sincronizar ${result.failed.length} archivo(s) offline.`
        )
      }
      if (result.synced === 0 && result.failed.length === 0 && flagFromServer) {
        await refreshOfflineCatalog()
      }
    } catch {
      // Keep local catalog if refresh fails.
    }

    const remaining = await countPendingOfflineOperations()
    if (!flagFromServer && remaining === 0) {
      writeStickyEnabled(false)
      setStickyEnabled(false)
    }

    await reloadCatalog()
    await reloadPending()
  }, [flagFromServer, stickyEnabled, probeOnline, reloadCatalog, reloadPending])

  useEffect(() => {
    if (flagFromServer) {
      writeStickyEnabled(true)
      setStickyEnabled(true)
    }
  }, [flagFromServer])

  useEffect(() => {
    if (options?.salesShiftId) {
      try {
        localStorage.setItem(LAST_SHIFT_KEY, String(options.salesShiftId))
      } catch {
        // ignore
      }
    }
  }, [options?.salesShiftId])

  useEffect(() => {
    void reloadCatalog()
    void reloadPending()
    if (!offlineEnabled) {
      setConnectivity(navigator.onLine ? 'online' : 'offline')
      return
    }

    void refreshAndSync()

    const onOnline = () => {
      void refreshAndSync()
    }
    const onOffline = () => {
      setConnectivity('offline')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const interval = window.setInterval(() => {
      void probeOnline().then((online) => {
        if (online) {
          void refreshAndSync()
        }
      })
    }, 30000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(interval)
    }
  }, [offlineEnabled, probeOnline, refreshAndSync, reloadCatalog, reloadPending])

  const canSellOffline = useMemo(
    () => offlineEnabled && connectivity === 'offline' && catalog !== null,
    [offlineEnabled, connectivity, catalog]
  )

  const persistOfflineSale = useCallback(
    async (input: {
      customerId: number | null
      guestName: string | null
      paymentType: 'CASH' | 'CREDIT'
      billingMode: 'FAST' | 'ORDER'
      discountUsd: number
      lines: OfflineSaleOperation['lines']
      payments?: OfflineSalePaymentPayload[]
      salesShiftId?: number | null
    }) => {
      if (!canSellOffline || !catalog) {
        throw new Error(
          offlineEnabled
            ? 'No hay copia local del catálogo. Abrí el POS con internet al menos una vez.'
            : 'La venta sin conexión no está habilitada para esta empresa.'
        )
      }

      let shiftId = input.salesShiftId ?? null
      if (!shiftId) {
        try {
          const stored = localStorage.getItem(LAST_SHIFT_KEY)
          shiftId = stored ? Number(stored) : null
          if (shiftId !== null && !Number.isFinite(shiftId)) {
            shiftId = null
          }
        } catch {
          shiftId = null
        }
      }

      const offlineClientId = createOfflineClientId()
      const localRef = `OFF-${offlineClientId.slice(0, 8).toUpperCase()}`
      const operation: OfflineSaleOperation = {
        type: 'sale',
        offline_client_id: offlineClientId,
        sold_at: new Date().toISOString(),
        sales_shift_id: shiftId,
        customer_id: input.customerId,
        guest_name: input.guestName,
        payment_type: input.paymentType,
        billing_mode: input.billingMode,
        discount_usd: input.discountUsd,
        payments: input.payments,
        lines: input.lines,
        local_ref: localRef,
      }

      await writeOfflineOperationFile(operationFileName(operation), operation)
      await reloadPending()
      return { localRef, offlineClientId, operation }
    },
    [canSellOffline, catalog, offlineEnabled, reloadPending]
  )

  const returnLocalSaleFully = useCallback(
    async (fileName: string) => {
      await returnPendingOfflineSaleFully(fileName)
      await reloadPending()
      await reloadCatalog()
    },
    [reloadPending, reloadCatalog]
  )

  const returnLocalSalePartial = useCallback(
    async (fileName: string, returns: Array<{ lineIndex: number; quantity: number }>) => {
      await returnPendingOfflineSalePartial(fileName, returns)
      await reloadPending()
      await reloadCatalog()
    },
    [reloadPending, reloadCatalog]
  )

  return {
    offlineEnabled,
    flagFromServer,
    connectivity,
    catalog,
    canSellOffline,
    pendingCount,
    pendingSales,
    syncMessage,
    clearSyncMessage: () => setSyncMessage(null),
    refreshAndSync,
    persistOfflineSale,
    returnLocalSaleFully,
    returnLocalSalePartial,
    reloadPending,
  }
}
