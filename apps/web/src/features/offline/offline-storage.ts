import { getElectronOfflineApi, isElectronOfflineAvailable } from '@/lib/electron-bridge'
import {
  idbDeleteOperation,
  idbHasPending,
  idbListOperations,
  idbReadCatalog,
  idbReadOperation,
  idbWriteCatalog,
  idbWriteOperation,
} from '@/features/offline/offline-idb-store'
import type { OfflineCatalogSnapshot, OfflineOperation } from '@/features/offline/types'

function useElectron(): boolean {
  return isElectronOfflineAvailable()
}

export async function writeOfflineCatalogSnapshot(catalog: OfflineCatalogSnapshot): Promise<void> {
  const json = JSON.stringify(catalog)
  if (useElectron()) {
    await getElectronOfflineApi()!.writeCatalog(json)
    return
  }
  await idbWriteCatalog(json)
}

export async function readOfflineCatalogSnapshot(): Promise<OfflineCatalogSnapshot | null> {
  const raw = useElectron()
    ? await getElectronOfflineApi()!.readCatalog()
    : await idbReadCatalog()
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as OfflineCatalogSnapshot
  } catch {
    return null
  }
}

export async function listOfflineOperationFileNames(): Promise<string[]> {
  if (useElectron()) {
    return getElectronOfflineApi()!.listOperations()
  }
  return idbListOperations()
}

export async function writeOfflineOperationFile(
  fileName: string,
  operation: OfflineOperation
): Promise<void> {
  const json = JSON.stringify(operation)
  if (useElectron()) {
    await getElectronOfflineApi()!.writeOperation(fileName, json)
    return
  }
  await idbWriteOperation(fileName, json)
}

export async function readOfflineOperationFile(
  fileName: string
): Promise<OfflineOperation | null> {
  const raw = useElectron()
    ? await getElectronOfflineApi()!.readOperation(fileName)
    : await idbReadOperation(fileName)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as OfflineOperation
  } catch {
    return null
  }
}

export async function deleteOfflineOperationFile(fileName: string): Promise<boolean> {
  if (useElectron()) {
    return getElectronOfflineApi()!.deleteOperation(fileName)
  }
  return idbDeleteOperation(fileName)
}

export async function hasPendingOfflineOperations(): Promise<boolean> {
  if (useElectron()) {
    return getElectronOfflineApi()!.hasPending()
  }
  return idbHasPending()
}

export function createOfflineClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `off${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function operationFileName(operation: OfflineOperation): string {
  switch (operation.type) {
    case 'sale':
      return `venta-${operation.offline_client_id}.json`
    case 'return':
      return `devolucion-${operation.offline_client_id}.json`
    case 'transition':
      return `estado-${operation.offline_client_id}.json`
    case 'close_shift':
      return `cierre-turno.json`
  }
}
