import { isCatalogService } from '#constants/catalog_item_kind'
import { formatInventoryQuantityForStorage } from '#constants/inventory_units'
import CatalogProduct from '#models/catalog_product'
import InventoryMovement from '#models/inventory_movement'
import ProductInventoryMovement from '#models/product_inventory_movement'
import type Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import ProductInventoryService from '#services/product_inventory_service'
import { resolveEffectiveFormulaMaterials } from '#services/sale_line_formula'
import { calculateSaleReturnAmounts } from '#utils/sale_return_amounts'
import { calculateProductReturnStockQuantity } from '#utils/sale_return_stock'
import { lineInventoryQuantity } from '#utils/wholesale'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class SaleReturnService {
  private productInventoryService = new ProductInventoryService()
  private sizeService = new CatalogProductSizeService()

  async restoreLineInventory(
    sale: Sale,
    line: SaleLine,
    returnQty: number,
    unit: string,
    trx: TransactionClientContract,
    note: string
  ) {
    if (line.catalogProductId) {
      const product =
        line.catalogProduct ??
        (await CatalogProduct.query({ client: trx })
          .where('id', Number(line.catalogProductId))
          .first())

      if (product && isCatalogService(product)) {
        return
      }

      const inventoryReturnQty = lineInventoryQuantity(
        returnQty,
        Boolean(line.isWholesale),
        line.unitsPerPack
      )
      await this.restoreProductStock(
        Number(sale.id),
        Number(line.catalogProductId),
        inventoryReturnQty,
        trx,
        note
      )
      if (line.catalogProductSizeId) {
        await this.sizeService.restoreSizeStock(
          Number(line.catalogProductSizeId),
          inventoryReturnQty,
          trx
        )
      }
      await this.restoreFormulaMaterials(line, inventoryReturnQty, trx, note)
    }

    if (line.materialId) {
      const inventoryReturnQty = lineInventoryQuantity(
        returnQty,
        Boolean(line.isWholesale),
        line.unitsPerPack
      )
      await InventoryMovement.create(
        {
          materialId: Number(line.materialId),
          type: 'REVERSAL_ADJUSTMENT',
          quantity: formatInventoryQuantityForStorage(inventoryReturnQty, unit),
          note,
        },
        { client: trx }
      )
    }
  }

  async recalculateAmounts(sale: Sale, trx: TransactionClientContract) {
    const lines = await SaleLine.query({ client: trx }).where('saleId', Number(sale.id))
    const amounts = calculateSaleReturnAmounts({
      lines: lines.map((line) => ({
        quantity: Number(line.quantity),
        returnedQuantity: Number(line.returnedQuantity ?? 0),
        unitPriceUsd: Number(line.unitPriceUsd),
      })),
      discountUsd: sale.discountUsd,
      totalUsd: sale.totalUsd,
      paymentType: sale.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH',
      amountPaidUsd: sale.amountPaidUsd,
    })

    sale.discountUsd = amounts.discountUsd
    sale.totalUsd = amounts.totalUsd
    sale.amountPaidUsd = amounts.amountPaidUsd
    sale.balanceUsd = amounts.balanceUsd

    sale.useTransaction(trx)
    await sale.save()
  }

  private async restoreProductStock(
    saleId: number,
    catalogProductId: number,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const saleOutMovements = await ProductInventoryMovement.query({ client: trx })
      .where('saleId', saleId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'SALE_OUT')

    const reversalMovements = await ProductInventoryMovement.query({ client: trx })
      .where('saleId', saleId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'REVERSAL_ADJUSTMENT')

    const toRevert = calculateProductReturnStockQuantity(
      saleOutMovements.map((movement) => movement.quantity),
      reversalMovements.map((movement) => movement.quantity),
      quantity
    )

    if (toRevert <= 0) {
      return
    }

    await this.productInventoryService.registrarMovimiento(
      {
        catalogProductId,
        type: 'REVERSAL_ADJUSTMENT',
        quantity: toRevert,
        saleId,
        note,
      },
      trx
    )
  }

  private async restoreFormulaMaterials(
    line: SaleLine,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const product =
      line.catalogProduct ??
      (line.catalogProductId
        ? await CatalogProduct.query({ client: trx })
            .where('id', Number(line.catalogProductId))
            .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
            .first()
        : null)

    if (!product?.formulaId) {
      return
    }

    if (!line.saleLineMaterials) {
      await line.load('saleLineMaterials', (q) => q.preload('material'))
    }

    for (const formulaItem of resolveEffectiveFormulaMaterials(line, product)) {
      const consumo = quantity * formulaItem.quantityPerUnit
      if (consumo <= 0) {
        continue
      }

      await InventoryMovement.create(
        {
          materialId: formulaItem.materialId,
          type: 'REVERSAL_ADJUSTMENT',
          quantity: consumo.toFixed(3),
          note,
        },
        { client: trx }
      )
    }
  }
}
