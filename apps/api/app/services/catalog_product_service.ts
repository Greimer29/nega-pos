import FormulaNoEncontradaException from '#exceptions/formula_no_encontrada_exception'
import ProductoCatalogoEnPedidosActivosException from '#exceptions/producto_catalogo_en_pedidos_activos_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ArchivoImagenNoDisponibleException from '#exceptions/archivo_imagen_no_disponible_exception'
import ServicioCatalogoOperacionInvalidaException from '#exceptions/servicio_catalogo_operacion_invalida_exception'
import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import OrderLine from '#models/order_line'
import PurchaseItem from '#models/purchase_item'
import CategoryService from '#services/category_service'
import FormulaService from '#services/formula_service'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import ProductCodeService from '#services/product_code_service'
import ProductInventoryService from '#services/product_inventory_service'
import type { CatalogItemKind } from '#constants/catalog_item_kind'
import { isCatalogService } from '#constants/catalog_item_kind'
import {
  INVENTORY_UNITS,
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
  type InventoryUnit,
} from '#constants/inventory_units'
import type { CostWarning } from '#types/cost_warning'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { tenantStorageKey } from '#utils/tenant_storage'
import { assertProductBarcodeAvailable, normalizeBarcode } from '#utils/barcode'
import { normalizeSupplierCode } from '#utils/supplier_code'
import ConfiguracionMayoristaInvalidaException from '#exceptions/configuracion_mayorista_invalida_exception'
import { normalizeWholesaleConfig, type WholesaleConfigInput } from '#utils/wholesale'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type CatalogProductInput = {
  name: string
  description?: string | null
  category: string
  item_kind?: CatalogItemKind
  sale_unit?: InventoryUnit
  sale_price_usd: number
  cost_usd?: number
  formula_id?: number | null
  stock_quantity?: number
  minimum_stock?: number
  barcode?: string | null
  supplier_code?: string | null
  wholesale_enabled?: boolean
  wholesale_units_per_pack?: number | null
  wholesale_cost_usd?: number | null
  wholesale_sale_price_usd?: number | null
  active?: boolean
  sizes?: Array<{ size: string; stock_quantity: number }>
}

export type CatalogProductUpdateInput = Partial<CatalogProductInput>

