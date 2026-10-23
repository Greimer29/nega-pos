import CatalogProductImageService from '#services/catalog_product_image_service'
import CatalogProductImportService from '#services/catalog_product_import_service'
import CatalogProductPricingService from '#services/catalog_product_pricing_service'
import CatalogProductQueryService from '#services/catalog_product_query_service'
import CatalogProductService from '#services/catalog_product_service'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import { broadcastCompanyEvent } from '#services/company_realtime_service'
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
  bulkAjusteCatalogProductValidator,
  replaceCatalogProductSizesValidator,
  importCatalogProductsValidator,
  catalogProductPurchaseHistoryValidator,
} from '#validators/catalog_product'
import { serializeCostWarning } from '#types/cost_warning'
import type { HttpContext } from '@adonisjs/core/http'

export default class CatalogProductsController {
  private service = new CatalogProductService()
  private queryService = new CatalogProductQueryService()
  private pricingService = new CatalogProductPricingService()
  private imageService = new CatalogProductImageService()
  private importService = new CatalogProductImportService()
  private inventoryService = new ProductInventoryService()
  private stockService = new CatalogProductStockService()

  private async serializeWithStock(product: CatalogProduct) {
    const stock = await this.stockService.calcularStockDisponible(product)
    const costUsd = await this.pricingService.resolverCostoUsd(product)
    return serializeCatalogProduct(product, { stock, costUsd })
  }

  private async serializeManyWithStock(products: CatalogProduct[]) {
    const stockById = await this.stockService.calcularStockForProducts(products)
    const costById = await this.pricingService.resolverCostosUsdEnLote(products)

    return products.map((product) =>
      serializeCatalogProduct(product, {
        stock: stockById.get(Number(product.id)),
        costUsd: costById.get(Number(product.id)),
      })
    )
  }

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCatalogProductsValidator)
    const paginator = await this.queryService.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      barcode: filters.barcode,
      category: filters.category,
      size: filters.size,
      active: filters.active,
      itemKind: filters.item_kind,
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
    const product = await this.queryService.obtenerDetalle(Number(params.id))
    const movimientos = await this.inventoryService.listarMovimientos(Number(params.id))
    const stock = await this.stockService.calcularStockDisponible(product)

    const costUsd = await this.pricingService.resolverCostoUsd(product)

    return serialize({
      catalog_product: serializeCatalogProductDetail(product, { movimientos, stock, costUsd }),
    })
  }

  async historialCompras({ params, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(catalogProductPurchaseHistoryValidator)
    const historial = await this.queryService.historialCompras(Number(params.id), {
      month: filters.month,
      from: filters.from,
      to: filters.to,
    })

    return serialize({
      historial,
    })
  }

  async ajuste({ params, request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(ajusteCatalogProductValidator)
    const movimiento = await this.inventoryService.ajustar(Number(params.id), {
      ...payload,
      created_by_user_id: Number(auth.getUserOrFail().id),
    })
    broadcastCompanyEvent('catalog.changed')

    return serialize({
      movimiento: serializeProductMovimientos([movimiento])[0],
    })
  }

  async ajusteMasivo({ request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(bulkAjusteCatalogProductValidator)
    const movimientos = await this.inventoryService.ajustarEnLote({
      ...payload,
      created_by_user_id: Number(auth.getUserOrFail().id),
    })
    broadcastCompanyEvent('catalog.changed')

    return serialize({
      movimientos: serializeProductMovimientos(movimientos),
      count: movimientos.length,
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCatalogProductValidator)
    const product = await this.service.crear(payload)
    broadcastCompanyEvent('catalog.changed')

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }

  async update({ params, request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateCatalogProductValidator)
    const { product, costWarnings } = await this.service.actualizar(Number(params.id), payload, {
      userId: Number(auth.getUserOrFail().id),
    })
    broadcastCompanyEvent('catalog.changed')

    return serialize({
      catalog_product: await this.serializeWithStock(product),
      cost_warnings: costWarnings.map(serializeCostWarning),
    })
  }

  async replaceSizes({ params, request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(replaceCatalogProductSizesValidator)
    const product = await this.service.replaceSizes(Number(params.id), payload.sizes, {
      userId: Number(auth.getUserOrFail().id),
    })
    broadcastCompanyEvent('catalog.changed')

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }

  async applyProfitMargin({ request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(applyCatalogProfitMarginValidator)
    const result = await this.pricingService.aplicarMargenGanancia({
      catalog_product_ids: payload.catalog_product_ids,
      profit_margin_percent: payload.profit_margin_percent,
      userId: Number(auth.getUserOrFail().id),
    })
    broadcastCompanyEvent('catalog.changed')

    return serialize({
      updatedCount: result.updatedCount,
      skipped: result.skipped,
    })
  }

  async importar({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(importCatalogProductsValidator)
    const result = await this.importService.importar(payload.item_kind, payload.rows)
    broadcastCompanyEvent('catalog.changed')

    return serialize(result)
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))
    broadcastCompanyEvent('catalog.changed')

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

    const product = await this.imageService.guardarImagen(Number(params.id), file)

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }

  async downloadImage({ params, response }: HttpContext) {
    const image = await this.imageService.obtenerImagen(Number(params.id))

    response.header('Content-Type', image.contentType)
    response.header('Content-Disposition', `inline; filename="${image.filename}"`)
    response.header('Cache-Control', 'public, max-age=86400')
    return response.send(image.bytes)
  }

  async deleteImage({ params, serialize }: HttpContext) {
    const product = await this.imageService.eliminarImagen(Number(params.id))

    return serialize({
      catalog_product: await this.serializeWithStock(product),
    })
  }
}
