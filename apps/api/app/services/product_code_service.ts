import CodigoDuplicadoException from '#exceptions/codigo_duplicado_exception'
import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import { catalogProductIdFromCode, formatCatalogProductCode } from '#utils/catalog_product_code'

export type ProductCodeOwner =
  | { type: 'material'; id: number }
  | { type: 'catalog_product'; id: number }

export default class ProductCodeService {
  async assertUnique(code: string, exclude?: ProductCodeOwner): Promise<void> {
    const normalized = code.trim()
    if (!normalized) {
      return
    }

    await this.assertNotUsedByMaterial(normalized, exclude)
    await this.assertNotUsedByCatalogProduct(normalized, exclude)
  }

  async assertCatalogProductCodeAvailable(productId: number): Promise<void> {
    await this.assertUnique(formatCatalogProductCode(productId), {
      type: 'catalog_product',
      id: productId,
    })
  }

  private async assertNotUsedByMaterial(code: string, exclude?: ProductCodeOwner) {
    const query = Material.query().where('code', code)
    if (exclude?.type === 'material') {
      query.whereNot('id', exclude.id)
    }

    if (await query.first()) {
      throw new CodigoDuplicadoException()
    }
  }

  private async assertNotUsedByCatalogProduct(code: string, exclude?: ProductCodeOwner) {
    const catalogProductId = catalogProductIdFromCode(code)
    if (catalogProductId === null) {
      return
    }

    if (exclude?.type === 'catalog_product' && exclude.id === catalogProductId) {
      return
    }

    const exists = await CatalogProduct.query().where('id', catalogProductId).first()
    if (exists) {
      throw new CodigoDuplicadoException()
    }
  }
}
