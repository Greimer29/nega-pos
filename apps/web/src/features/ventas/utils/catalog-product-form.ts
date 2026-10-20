import type { FormulaMaterialItem } from '@/features/formulas/types'
import type { ProductSaleUnit } from '@/features/ventas/constants'
import type { CatalogProductInput, CatalogProductSizeInput } from '@/features/ventas/types'
import { normalizeInventoryQuantity } from '@/lib/inventory-units'
import { calcProfitMarginPercent } from '@/lib/profit-margin'
import { deriveUnitCostFromPack, MIN_WHOLESALE_UNITS_PER_PACK } from '@/lib/wholesale'

export type SizeRow = {
  key: string
  size: string
  stock_quantity: string
}

export function newSizeRow(): SizeRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    size: '',
    stock_quantity: '0',
  }
}

export function formatMarginValue(cost: number, sale: string) {
  const margin = calcProfitMarginPercent(sale, cost)
  return margin !== null ? margin.toFixed(1) : ''
}

export function sumSizeRowsStock(rows: SizeRow[], saleUnit: ProductSaleUnit) {
  return rows.reduce((sum, row) => {
    if (!row.size.trim()) return sum
    return sum + normalizeInventoryQuantity(Math.max(0, Number(row.stock_quantity) || 0), saleUnit)
  }, 0)
}

export function calcFormulaMaterialsCost(materials: FormulaMaterialItem[] | undefined) {
  if (!materials?.length) {
    return 0
  }

  return materials.reduce((total, item) => {
    const unitCost = Number(item.material?.last_purchase_price_usd ?? 0)
    return total + unitCost * Number(item.quantity)
  }, 0)
}

export function packUnitsAreValid(units: number) {
  return Number.isFinite(units) && units >= MIN_WHOLESALE_UNITS_PER_PACK
}

export function deriveRetailCost(
  wholesaleEnabled: boolean,
  wholesaleUnits: string,
  wholesaleCost: string,
  costPrice: string
) {
  const packUnitsNum = Number(wholesaleUnits)
  return wholesaleEnabled && packUnitsAreValid(packUnitsNum)
    ? deriveUnitCostFromPack(Number(wholesaleCost) || 0, packUnitsNum)
    : Number(costPrice)
}

export function validateSizeRows(rows: SizeRow[]): string | null {
  const seen = new Set<string>()
  for (const row of rows) {
    const label = row.size.trim()
    if (!label) continue
    if (label.length > 20) {
      return 'Cada talla puede tener como máximo 20 caracteres.'
    }
    const key = label.toLowerCase()
    if (seen.has(key)) {
      return `La talla "${label}" está duplicada.`
    }
    seen.add(key)
    if (Number(row.stock_quantity) < 0) {
      return 'El stock por talla no puede ser negativo.'
    }
  }
  if (seen.size === 0) {
    return 'Agregá al menos una talla o desactivá «Usar tallas».'
  }
  return null
}

export type CatalogProductFormValues = {
  name: string
  description: string
  category: string
  barcode: string
  supplierCode: string
  saleUnit: ProductSaleUnit
  salePrice: string
  costPrice: string
  stockQuantity: string
  minimumStock: string
  useFormula: boolean
  useSizes: boolean
  sizeRows: SizeRow[]
  wholesaleEnabled: boolean
  wholesaleUnits: string
  wholesaleCost: string
  wholesaleSale: string
}

export function validateCatalogProductForm(
  values: CatalogProductFormValues,
  hasFormula: boolean
): string | null {
  if (!values.category.trim()) {
    return 'Elegí una categoría.'
  }

  if (values.useFormula && values.useSizes) {
    return 'Un producto con fórmula no puede usar tallas.'
  }

  if (values.wholesaleEnabled && values.useSizes) {
    return 'La configuración mayorista no aplica a productos con tallas.'
  }

  if (values.wholesaleEnabled) {
    const units = Number(values.wholesaleUnits)
    if (!packUnitsAreValid(units)) {
      return `El paquete mayorista debe traer al menos ${MIN_WHOLESALE_UNITS_PER_PACK} unidades.`
    }
    if (!Number.isFinite(Number(values.wholesaleCost)) || Number(values.wholesaleCost) < 0) {
      return 'Indicá el precio costo del paquete mayorista.'
    }
    if (!Number.isFinite(Number(values.wholesaleSale)) || Number(values.wholesaleSale) < 0) {
      return 'Indicá el precio de venta del paquete mayorista.'
    }
  }

  if (values.useFormula && !hasFormula) {
    return 'Elegí o creá una fórmula, o desactivá «Usar fórmula».'
  }

  if (Number(values.minimumStock) < 0) {
    return 'El stock mínimo no puede ser negativo.'
  }

  if (values.useSizes) {
    return validateSizeRows(values.sizeRows)
  }

  return null
}

export type CatalogProductPayloadContext = {
  selectedFormulaId: number | undefined
  hadSizes: boolean
  isEditing: boolean
  purchaseFlow: boolean
}

export function buildCatalogProductPayload(
  values: CatalogProductFormValues,
  context: CatalogProductPayloadContext
): CatalogProductInput {
  const { saleUnit, wholesaleEnabled, useSizes } = values
  const hasFormula = context.selectedFormulaId != null
  const sizesPayload: CatalogProductSizeInput[] | undefined = useSizes
    ? values.sizeRows
        .filter((row) => row.size.trim())
        .map((row) => ({
          size: row.size.trim(),
          stock_quantity: normalizeInventoryQuantity(
            Math.max(0, Number(row.stock_quantity) || 0),
            saleUnit
          ),
        }))
    : context.hadSizes && !hasFormula
      ? []
      : undefined

  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    category: values.category,
    barcode: values.barcode.trim() || null,
    supplier_code: values.supplierCode.trim() || null,
    sale_unit: saleUnit,
    sale_price_usd: Number(values.salePrice),
    minimum_stock: normalizeInventoryQuantity(Number(values.minimumStock) || 0, saleUnit),
    wholesale_enabled: wholesaleEnabled,
    wholesale_units_per_pack: wholesaleEnabled ? Number(values.wholesaleUnits) : null,
    wholesale_cost_usd: wholesaleEnabled ? Number(values.wholesaleCost) : null,
    wholesale_sale_price_usd: wholesaleEnabled ? Number(values.wholesaleSale) : null,
    ...(hasFormula
      ? { formula_id: context.selectedFormulaId }
      : {
          cost_usd: wholesaleEnabled
            ? deriveRetailCost(
                wholesaleEnabled,
                values.wholesaleUnits,
                values.wholesaleCost,
                values.costPrice
              )
            : Number(values.costPrice),
          formula_id: null,
          stock_quantity: useSizes
            ? sumSizeRowsStock(values.sizeRows, saleUnit)
            : context.purchaseFlow && !context.isEditing
              ? 0
              : normalizeInventoryQuantity(Number(values.stockQuantity) || 0, saleUnit),
          ...(sizesPayload !== undefined ? { sizes: sizesPayload } : {}),
        }),
  }
}
