import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // Solo GET: un reintento. Las mutations NO reintentan (evita esperas de 1–2 min).
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
      // Datos de config deben verse frescos tras mutar; 15s basta para navegación.
      staleTime: 15_000,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Nunca reintentar PUT/DELETE automáticamente: duplica espera y puede doble-aplicar.
      retry: false,
    },
  },
})
