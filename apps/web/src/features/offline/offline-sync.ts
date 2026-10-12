import {
  fetchOfflineCatalog,
  syncOfflineCloseShift,
  syncOfflineReturn,
  syncOfflineSale,
  syncOfflineTransition,
} from '@/features/offline/offline-api'
import {
  deleteOfflineOperationFile,
  hasPendingOfflineOperations,
  listOfflineOperationFileNames,
  readOfflineOperationFile,
  writeOfflineCatalogSnapshot,
} from '@/features/offline/offline-storage'

export type OfflineSyncResult = {
  synced: number
  failed: Array<{ fileName: string; message: string }>
  catalogRefreshed: boolean
}

function sortOperations(fileNames: string[]): string[] {
  const rank = (name: string) => {
    if (name.startsWith('venta-')) return 0
    if (name.startsWith('devolucion-')) return 1
    if (name.startsWith('estado-')) return 2
    if (name === 'cierre-turno.json') return 3
    return 4
  }
  return [...fileNames].sort((a, b) => {
    const diff = rank(a) - rank(b)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
}

export async function refreshOfflineCatalog(options?: {
  force?: boolean
}): Promise<boolean> {
  if (!options?.force && (await hasPendingOfflineOperations())) {
    return false
  }
  const catalog = await fetchOfflineCatalog()
  await writeOfflineCatalogSnapshot(catalog)
  return true
}

export async function syncPendingOfflineOperations(): Promise<OfflineSyncResult> {
  const files = sortOperations(await listOfflineOperationFileNames())
  const failed: Array<{ fileName: string; message: string }> = []
  let synced = 0

  for (const fileName of files) {
    const operation = await readOfflineOperationFile(fileName)
    if (!operation) {
      failed.push({ fileName, message: 'Archivo ilegible' })
      continue
    }

    try {
      if (operation.type === 'sale') {
        await syncOfflineSale(operation)
      } else if (operation.type === 'return') {
        await syncOfflineReturn({
          sale_id: operation.sale_id,
          lines: operation.lines,
        })
      } else if (operation.type === 'transition') {
        await syncOfflineTransition({
          sale_id: operation.sale_id,
          order_status: operation.order_status,
        })
      } else if (operation.type === 'close_shift') {
        await syncOfflineCloseShift(operation.sales_shift_id)
      }
      await deleteOfflineOperationFile(fileName)
      synced += 1
    } catch (error) {
      failed.push({
        fileName,
        message: error instanceof Error ? error.message : 'Error al sincronizar',
      })
    }
  }

  let catalogRefreshed = false
  if (failed.length === 0) {
    try {
      catalogRefreshed = await refreshOfflineCatalog({ force: true })
    } catch {
      catalogRefreshed = false
    }
  }

  return { synced, failed, catalogRefreshed }
}
