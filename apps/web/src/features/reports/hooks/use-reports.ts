import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getAccountStatement } from '@/features/reports/services/report-service'
import type { AccountStatementParams } from '@/features/reports/types'

export const reportsQueryKey = ['reports'] as const

export function useAccountStatementQuery(
  params: AccountStatementParams,
  options?: Pick<UseQueryOptions<Awaited<ReturnType<typeof getAccountStatement>>>, 'enabled'>
) {
  return useQuery({
    queryKey: [...reportsQueryKey, 'account-statement', params],
    queryFn: () => getAccountStatement(params),
    enabled: options?.enabled ?? true,
  })
}
