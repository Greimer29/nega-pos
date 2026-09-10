import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { getElectronUpdatesApi, isElectronUpdatesAvailable } from '@/lib/electron-bridge'
import {
  appUpdateDownloadUrl,
  detectClientPlatform,
  fetchAppUpdateLatest,
  getInstalledAppVersion,
  type AppUpdateLatest,
  type AppUpdatePlatform,
} from '@/features/settings/services/app-updates-service'

export function useAppUpdates() {
  const currentVersion = useMemo(() => getInstalledAppVersion(), [])
  const platform = useMemo(() => detectClientPlatform(), [])
  const [latest, setLatest] = useState<AppUpdateLatest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [progressPercent, setProgressPercent] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAppUpdateLatest(currentVersion)
      setLatest(data)
    } catch (err) {
      setLatest(null)
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [currentVersion])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const preferredPlatform: AppUpdatePlatform | null = platform === 'browser' ? null : platform

  const preferredAsset =
    preferredPlatform === 'desktop'
      ? latest?.desktop
      : preferredPlatform === 'android'
        ? latest?.android
        : null

  const canUpdatePreferred = Boolean(
    latest?.updateAvailable && preferredAsset?.available && preferredPlatform
  )

  const supportsAutoInstall = platform === 'desktop' && isElectronUpdatesAvailable()

  const startUpdate = useCallback(
    async (target: AppUpdatePlatform) => {
      setError(null)
      setStatusMessage(null)
      const url = appUpdateDownloadUrl(target)

      if (target === 'desktop' && isElectronUpdatesAvailable()) {
        const updatesApi = getElectronUpdatesApi()
        if (!updatesApi) {
          window.location.assign(url)
          return
        }

        setInstalling(true)
        setProgressPercent(0)
        setStatusMessage('Descargando instalador…')
        const stopProgress = updatesApi.onProgress((progress) => {
          setProgressPercent(progress.percent)
        })

        try {
          await updatesApi.downloadAndInstall(url)
          setStatusMessage('Instalador abierto. La app se cerrará para completar la actualización.')
        } catch (err) {
          setError(getApiErrorMessage(err) || 'No se pudo iniciar la actualización automática.')
          setStatusMessage(null)
        } finally {
          stopProgress()
          setInstalling(false)
        }
        return
      }

      // Android / browser: el WebView o el navegador descarga el archivo.
      // En Android el usuario confirma la instalación del APK (no hay silent update).
      setStatusMessage(
        target === 'android'
          ? 'Descarga iniciada. Cuando termine, abrí el APK desde Descargas e instalalo.'
          : null
      )
      window.location.assign(url)
    },
    []
  )

  return {
    currentVersion,
    platform,
    preferredPlatform,
    latest,
    loading,
    error,
    installing,
    progressPercent,
    statusMessage,
    canUpdatePreferred,
    /** @deprecated alias */
    canDownloadPreferred: canUpdatePreferred,
    supportsAutoInstall,
    refresh,
    startUpdate,
    /** @deprecated alias */
    startDownload: startUpdate,
  }
}
