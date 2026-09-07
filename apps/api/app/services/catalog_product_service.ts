import FormulaNoEncontradaException from '#exceptions/formula_no_encontrada_exception'
import ProductoCatalogoEnPedidosActivosException from '#exceptions/producto_catalogo_en_pedidos_activos_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ArchivoImagenNoDisponibleException from '#exceptions/archivo_imagen_no_disponible_exception'
import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import OrderLine from '#models/order_line'
import CategoryService from '#services/category_service'
import FormulaService from '#services/formula_service'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import ProductCodeService from '#services/product_code_service'
import ProductInventoryService from '#services/product_inventory_service'
import type { InventoryUnit } from '#constants/inventory_units'
import { formatInventoryQuantityForStorage, normalizeInventoryQuantity } from '#constants/inventory_units'
import type { CostWarning } from '#types/cost_warning'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { tenantStorageKey } from '#utils/tenant_storage'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type CatalogProductInput = {
  name: string
  description?: string | null
  category: string
  sale_unit?: InventoryUnit
  sale_price_usd: number
  cost_usd?: number
  formula_id?: number | null
  stock_quantity?: number
  minimum_stock?: number
  active?: boolean
  sizes?: Array<{ size: string; stock_quantity: number }>
}

export type CatalogProductUpdateInput = Partial<CatalogProductInput>

export type ListCatalogProductsFilters = {
  page?: number
  perPage?: number
  search?: string
  category?: string
  size?: string
  active?: boolean
  sortBy?: 'name' | 'most_sold'
  sortDir?: 'asc' | 'desc'
}

export type CatalogProductImageDownload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

export type ApplyProfitMarginInput = {
  catalog_product_ids: number[]
  profit_margin_percent: number
  userId?: number | null
}

export type ApplyProfitMarginSkipped = {
  id: number
  name: string
  reason: 'NO_COST_PRICE' | 'NOT_FOUND'
}

export type ApplyProfitMarginResult = {
  updatedCount: number
  skipped: ApplyProfitMarginSkipped[]
}

export type CatalogProductUpdateResult = {
  product: CatalogProduct
  costWarnings: CostWarning[]
}

export type CatalogProductUpdateOptions = {
  userId?: number | null
}

