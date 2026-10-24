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

const offlineApi = {
  isAvailable: true as const,
  getRootPath: (): Promise<string> => ipcRenderer.invoke('offline:getRootPath'),
  writeCatalog: (json: string): Promise<void> => ipcRenderer.invoke('offline:writeCatalog', json),
  readCatalog: (): Promise<string | null> => ipcRenderer.invoke('offline:readCatalog'),
  listOperations: (): Promise<string[]> => ipcRenderer.invoke('offline:listOperations'),
  writeOperation: (fileName: string, json: string): Promise<void> =>
    ipcRenderer.invoke('offline:writeOperation', fileName, json),
  readOperation: (fileName: string): Promise<string | null> =>
    ipcRenderer.invoke('offline:readOperation', fileName),
  deleteOperation: (fileName: string): Promise<boolean> =>
    ipcRenderer.invoke('offline:deleteOperation', fileName),
  hasPending: (): Promise<boolean> => ipcRenderer.invoke('offline:hasPending'),
}

const filesApi = {
  isAvailable: true as const,
  saveQuotePdf: (fileName: string, data: Uint8Array): Promise<{ path: string; fileName: string }> =>
    ipcRenderer.invoke('files:saveQuotePdf', fileName, data),
}

const appVersion = String(ipcRenderer.sendSync('app:getVersion') ?? '')

contextBridge.exposeInMainWorld('negaPos', {
  appVersion,
  printing: printingApi,
  updates: updatesApi,
  offline: offlineApi,
  files: filesApi,
})
