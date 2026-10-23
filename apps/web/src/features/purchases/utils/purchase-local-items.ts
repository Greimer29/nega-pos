import { formatMachineTypeLabel } from '@/features/machines/constants'
import { UNIT_ABREV } from '@/features/materials/constants'
import type { Material } from '@/features/materials/types'
import type {
  LocalPurchaseItem,
  PurchaseItem,
  PurchaseItemMaterial,
} from '@/features/purchases/types'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { wholesalePackCostUsd, wholesaleUnitsPerPack } from '@/lib/wholesale'

export function materialToSummary(material: Material): PurchaseItemMaterial {
  return {
    id: material.id,
    code: material.code,
    name: material.name,
    category: material.category,
    unit: material.unit,
  }
}

/** Draft rows keep the database id as `db-{id}` so later edits and deletes reach the server. */
export function purchaseItemToLocal(item: PurchaseItem): LocalPurchaseItem {
  if (item.itemType === 'machine' || item.machineId) {
    return {
      localId: `db-${item.id}`,
      itemType: 'machine',
      machineId: item.machineId ?? undefined,
      machine: item.machine ?? {
        id: item.machineId ?? 0,
        name: 'Máquina',
        type: 'OTHER',
      },
      quantity: Number(item.quantity),
      unitPriceUsd: Number(item.unitPriceUsd ?? 0),
      isWholesale: false,
    }
  }

  if (item.itemType === 'product' || item.catalogProductId) {
    return {
      localId: `db-${item.id}`,
      itemType: 'product',
      catalogProductId: item.catalogProductId ?? undefined,
      catalogProduct: item.catalogProduct ?? {
        id: item.catalogProductId ?? 0,
        name: 'Producto',
        category: 'OTHER',
        saleUnit: 'UND',
      },
      quantity: Number(item.quantity),
      unitPriceUsd: Number(item.unitPriceUsd ?? 0),
      isWholesale: Boolean(item.isWholesale),
    }
  }

  return {
    localId: `db-${item.id}`,
    itemType: 'material',
    materialId: item.materialId ?? undefined,
    material: item.material ?? {
      id: item.materialId ?? 0,
      code: `#${item.materialId}`,
      name: 'Material',
      category: 'Otro',
      unit: 'UND',
    },
    quantity: Number(item.quantity),
    unitPriceUsd: Number(item.unitPriceUsd ?? 0),
    isWholesale: Boolean(item.isWholesale),
  }
}

export function localItemCode(item: LocalPurchaseItem) {
  if (item.itemType === 'machine') {
    return formatMachineTypeLabel(item.machine?.type ?? 'OTHER')
  }
  if (item.itemType === 'product') {
    return catalogProductCode(item.catalogProduct?.id ?? item.catalogProductId ?? 0)
  }
  return item.material?.code ?? '—'
}

export function localItemName(item: LocalPurchaseItem) {
  if (item.itemType === 'machine') return item.machine?.name ?? 'Máquina'
  return item.itemType === 'product'
    ? (item.catalogProduct?.name ?? 'Producto')
    : (item.material?.name ?? 'Material')
}

export function localItemCanWholesale(item: LocalPurchaseItem) {
  if (item.itemType === 'machine') return false
  if (item.itemType === 'product') {
    return Boolean(item.catalogProduct?.wholesaleEnabled)
  }
  return Boolean(item.material?.wholesaleEnabled)
}

export function localItemUnit(item: LocalPurchaseItem) {
  if (item.itemType === 'machine') return 'Und'
  if (item.isWholesale) {
    return 'Paq.'
  }
  if (item.itemType === 'product') {
    return productSaleUnitAbrev(item.catalogProduct?.saleUnit ?? 'UND')
  }
  return UNIT_ABREV[item.material?.unit ?? 'UND']
}

export function localItemUnitCode(item: LocalPurchaseItem) {
  if (item.itemType === 'machine') return 'UND'
  if (item.itemType === 'product') {
    return item.catalogProduct?.saleUnit ?? 'UND'
  }
  return item.material?.unit ?? 'UND'
}

/**
 * Unit price after toggling wholesale: the pack cost when turning it on, the cost per unit
 * when turning it off; keeps the current price if the item has no wholesale cost.
 */
export function wholesaleTogglePriceUsd(item: LocalPurchaseItem, checked: boolean): number {
  const source = item.itemType === 'product' ? item.catalogProduct : item.material
  const packCost = wholesalePackCostUsd(source)
  const units = wholesaleUnitsPerPack(source)
  const derivedUnit = packCost != null && units ? packCost / units : null

  return checked ? (packCost ?? item.unitPriceUsd) : (derivedUnit ?? item.unitPriceUsd)
}

export function parseDbItemId(localId: string): number | null {
  if (!localId.startsWith('db-')) return null
  const id = Number(localId.slice(3))
  return Number.isFinite(id) ? id : null
}

/**
 * Rate shown for the entry currency: none for the base currency, then the purchase rate,
 * the configured currency rate, and for VES the legacy global rate.
 */
export function resolveEntryRateInput(
  currencyCode: string,
  currencies: Array<{ code: string; ratePerUsd: string }>,
  purchaseRate?: string | null,
  legacyGlobalRate?: string | number | null,
  baseCurrencyCode = 'XAU'
): string {
  if (currencyCode.toUpperCase() === baseCurrencyCode.toUpperCase()) {
    return ''
  }

  if (purchaseRate) {
    return formatRateInput(purchaseRate)
  }

  const currency = currencies.find((row) => row.code === currencyCode)
  if (currency) {
    return formatRateInput(currency.ratePerUsd)
  }

  if (currencyCode === 'VES' && legacyGlobalRate) {
    return formatRateInput(legacyGlobalRate)
  }

  return ''
}

export function formatRateInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : ''
}
