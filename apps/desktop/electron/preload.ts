import { contextBridge, ipcRenderer } from 'electron'
import type { PrintConfig } from './print-config'
import type { PrinterInfo, PrintHtmlOptions } from './print-service'
import type { UpdateDownloadProgress } from './app-updates'

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

const updatesApi = {
  isAvailable: true as const,
  downloadAndInstall: (downloadUrl: string): Promise<{ path: string; fileName: string }> =>
    ipcRenderer.invoke('updates:downloadAndInstall', downloadUrl),
  onProgress: (listener: (progress: UpdateDownloadProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: UpdateDownloadProgress) => {
      listener(progress)
    }
    ipcRenderer.on('updates:progress', handler)
    return () => {
      ipcRenderer.removeListener('updates:progress', handler)
    }
  },
}

contextBridge.exposeInMainWorld('negaPos', {
  printing: printingApi,
  updates: updatesApi,
})
