import MachineNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ProductoCatalogoStockFormulaException from '#exceptions/producto_catalogo_stock_formula_exception'
import StockInsuficienteDevolucionException from '#exceptions/stock_insuficiente_devolucion_exception'
import CatalogProduct from '#models/catalog_product'
import InventoryMovement from '#models/inventory_movement'
import Machine from '#models/machine'
import Material from '#models/material'
import Purchase from '#models/purchase'
import type PurchaseItem from '#models/purchase_item'
import FormulaService from '#services/formula_service'
import MaterialService from '#services/material_service'
import ProductInventoryService from '#services/product_inventory_service'
import type { CostWarning } from '#types/cost_warning'
import { lineInventoryQuantity } from '#utils/wholesale'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type ConfirmedItemsResult = {
  totalUsd: number
  materialIds: number[]
}

export default class PurchaseInventoryService {
  private materialService = new MaterialService()
  private formulaService = new FormulaService()
  private productInventoryService = new ProductInventoryService()

  /**
   * Registers stock entries and purchase costs for each item. Machine items only set the
   * acquisition cost; non-inventory purchases still add every subtotal to the total.
   */
  async applyConfirmedItems(
    purchase: Purchase,
    items: PurchaseItem[],
    affectsInventory: boolean,
    trx: TransactionClientContract
  ): Promise<ConfirmedItemsResult> {
    let totalUsd = 0
    const materialIds = new Set<number>()

    for (const item of items) {
      const unitPriceUsd = item.unitPriceUsd ?? '0'
      const subtotalUsd = item.subtotalUsd ?? '0'

      totalUsd += Number(subtotalUsd)

      if (item.machineId) {
        await this.applyMachineAcquisitionCost(item, trx)
        continue
      }

      if (!affectsInventory) {
        continue
      }

      const inventoryQty = lineInventoryQuantity(
        Number(item.quantity),
        Boolean(item.isWholesale),
        item.unitsPerPack
      )

      if (item.materialId) {
        await InventoryMovement.create(
          {
            materialId: Number(item.materialId),
            type: 'PURCHASE_IN',
            quantity: this.formatCantidad(inventoryQty),
            purchaseItemId: Number(item.id),
          },
          { client: trx }
        )

        const material = await Material.query({ client: trx })
          .where('id', Number(item.materialId))
          .forUpdate()
          .first()

        if (!material) {
          throw new MaterialNoEncontradoException()
        }

        material.lastPurchasePrice = item.unitPriceBs
        material.lastPurchaseDate = purchase.date

        this.applyConfirmedPurchaseCost(material, item, unitPriceUsd)

        material.useTransaction(trx)
        await material.save()
        materialIds.add(Number(item.materialId))
      }

      if (item.catalogProductId) {
        const product = await CatalogProduct.query({ client: trx })
          .where('id', Number(item.catalogProductId))
          .forUpdate()
          .first()

        if (!product) {
          throw new ProductoCatalogoNoEncontradoException()
        }

        if (product.formulaId) {
          throw new ProductoCatalogoStockFormulaException()
        }

        await this.productInventoryService.registrarMovimiento(
          {
            catalogProductId: Number(item.catalogProductId),
            type: 'PURCHASE_IN',
            quantity: inventoryQty,
            purchaseItemId: Number(item.id),
            note: `Compra #${purchase.id}`,
          },
          trx
        )

        // registrarMovimiento guarda stock en otra instancia; refrescar antes del costo.
        await product.refresh()
        this.applyConfirmedPurchaseCost(product, item, unitPriceUsd)
        product.useTransaction(trx)
        await product.save()
      }
    }

    return { totalUsd, materialIds: [...materialIds] }
  }

  /** One warning per affected product, even when several purchased materials feed it. */
  async recalculateFormulaCosts(
    materialIds: number[],
    trx: TransactionClientContract
  ): Promise<CostWarning[]> {
    const costWarnings: CostWarning[] = []
    const seenProductIds = new Set<number>()

    for (const materialId of materialIds) {
      const warnings = await this.formulaService.recalcularCostosPorMaterial(materialId, trx)
      for (const warning of warnings) {
        if (!seenProductIds.has(warning.product_id)) {
          seenProductIds.add(warning.product_id)
          costWarnings.push(warning)
        }
      }
    }

    return costWarnings
  }

  async assertReturnableStock(items: PurchaseItem[], trx: TransactionClientContract) {
    const faltantes: Array<{
      material_id: number
      material_name: string
      required: string
      available: string
    }> = []

    for (const item of items) {
      if (item.materialId) {
        await Material.query({ client: trx })
          .where('id', Number(item.materialId))
          .forUpdate()
          .first()

        const stock = await this.materialService.calcularStock(Number(item.materialId), trx)
        const required = lineInventoryQuantity(
          Number(item.quantity),
          Boolean(item.isWholesale),
          item.unitsPerPack
        )

        if (stock < required) {
          faltantes.push({
            material_id: Number(item.materialId),
            material_name: item.material?.name ?? `Material ${item.materialId}`,
            required: this.formatCantidad(required),
            available: this.formatCantidad(stock),
          })
        }
      }

      if (item.catalogProductId) {
        await item.load('catalogProduct')
        const product = await CatalogProduct.query({ client: trx })
          .where('id', Number(item.catalogProductId))
          .forUpdate()
          .first()

        const stock = product ? Number(product.stockQuantity) : 0
        const required = lineInventoryQuantity(
          Number(item.quantity),
          Boolean(item.isWholesale),
          item.unitsPerPack
        )

        if (stock < required) {
          faltantes.push({
            material_id: Number(item.catalogProductId),
            material_name: item.catalogProduct?.name ?? `Producto ${item.catalogProductId}`,
            required: this.formatCantidad(required),
            available: this.formatCantidad(stock),
          })
        }
      }
    }

    if (faltantes.length > 0) {
      throw new StockInsuficienteDevolucionException(faltantes)
    }
  }

