import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  fetchAppUpdateLatest,
  getInstalledAppVersion,
} from '@/features/settings/services/app-updates-service'

export const appUpdateLatestQueryKey = ['app-updates', 'latest'] as const

export function useAppUpdateLatestQuery(enabled = true) {
  const currentVersion = useMemo(() => getInstalledAppVersion(), [])

  return useQuery({
    queryKey: [...appUpdateLatestQueryKey, currentVersion ?? 'unknown'],
    queryFn: () => fetchAppUpdateLatest(currentVersion),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  })
}

/** True when the API reports a newer release than the installed client. */
export function useUpdateAvailable() {
  const { can } = useAuth()
  const canCheck = can('settings.view')
  const { data } = useAppUpdateLatestQuery(canCheck)
  return Boolean(canCheck && data?.updateAvailable)
}
