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

export type ElectronBridge = {
  printing: ElectronPrintingApi
  updates?: ElectronUpdatesApi
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
