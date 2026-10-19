import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import type Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import SaleLineMaterial from '#models/sale_line_material'
import {
  resolveEffectiveFormulaMaterials,
  sumEffectiveMaterialCostUsd,
  type ResolvedSaleLineFormulaMaterial,
} from '#services/sale_line_formula'
import { freezeFormulaSaleLineCost } from '#utils/sale_line_cost'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type ResolvedSaleLine = {
  catalogProductId: number | null
  materialId: number | null
  catalogProductSizeId: number | null
  size: string | null
  description: string
  quantity: string
  unitPriceUsd: string
  subtotalUsd: string
  costUsd: string | null
  kitchenNote: string | null
  isWholesale: boolean
  unitsPerPack: string | null
  formulaMaterials: ResolvedSaleLineFormulaMaterial[] | null
}

export default class SaleLineService {
  async persistLines(saleId: number, lines: ResolvedSaleLine[], trx: TransactionClientContract) {
    for (const line of lines) {
      const saleLine = await SaleLine.create(
        {
          saleId,
          catalogProductId: line.catalogProductId,
          catalogProductSizeId: line.catalogProductSizeId,
          size: line.size,
          materialId: line.materialId,
          description: line.description,
          quantity: line.quantity,
          unitPriceUsd: line.unitPriceUsd,
          subtotalUsd: line.subtotalUsd,
          costUsd: line.costUsd,
          kitchenNote: line.kitchenNote,
          isWholesale: line.isWholesale,
          unitsPerPack: line.unitsPerPack,
          returnedQuantity: '0.000',
        },
        { client: trx }
      )

      if (line.formulaMaterials && line.formulaMaterials.length > 0) {
        for (const item of line.formulaMaterials) {
          await SaleLineMaterial.create(
            {
              saleLineId: saleLine.id,
              materialId: item.materialId,
              quantityPerUnit: item.quantityPerUnit,
            },
            { client: trx }
          )
        }
      }
    }
  }

  async freezeCosts(sale: Sale, trx: TransactionClientContract) {
    for (const line of sale.saleLines) {
      if (line.catalogProductId) {
        const product =
          line.catalogProduct ??
          (await CatalogProduct.query({ client: trx })
            .where('id', Number(line.catalogProductId))
            .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
            .first())

        if (product?.formulaId) {
          const effectiveMaterials = resolveEffectiveFormulaMaterials(line, product)
          if (effectiveMaterials.length > 0) {
            const unitCost = Number(sumEffectiveMaterialCostUsd(effectiveMaterials))
            line.costUsd = freezeFormulaSaleLineCost(unitCost, line.isWholesale, line.unitsPerPack)
          } else if (product.costUsd) {
            line.costUsd = product.costUsd
          }
        } else if (product?.costUsd && !line.costUsd) {
          line.costUsd = product.costUsd
        }
      }

      if (line.costUsd) {
        line.useTransaction(trx)
        await line.save()
        continue
      }

      if (line.materialId && !line.costUsd) {
        const material = line.material ?? (await Material.find(Number(line.materialId)))
        if (material?.lastPurchasePriceUsd) {
          line.costUsd = material.lastPurchasePriceUsd
        }
      }

      line.useTransaction(trx)
      await line.save()
    }
  }
}