function formatUsdNote(value: string | number) {
  return Number(value).toFixed(2)
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const MOST_SOLD_SQL = `COALESCE((
  SELECT SUM(sl.quantity)
  FROM sale_lines sl
  WHERE sl.catalog_product_id = catalog_products.id
), 0) + COALESCE((
  SELECT SUM(ol.quantity)
  FROM order_lines ol
  INNER JOIN orders o ON o.id = ol.order_id
  WHERE ol.catalog_product_id = catalog_products.id
    AND o.status NOT IN ('CANCELLED', 'DRAFT')
), 0)`

export default class CatalogProductService {
  private formulaService = new FormulaService()
  private categoryService = new CategoryService()
  private productCodeService = new ProductCodeService()
  private sizeService = new CatalogProductSizeService()
  private inventoryService = new ProductInventoryService()

  async listar(
    filters: ListCatalogProductsFilters = {}
  ): Promise<ModelPaginatorContract<CatalogProduct>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 30
    const sortBy = filters.sortBy ?? 'name'
    const sortDir = filters.sortDir ?? 'asc'

    const query = CatalogProduct.query().preload('sizes', (q) => q.orderBy('size', 'asc'))

    if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder.whereILike('name', term).orWhereILike('description', term)
      })
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.size?.trim()) {
      const sizeTerm = filters.size.trim()
      query.whereHas('sizes', (sizesQuery) => {
        sizesQuery.whereILike('size', sizeTerm).where('stock_quantity', '>', 0)
      })
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    if (sortBy === 'most_sold') {
      query.orderByRaw(`${MOST_SOLD_SQL} ${sortDir === 'desc' ? 'DESC' : 'ASC'}`)
    } else {
      query.orderBy('name', sortDir)
    }

    query.orderBy('id', 'desc')

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<CatalogProduct> {
    const product = await CatalogProduct.query()
      .where('id', id)
      .preload('sizes', (q) => q.orderBy('size', 'asc'))
      .first()
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }
    return product
  }

  async obtenerDetalle(id: number): Promise<CatalogProduct> {
    const product = await CatalogProduct.query()
      .where('id', id)
      .preload('formula', (q) =>
        q.preload('materials', (mq) => mq.preload('material').orderBy('id', 'asc'))
      )
      .preload('sizes', (q) => q.orderBy('size', 'asc'))
      .first()

    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    return product
  }

  async crear(input: CatalogProductInput): Promise<CatalogProduct> {
    let costUsd = input.cost_usd ?? 0

    if (input.formula_id) {
      await this.assertFormulaExiste(input.formula_id)
      if (input.cost_usd === undefined) {
        costUsd = await this.formulaService.calcularCosto(input.formula_id)
      }
    }

    await this.categoryService.assertCategoriaActiva(input.category)

    if (input.sizes && input.sizes.length > 0 && input.formula_id) {
      const { default: ProductoConFormulaNoPermiteTallasException } = await import(
        '#exceptions/producto_con_formula_no_permite_tallas_exception'
      )
      throw new ProductoConFormulaNoPermiteTallasException()
    }

    return db.transaction(async (trx) => {
      const saleUnit = input.sale_unit ?? 'UND'
      const stockQty = input.formula_id
        ? 0
        : normalizeInventoryQuantity(input.stock_quantity ?? 0, saleUnit)
      const product = await CatalogProduct.create(
        {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category.trim(),
          saleUnit,
          formulaId: input.formula_id ?? null,
          salePriceUsd: input.sale_price_usd.toFixed(4),
          previousSalePriceUsd: null,
          costUsd: costUsd.toFixed(4),
          stockQuantity: formatInventoryQuantityForStorage(stockQty, saleUnit),
          minimumStock: formatInventoryQuantityForStorage(input.minimum_stock ?? 0, saleUnit),
          active: input.active ?? true,
        },
        { client: trx }
      )

      await this.productCodeService.assertCatalogProductCodeAvailable(Number(product.id))

      if (input.sizes !== undefined && !input.formula_id) {
        await this.sizeService.replaceSizes(product, input.sizes, trx)
      }

      await product.load('sizes', (q) => q.orderBy('size', 'asc'))
      return product
    })
  }

  async actualizar(
    id: number,
    input: CatalogProductUpdateInput,
    options: CatalogProductUpdateOptions = {}
  ): Promise<CatalogProductUpdateResult> {
    return db.transaction(async (trx) => {
      const product = await CatalogProduct.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .first()

      if (!product) {
        throw new ProductoCatalogoNoEncontradoException()
      }

      const costWarnings: CostWarning[] = []
      const previousFormulaId = product.formulaId
      const previousSalePrice = product.salePriceUsd
      const previousCostUsd = product.costUsd
      const previousStock = Number(product.stockQuantity)
      const trackedSalePrice = input.sale_price_usd !== undefined
      const trackedCost = input.cost_usd !== undefined
      const trackedStock =
        input.stock_quantity !== undefined || input.sizes !== undefined

      if (input.formula_id !== undefined) {
        if (input.formula_id === null) {
          product.formulaId = null
        } else {
          await this.assertFormulaExiste(input.formula_id)
          product.formulaId = input.formula_id
          if (input.formula_id !== previousFormulaId) {
            product.stockQuantity = '0.000'
            await this.sizeService.replaceSizes(product, [], trx)
          }
        }
      }

      if (input.sale_price_usd !== undefined) {
        const newPrice = input.sale_price_usd.toFixed(4)
        const currentPrice = product.salePriceUsd

        if (newPrice !== currentPrice && input.sale_price_usd < Number(currentPrice)) {
          product.previousSalePriceUsd = currentPrice
        }

        product.salePriceUsd = newPrice
      }

      if (input.name !== undefined) {
        product.name = input.name.trim()
      }

      if (input.description !== undefined) {
        product.description = input.description?.trim() || null
      }

      if (input.category !== undefined) {
        await this.categoryService.assertCategoriaActiva(input.category)
        product.category = input.category.trim()
      }

      if (input.sale_unit !== undefined) {
        product.saleUnit = input.sale_unit
      }

      const saleUnit = product.saleUnit ?? 'UND'

      if (input.minimum_stock !== undefined) {
        product.minimumStock = formatInventoryQuantityForStorage(input.minimum_stock, saleUnit)
      }

      if (input.active !== undefined) {
        product.active = input.active
      }

      if (input.cost_usd !== undefined) {
        product.costUsd = input.cost_usd.toFixed(4)
      } else if (product.formulaId) {
        product.costUsd = await this.calcularCostoFormulaPersistible(product)
      }

      const touchingSizes = input.sizes !== undefined

      if (touchingSizes) {
        if (product.formulaId) {
          const { default: ProductoConFormulaNoPermiteTallasException } = await import(
            '#exceptions/producto_con_formula_no_permite_tallas_exception'
          )
          throw new ProductoConFormulaNoPermiteTallasException()
        }
        await this.sizeService.replaceSizes(product, input.sizes ?? [], trx)
      } else if (input.stock_quantity !== undefined && !product.formulaId) {
        const existingSizes = await this.sizeService.loadSizes(Number(product.id), trx)
        if (existingSizes.length === 0) {
          product.stockQuantity = formatInventoryQuantityForStorage(input.stock_quantity, saleUnit)
        }
      }

      const effectiveCostUsd = Number(product.costUsd)
      const warning = this.buildCostWarningIfNeeded(product, effectiveCostUsd)
      if (warning) {
        costWarnings.push(warning)
      }

      product.useTransaction(trx)
      await product.save()
      await product.load('sizes', (q) => q.orderBy('size', 'asc'))

      await this.registrarHistorialEdicion(product, {
        previousSalePrice,
        previousCostUsd,
        previousStock,
        trackedSalePrice,
        trackedCost,
        trackedStock,
        userId: options.userId ?? null,
        trx,
      })

      return { product, costWarnings }
    })
  }

  async replaceSizes(
    id: number,
    sizes: Array<{ size: string; stock_quantity: number }>,
    options: CatalogProductUpdateOptions = {}
  ): Promise<CatalogProduct> {
    return db.transaction(async (trx) => {
      const product = await CatalogProduct.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .first()

      if (!product) {
        throw new ProductoCatalogoNoEncontradoException()
      }

      const previousStock = Number(product.stockQuantity)
      await this.sizeService.replaceSizes(product, sizes, trx)
      await product.load('sizes', (q) => q.orderBy('size', 'asc'))

      await this.registrarHistorialEdicion(product, {
        previousSalePrice: product.salePriceUsd,
        previousCostUsd: product.costUsd,
        previousStock,
        trackedSalePrice: false,
        trackedCost: false,
        trackedStock: true,
        userId: options.userId ?? null,
        trx,
      })

      return product
    })
  }

  async eliminar(id: number): Promise<{ id: number; modo: 'soft' | 'hard' }> {
    return db.transaction(async (trx) => {
      const product = await CatalogProduct.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .first()

      if (!product) {
        throw new ProductoCatalogoNoEncontradoException()
      }

      await this.assertNoPedidosActivos(id, trx)

      const tieneVentas = await db
        .from('sale_lines')
        .where('catalog_product_id', id)
        .count('* as total')
        .useTransaction(trx)
        .first()

      if (Number(tieneVentas?.total ?? 0) > 0) {
        product.active = false
        product.useTransaction(trx)
        await product.save()
        return { id, modo: 'soft' }
      }

      if (product.imagePath) {
        await drive
          .use()
          .delete(product.imagePath)
          .catch(() => undefined)
      }

      product.useTransaction(trx)
      await product.delete()
      return { id, modo: 'hard' }
    })
  }

  async recalcularCosto(id: number): Promise<CatalogProductUpdateResult> {
    const product = await this.obtener(id)

    if (!product.formulaId) {
      return { product, costWarnings: [] }
    }

    const costUsd = await this.formulaService.calcularCosto(Number(product.formulaId))
    product.costUsd = costUsd.toFixed(4)
    const costWarnings: CostWarning[] = []
    const warning = this.buildCostWarningIfNeeded(product, costUsd)
    if (warning) {
      costWarnings.push(warning)
    }
    await product.save()
    return { product, costWarnings }
  }

  async aplicarMargenGanancia(input: ApplyProfitMarginInput): Promise<ApplyProfitMarginResult> {
    const multiplier = 1 + input.profit_margin_percent / 100
    const skipped: ApplyProfitMarginSkipped[] = []
    let updatedCount = 0

    await db.transaction(async (trx) => {
      for (const productId of input.catalog_product_ids) {
        const product = await CatalogProduct.query({ client: trx })
          .where('id', productId)
          .forUpdate()
          .first()

        if (!product) {
          skipped.push({ id: productId, name: `#${productId}`, reason: 'NOT_FOUND' })
          continue
        }

        const costUsd = product.costUsd
        if (!costUsd || Number(costUsd) <= 0) {
          skipped.push({
            id: Number(product.id),
            name: product.name,
            reason: 'NO_COST_PRICE',
          })
          continue
        }

        const previousSalePrice = product.salePriceUsd
        const newSalePrice = (Number(costUsd) * multiplier).toFixed(4)
        const currentSalePrice = product.salePriceUsd

        if (currentSalePrice !== null && currentSalePrice !== newSalePrice) {
          product.previousSalePriceUsd = currentSalePrice
        } else if (currentSalePrice === null) {
          product.previousSalePriceUsd = null
        }

        product.salePriceUsd = newSalePrice
        product.useTransaction(trx)
        await product.save()

        if (previousSalePrice !== newSalePrice) {
          await this.inventoryService.registrarMovimiento(
            {
              catalogProductId: Number(product.id),
              type: 'PRICE_CHANGE',
              quantity: 0,
              note: `Edición de precio: venta $${formatUsdNote(previousSalePrice)} → $${formatUsdNote(newSalePrice)} (margen)`,
              createdByUserId: input.userId ?? null,
              skipStockUpdate: true,
            },
            trx
          )
        }

        updatedCount++
      }
    })

    return { updatedCount, skipped }
  }

  async guardarImagen(id: number, file: MultipartFile): Promise<CatalogProduct> {
    const product = await this.obtener(id)
    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = tenantStorageKey(`catalog-products/${id}/${randomUUID()}.${extension}`)

    if (product.imagePath) {
      await drive
        .use()
        .delete(product.imagePath)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    product.imagePath = key
    await product.save()

    return product
  }

  async eliminarImagen(id: number): Promise<CatalogProduct> {
    const product = await this.obtener(id)

    if (product.imagePath) {
      await drive
        .use()
        .delete(product.imagePath)
        .catch(() => undefined)
      product.imagePath = null
      await product.save()
    }

    return product
  }

  async obtenerImagen(id: number): Promise<CatalogProductImageDownload> {
    const product = await this.obtener(id)

    if (!product.imagePath) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const exists = await drive.use().exists(product.imagePath)
    if (!exists) {
      product.imagePath = null
      await product.save()
      throw new ArchivoImagenNoDisponibleException()
    }

    const bytes = await drive.use().getBytes(product.imagePath)
    const extension = product.imagePath.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = IMAGE_MIME[extension] ?? 'application/octet-stream'
    const filename = `catalog-${id}.${extension}`

    return { bytes, contentType, filename }
  }

  async resolverCostosUsdEnLote(products: CatalogProduct[]): Promise<Map<number, string>> {
    const costByProductId = new Map<number, string>()
    const costByFormulaId = new Map<number, string>()

    for (const product of products) {
      const productId = Number(product.id)

      if (!product.formulaId) {
        costByProductId.set(productId, this.normalizeCostUsd(product.costUsd))
        continue
      }

      const formulaId = Number(product.formulaId)
      let formulaCost = costByFormulaId.get(formulaId)

      if (formulaCost === undefined) {
        try {
          const formulaCostValue = await this.formulaService.calcularCosto(formulaId)
          formulaCost = formulaCostValue.toFixed(4)
        } catch {
          formulaCost = this.normalizeCostUsd(product.costUsd)
        }
        costByFormulaId.set(formulaId, formulaCost)
      }

      costByProductId.set(productId, formulaCost)
    }

    return costByProductId
  }

  async resolverCostoUsd(product: CatalogProduct): Promise<string> {
    const resolved = await this.resolverCostosUsdEnLote([product])
    return resolved.get(Number(product.id)) ?? this.normalizeCostUsd(product.costUsd)
  }

  private async calcularCostoFormulaPersistible(product: CatalogProduct): Promise<string> {
    const costUsd = await this.formulaService.calcularCosto(Number(product.formulaId))
    return costUsd.toFixed(4)
  }

  private normalizeCostUsd(value: string | null | undefined): string {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed.toFixed(4) : '0.0000'
  }

  private buildCostWarningIfNeeded(product: CatalogProduct, costUsd: number): CostWarning | null {
    const salePrice = Number(product.salePriceUsd)
    if (salePrice > 0 && salePrice < costUsd) {
      return {
        product_id: Number(product.id),
        product_name: product.name,
        sale_price_usd: product.salePriceUsd,
        cost_usd: costUsd.toFixed(4),
      }
    }
    return null
  }

  private async registrarHistorialEdicion(
    product: CatalogProduct,
    params: {
      previousSalePrice: string
      previousCostUsd: string
      previousStock: number
      trackedSalePrice: boolean
      trackedCost: boolean
      trackedStock: boolean
      userId: number | null
      trx: import('@adonisjs/lucid/types/database').TransactionClientContract
    }
  ) {
    const saleUnit = product.saleUnit ?? 'UND'
    const userId = params.userId

    if (params.trackedStock && !product.formulaId) {
      const stockDelta = normalizeInventoryQuantity(
        Number(product.stockQuantity) - params.previousStock,
        saleUnit
      )
      if (stockDelta !== 0) {
        await this.inventoryService.registrarMovimiento(
          {
            catalogProductId: Number(product.id),
            type: 'MANUAL_ADJUSTMENT',
            quantity: stockDelta,
            note: 'Edición de producto (stock)',
            createdByUserId: userId,
            skipStockUpdate: true,
          },
          params.trx
        )
      }
    }

    const saleChanged =
      params.trackedSalePrice && product.salePriceUsd !== params.previousSalePrice
    const costChanged = params.trackedCost && product.costUsd !== params.previousCostUsd

    if (!saleChanged && !costChanged) {
      return
    }

    const parts: string[] = []
    if (saleChanged) {
      parts.push(
        `venta $${formatUsdNote(params.previousSalePrice)} → $${formatUsdNote(product.salePriceUsd)}`
      )
    }
    if (costChanged) {
      parts.push(
        `costo $${formatUsdNote(params.previousCostUsd)} → $${formatUsdNote(product.costUsd)}`
      )
    }

    await this.inventoryService.registrarMovimiento(
      {
        catalogProductId: Number(product.id),
        type: 'PRICE_CHANGE',
        quantity: 0,
        note: `Edición de precio: ${parts.join('; ')}`,
        createdByUserId: userId,
        skipStockUpdate: true,
      },
      params.trx
    )
  }

  private async assertFormulaExiste(formulaId: number) {
    const formula = await Formula.find(formulaId)
    if (!formula) {
      throw new FormulaNoEncontradaException()
    }
  }

  private async assertNoPedidosActivos(
    catalogProductId: number,
    trx: import('@adonisjs/lucid/types/database').TransactionClientContract
  ) {
    const activo = await OrderLine.query({ client: trx })
      .where('catalogProductId', catalogProductId)
      .whereHas('order', (query) => {
        query.whereIn('status', ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION'])
      })
      .first()

    if (activo) {
      throw new ProductoCatalogoEnPedidosActivosException()
    }
  }
}
