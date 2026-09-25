import type { AccountStatementMovementType } from '@/features/reports/types'
import type { AccountStatementParams } from '@/features/reports/types'
import type { MetricTone } from '@/features/reports/report-ui'

export type ReportMovementCategorySlug = 'ventas' | 'compras' | 'gastos' | 'maquina' | 'ingresos'

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
    title: 'Historial de cobros por ventas',
    subtitle:
      'Ventas de contado y abonos de clientes. El fiado pendiente (CxC) no suma hasta el cobro.',
    movementType: 'sale',
    apiType: 'sales',
    tone: 'income',
    totalsKind: 'credit_split',
  },
  compras: {
    slug: 'compras',
    title: 'Historial de compras',
    subtitle: 'Compras de contado y abonos a proveedores. El inventario permanece en la empresa.',
    movementType: 'purchase',
    apiType: 'purchases',
    tone: 'purchase',
    totalsKind: 'credit_split',
  },
  gastos: {
    slug: 'gastos',
    title: 'Historial de gastos operativos',
    subtitle:
      'Egresos del período para operar. No incluyen compras de inventario.',
    movementType: 'expense',
    apiType: 'expenses',
    tone: 'expense',
    totalsKind: 'single',
  },
  maquina: {
    slug: 'maquina',
    title: 'Historial de gastos máquina (histórico)',
    subtitle: 'Registros legacy en machine_expenses; los nuevos gastos de máquina van en Gastos',
    movementType: 'machine_expense',
    apiType: 'machine_expenses',
    tone: 'machine',
    totalsKind: 'single',
  },
  ingresos: {
    slug: 'ingresos',
    title: 'Historial de aportes de capital',
    subtitle:
      'Entradas del titular u otros socios. No son ingresos por ventas ni utilidad.',
    movementType: 'income',
    apiType: 'incomes',
    tone: 'income',
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
