import {
  INVENTORY_UNITS,
  type InventoryUnit,
} from '@/lib/inventory-units'

export const MATERIAL_CATEGORIAS = [
  'FABRIC',
  'THREAD',
  'BUTTON',
  'ELASTIC',
  'LABEL',
  'BAG',
  'OTHER',
] as const

export const MATERIAL_UNITES = INVENTORY_UNITS

export type MaterialCategoria = (typeof MATERIAL_CATEGORIAS)[number]
export type MaterialUnidad = InventoryUnit

export type MaterialStatusFilter = 'active' | 'inactive' | 'out_of_stock'

export type MaterialSortBy = 'name' | 'most_purchased' | 'most_used' | 'most_flow'

export const CATEGORIA_LABELS: Record<MaterialCategoria, string> = {
  FABRIC: 'Telas',
  THREAD: 'Hilos',
  BUTTON: 'Botones',
  ELASTIC: 'Elásticas',
  LABEL: 'Etiquetas',
  BAG: 'Envolturas',
  OTHER: 'Otro',
}

export const UNIT_ABREV: Record<MaterialUnidad, string> = {
  UND: 'UND',
  PAR: 'PAR',
  CAJ: 'CAJ',
  ROL: 'ROL',
  SET: 'SET',
  MTS: 'MTS',
  KG: 'KG',
}

/** Unidad sugerida al crear o cambiar categoría (el usuario puede cambiarla). */
export const DEFAULT_UNIT_BY_CATEGORY: Record<MaterialCategoria, MaterialUnidad> = {
  FABRIC: 'MTS',
  THREAD: 'ROL',
  BUTTON: 'UND',
  ELASTIC: 'MTS',
  LABEL: 'UND',
  BAG: 'UND',
  OTHER: 'UND',
}

export function materialStockDisponible(material: {
  stockActual?: number
  stockComprometido?: number
}) {
  const stock = material.stockActual ?? 0
  const comprometido = material.stockComprometido ?? 0
  return { stock, comprometido, disponible: Math.max(0, stock - comprometido) }
}

export const STATUS_FILTER_LABELS: Record<MaterialStatusFilter, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  out_of_stock: 'Sin stock',
}

export const SORT_BY_LABELS: Record<MaterialSortBy, string> = {
  name: 'Nombre',
  most_purchased: 'Más comprados',
  most_used: 'Más usados',
  most_flow: 'Más flujo',
}

export const MOVIMIENTO_TIPO_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Entrada por purchase',
  ORDER_OUT: 'Salida por order',
  MANUAL_ADJUSTMENT: 'Ajuste de inventario',
  MANUAL_CARGO: 'Cargo manual',
  MANUAL_DESCARGO: 'Descargo manual',
  REVERSAL_ADJUSTMENT: 'Reversión',
}

import { resolvePublicAssetUrl } from '@/lib/api'

export function materialImageUrl(materialId: number) {
  return resolvePublicAssetUrl(`/materials/${materialId}/image`)
}

export function formatMaterialUsd(value: string | null | undefined) {
  if (!value) {
    return '—'
  }
  return Number(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function deriveMaterialStatus(material: {
  active: boolean
  stockActual?: number
}): 'active' | 'inactive' | 'out_of_stock' {
  if (!material.active) {
    return 'inactive'
  }
  if ((material.stockActual ?? 0) <= 0) {
    return 'out_of_stock'
  }
  return 'active'
}

export const MATERIAL_STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  out_of_stock: 'Sin stock',
} as const

export const MATERIAL_STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-muted text-muted-foreground',
  out_of_stock: 'bg-red-100 text-red-800',
} as const
