import FormulaNoEncontradaException from '#exceptions/formula_no_encontrada_exception'
import ProductoCatalogoEnPedidosActivosException from '#exceptions/producto_catalogo_en_pedidos_activos_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ServicioCatalogoOperacionInvalidaException from '#exceptions/servicio_catalogo_operacion_invalida_exception'
import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import OrderLine from '#models/order_line'
import CategoryService from '#services/category_service'
import FormulaService from '#services/formula_service'
import CatalogProductPricingService from '#services/catalog_product_pricing_service'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import ProductCodeService from '#services/product_code_service'
import ProductInventoryService from '#services/product_inventory_service'
import type { CatalogItemKind } from '#constants/catalog_item_kind'
import { isCatalogService } from '#constants/catalog_item_kind'
import {
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
  type InventoryUnit,
} from '#constants/inventory_units'
import type { CostWarning } from '#types/cost_warning'
import drive from '@adonisjs/drive/services/main'
import { assertProductBarcodeAvailable, normalizeBarcode } from '#utils/barcode'
import { formatUsdNote } from '#utils/price_change_note'
import { normalizeSupplierCode } from '#utils/supplier_code'
import ConfiguracionMayoristaInvalidaException from '#exceptions/configuracion_mayorista_invalida_exception'
import { normalizeWholesaleConfig, type WholesaleConfigInput } from '#utils/wholesale'
import db from '@adonisjs/lucid/services/db'

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

export type CatalogProductUpdateResult = {
  product: CatalogProduct
  costWarnings: CostWarning[]
}

export type CatalogProductUpdateOptions = {
  userId?: number | null
}

export default class CatalogProductService {
  private formulaService = new FormulaService()
  private categoryService = new CategoryService()
  private productCodeService = new ProductCodeService()
  private sizeService = new CatalogProductSizeService()
  private inventoryService = new ProductInventoryService()
  private pricingService = new CatalogProductPricingService()

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
    // Con fórmula el costo unitario lo define la receta; el paquete mayorista no lo pisa.
    if (wholesale.derivedUnitCost !== null && !input.formula_id) {
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
      const warning = this.pricingService.buildCostWarningIfNeeded(product, effectiveCostUsd)
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
    } else if (options.hasSizes) {
      rejectReason = 'Un producto con tallas no admite configuración mayorista'
    }

    // Fórmula + mayorista permitido: el mayorista vende paquetes del producto;
    // el stock se descuenta del material vía fórmula (paquetes × und/paq × qty fórmula).
    return normalizeWholesaleConfig(input, {
      allowEnabled: !options.isService && !options.hasSizes,
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
      if (product.wholesaleEnabled && (options.hasSizes || options.isService)) {
        throw new ConfiguracionMayoristaInvalidaException(
          options.hasSizes
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
    // Con fórmula el costo unitario lo define la receta; no pisar con costo derivado del paquete.
    if (wholesale.derivedUnitCost !== null && !options.hasFormula) {
      product.costUsd = wholesale.derivedUnitCost.toFixed(4)
    }
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
}
