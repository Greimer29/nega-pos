import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'

/**
 * useQuery que solo corre cuando la sesión está lista (post login / bootstrap).
 * Evita 401/502 en consola por requests disparadas antes de auth/me.
 */
export function useAuthenticatedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  const { isAuthenticated, isLoading, sessionBootstrapError } = useAuth()
  const enabledByAuth = isAuthenticated && !isLoading && !sessionBootstrapError
  const enabled = (options.enabled ?? true) && enabledByAuth

  return useQuery({
    ...options,
    enabled,
  })
}
