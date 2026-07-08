import type { PrintConfig } from './print-config'
import type { PrinterInfo, PrintHtmlOptions } from './print-service'

export type NegaPosPrintingApi = {
  isAvailable: true
  listPrinters: () => Promise<PrinterInfo[]>
  getConfig: () => Promise<PrintConfig>
  saveConfig: (config: PrintConfig) => Promise<PrintConfig>
  printHtml: (options: PrintHtmlOptions) => Promise<void>
}

export type NegaPosBridge = {
  printing: NegaPosPrintingApi
}

declare global {
  interface Window {
    negaPos?: NegaPosBridge
  }
}

export {}
