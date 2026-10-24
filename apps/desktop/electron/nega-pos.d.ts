import type { PrintConfig } from './print-config'
import type { PrinterInfo, PrintHtmlOptions } from './print-service'

export type NegaPosPrintingApi = {
  isAvailable: true
  listPrinters: () => Promise<PrinterInfo[]>
  /** @deprecated Prefer API print config. */
  getConfig: () => Promise<PrintConfig>
  getLocalConfig: () => Promise<PrintConfig | null>
  getConfigPath: () => Promise<string>
  isMigrated: () => Promise<boolean>
  markMigrated: () => Promise<void>
  /** @deprecated Prefer API print config. */
  saveConfig: (config: PrintConfig) => Promise<PrintConfig>
  printHtml: (options: PrintHtmlOptions) => Promise<void>
}

export type NegaPosFilesApi = {
  isAvailable: true
  saveQuotePdf: (fileName: string, data: Uint8Array) => Promise<{ path: string; fileName: string }>
}

export type NegaPosBridge = {
  printing: NegaPosPrintingApi
  files?: NegaPosFilesApi
}

declare global {
  interface Window {
    negaPos?: NegaPosBridge
  }
}

export {}
