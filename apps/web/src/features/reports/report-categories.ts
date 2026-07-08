import type { AccountStatementMovementType } from '@/features/reports/types'
import type { AccountStatementParams } from '@/features/reports/types'
import type { MetricTone } from '@/features/reports/report-ui'

export type ReportMovementCategorySlug = 'ventas' | 'compras' | 'gastos' | 'maquina'

export type ReportTotalsKind = 'credit_split' | 'single'

type ReportCategoryConfig = {
  slug: ReportMovementCategorySlug
  title: string
  subtitle: string
  movementType: AccountStatementMovementType
  apiType: NonNullable<AccountStatementParams['types']>[number]
  tone: MetricTone
  totalsKind: ReportTotalsKind
}

export const REPORT_CATEGORIES: Record<ReportMovementCategorySlug, ReportCategoryConfig> = {
  ventas: {
    slug: 'ventas',
    title: 'Historial de ventas',
    subtitle: 'Cobros por ventas (contado + abonos) en el período seleccionado',
    movementType: 'sale',
    apiType: 'sales',
    tone: 'income',
    totalsKind: 'credit_split',
  },
  compras: {
    slug: 'compras',
    title: 'Historial de compras',
    subtitle: 'Egresos por compras en el período seleccionado',
    movementType: 'purchase',
    apiType: 'purchases',
    tone: 'purchase',
    totalsKind: 'credit_split',
  },
  gastos: {
    slug: 'gastos',
    title: 'Historial de gastos empresa',
    subtitle: 'Egresos operativos en el período seleccionado',
    movementType: 'expense',
    apiType: 'expenses',
    tone: 'expense',
    totalsKind: 'single',
  },
  maquina: {
    slug: 'maquina',
    title: 'Historial de gastos máquina',
    subtitle: 'Egresos por mantenimiento y máquinas en el período seleccionado',
    movementType: 'machine_expense',
    apiType: 'machine_expenses',
    tone: 'machine',
    totalsKind: 'single',
  },
}

export function getReportCategory(slug: string | undefined): ReportCategoryConfig | null {
  if (!slug || !(slug in REPORT_CATEGORIES)) return null
  return REPORT_CATEGORIES[slug as ReportMovementCategorySlug]
}

export function reportCategoryHref(
  slug: ReportMovementCategorySlug,
  search: string
): string {
  const query = search ? `?${search}` : ''
  return `/reportes/movimientos/${slug}${query}`
}
