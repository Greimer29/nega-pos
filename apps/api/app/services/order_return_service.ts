import CatalogProduct from '#models/catalog_product'
import InventoryMovement from '#models/inventory_movement'
import type Order from '#models/order'
import OrderLine from '#models/order_line'
import ProductInventoryMovement from '#models/product_inventory_movement'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import { formatCantidadReversion } from '#services/order_stock'
import ProductInventoryService from '#services/product_inventory_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class OrderReturnService {
  private productInventoryService = new ProductInventoryService()
  private sizeService = new CatalogProductSizeService()

  async restoreLineInventory(
    order: Order,
    line: OrderLine,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    await this.restoreProductStock(
      Number(order.id),
      Number(line.catalogProductId),
      quantity,
      trx,
      note
    )

    if (line.catalogProductSizeId) {
      await this.sizeService.restoreSizeStock(Number(line.catalogProductSizeId), quantity, trx)
    }

    await this.restoreFormulaMaterials(order, line, quantity, trx, note)
  }

  /**
   * Full return without explicit lines: if any production material is still not fully
   * reversed, every ORDER_OUT movement of the order is reversed.
   */
  async restoreUnreversedMaterials(order: Order, trx: TransactionClientContract, note: string) {
    const salidas = await InventoryMovement.query({ client: trx })
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    if (salidas.length === 0) {
      return
    }

    const reversiones = await InventoryMovement.query({ client: trx })
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')

    const consumedByMaterial = new Map<number, number>()
    for (const salida of salidas) {
      const materialId = Number(salida.materialId)
      consumedByMaterial.set(
        materialId,
        (consumedByMaterial.get(materialId) ?? 0) + Math.abs(Number(salida.quantity))
      )
    }

    const revertedByMaterial = new Map<number, number>()
    for (const reversion of reversiones) {
      const materialId = Number(reversion.materialId)
      revertedByMaterial.set(
        materialId,
        (revertedByMaterial.get(materialId) ?? 0) + Math.abs(Number(reversion.quantity))
      )
    }

    let needsFullRevert = false
    for (const [materialId, consumed] of consumedByMaterial) {
      const reverted = revertedByMaterial.get(materialId) ?? 0
      if (reverted + 0.0005 < consumed) {
        needsFullRevert = true
        break
      }
    }

    if (needsFullRevert) {
      await this.revertMaterialMovements(Number(order.id), trx, note)
    }
  }

  async revertMaterialMovements(orderId: number, trx: TransactionClientContract, note: string) {
    const salidas = await InventoryMovement.query({ client: trx })
      .where('orderId', orderId)
      .where('type', 'ORDER_OUT')

    for (const salida of salidas) {
      await InventoryMovement.create(
        {
          materialId: Number(salida.materialId),
          type: 'REVERSAL_ADJUSTMENT',
          quantity: formatCantidadReversion(salida.quantity),
          orderId,
          note,
        },
        { client: trx }
      )
    }
  }

  /** Cancellation: puts back every product SALE_OUT and the pending size stock of each line. */
  async revertProductStock(order: Order, trx: TransactionClientContract, note: string) {
    const salidas = await ProductInventoryMovement.query({ client: trx })
      .where('orderId', Number(order.id))
      .where('type', 'SALE_OUT')

    for (const movimiento of salidas) {
      const qty = Math.abs(Number(movimiento.quantity))
      await this.productInventoryService.registrarMovimiento(
        {
          catalogProductId: Number(movimiento.catalogProductId),
          type: 'REVERSAL_ADJUSTMENT',
          quantity: qty,
          orderId: Number(order.id),
          note,
        },
        trx
      )
    }

    const lines =
      order.orderLines ??
      (await OrderLine.query({ client: trx }).where('orderId', Number(order.id)))

    for (const line of lines) {
      if (!line.catalogProductSizeId) continue
      const remaining = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
      if (remaining <= 0) continue
      await this.sizeService.restoreSizeStock(Number(line.catalogProductSizeId), remaining, trx)
    }
  }

  /** Sets totals and balance from the still-active quantities; the caller saves the order. */
  async recalculateAmounts(order: Order, trx: TransactionClientContract) {
    const lines = await OrderLine.query({ client: trx }).where('orderId', Number(order.id))

    let activeTotal = 0
    let activeQty = 0

    for (const line of lines) {
      const active = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
      if (active <= 0) {
        continue
      }
      activeTotal += active * Number(line.unitPriceUsd)
      activeQty += active
    }

    order.totalPrice = activeTotal.toFixed(4)
    order.totalQuantity = Math.max(0, Math.ceil(activeQty))

    const paid = Number(order.amountPaidUsd ?? 0)

    if (order.paymentType === 'CREDIT') {
      order.balanceUsd = Math.max(0, activeTotal - paid).toFixed(4)
    } else {
      order.amountPaidUsd = activeTotal.toFixed(4)
      order.balanceUsd = '0.0000'
    }
  }

  private async restoreProductStock(
    orderId: number,
    catalogProductId: number,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const salidas = await ProductInventoryMovement.query({ client: trx })
      .where('orderId', orderId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'SALE_OUT')

    let soldTotal = 0
    for (const salida of salidas) {
      soldTotal += Math.abs(Number(salida.quantity))
    }

    const reversiones = await ProductInventoryMovement.query({ client: trx })
      .where('orderId', orderId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'REVERSAL_ADJUSTMENT')

    let reversedTotal = 0
    for (const reversion of reversiones) {
      reversedTotal += Number(reversion.quantity)
    }

    const toReverse = Math.min(quantity, Math.max(0, soldTotal - reversedTotal))
    if (toReverse <= 0) {
      return
    }

    await this.productInventoryService.registrarMovimiento(
      {
        catalogProductId,
        type: 'REVERSAL_ADJUSTMENT',
        quantity: toReverse,
        orderId,
        note,
      },
      trx
    )
  }

  private async restoreFormulaMaterials(
    order: Order,
    line: OrderLine,
    returnQty: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const salidas = await InventoryMovement.query({ client: trx })
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    if (salidas.length === 0) {
      return
    }

    const product =
      line.catalogProduct ??
      (await CatalogProduct.query({ client: trx })
        .where('id', Number(line.catalogProductId))
        .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        .first())

    const formulaMaterials = product?.formula?.materials
    if (!formulaMaterials?.length) {
      return
    }

    for (const formulaItem of formulaMaterials) {
      const materialId = Number(formulaItem.materialId)
      const consumoDevuelto = returnQty * Number(formulaItem.quantity)
      if (consumoDevuelto <= 0) {
        continue
      }

      await InventoryMovement.create(
        {
          materialId,
          type: 'REVERSAL_ADJUSTMENT',
          quantity: consumoDevuelto.toFixed(3),
          orderId: Number(order.id),
          note,
        },
        { client: trx }
      )
    }
  }
}
