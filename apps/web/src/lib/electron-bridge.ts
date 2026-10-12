import type { PrintConfig } from '@/features/printing/types'

export type ElectronPrinterInfo = {
  name: string
  isDefault: boolean
  status?: number
}

export type ElectronPrintHtmlOptions = {
  html: string
  deviceName: string
  paperWidthMm?: number
  jobName?: string
}

export type ElectronPrintingApi = {
  isAvailable: true
  listPrinters: () => Promise<ElectronPrinterInfo[]>
  /** @deprecated Prefer API print config. */
  getConfig: () => Promise<PrintConfig>
  getLocalConfig?: () => Promise<PrintConfig | null>
  getConfigPath: () => Promise<string>
  isMigrated?: () => Promise<boolean>
  markMigrated?: () => Promise<void>
  /** @deprecated Prefer API print config. */
  saveConfig: (config: PrintConfig) => Promise<PrintConfig>
  printHtml: (options: ElectronPrintHtmlOptions) => Promise<void>
}

export type ElectronUpdateProgress = {
  receivedBytes: number
  totalBytes: number | null
  percent: number | null
}

export type ElectronUpdatesApi = {
  isAvailable: true
  downloadAndInstall: (downloadUrl: string) => Promise<{ path: string; fileName: string }>
  onProgress: (listener: (progress: ElectronUpdateProgress) => void) => () => void
}

export type ElectronOfflineApi = {
  isAvailable: true
  getRootPath: () => Promise<string>
  writeCatalog: (json: string) => Promise<void>
  readCatalog: () => Promise<string | null>
  listOperations: () => Promise<string[]>
  writeOperation: (fileName: string, json: string) => Promise<void>
  readOperation: (fileName: string) => Promise<string | null>
  deleteOperation: (fileName: string) => Promise<boolean>
  hasPending: () => Promise<boolean>
}

export type ElectronBridge = {
  /** Versión del paquete Electron (`app.getVersion()`), fuente de verdad en desktop. */
  appVersion?: string
  printing: ElectronPrintingApi
  updates?: ElectronUpdatesApi
  offline?: ElectronOfflineApi
}

export function getElectronAppVersion(): string | null {
  const version = typeof window !== 'undefined' ? window.negaPos?.appVersion?.trim() : undefined
  return version || null
}

export function isElectronPrintingAvailable(): boolean {
  return typeof window !== 'undefined' && window.negaPos?.printing?.isAvailable === true
}

export function getElectronPrintingApi(): ElectronPrintingApi | null {
  if (!isElectronPrintingAvailable()) {
    return null
  }
  return window.negaPos!.printing
}

export function isElectronUpdatesAvailable(): boolean {
  return typeof window !== 'undefined' && window.negaPos?.updates?.isAvailable === true
}

export function getElectronUpdatesApi(): ElectronUpdatesApi | null {
  if (!isElectronUpdatesAvailable()) {
    return null
  }
  return window.negaPos!.updates!
}

export function isElectronOfflineAvailable(): boolean {
  return typeof window !== 'undefined' && window.negaPos?.offline?.isAvailable === true
}

export function getElectronOfflineApi(): ElectronOfflineApi | null {
  if (!isElectronOfflineAvailable()) {
    return null
  }
  return window.negaPos!.offline!
}
