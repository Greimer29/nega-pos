import { contextBridge, ipcRenderer } from 'electron'
import type { PrintConfig } from './print-config'
import type { PrinterInfo, PrintHtmlOptions } from './print-service'

const printingApi = {
  isAvailable: true as const,
  listPrinters: (): Promise<PrinterInfo[]> => ipcRenderer.invoke('printing:listPrinters'),
  getConfig: (): Promise<PrintConfig> => ipcRenderer.invoke('printing:getConfig'),
  saveConfig: (config: PrintConfig): Promise<PrintConfig> =>
    ipcRenderer.invoke('printing:saveConfig', config),
  printHtml: (options: PrintHtmlOptions): Promise<void> =>
    ipcRenderer.invoke('printing:printHtml', options),
}

contextBridge.exposeInMainWorld('negaPos', {
  printing: printingApi,
})
