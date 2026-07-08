import type { OrderEstado, OrderModalidad } from '@/features/orders/types'
import { formatFecha } from '@/lib/format-date'

export { formatFecha }

export const ESTADO_LABELS: Record<OrderEstado, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmado',
  IN_PRODUCTION: 'En producción',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  RETURNED: 'Devuelto',
}

export const MODALIDAD_LABELS: Record<OrderModalidad, string> = {
  WHITE_LABEL: 'White label',
  CORPORATE: 'Corporativo',
}

export function formatPrecio(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  const num = Number(value)
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const TRANSICIONES: Record<
  OrderEstado,
  { destino: OrderEstado; label: string; variant?: 'default' | 'destructive' | 'outline' }[]
> = {
  DRAFT: [
    { destino: 'CONFIRMED', label: 'Confirmar venta' },
    { destino: 'DELIVERED', label: 'Facturar y entregar' },
    { destino: 'CANCELLED', label: 'Cancelar', variant: 'destructive' },
  ],
  CONFIRMED: [
    { destino: 'IN_PRODUCTION', label: 'Pasar a producción' },
    { destino: 'CANCELLED', label: 'Cancelar', variant: 'destructive' },
  ],
  IN_PRODUCTION: [
    { destino: 'DELIVERED', label: 'Marcar entregado' },
    { destino: 'CANCELLED', label: 'Cancelar', variant: 'destructive' },
  ],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
}