  async reverseItems(purchase: Purchase, items: PurchaseItem[], trx: TransactionClientContract) {
    for (const item of items) {
      if (item.machineId) {
        await this.clearMachineAcquisitionCost(Number(item.machineId), trx)
        continue
      }

      const qty = lineInventoryQuantity(
        Number(item.quantity),
        Boolean(item.isWholesale),
        item.unitsPerPack
      )

      if (item.materialId) {
        await InventoryMovement.create(
          {
            materialId: Number(item.materialId),
            type: 'REVERSAL_ADJUSTMENT',
            quantity: (-qty).toFixed(3),
            purchaseItemId: Number(item.id),
            note: `Devolución compra #${purchase.id}`,
          },
          { client: trx }
        )
      }

      if (item.catalogProductId) {
        await this.productInventoryService.registrarMovimiento(
          {
            catalogProductId: Number(item.catalogProductId),
            type: 'REVERSAL_ADJUSTMENT',
            quantity: -qty,
            purchaseItemId: Number(item.id),
            note: `Devolución compra #${purchase.id}`,
          },
          trx
        )
      }
    }
  }

  private async applyMachineAcquisitionCost(item: PurchaseItem, trx: TransactionClientContract) {
    if (!item.machineId) return

    const machine = await Machine.query({ client: trx })
      .where('id', Number(item.machineId))
      .forUpdate()
      .first()

    if (!machine) {
      throw new MachineNoEncontradaException()
    }

    const costUsd = Number(item.unitPriceUsd ?? 0).toFixed(2)
    machine.acquisitionCost = costUsd
    machine.acquisitionAmountNative = null
    machine.entryCurrencyCode = null
    machine.entryRate = null
    machine.isCredit = false
    machine.amountPaidUsd = Number(item.unitPriceUsd ?? 0).toFixed(4)
    machine.balanceUsd = '0.0000'
    machine.creditDueDate = null
    if (!machine.acquisitionDate) {
      const purchase = await Purchase.query({ client: trx })
        .where('id', Number(item.purchaseId))
        .first()
      if (purchase) {
        machine.acquisitionDate = purchase.date
      }
    }
    machine.useTransaction(trx)
    await machine.save()
  }

  private async clearMachineAcquisitionCost(machineId: number, trx: TransactionClientContract) {
    const machine = await Machine.query({ client: trx }).where('id', machineId).forUpdate().first()
    if (!machine) return

    machine.acquisitionCost = null
    machine.acquisitionAmountNative = null
    machine.entryCurrencyCode = null
    machine.entryRate = null
    machine.amountPaidUsd = '0.0000'
    machine.balanceUsd = '0.0000'
    machine.isCredit = false
    machine.creditDueDate = null
    machine.useTransaction(trx)
    await machine.save()
  }

  private applyConfirmedPurchaseCost(
    item: CatalogProduct | Material,
    line: PurchaseItem,
    unitPriceUsd: string
  ) {
    // No usar `'costUsd' in item`: en Lucid con `declare` el `in` no detecta la columna
    // y el costo del producto nunca se persistía al confirmar la compra.
    if (item instanceof CatalogProduct) {
      if (line.isWholesale) {
        const packCost = Number(unitPriceUsd)
        const unitsPerPack = Number(line.unitsPerPack)
        const unitCost = (packCost / unitsPerPack).toFixed(4)
        item.wholesaleCostUsd = packCost.toFixed(4)
        item.costUsd = unitCost
        return
      }
      item.costUsd = unitPriceUsd
      return
    }

    if (line.isWholesale) {
      const packCost = Number(unitPriceUsd)
      const unitsPerPack = Number(line.unitsPerPack)
      const unitCost = (packCost / unitsPerPack).toFixed(4)
      item.wholesaleCostUsd = packCost.toFixed(4)
      if (item.lastPurchasePriceUsd !== null && item.lastPurchasePriceUsd !== unitCost) {
        item.previousPurchasePriceUsd = item.lastPurchasePriceUsd
      }
      item.lastPurchasePriceUsd = unitCost
      return
    }

    if (item.lastPurchasePriceUsd !== null && item.lastPurchasePriceUsd !== unitPriceUsd) {
      item.previousPurchasePriceUsd = item.lastPurchasePriceUsd
    }
    item.lastPurchasePriceUsd = unitPriceUsd
  }

  private formatCantidad(quantity: number): string {
    return quantity.toFixed(2)
  }
}
