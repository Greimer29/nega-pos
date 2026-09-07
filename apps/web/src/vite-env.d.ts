/// <reference types="vite/client" />

import type { ElectronBridge } from '@/lib/electron-bridge'

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_BUILD_ID?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    negaPos?: ElectronBridge
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          prompt: () => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              width?: number
              text?: string
              shape?: string
            }
          ) => void
        }
      }
    }
  }
}

export {}
