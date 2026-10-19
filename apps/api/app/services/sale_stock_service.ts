import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import { isCatalogService } from '#constants/catalog_item_kind'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import type Sale from '#models/sale'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import MaterialService from '#services/material_service'
import ProductInventoryService from '#services/product_inventory_service'
import { formatCantidadMovimiento } from '#services/order_stock'
import { resolveEffectiveFormulaMaterials } from '#services/sale_line_formula'
import { formulaMaterialInventoryQuantity, lineInventoryQuantity } from '#utils/wholesale'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class SaleStockService {
  private materialService = new MaterialService()
  private productInventoryService = new ProductInventoryService()
  private catalogProductStockService = new CatalogProductStockService()
  private sizeService = new CatalogProductSizeService()

  async deductSaleStock(
    sale: Sale,
    trx: TransactionClientContract,
    options?: { allowInsufficient?: boolean }
  ): Promise<boolean> {
    const saleId = Number(sale.id)
    let needsReview = false
    const allowInsufficient = Boolean(options?.allowInsufficient)

    for (const line of sale.saleLines) {
      const quantity = lineInventoryQuantity(
        Number(line.quantity),
        Boolean(line.isWholesale),
        line.unitsPerPack
      )

      if (line.catalogProductId) {
        const product =
          line.catalogProduct ??
          (await CatalogProduct.query({ client: trx })
            .where('id', Number(line.catalogProductId))
            .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
            .forUpdate()
            .first())

        if (!product) {
          throw new ProductoCatalogoNoEncontradoException()
        }

        if (isCatalogService(product)) {
          continue
        }

        const { quantity: available } =
          await this.catalogProductStockService.calcularStockDisponible(product, { trx })

        if (quantity > available) {
          if (!allowInsufficient) {
            throw new StockInsuficienteException([
              {
                material_id: Number(product.id),
                name: product.name,
                stock_actual: available,
                consumo_proyectado: quantity,
                faltante: quantity - available,
              },
            ])
          }
          needsReview = true
        }

        if (line.catalogProductSizeId) {
          const sizeRow = await CatalogProductSize.query({ client: trx })
            .where('id', Number(line.catalogProductSizeId))
            .forUpdate()
            .first()
          const sizeStock = sizeRow ? Number(sizeRow.stockQuantity) : 0
          if (quantity > sizeStock) {
            if (!allowInsufficient) {
              throw new StockInsuficienteException([
                {
                  material_id: Number(product.id),
                  name: `${product.name}${sizeRow ? ` (${sizeRow.size})` : ''}`,
                  stock_actual: sizeStock,
                  consumo_proyectado: quantity,
                  faltante: quantity - sizeStock,
                },
              ])
            }
            needsReview = true
          }
        }

        if (product.formulaId) {
          const formulaMaterials = resolveEffectiveFormulaMaterials(line, product)
          const wholesaleNote =
            line.isWholesale && line.unitsPerPack
              ? ` · mayorista (${line.quantity} paq × ${line.unitsPerPack} und)`
              : ''
          for (const formulaItem of formulaMaterials) {
            const materialId = formulaItem.materialId
            const consumption = formulaMaterialInventoryQuantity(
              Number(line.quantity),
              Boolean(line.isWholesale),
              line.unitsPerPack,
              formulaItem.quantityPerUnit
            )
            if (consumption <= 0) {
              continue
            }

            const currentStock = await this.materialService.calcularStock(materialId, trx)
            if (currentStock < consumption) {
              if (!allowInsufficient) {
                const material = formulaItem.material ?? (await Material.findOrFail(materialId))
                throw new StockInsuficienteException([
                  {
                    material_id: materialId,
                    name: material.name,
                    stock_actual: currentStock,
                    consumo_proyectado: consumption,
                    faltante: consumption - currentStock,
                  },
                ])
              }
              needsReview = true
            }

            await InventoryMovement.create(
              {
                materialId,
                type: 'SALE_OUT',
                quantity: formatCantidadMovimiento(consumption),
                note: `Factura ${sale.code}${wholesaleNote}`,
              },
              { client: trx }
            )
          }
          continue
        }

        const sizeLabel = line.size?.trim()
        const sizeNote = sizeLabel ? ` talla ${sizeLabel}` : ''
        const wholesaleNote =
          line.isWholesale && line.unitsPerPack
            ? ` — ${Number(line.quantity)} paq. × ${Number(line.unitsPerPack)} und`
            : ''
        const movementNote = `Venta ${sale.code}${sizeNote}${wholesaleNote}`

        if (line.catalogProductSizeId) {
          await this.sizeService.deductSizeStock(Number(line.catalogProductSizeId), quantity, trx)
        }

        await this.productInventoryService.registrarMovimiento(
          {
            catalogProductId: Number(line.catalogProductId),
            type: 'SALE_OUT',
            quantity: -quantity,
            saleId,
            note: movementNote,
            allowNegativeStock: allowInsufficient,
          },
          trx
        )
      }

      if (line.materialId) {
        const materialId = Number(line.materialId)
        const currentStock = await this.materialService.calcularStock(materialId, trx)
        if (currentStock < quantity) {
          if (!allowInsufficient) {
            const material = line.material ?? (await Material.findOrFail(materialId))
            throw new StockInsuficienteException([
              {
                material_id: materialId,
                name: material.name,
                stock_actual: currentStock,
                consumo_proyectado: quantity,
                faltante: quantity - currentStock,
              },
            ])
          }
          needsReview = true
        }

        const wholesaleNote =
          line.isWholesale && line.unitsPerPack
            ? ` — ${Number(line.quantity)} paq. × ${Number(line.unitsPerPack)} und`
            : ''

        await InventoryMovement.create(
          {
            materialId,
            type: 'SALE_OUT',
            quantity: formatCantidadMovimiento(quantity),
            note: `Factura ${sale.code}${wholesaleNote}`,
          },
          { client: trx }
        )
      }
    }

    return needsReview
  }
}
