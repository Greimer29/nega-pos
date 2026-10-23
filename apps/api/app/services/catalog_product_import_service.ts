import type { CatalogItemKind } from '#constants/catalog_item_kind'
import { INVENTORY_UNITS, type InventoryUnit } from '#constants/inventory_units'
import CatalogProductService from '#services/catalog_product_service'
import CategoryService from '#services/category_service'

export type CatalogImportRow = {
  row: number
  name?: string
  category?: string
  description?: string
  sale_unit?: string
  sale_price_usd?: number
  cost_usd?: number
  stock_quantity?: number
  minimum_stock?: number
  barcode?: string
  supplier_code?: string
}

export type CatalogImportRowResult = {
  row: number
  ok: boolean
  id?: number
  error?: string
}

export type CatalogImportResult = {
  created: number
  failed: number
  results: CatalogImportRowResult[]
}

function resolveImportUnit(value?: string): InventoryUnit | null {
  if (!value?.trim()) return 'UND'
  const normalized = value.trim().toUpperCase()
  return INVENTORY_UNITS.includes(normalized as InventoryUnit)
    ? (normalized as InventoryUnit)
    : null
}

/** Bulk import: each row is created on its own and reports its own error. */
export default class CatalogProductImportService {
  private categoryService = new CategoryService()
  private productService = new CatalogProductService()

  async importar(
    itemKind: CatalogItemKind,
    rows: CatalogImportRow[]
  ): Promise<CatalogImportResult> {
    const results: CatalogImportRowResult[] = []
    let created = 0

    for (const row of rows) {
      const label = `Fila ${row.row}`
      try {
        const name = row.name?.trim() ?? ''
        if (!name) {
          results.push({ row: row.row, ok: false, error: `${label}: el nombre es obligatorio` })
          continue
        }

        const isService = itemKind === 'SERVICE'
        const categoryName = (row.category?.trim() || (isService ? 'Servicios' : '')).trim()
        if (!isService && !categoryName) {
          results.push({ row: row.row, ok: false, error: `${label}: la categoría es obligatoria` })
          continue
        }

        const salePrice = row.sale_price_usd
        if (salePrice === undefined || salePrice === null || Number.isNaN(Number(salePrice))) {
          results.push({
            row: row.row,
            ok: false,
            error: `${label}: el precio de venta es obligatorio`,
          })
          continue
        }

        const saleUnit = resolveImportUnit(row.sale_unit)
        if (row.sale_unit?.trim() && !saleUnit) {
          results.push({
            row: row.row,
            ok: false,
            error: `${label}: unidad inválida (usá UND, PAR, CAJ, ROL, SET, MTS o KG)`,
          })
          continue
        }

        await this.categoryService.asegurarActiva(categoryName || 'Servicios')

        const product = await this.productService.crear({
          name,
          description: row.description?.trim() || undefined,
          category: categoryName || 'Servicios',
          item_kind: itemKind,
          sale_unit: saleUnit ?? 'UND',
          sale_price_usd: Number(salePrice),
          cost_usd: row.cost_usd !== undefined ? Number(row.cost_usd) : 0,
          stock_quantity: isService ? 0 : Number(row.stock_quantity ?? 0),
          minimum_stock: isService ? 0 : Number(row.minimum_stock ?? 0),
          barcode: isService ? null : row.barcode,
          supplier_code: isService ? null : row.supplier_code,
        })

        created += 1
        results.push({ row: row.row, ok: true, id: Number(product.id) })
      } catch (error) {
        results.push({
          row: row.row,
          ok: false,
          error: `${label}: ${error instanceof Error ? error.message : 'No se pudo crear'}`,
        })
      }
    }

    return { created, failed: results.filter((item) => !item.ok).length, results }
  }
}
