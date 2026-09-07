import { Exception } from '@adonisjs/core/exceptions'
import ProductoCatalogoStockFormulaException from '#exceptions/producto_catalogo_stock_formula_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ProductoTallaRequeridaException from '#exceptions/producto_talla_requerida_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import {
  resolveInventoryAdjustment,
  type InventoryAdjustmentMode,
} from '#constants/inventory_adjustment'
import {
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
} from '#constants/inventory_units'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import ProductInventoryMovement, {
  type ProductMovementType,
} from '#models/product_inventory_movement'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type RegistrarMovimientoProductoInput = {
  catalogProductId: number
  type: ProductMovementType
  quantity: number
  note?: string | null
  purchaseItemId?: number | null
  orderId?: number | null
  saleId?: number | null
  createdByUserId?: number | null
  /** Si true, solo escribe el historial (el stock ya fue aplicado). */
  skipStockUpdate?: boolean
}

export type AjusteProductoInput = {
  mode: InventoryAdjustmentMode
  quantity: number
  note?: string
  catalog_product_size_id?: number | null
  created_by_user_id?: number | null
}

export type BulkAjusteProductoItemInput = {
  catalog_product_id: number
  catalog_product_size_id?: number | null
  quantity: number
}

export type BulkAjusteProductoInput = {
  mode: InventoryAdjustmentMode
  note?: string
  created_by_user_id?: number | null
  items: BulkAjusteProductoItemInput[]
}

export default class ProductInventoryService {
  async listarMovimientos(catalogProductId: number): Promise<ProductInventoryMovement[]> {
    return ProductInventoryMovement.query()
      .where('catalogProductId', catalogProductId)
      .preload('createdBy')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
  }

  async ajustar(
    catalogProductId: number,
    input: AjusteProductoInput,
    trx?: TransactionClientContract
  ): Promise<ProductInventoryMovement> {
    const run = async (client: TransactionClientContract) => {
      const product = await CatalogProduct.query({ client })
        .where('id', catalogProductId)
        .preload('sizes')
        .forUpdate()
        .first()

      if (!product) {
        throw new ProductoCatalogoNoEncontradoException()
      }

      if (product.formulaId) {
        throw new ProductoCatalogoStockFormulaException()
      }

      const unit = product.saleUnit ?? 'UND'
      const quantity = normalizeInventoryQuantity(input.quantity, unit)
      const note = input.note?.trim() || null
      const sizes = product.sizes ?? []

      if (sizes.length > 0) {
        return this.ajustarConTalla(
          product,
          input.mode,
          quantity,
          note,
          input.catalog_product_size_id,
          input.created_by_user_id ?? null,
          client
        )
      }

      if (input.catalog_product_size_id) {
        throw new ProductoTallaRequeridaException()
      }

      const stockActual = Number(product.stockQuantity)
      const { delta, movementType } = resolveInventoryAdjustment(input.mode, quantity, stockActual)

      return this.registrarMovimiento(
        {
          catalogProductId,
          type: movementType,
          quantity: delta,
          note,
          createdByUserId: input.created_by_user_id ?? null,
        },
        client
      )
    }

    if (trx) {
      return run(trx)
    }

    return db.transaction(run)
  }

