import ProductoCatalogoStockFormulaException from '#exceptions/producto_catalogo_stock_formula_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import {
  resolveInventoryAdjustment,
  type InventoryAdjustmentMode,
} from '#constants/inventory_adjustment'
import CatalogProduct from '#models/catalog_product'
import ProductInventoryMovement, {
  type ProductMovementType,
} from '#models/product_inventory_movement'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type RegistrarMovimientoProductoInput = {
  catalogProductId: number
  type: ProductMovementType
  quantity: number
  note?: string | null
  purchaseItemId?: number | null
  orderId?: number | null
  saleId?: number | null
}

export type AjusteProductoInput = {
  mode: InventoryAdjustmentMode
  quantity: number
  note?: string
}

export default class ProductInventoryService {
  async listarMovimientos(catalogProductId: number): Promise<ProductInventoryMovement[]> {
    return ProductInventoryMovement.query()
      .where('catalogProductId', catalogProductId)
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
  }

  async ajustar(
    catalogProductId: number,
    input: AjusteProductoInput
  ): Promise<ProductInventoryMovement> {
    const product = await CatalogProduct.find(catalogProductId)
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    if (product.formulaId) {
      throw new ProductoCatalogoStockFormulaException()
    }

    const stockActual = Number(product.stockQuantity)
    const { delta, movementType } = resolveInventoryAdjustment(
      input.mode,
      input.quantity,
      stockActual
    )

    return this.registrarMovimiento({
      catalogProductId,
      type: movementType,
      quantity: delta,
      note: input.note?.trim() || null,
    })
  }

  async registrarMovimiento(
    input: RegistrarMovimientoProductoInput,
    trx?: TransactionClientContract
  ): Promise<ProductInventoryMovement> {
    const run = async (client: TransactionClientContract) => {
      const product = await CatalogProduct.query({ client })
        .where('id', input.catalogProductId)
        .forUpdate()
        .first()

      if (!product) {
        throw new ProductoCatalogoNoEncontradoException()
      }

      if (
        product.formulaId &&
        (input.type === 'PURCHASE_IN' ||
          input.type === 'MANUAL_CARGO' ||
          input.type === 'MANUAL_DESCARGO' ||
          input.type === 'MANUAL_ADJUSTMENT' ||
          input.type === 'SALE_OUT')
      ) {
        throw new ProductoCatalogoStockFormulaException()
      }

      const stockActual = Number(product.stockQuantity)
      const nuevoStock = stockActual + input.quantity

      if (nuevoStock < 0) {
        throw new StockInsuficienteException([
          {
            material_id: Number(product.id),
            name: product.name,
            stock_actual: stockActual,
            consumo_proyectado: Math.abs(input.quantity),
            faltante: Math.abs(nuevoStock),
          },
        ])
      }

      product.stockQuantity = nuevoStock.toFixed(3)
      product.useTransaction(client)
      await product.save()

      return ProductInventoryMovement.create(
        {
          catalogProductId: input.catalogProductId,
          type: input.type,
          quantity: input.quantity.toFixed(3),
          note: input.note?.trim() || null,
          purchaseItemId: input.purchaseItemId ?? null,
          orderId: input.orderId ?? null,
          saleId: input.saleId ?? null,
        },
        { client }
      )
    }

    if (trx) {
      return run(trx)
    }

    const dbModule = await import('@adonisjs/lucid/services/db')
    return dbModule.default.transaction(run)
  }
}
