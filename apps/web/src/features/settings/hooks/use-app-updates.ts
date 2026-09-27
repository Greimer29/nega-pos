import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { getElectronUpdatesApi, isElectronUpdatesAvailable } from '@/lib/electron-bridge'
import {
  appUpdateLatestQueryKey,
  useAppUpdateLatestQuery,
} from '@/features/settings/hooks/use-app-update-latest-query'
import {
  appUpdateDownloadUrl,
  detectClientPlatform,
  getInstalledAppVersion,
  type AppUpdatePlatform,
} from '@/features/settings/services/app-updates-service'

export function useAppUpdates() {
  const queryClient = useQueryClient()
  const currentVersion = useMemo(() => getInstalledAppVersion(), [])
  const platform = useMemo(() => detectClientPlatform(), [])
  const latestQuery = useAppUpdateLatestQuery(true)
  const [installing, setInstalling] = useState(false)
  const [progressPercent, setProgressPercent] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const latest = latestQuery.data ?? null
  const loading = latestQuery.isLoading || latestQuery.isFetching
  const error =
    actionError ??
    (latestQuery.error ? getApiErrorMessage(latestQuery.error) : null)

  const refresh = useCallback(async () => {
    setActionError(null)
    await queryClient.invalidateQueries({ queryKey: appUpdateLatestQueryKey })
  }, [queryClient])

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
      setActionError(null)
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
          setActionError(getApiErrorMessage(err) || 'No se pudo iniciar la actualización automática.')
          setStatusMessage(null)
        } finally {
          stopProgress()
          setInstalling(false)
        }
        return
      }

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
