import ProductoConFormulaNoPermiteTallasException from '#exceptions/producto_con_formula_no_permite_tallas_exception'
import ProductoTallaDuplicadaException from '#exceptions/producto_talla_duplicada_exception'
import ProductoTallaRequeridaException from '#exceptions/producto_talla_requerida_exception'
import {
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
} from '#constants/inventory_units'
import type CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type SizeInput = {
  size: string
  stock_quantity: number
}

export type NormalizedSize = {
  size: string
  stockQuantity: number
}

export type ResolvedProductSize = {
  sizeId: number | null
  sizeLabel: string | null
}

function normalizeSizeLabel(raw: string): string {
  return raw.trim()
}

export function productHasSizes(product: CatalogProduct): boolean {
  return Boolean(product.$preloaded.sizes ? product.sizes.length > 0 : false)
}

export default class CatalogProductSizeService {
  normalizeSizes(sizes: SizeInput[], saleUnit = 'UND'): NormalizedSize[] {
    const normalized: NormalizedSize[] = []
    const seen = new Set<string>()

    for (const row of sizes) {
      const size = normalizeSizeLabel(row.size)
      if (!size) continue

      const key = size.toLowerCase()
      if (seen.has(key)) {
        throw new ProductoTallaDuplicadaException()
      }
      seen.add(key)

      const stockQuantity = normalizeInventoryQuantity(
        Math.max(0, Number(row.stock_quantity) || 0),
        saleUnit
      )
      normalized.push({ size, stockQuantity })
    }

    return normalized
  }

  /**
   * Replace strategy: DELETE all sizes + INSERT. Recalculates product.stock_quantity = sum.
   * sizes=[] clears sizes (caller may keep/set global stock separately).
   */
  async replaceSizes(
    product: CatalogProduct,
    sizes: SizeInput[],
    trx?: TransactionClientContract
  ): Promise<CatalogProductSize[]> {
    if (product.formulaId) {
      throw new ProductoConFormulaNoPermiteTallasException()
    }

    const saleUnit = product.saleUnit ?? 'UND'
    const normalized = this.normalizeSizes(sizes, saleUnit)
    const productId = Number(product.id)

    const run = async (client: TransactionClientContract) => {
      await CatalogProductSize.query({ client }).where('catalogProductId', productId).delete()

      const created: CatalogProductSize[] = []
      for (const row of normalized) {
        const sizeRow = await CatalogProductSize.create(
          {
            catalogProductId: productId,
            size: row.size,
            stockQuantity: formatInventoryQuantityForStorage(row.stockQuantity, saleUnit),
          },
          { client }
        )
        created.push(sizeRow)
      }

      const sum = normalized.reduce((acc, row) => acc + row.stockQuantity, 0)
      product.useTransaction(client)
      product.stockQuantity = formatInventoryQuantityForStorage(sum, saleUnit)
      await product.save()

      return created
    }

    if (trx) {
      return run(trx)
    }

    const { default: db } = await import('@adonisjs/lucid/services/db')
    return db.transaction((client) => run(client))
  }

  async loadSizes(
    productId: number,
    trx?: TransactionClientContract
  ): Promise<CatalogProductSize[]> {
    const query = CatalogProductSize.query()
    if (trx) query.useTransaction(trx)
    return query.where('catalogProductId', productId).orderBy('size', 'asc')
  }

  async resolveForLine(
    product: CatalogProduct,
    input: { catalog_product_size_id?: number | null; size?: string | null },
    trx?: TransactionClientContract
  ): Promise<ResolvedProductSize> {
    const sizes = product.$preloaded.sizes
      ? product.sizes
      : await this.loadSizes(Number(product.id), trx)

    if (sizes.length === 0) {
      return { sizeId: null, sizeLabel: null }
    }

    if (input.catalog_product_size_id) {
      const match = sizes.find((s) => Number(s.id) === Number(input.catalog_product_size_id))
      if (match) {
        return { sizeId: Number(match.id), sizeLabel: match.size }
      }
      throw new ProductoTallaRequeridaException()
    }

    const label = input.size?.trim()
    if (label) {
      const match = sizes.find((s) => s.size.toLowerCase() === label.toLowerCase())
      if (match) {
        return { sizeId: Number(match.id), sizeLabel: match.size }
      }
    }

    throw new ProductoTallaRequeridaException()
  }

  async deductSizeStock(
    sizeId: number,
    quantity: number,
    trx: TransactionClientContract
  ): Promise<CatalogProductSize> {
    const sizeRow = await CatalogProductSize.query({ client: trx })
      .where('id', sizeId)
      .forUpdate()
      .first()

    if (!sizeRow) {
      throw new ProductoTallaRequeridaException()
    }

    const current = Number(sizeRow.stockQuantity)
    const next = Math.max(0, current - quantity)
    sizeRow.useTransaction(trx)
    sizeRow.stockQuantity = next.toFixed(4)
    await sizeRow.save()
    return sizeRow
  }

  async restoreSizeStock(
    sizeId: number,
    quantity: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const sizeRow = await CatalogProductSize.query({ client: trx })
      .where('id', sizeId)
      .forUpdate()
      .first()

    if (!sizeRow) return

    const current = Number(sizeRow.stockQuantity)
    sizeRow.useTransaction(trx)
    sizeRow.stockQuantity = (current + quantity).toFixed(4)
    await sizeRow.save()
  }
}
