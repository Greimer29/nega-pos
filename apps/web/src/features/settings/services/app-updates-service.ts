import { api, getApiV1BaseUrl } from '@/lib/api'

export type AppUpdatePlatform = 'desktop' | 'android'

export type AppUpdateAssetSummary = {
  available: boolean
  fileName: string | null
}

export type AppUpdateLatest = {
  latestVersion: string
  releaseNotes: string
  publishedAt: string | null
  desktop: AppUpdateAssetSummary
  android: AppUpdateAssetSummary
  updateAvailable: boolean
  current: string | null
}

type LatestResponse = {
  data: AppUpdateLatest
}

export function getInstalledAppVersion(): string | null {
  const fromEnv = import.meta.env.VITE_APP_VERSION?.trim()
  if (fromEnv) return fromEnv
  const buildId = import.meta.env.VITE_BUILD_ID?.trim()
  if (!buildId) return null
  return buildId.split('-')[0]?.trim() || null
}

export function detectClientPlatform(): AppUpdatePlatform | 'browser' {
  if (typeof window === 'undefined') return 'browser'
  if (window.negaPos?.updates?.isAvailable || window.negaPos?.printing?.isAvailable) {
    return 'desktop'
  }
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua) || /Capacitor/i.test(ua)) return 'android'
  return 'browser'
}

export async function fetchAppUpdateLatest(current?: string | null): Promise<AppUpdateLatest> {
  const { data } = await api.get<LatestResponse>('/app-updates/latest', {
    params: current ? { current } : undefined,
  })
  return data.data
}

export function appUpdateDownloadUrl(platform: AppUpdatePlatform): string {
  return `${getApiV1BaseUrl()}/app-updates/download/${platform}`
}
