import type CatalogProduct from '#models/catalog_product'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Order from '#models/order'
import { buildOrderConsumoMap } from '#services/order_stock'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type CatalogProductStockSource = 'manual' | 'formula'

export type CatalogProductStockResult = {
  quantity: number
  source: CatalogProductStockSource
}

export default class CatalogProductStockService {
  resolveSource(product: CatalogProduct): CatalogProductStockSource {
    return product.formulaId ? 'formula' : 'manual'
  }

  async calcularStockDisponible(
    product: CatalogProduct,
    options?: { excludeOrderId?: number; trx?: TransactionClientContract }
  ): Promise<CatalogProductStockResult> {
    if (!product.formulaId) {
      return {
        quantity: Number(product.stockQuantity),
        source: 'manual',
      }
    }

    const formulaMaterials = await this.resolveFormulaMaterials(product, options?.trx)

    if (formulaMaterials.length === 0) {
      return { quantity: 0, source: 'formula' }
    }

    const materialIds = formulaMaterials.map((item) => Number(item.materialId))
    const stockFisico = await this.getStockFisicoPorMaterialIds(materialIds, options?.trx)
    const comprometido = await this.calcularMaterialComprometido(options?.excludeOrderId)

    let minUnits = Number.POSITIVE_INFINITY

    for (const formulaItem of formulaMaterials) {
      const qtyPerUnit = Number(formulaItem.quantity)
      if (qtyPerUnit <= 0) {
        continue
      }

      const materialId = Number(formulaItem.materialId)
      const fisico = stockFisico.get(materialId) ?? 0
      const reservado = comprometido.get(materialId) ?? 0
      const disponible = fisico - reservado
      const units = Math.floor(disponible / qtyPerUnit)
      minUnits = Math.min(minUnits, units)
    }

    return {
      quantity: Number.isFinite(minUnits) ? Math.max(0, minUnits) : 0,
      source: 'formula',
    }
  }

  async calcularStockForProducts(
    products: CatalogProduct[],
    options?: { excludeOrderId?: number; trx?: TransactionClientContract }
  ): Promise<Map<number, CatalogProductStockResult>> {
    const results = new Map<number, CatalogProductStockResult>()
    const comprometido = await this.calcularMaterialComprometido(options?.excludeOrderId)

    const formulaMaterialIds = new Set<number>()
    const formulaItemsByProductId = new Map<number, FormulaMaterial[]>()

    for (const product of products) {
      if (!product.formulaId) {
        results.set(Number(product.id), {
          quantity: Number(product.stockQuantity),
          source: 'manual',
        })
        continue
      }

      const formulaMaterials = await this.resolveFormulaMaterials(product, options?.trx)
      formulaItemsByProductId.set(Number(product.id), formulaMaterials)

      if (formulaMaterials.length === 0) {
        results.set(Number(product.id), { quantity: 0, source: 'formula' })
        continue
      }

      for (const item of formulaMaterials) {
        formulaMaterialIds.add(Number(item.materialId))
      }
    }

    const stockFisico = await this.getStockFisicoPorMaterialIds(
      [...formulaMaterialIds],
      options?.trx
    )

    for (const [productId, formulaMaterials] of formulaItemsByProductId) {
      let minUnits = Number.POSITIVE_INFINITY

      for (const formulaItem of formulaMaterials) {
        const qtyPerUnit = Number(formulaItem.quantity)
        if (qtyPerUnit <= 0) {
          continue
        }

        const materialId = Number(formulaItem.materialId)
        const fisico = stockFisico.get(materialId) ?? 0
        const reservado = comprometido.get(materialId) ?? 0
        const disponible = fisico - reservado
        const units = Math.floor(disponible / qtyPerUnit)
        minUnits = Math.min(minUnits, units)
      }

      results.set(productId, {
        quantity: Number.isFinite(minUnits) ? Math.max(0, minUnits) : 0,
        source: 'formula',
      })
    }

    return results
  }

  private async resolveFormulaMaterials(
    product: CatalogProduct,
    trx?: TransactionClientContract
  ): Promise<FormulaMaterial[]> {
    if (product.formula?.materials?.length) {
      return product.formula.materials
    }

    if (!product.formulaId) {
      return []
    }

    const query = FormulaMaterial.query()
      .where('formulaId', Number(product.formulaId))
      .preload('material')

    if (trx) {
      query.useTransaction(trx)
    }

    return query
  }

  private async getStockFisicoPorMaterialIds(
    materialIds: number[],
    trx?: TransactionClientContract
  ): Promise<Map<number, number>> {
    const stockByMaterialId = new Map<number, number>()

    for (const materialId of materialIds) {
      if (stockByMaterialId.has(materialId)) {
        continue
      }

      const query = InventoryMovement.query()
        .where('materialId', materialId)
        .sum('quantity as total')

      if (trx) {
        query.useTransaction(trx)
      }

      const result = await query.first()
      stockByMaterialId.set(materialId, Number(result?.$extras.total ?? 0))
    }

    return stockByMaterialId
  }

  private async calcularMaterialComprometido(
    excludeOrderId?: number
  ): Promise<Map<number, number>> {
    const query = Order.query()
      .whereIn('status', ['DRAFT', 'CONFIRMED'])
      .preload('orderLines', (q) =>
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
      )
      .preload('orderMaterials', (q) => q.preload('material'))

    if (excludeOrderId) {
      query.whereNot('id', excludeOrderId)
    }

    const orders = await query
    const comprometido = new Map<number, number>()

    for (const order of orders) {
      const { consumoPorMaterial } = buildOrderConsumoMap(order)

      for (const [materialId, data] of consumoPorMaterial) {
        comprometido.set(materialId, (comprometido.get(materialId) ?? 0) + data.cantidadTotal)
      }
    }

    return comprometido
  }
}