  async ajustarEnLote(input: BulkAjusteProductoInput): Promise<ProductInventoryMovement[]> {
    if (input.items.length === 0) {
      throw new Exception('Agregá al menos un producto al movimiento', {
        status: 422,
        code: 'BULK_ADJUSTMENT_EMPTY',
      })
    }

    const seen = new Set<string>()
    for (const item of input.items) {
      const key = `${item.catalog_product_id}:${item.catalog_product_size_id ?? 'none'}`
      if (seen.has(key)) {
        throw new Exception('Hay productos o tallas duplicadas en el movimiento', {
          status: 422,
          code: 'BULK_ADJUSTMENT_DUPLICATE',
        })
      }
      seen.add(key)
    }

    return db.transaction(async (trx) => {
      const movements: ProductInventoryMovement[] = []
      const note = input.note?.trim() || undefined

      for (const item of input.items) {
        const movement = await this.ajustar(
          item.catalog_product_id,
          {
            mode: input.mode,
            quantity: item.quantity,
            note,
            catalog_product_size_id: item.catalog_product_size_id,
            created_by_user_id: input.created_by_user_id,
          },
          trx
        )
        movements.push(movement)
      }

      return movements
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
        !input.skipStockUpdate &&
        product.formulaId &&
        (input.type === 'PURCHASE_IN' ||
          input.type === 'MANUAL_CARGO' ||
          input.type === 'MANUAL_DESCARGO' ||
          input.type === 'MANUAL_ADJUSTMENT' ||
          input.type === 'SALE_OUT')
      ) {
        throw new ProductoCatalogoStockFormulaException()
      }

      const unit = product.saleUnit ?? 'UND'
      const movementQty = normalizeInventoryQuantity(input.quantity, unit)

      if (!input.skipStockUpdate && input.type !== 'PRICE_CHANGE') {
        const stockActual = Number(product.stockQuantity)
        const nuevoStock = normalizeInventoryQuantity(stockActual + movementQty, unit)

        if (nuevoStock < 0) {
          throw new StockInsuficienteException([
            {
              material_id: Number(product.id),
              name: product.name,
              stock_actual: stockActual,
              consumo_proyectado: Math.abs(movementQty),
              faltante: Math.abs(nuevoStock),
            },
          ])
        }

        product.stockQuantity = formatInventoryQuantityForStorage(nuevoStock, unit)
        product.useTransaction(client)
        await product.save()
      }

      return ProductInventoryMovement.create(
        {
          catalogProductId: input.catalogProductId,
          type: input.type,
          quantity: formatInventoryQuantityForStorage(movementQty, unit),
          note: input.note?.trim() || null,
          purchaseItemId: input.purchaseItemId ?? null,
          orderId: input.orderId ?? null,
          saleId: input.saleId ?? null,
          createdByUserId: input.createdByUserId ?? null,
        },
        { client }
      ).then(async (movement) => {
        if (input.createdByUserId) {
          await movement.load('createdBy')
        }
        return movement
      })
    }

    if (trx) {
      return run(trx)
    }

    return db.transaction(run)
  }

  private async ajustarConTalla(
    product: CatalogProduct,
    mode: InventoryAdjustmentMode,
    quantity: number,
    note: string | null,
    sizeId: number | null | undefined,
    createdByUserId: number | null,
    client: TransactionClientContract
  ): Promise<ProductInventoryMovement> {
    if (!sizeId) {
      throw new ProductoTallaRequeridaException()
    }

    const sizeRow = await CatalogProductSize.query({ client })
      .where('id', sizeId)
      .where('catalogProductId', Number(product.id))
      .forUpdate()
      .first()

    if (!sizeRow) {
      throw new ProductoTallaRequeridaException()
    }

    const unit = product.saleUnit ?? 'UND'
    const stockActual = Number(sizeRow.stockQuantity)
    const { delta, movementType } = resolveInventoryAdjustment(mode, quantity, stockActual)
    const nuevoSizeStock = normalizeInventoryQuantity(stockActual + delta, unit)

    if (nuevoSizeStock < 0) {
      throw new StockInsuficienteException([
        {
          material_id: Number(product.id),
          name: `${product.name} (${sizeRow.size})`,
          stock_actual: stockActual,
          consumo_proyectado: Math.abs(delta),
          faltante: Math.abs(nuevoSizeStock),
        },
      ])
    }

    sizeRow.useTransaction(client)
    sizeRow.stockQuantity = formatInventoryQuantityForStorage(nuevoSizeStock, unit)
    await sizeRow.save()

    const sizes = await CatalogProductSize.query({ client }).where(
      'catalogProductId',
      Number(product.id)
    )
    const total = sizes.reduce((sum, row) => sum + Number(row.stockQuantity), 0)

    product.useTransaction(client)
    product.stockQuantity = formatInventoryQuantityForStorage(total, unit)
    await product.save()

    return ProductInventoryMovement.create(
      {
        catalogProductId: Number(product.id),
        type: movementType,
        quantity: formatInventoryQuantityForStorage(delta, unit),
        note,
        purchaseItemId: null,
        orderId: null,
        saleId: null,
        createdByUserId,
      },
      { client }
    ).then(async (movement) => {
      if (createdByUserId) {
        await movement.load('createdBy')
      }
      return movement
    })
  }
}
