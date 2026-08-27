import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // Un reintento en red/timeout ayuda con Railway remoto inestable.
  if (failureCount >= 1) {
    return false
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status && [401, 403, 404, 422].includes(status)) {
      return false
    }

    if (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      status === 502 ||
      status === 503 ||
      status === 504
    ) {
      return true
    }
  }

  return false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        if (!axios.isAxiosError(error)) return false
        return (
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          error.message === 'Network Error' ||
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 504
        )
      },
    },
  },
})
