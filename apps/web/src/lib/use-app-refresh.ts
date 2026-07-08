import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { refreshCsrfToken } from '@/lib/api'

export function useAppRefresh() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await refreshCsrfToken()
      await queryClient.refetchQueries({ type: 'active' })
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, queryClient])

  return { refresh, isRefreshing }
}