export type ListCatalogProductsFilters = {
  page?: number
  perPage?: number
  search?: string
  barcode?: string
  category?: string
  size?: string
  active?: boolean
  /** Default PRODUCT so existing product UIs never list services accidentally. */
  itemKind?: CatalogItemKind
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

export type CatalogProductPurchaseHistoryFilters = {
  month?: string
  from?: string
  to?: string
}

export type CatalogProductPurchaseHistoryItem = {
  purchaseItemId: number
  purchaseId: number
  date: string
  supplier: {
    id: number
    code: string | null
    name: string
  }
  quantity: string
  unitPriceUsd: string | null
  subtotalUsd: string | null
}

function formatUsdNote(value: string | number) {
  return Number(value).toFixed(4)
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

    const barcode = filters.barcode?.trim()
    if (barcode) {
      query.where('barcode', barcode)
    } else if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('name', term)
          .orWhereILike('description', term)
          .orWhereILike('supplier_code', term)
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

    const itemKind = filters.itemKind ?? 'PRODUCT'
    query.where('itemKind', itemKind)

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

  async historialCompras(
    productId: number,
    filters: CatalogProductPurchaseHistoryFilters = {}
  ): Promise<CatalogProductPurchaseHistoryItem[]> {
    await this.obtener(productId)

    const query = PurchaseItem.query()
      .select('purchase_items.*')
      .join('purchases', 'purchases.id', 'purchase_items.purchase_id')
      .where('purchase_items.catalog_product_id', productId)
      .where('purchases.status', 'CONFIRMED')
      .orderBy('purchases.date', 'desc')
      .orderBy('purchase_items.id', 'desc')
      .preload('purchase', (purchaseQuery) => {
        purchaseQuery.preload('supplier')
      })

    const period = resolvePurchaseHistoryPeriod(filters)
    if (period) {
      query.where('purchases.date', '>=', period.from)
      query.where('purchases.date', '<=', period.to)
    }

    const items = await query

    return items.map((item) => ({
      purchaseItemId: Number(item.id),
      purchaseId: Number(item.purchaseId),
      date: item.purchase.date.toISODate()!,
      supplier: {
        id: Number(item.purchase.supplier.id),
        code: item.purchase.supplier.rif?.trim() || null,
        name: item.purchase.supplier.name,
      },
      quantity: item.quantity,
      unitPriceUsd: item.unitPriceUsd,
      subtotalUsd: item.subtotalUsd,
    }))
  }

  async crear(input: CatalogProductInput): Promise<CatalogProduct> {
    const itemKind: CatalogItemKind = input.item_kind ?? 'PRODUCT'
    const isService = itemKind === 'SERVICE'

    if (isService) {
      if (input.formula_id) {
        throw new ServicioCatalogoOperacionInvalidaException(
          'Un servicio no puede tener fórmula de materiales'
        )
      }
      if (input.sizes && input.sizes.length > 0) {
        throw new ServicioCatalogoOperacionInvalidaException('Un servicio no admite tallas')
      }
    }

    let costUsd = input.cost_usd ?? 0

    if (input.formula_id) {
      await this.assertFormulaExiste(input.formula_id)
      if (input.cost_usd === undefined) {
        costUsd = await this.formulaService.calcularCosto(input.formula_id)
      }
    }

    if (!isService) {
      await this.categoryService.assertCategoriaActiva(input.category)
    }

    if (input.sizes && input.sizes.length > 0 && input.formula_id) {
      const { default: ProductoConFormulaNoPermiteTallasException } =
        await import('#exceptions/producto_con_formula_no_permite_tallas_exception')
      throw new ProductoConFormulaNoPermiteTallasException()
    }

    const wholesale = this.normalizeProductWholesale(input, {
      isService,
      hasFormula: Boolean(input.formula_id),
      hasSizes: Boolean(input.sizes && input.sizes.length > 0),
    })
    if (wholesale.derivedUnitCost !== null) {
      costUsd = wholesale.derivedUnitCost
    }

    const barcode = isService ? null : normalizeBarcode(input.barcode)
    if (!isService) {
      await assertProductBarcodeAvailable(barcode)
    }

    return db.transaction(async (trx) => {
      const saleUnit = input.sale_unit ?? 'UND'
      const stockQty =
        isService || input.formula_id
          ? 0
          : normalizeInventoryQuantity(input.stock_quantity ?? 0, saleUnit)
      const product = await CatalogProduct.create(
        {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category.trim() || (isService ? 'Servicios' : input.category.trim()),
          itemKind,
          saleUnit,
          formulaId: isService ? null : (input.formula_id ?? null),
          salePriceUsd: input.sale_price_usd.toFixed(4),
          previousSalePriceUsd: null,
          costUsd: costUsd.toFixed(4),
          stockQuantity: formatInventoryQuantityForStorage(stockQty, saleUnit),
          minimumStock: formatInventoryQuantityForStorage(
            isService ? 0 : (input.minimum_stock ?? 0),
            saleUnit
          ),
          barcode,
          supplierCode: isService ? null : normalizeSupplierCode(input.supplier_code),
          wholesaleEnabled: wholesale.wholesaleEnabled,
          wholesaleUnitsPerPack: wholesale.wholesaleUnitsPerPack,
          wholesaleCostUsd: wholesale.wholesaleCostUsd,
          wholesaleSalePriceUsd: wholesale.wholesaleSalePriceUsd,
          active: input.active ?? true,
        },
        { client: trx }
      )

      await this.productCodeService.assertCatalogProductCodeAvailable(Number(product.id))

      if (!isService && input.sizes !== undefined && !input.formula_id) {
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

      if (input.item_kind !== undefined && input.item_kind !== product.itemKind) {
        throw new ServicioCatalogoOperacionInvalidaException(
          'No se puede cambiar el tipo de ítem (producto/servicio)'
        )
      }

      const isService = isCatalogService(product)

      if (isService) {
        if (input.formula_id) {
          throw new ServicioCatalogoOperacionInvalidaException(
            'Un servicio no puede tener fórmula de materiales'
          )
        }
        if (input.sizes && input.sizes.length > 0) {
          throw new ServicioCatalogoOperacionInvalidaException('Un servicio no admite tallas')
        }
        if (input.stock_quantity !== undefined) {
          throw new ServicioCatalogoOperacionInvalidaException('Un servicio no maneja inventario')
        }
      }

      const costWarnings: CostWarning[] = []
      const previousFormulaId = product.formulaId
      const previousSalePrice = product.salePriceUsd
      const previousCostUsd = product.costUsd
      const previousStock = Number(product.stockQuantity)
      const trackedSalePrice = input.sale_price_usd !== undefined
      const trackedCost = input.cost_usd !== undefined
      const trackedStock =
        !isService && (input.stock_quantity !== undefined || input.sizes !== undefined)

      if (!isService && input.formula_id !== undefined) {
        if (input.formula_id === null) {
          product.formulaId = null
        } else {
          await this.assertFormulaExiste(input.formula_id)
          if (input.formula_id !== previousFormulaId) {
            product.stockQuantity = '0.000'
            // replaceSizes rejects products that already have a formula — clear first
            product.formulaId = null
            await this.sizeService.replaceSizes(product, [], trx)
          }
          product.formulaId = input.formula_id
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
        if (!isService) {
          await this.categoryService.assertCategoriaActiva(input.category)
        }
        product.category = input.category.trim()
      }

      if (input.sale_unit !== undefined) {
        product.saleUnit = input.sale_unit
      }

      const saleUnit = product.saleUnit ?? 'UND'

      if (!isService && input.minimum_stock !== undefined) {
        product.minimumStock = formatInventoryQuantityForStorage(input.minimum_stock, saleUnit)
      }

      if (input.active !== undefined) {
        product.active = input.active
      }

      if (!isService && input.barcode !== undefined) {
        const barcode = normalizeBarcode(input.barcode)
        await assertProductBarcodeAvailable(barcode, Number(product.id))
        product.barcode = barcode
      }

      if (!isService && input.supplier_code !== undefined) {
        product.supplierCode = normalizeSupplierCode(input.supplier_code)
      }

      if (input.cost_usd !== undefined) {
        product.costUsd = input.cost_usd.toFixed(4)
      } else if (!isService && product.formulaId) {
        product.costUsd = await this.calcularCostoFormulaPersistible(product)
      }

      const touchingSizes = !isService && input.sizes !== undefined

      if (touchingSizes) {
        if (product.formulaId) {
          const { default: ProductoConFormulaNoPermiteTallasException } =
            await import('#exceptions/producto_con_formula_no_permite_tallas_exception')
          throw new ProductoConFormulaNoPermiteTallasException()
        }
        await this.sizeService.replaceSizes(product, input.sizes ?? [], trx)
      } else if (!isService && input.stock_quantity !== undefined && !product.formulaId) {
        const existingSizes = await this.sizeService.loadSizes(Number(product.id), trx)
        if (existingSizes.length === 0) {
          product.stockQuantity = formatInventoryQuantityForStorage(input.stock_quantity, saleUnit)
        }
      }

      const sizesAfterUpdate = await this.sizeService.loadSizes(Number(product.id), trx)
      this.applyWholesaleToProduct(product, input, {
        isService,
        hasFormula: Boolean(product.formulaId),
        hasSizes: sizesAfterUpdate.length > 0,
      })

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

      if (isCatalogService(product)) {
        throw new ServicioCatalogoOperacionInvalidaException(
          'Un servicio no admite tallas ni inventario'
        )
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

  private normalizeProductWholesale(
    input: WholesaleConfigInput,
    options: { isService: boolean; hasFormula: boolean; hasSizes: boolean }
  ) {
    let rejectReason = 'Este ítem no admite configuración mayorista'
    if (options.isService) {
      rejectReason = 'Un servicio no admite configuración mayorista'
    } else if (options.hasFormula) {
      rejectReason = 'Un producto con fórmula no admite configuración mayorista'
    } else if (options.hasSizes) {
      rejectReason = 'Un producto con tallas no admite configuración mayorista'
    }

    return normalizeWholesaleConfig(input, {
      allowEnabled: !options.isService && !options.hasFormula && !options.hasSizes,
      rejectReason,
    })
  }

  private applyWholesaleToProduct(
    product: CatalogProduct,
    input: CatalogProductUpdateInput,
    options: { isService: boolean; hasFormula: boolean; hasSizes: boolean }
  ) {
    const wholesaleTouched =
      input.wholesale_enabled !== undefined ||
      input.wholesale_units_per_pack !== undefined ||
      input.wholesale_cost_usd !== undefined ||
      input.wholesale_sale_price_usd !== undefined

    if (!wholesaleTouched) {
      if (
        product.wholesaleEnabled &&
        (options.hasFormula || options.hasSizes || options.isService)
      ) {
        throw new ConfiguracionMayoristaInvalidaException(
          options.hasFormula
            ? 'Un producto con fórmula no admite configuración mayorista'
            : options.hasSizes
              ? 'Un producto con tallas no admite configuración mayorista'
              : 'Un servicio no admite configuración mayorista'
        )
      }
      return
    }

    const wholesale = this.normalizeProductWholesale(
      {
        wholesale_enabled: input.wholesale_enabled ?? Boolean(product.wholesaleEnabled),
        wholesale_units_per_pack:
          input.wholesale_units_per_pack ??
          (product.wholesaleUnitsPerPack !== null ? Number(product.wholesaleUnitsPerPack) : null),
        wholesale_cost_usd:
          input.wholesale_cost_usd ??
          (product.wholesaleCostUsd !== null ? Number(product.wholesaleCostUsd) : null),
        wholesale_sale_price_usd:
          input.wholesale_sale_price_usd ??
          (product.wholesaleSalePriceUsd !== null ? Number(product.wholesaleSalePriceUsd) : null),
      },
      options
    )

    product.wholesaleEnabled = wholesale.wholesaleEnabled
    product.wholesaleUnitsPerPack = wholesale.wholesaleUnitsPerPack
    product.wholesaleCostUsd = wholesale.wholesaleCostUsd
    product.wholesaleSalePriceUsd = wholesale.wholesaleSalePriceUsd
    if (wholesale.derivedUnitCost !== null) {
      product.costUsd = wholesale.derivedUnitCost.toFixed(4)
    }
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

    const saleChanged = params.trackedSalePrice && product.salePriceUsd !== params.previousSalePrice
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

  async importar(
    itemKind: CatalogItemKind,
    rows: CatalogImportRow[]
  ): Promise<CatalogImportResult> {
    const results: CatalogImportRowResult[] = []
    let created = 0

    for (const row of rows) {
      const label = `Fila ${row.row}`
      try {
        const name = row.name?.trim() ?? ''
        if (!name) {
          results.push({ row: row.row, ok: false, error: `${label}: el nombre es obligatorio` })
          continue
        }

        const isService = itemKind === 'SERVICE'
        const categoryName = (row.category?.trim() || (isService ? 'Servicios' : '')).trim()
        if (!isService && !categoryName) {
          results.push({ row: row.row, ok: false, error: `${label}: la categoría es obligatoria` })
          continue
        }

        const salePrice = row.sale_price_usd
        if (salePrice === undefined || salePrice === null || Number.isNaN(Number(salePrice))) {
          results.push({
            row: row.row,
            ok: false,
            error: `${label}: el precio de venta es obligatorio`,
          })
          continue
        }

        const saleUnit = resolveImportUnit(row.sale_unit)
        if (row.sale_unit?.trim() && !saleUnit) {
          results.push({
            row: row.row,
            ok: false,
            error: `${label}: unidad inválida (usá UND, PAR, CAJ, ROL, SET, MTS o KG)`,
          })
          continue
        }

        await this.categoryService.asegurarActiva(categoryName || 'Servicios')

        const product = await this.crear({
          name,
          description: row.description?.trim() || undefined,
          category: categoryName || 'Servicios',
          item_kind: itemKind,
          sale_unit: saleUnit ?? 'UND',
          sale_price_usd: Number(salePrice),
          cost_usd: row.cost_usd !== undefined ? Number(row.cost_usd) : 0,
          stock_quantity: isService ? 0 : Number(row.stock_quantity ?? 0),
          minimum_stock: isService ? 0 : Number(row.minimum_stock ?? 0),
          barcode: isService ? null : row.barcode,
          supplier_code: isService ? null : row.supplier_code,
        })

        created += 1
        results.push({ row: row.row, ok: true, id: Number(product.id) })
      } catch (error) {
        results.push({
          row: row.row,
          ok: false,
          error: `${label}: ${error instanceof Error ? error.message : 'No se pudo crear'}`,
        })
      }
    }

    return { created, failed: results.filter((item) => !item.ok).length, results }
  }
}

export type CatalogImportRow = {
  row: number
  name?: string
  category?: string
  description?: string
  sale_unit?: string
  sale_price_usd?: number
  cost_usd?: number
  stock_quantity?: number
  minimum_stock?: number
  barcode?: string
  supplier_code?: string
}

export type CatalogImportRowResult = {
  row: number
  ok: boolean
  id?: number
  error?: string
}

export type CatalogImportResult = {
  created: number
  failed: number
  results: CatalogImportRowResult[]
}

function resolveImportUnit(value?: string): InventoryUnit | null {
  if (!value?.trim()) return 'UND'
  const normalized = value.trim().toUpperCase()
  return INVENTORY_UNITS.includes(normalized as InventoryUnit)
    ? (normalized as InventoryUnit)
    : null
}

function resolvePurchaseHistoryPeriod(filters: CatalogProductPurchaseHistoryFilters) {
  if (filters.month) {
    const start = DateTime.fromISO(`${filters.month}-01`).startOf('month')
    return {
      from: start.toISODate()!,
      to: start.endOf('month').toISODate()!,
    }
  }

  if (filters.from) {
    return { from: filters.from, to: filters.to || filters.from }
  }

  return null
}
