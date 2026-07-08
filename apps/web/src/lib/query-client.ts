import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) {
    return false
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status && [401, 403, 404, 502, 503, 504].includes(status)) {
      return false
    }

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return import.meta.env.DEV
    }
  }

  return import.meta.env.DEV
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryQuery,
    },
  },
})
