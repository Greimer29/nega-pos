import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  getAccountStatement,
  getInventoryProductMovements,
  getInventoryReport,
} from '@/features/reports/services/report-service'
import type {
  AccountStatementParams,
  InventoryMovementsParams,
  InventoryReportParams,
} from '@/features/reports/types'

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

export function useInventoryReportQuery(
  params: InventoryReportParams,
  options?: Pick<UseQueryOptions<Awaited<ReturnType<typeof getInventoryReport>>>, 'enabled'>
) {
  return useQuery({
    queryKey: [...reportsQueryKey, 'inventory', params],
    queryFn: () => getInventoryReport(params),
    enabled: options?.enabled ?? true,
  })
}

export function useInventoryProductMovementsQuery(
  productId: number | undefined,
  params: InventoryMovementsParams,
  options?: Pick<
    UseQueryOptions<Awaited<ReturnType<typeof getInventoryProductMovements>>>,
    'enabled'
  >
) {
  return useQuery({
    queryKey: [...reportsQueryKey, 'inventory-movements', productId, params],
    queryFn: () => getInventoryProductMovements(productId!, params),
    enabled: (options?.enabled ?? true) && productId != null && productId > 0,
  })
}
