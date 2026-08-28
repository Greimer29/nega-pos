import { contextBridge, ipcRenderer } from 'electron'
import type { PrintConfig } from './print-config'
import type { PrinterInfo, PrintHtmlOptions } from './print-service'

const printingApi = {
  isAvailable: true as const,
  listPrinters: (): Promise<PrinterInfo[]> => ipcRenderer.invoke('printing:listPrinters'),
  /** @deprecated Prefer API print config. */
  getConfig: (): Promise<PrintConfig> => ipcRenderer.invoke('printing:getConfig'),
  getLocalConfig: (): Promise<PrintConfig | null> => ipcRenderer.invoke('printing:getLocalConfig'),
  getConfigPath: (): Promise<string> => ipcRenderer.invoke('printing:getConfigPath'),
  isMigrated: (): Promise<boolean> => ipcRenderer.invoke('printing:isMigrated'),
  markMigrated: (): Promise<void> => ipcRenderer.invoke('printing:markMigrated'),
  /** @deprecated Prefer API print config. */
  saveConfig: (config: PrintConfig): Promise<PrintConfig> =>
    ipcRenderer.invoke('printing:saveConfig', config),
  printHtml: (options: PrintHtmlOptions): Promise<void> =>
    ipcRenderer.invoke('printing:printHtml', options),
}

contextBridge.exposeInMainWorld('negaPos', {
  printing: printingApi,
})
