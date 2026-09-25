import { formatFecha } from '@/lib/format-date'

export { formatFecha }

export const MOVEMENT_TYPE_LABELS = {
  sale: 'Venta',
  customer_payment: 'Abono cliente',
  purchase: 'Compra',
  supplier_payment: 'Pago proveedor',
  expense: 'Gasto empresa',
  machine_expense: 'Gasto máquina (histórico)',
  income: 'Aporte de capital',
} as const

export type ReportsHubTab = 'financiero' | 'inventario'

/** Subinformes del reporte financiero. `patrimonio` aún no implementado. */
export type FinancialSubReport = 'flujo' | 'resultados' | 'patrimonio'

export const REPORT_HUB_OPTIONS: Array<{
  id: ReportsHubTab
  label: string
}> = [
  { id: 'financiero', label: 'Reporte financiero' },
  { id: 'inventario', label: 'Reporte de inventario' },
]

export const FINANCIAL_SUB_REPORTS: Array<{
  id: FinancialSubReport
  label: string
  enabled: boolean
}> = [
  { id: 'flujo', label: 'Flujo de caja', enabled: true },
  { id: 'resultados', label: 'Estado de resultados', enabled: true },
  { id: 'patrimonio', label: 'Situación patrimonial', enabled: false },
]

export function parseReportsHubTab(value: string | null): ReportsHubTab {
  if (value === 'inventario') return 'inventario'
  return 'financiero'
}

export function parseFinancialSubReport(value: string | null): FinancialSubReport {
  if (value === 'resultados') return 'resultados'
  if (value === 'patrimonio') return 'flujo'
  return 'flujo'
}

export function formatMoney(value: string | number | null | undefined, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  const symbol = currency === 'USD' ? '$' : currency === 'VES' ? 'Bs' : currency
  return `${symbol} ${num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: currency === 'USD' ? 4 : 2,
  })}`
}

export function currencySymbol(code: string) {
  if (code === 'USD') return '$'
  if (code === 'VES') return 'Bs'
  return code
}

export function currentMonthIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function previousMonthIso() {
  const now = new Date()
  now.setMonth(now.getMonth() - 1)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function todayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function currentYearIso() {
  return String(new Date().getFullYear())
}

export function currentYearRange() {
  const year = currentYearIso()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}
