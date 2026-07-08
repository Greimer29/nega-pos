import CatalogProductService from '#services/catalog_product_service'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import ProductInventoryService from '#services/product_inventory_service'
import type CatalogProduct from '#models/catalog_product'
import {
  serializeCatalogProduct,
  serializeCatalogProductDetail,
  serializeProductMovimientos,
} from '#transformers/catalog_product_transformer'
import {
  createCatalogProductValidator,
  listCatalogProductsValidator,
  updateCatalogProductValidator,
  applyCatalogProfitMarginValidator,
  ajusteCatalogProductValidator,
} from '#validators/catalog_product'
import { serializeCostWarning } from '#types/cost_warning'
import type { HttpContext } from '@adonisjs/core/http'

export default class CatalogProductsController {
  private service = new CatalogProductService()
  private inventoryService = new ProductInventoryService()
  private stockService = new CatalogProductStockService()

  private async serializeWithStock(product: CatalogProduct) {
    const stock = await this.stockService.calcularStockDisponible(product)
    const costUsd = await this.service.resolverCostoUsd(product)
    return serializeCatalogProduct(product, { stock, costUsd })
  }

  private async serializeManyWithStock(products: CatalogProduct[]) {
    const stockById = await this.stockService.calcularStockForProducts(products)
    const costById = await this.service.resolverCostosUsdEnLote(products)

    return products.map((product) =>
      serializeCatalogProduct(product, {
        stock: stockById.get(Number(product.id)),
        costUsd: costById.get(Number(product.id)),
      })
    )
  }

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCatalogProductsValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      category: filters.category,
      active: filters.active,
      sortBy: filters.sort_by,
      sortDir: filters.sort_dir,
    })

    const products = paginator.all()
    const catalogProducts = await this.serializeManyWithStock(products)

    return serialize({
      catalog_products: catalogProducts,
      meta: paginator.getMeta(),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const product = await this.service.obtenerDetalle(Number(params.id))
    const movimientos = await this.inventoryService.listarMovimientos(Number(params.id))
    const stock = await this.stockService.calcularStockDisponible(product)

    const costUsd = await this.service.resolverCostoUsd(product)

    return serialize({
      catalog_product: serializeCatalogProductDetail(product, { movimientos, stock, costUsd }),
    })
  }

  async ajuste({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(ajusteCatalogProductValidator)
    const movimiento = await this.inventoryService.ajustar(Number(params.id), payload)

    return serialize({
      movimiento: serializeProductMovimientos([movimiento])[0],
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCatalogProductValidator)
    const product = await this.service.crear(payload)

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateCatalogProductValidator)
    const { product, costWarnings } = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      catalog_product: await this.serializeWithStock(product),
      cost_warnings: costWarnings.map(serializeCostWarning),
    })
  }

  async applyProfitMargin({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(applyCatalogProfitMarginValidator)
    const result = await this.service.aplicarMargenGanancia({
      catalog_product_ids: payload.catalog_product_ids,
      profit_margin_percent: payload.profit_margin_percent,
    })

    return serialize({
      updatedCount: result.updatedCount,
      skipped: result.skipped,
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize(result)
  }

  async uploadImage({ params, request, serialize }: HttpContext) {
    const file = request.file('image', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!file) {
      return serialize({ error: 'No image provided' })
    }

    const product = await this.service.guardarImagen(Number(params.id), file)

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }

  async downloadImage({ params, response }: HttpContext) {
    const image = await this.service.obtenerImagen(Number(params.id))

    response.header('Content-Type', image.contentType)
    response.header('Content-Disposition', `inline; filename="${image.filename}"`)
    response.header('Cache-Control', 'public, max-age=86400')
    return response.send(image.bytes)
  }

  async deleteImage({ params, serialize }: HttpContext) {
    const product = await this.service.eliminarImagen(Number(params.id))

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }
}
