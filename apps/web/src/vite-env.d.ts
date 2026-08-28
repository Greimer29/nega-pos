/// <reference types="vite/client" />

import type { ElectronBridge } from '@/lib/electron-bridge'

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_BUILD_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    negaPos?: ElectronBridge
  }
}
