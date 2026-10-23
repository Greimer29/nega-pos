import CatalogProduct from '#models/catalog_product'
import CatalogProductQueryService from '#services/catalog_product_query_service'
import type { CatalogProductUpdateResult } from '#services/catalog_product_service'
import FormulaService from '#services/formula_service'
import ProductInventoryService from '#services/product_inventory_service'
import type { CostWarning } from '#types/cost_warning'
import { formatUsdNote } from '#utils/price_change_note'
import db from '@adonisjs/lucid/services/db'

export type ApplyProfitMarginInput = {
  catalog_product_ids: number[]
  profit_margin_percent: number
  userId?: number | null
}

export type ApplyProfitMarginSkipped = {
  id: number
  name: string
  reason: 'NO_COST_PRICE' | 'NOT_FOUND'
}

export type ApplyProfitMarginResult = {
  updatedCount: number
  skipped: ApplyProfitMarginSkipped[]
}

/** Product costs (manual or from the formula) and sale prices derived from a margin. */
export default class CatalogProductPricingService {
  private formulaService = new FormulaService()
  private inventoryService = new ProductInventoryService()
  private queryService = new CatalogProductQueryService()

  async recalcularCosto(id: number): Promise<CatalogProductUpdateResult> {
    const product = await this.queryService.obtener(id)

    if (!product.formulaId) {
      return { product, costWarnings: [] }
    }

    const costUsd = await this.formulaService.calcularCosto(Number(product.formulaId))
    product.costUsd = costUsd.toFixed(4)
    const costWarnings: CostWarning[] = []
    const warning = this.buildCostWarningIfNeeded(product, costUsd)
    if (warning) {
      costWarnings.push(warning)
    }
    await product.save()
    return { product, costWarnings }
  }

  async aplicarMargenGanancia(input: ApplyProfitMarginInput): Promise<ApplyProfitMarginResult> {
    const multiplier = 1 + input.profit_margin_percent / 100
    const skipped: ApplyProfitMarginSkipped[] = []
    let updatedCount = 0

    await db.transaction(async (trx) => {
      for (const productId of input.catalog_product_ids) {
        const product = await CatalogProduct.query({ client: trx })
          .where('id', productId)
          .forUpdate()
          .first()

        if (!product) {
          skipped.push({ id: productId, name: `#${productId}`, reason: 'NOT_FOUND' })
          continue
        }

        const costUsd = product.costUsd
        if (!costUsd || Number(costUsd) <= 0) {
          skipped.push({
            id: Number(product.id),
            name: product.name,
            reason: 'NO_COST_PRICE',
          })
          continue
        }

        const previousSalePrice = product.salePriceUsd
        const newSalePrice = (Number(costUsd) * multiplier).toFixed(4)
        const currentSalePrice = product.salePriceUsd

        if (currentSalePrice !== null && currentSalePrice !== newSalePrice) {
          product.previousSalePriceUsd = currentSalePrice
        } else if (currentSalePrice === null) {
          product.previousSalePriceUsd = null
        }

        product.salePriceUsd = newSalePrice
        product.useTransaction(trx)
        await product.save()

        if (previousSalePrice !== newSalePrice) {
          await this.inventoryService.registrarMovimiento(
            {
              catalogProductId: Number(product.id),
              type: 'PRICE_CHANGE',
              quantity: 0,
              note: `Edición de precio: venta $${formatUsdNote(previousSalePrice)} → $${formatUsdNote(newSalePrice)} (margen)`,
              createdByUserId: input.userId ?? null,
              skipStockUpdate: true,
            },
            trx
          )
        }

        updatedCount++
      }
    })

    return { updatedCount, skipped }
  }

  async resolverCostosUsdEnLote(products: CatalogProduct[]): Promise<Map<number, string>> {
    const costByProductId = new Map<number, string>()
    const costByFormulaId = new Map<number, string>()

    for (const product of products) {
      const productId = Number(product.id)

      if (!product.formulaId) {
        costByProductId.set(productId, this.normalizeCostUsd(product.costUsd))
        continue
      }

      const formulaId = Number(product.formulaId)
      let formulaCost = costByFormulaId.get(formulaId)

      if (formulaCost === undefined) {
        try {
          const formulaCostValue = await this.formulaService.calcularCosto(formulaId)
          formulaCost = formulaCostValue.toFixed(4)
        } catch {
          formulaCost = this.normalizeCostUsd(product.costUsd)
        }
        costByFormulaId.set(formulaId, formulaCost)
      }

      costByProductId.set(productId, formulaCost)
    }

    return costByProductId
  }

  async resolverCostoUsd(product: CatalogProduct): Promise<string> {
    const resolved = await this.resolverCostosUsdEnLote([product])
    return resolved.get(Number(product.id)) ?? this.normalizeCostUsd(product.costUsd)
  }

  private normalizeCostUsd(value: string | null | undefined): string {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed.toFixed(4) : '0.0000'
  }

  buildCostWarningIfNeeded(product: CatalogProduct, costUsd: number): CostWarning | null {
    const salePrice = Number(product.salePriceUsd)
    if (salePrice > 0 && salePrice < costUsd) {
      return {
        product_id: Number(product.id),
        product_name: product.name,
        sale_price_usd: product.salePriceUsd,
        cost_usd: costUsd.toFixed(4),
      }
    }
    return null
  }
}
