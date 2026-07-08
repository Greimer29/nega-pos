import { resolvePublicAssetUrl } from '@/lib/api'
import {
  INVENTORY_UNIT_OPTIONS,
  type InventoryUnit,
  inventoryUnitAbrev,
  inventoryUnitLabel,
} from '@/lib/inventory-units'

export type ProductSaleUnit = InventoryUnit

export const PRODUCT_SALE_UNITS = INVENTORY_UNIT_OPTIONS

export const PRODUCT_SALE_UNIT_LABELS = Object.fromEntries(
  INVENTORY_UNIT_OPTIONS.map((u) => [u.value, u.label])
) as Record<ProductSaleUnit, string>

export const PRODUCT_SALE_UNIT_ABREV = Object.fromEntries(
  INVENTORY_UNIT_OPTIONS.map((u) => [u.value, u.value])
) as Record<ProductSaleUnit, string>

export function productSaleUnitLabel(unit: string) {
  return inventoryUnitLabel(unit)
}

export function productSaleUnitAbrev(unit: string) {
  return inventoryUnitAbrev(unit)
}

export const PAYMENT_METHODS = [
  { value: 'CASH_USD', label: 'Efectivo USD' },
  { value: 'CASH_BS', label: 'Efectivo Bs' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MOBILE_PAYMENT', label: 'Pago móvil' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BINANCE', label: 'Binance' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const BILLING_METHODS = [
  { value: 'FAST', label: 'Rápido' },
  { value: 'ORDER', label: 'Pedido' },
] as const

export type BillingMethod = (typeof BILLING_METHODS)[number]['value']

export const SALE_ORDER_STATUS_LABELS = {
  PENDING: 'Pendiente',
  IN_PROCESS: 'En proceso',
  DELIVERED: 'Entregado',
} as const

export const SALE_STATUS_LABELS = {
  DRAFT: 'Borrador',
  COMPLETED: 'Confirmada',
  RETURNED: 'Devuelta',
} as const

export function catalogImageUrl(productId: number) {
  return resolvePublicAssetUrl(`/catalog-products/${productId}/image`)
}

export function formatUsd(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '0.00'
  }
  return Number(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function categoryLabel(category: string) {
  return category
}

export function paymentMethodLabel(
  method: { name: string } | string | null | undefined
): string {
  if (!method) return '—'
  if (typeof method === 'string') return method
  return method.name
}
