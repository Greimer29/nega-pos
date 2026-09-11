import ArchivoFacturaFaltanteException from '#exceptions/archivo_factura_faltante_exception'
import ArchivoFacturaNoAdjuntoException from '#exceptions/archivo_factura_no_adjunto_exception'
import PurchaseItemReferenciaInvalidaException from '#exceptions/compra_item_referencia_invalida_exception'
import PurchaseItemNoEncontradoException from '#exceptions/compra_item_no_encontrado_exception'
import PurchaseNoDevolvableException from '#exceptions/compra_no_devolvable_exception'
import PurchaseNoEditableException from '#exceptions/compra_no_editable_exception'
import PurchaseNoEncontradaException from '#exceptions/compra_no_encontrada_exception'
import PurchaseSinItemsException from '#exceptions/compra_sin_items_exception'
import PurchaseYaConfirmadaException from '#exceptions/compra_ya_confirmada_exception'
import ProductInventoryService from '#services/product_inventory_service'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import ProductoCatalogoStockFormulaException from '#exceptions/producto_catalogo_stock_formula_exception'
import ServicioCatalogoOperacionInvalidaException from '#exceptions/servicio_catalogo_operacion_invalida_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import NumeroFacturaRequeridoException from '#exceptions/numero_factura_requerido_exception'
import StockInsuficienteDevolucionException from '#exceptions/stock_insuficiente_devolucion_exception'
import Purchase from '#models/purchase'
import PurchaseItem from '#models/purchase_item'
import Material from '#models/material'
import CatalogProduct from '#models/catalog_product'
import CompraCreditoSinVencimientoException from '#exceptions/compra_credito_sin_vencimiento_exception'
import InventoryMovement from '#models/inventory_movement'
import ProductInventoryMovement from '#models/product_inventory_movement'
import { isCatalogService } from '#constants/catalog_item_kind'
import SupplierService from '#services/supplier_service'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import MaterialService from '#services/material_service'
import FormulaService from '#services/formula_service'
import OrderService from '#services/order_service'
import type { CostWarning } from '#types/cost_warning'
import type { FulfilledPendingOrder } from '#services/order_service'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { tenantStorageKey } from '#utils/tenant_storage'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type PurchaseInput = {
  supplier_id?: number
  date: string
  date_recepcion?: string
  invoice_number?: string
  usd_rate?: number
  entry_currency_code?: string
  notes?: string
  account_id?: number | null
  is_credit?: boolean
  credit_due_date?: string
}

export type PurchaseItemInput = {
  material_id?: number
  catalog_product_id?: number
  quantity: number
  unit_price_usd: number
  unit_price_bs?: number
}

export type ConfirmPurchaseInput = Partial<PurchaseInput> & {
  items?: PurchaseItemInput[]
}

export type ListPurchasesFilters = {
  page?: number
  perPage?: number
  supplier_id?: number
  status?: Purchase['status']
  date_desde?: string
  date_hasta?: string
  account_id?: number
  unassigned?: boolean
}

export type PurchaseSummary = {
  totalUsd: string
  count: number
  confirmedCount: number
  confirmedPercent: number
}

export type FacturaDownload = {
  bytes: Buffer | Uint8Array
  contentType: string
  filename: string
}

const FACTURA_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export type ConfirmPurchaseResult = {
  purchase: Purchase
  costWarnings: CostWarning[]
  fulfilledOrders: FulfilledPendingOrder[]
}

export default class PurchaseService {
  private supplierService = new SupplierService()
  private accountService = new AccountService()
  private currencyService = new CurrencyService()
  private materialService = new MaterialService()
  private formulaService = new FormulaService()
  private orderService = new OrderService()
  private productInventoryService = new ProductInventoryService()

  async listar(filters: ListPurchasesFilters = {}): Promise<ModelPaginatorContract<Purchase>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Purchase.query().preload('account').orderBy('date', 'desc').orderBy('id', 'desc')

    if (filters.supplier_id) {
      query.where('supplierId', filters.supplier_id)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.date_desde) {
      query.where('date', '>=', filters.date_desde)
    }

    if (filters.date_hasta) {
      query.where('date', '<=', filters.date_hasta)
    }

    if (filters.unassigned) {
      query.whereNull('accountId')
    } else if (filters.account_id) {
      query.where('accountId', filters.account_id)
    }

    return query.paginate(page, perPage)
  }

  async resumen(): Promise<PurchaseSummary> {
    const rows = await Purchase.query().select('status', 'total_usd', 'total_bs', 'usd_rate')

    let totalUsd = 0
    let count = 0
    let confirmedCount = 0

    for (const row of rows) {
      count += 1
      if (row.status === 'CONFIRMED') {
        confirmedCount += 1
        totalUsd += this.resolveTotalUsd(row)
      }
    }

    const confirmedPercent = count > 0 ? Math.round((confirmedCount / count) * 10000) / 100 : 0

    return {
      totalUsd: totalUsd.toFixed(4),
      count,
      confirmedCount,
      confirmedPercent,
    }
  }

  async obtener(id: number): Promise<Purchase> {
    const purchase = await Purchase.find(id)
    if (!purchase) {
      throw new PurchaseNoEncontradaException()
    }
    return purchase
  }

  async obtenerDetalle(id: number): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
    const purchase = await Purchase.query().where('id', id).preload('account').first()
    if (!purchase) {
      throw new PurchaseNoEncontradaException()
    }
    const items = await PurchaseItem.query()
      .where('purchaseId', Number(purchase.id))
      .preload('material')
      .preload('catalogProduct')
      .orderBy('id', 'asc')

    return { purchase, items }
  }

  async crear(input: PurchaseInput): Promise<Purchase> {
    if (input.supplier_id) {
      await this.supplierService.obtener(input.supplier_id)
    }
    const baseCode = await this.currencyService.getBaseCurrencyCode()
    const data = await this.preparePurchaseInput(input, baseCode)
    const entryCurrencyCode = await this.resolveEntryCurrencyCode(
      input.entry_currency_code ?? (input.usd_rate !== undefined ? 'VES' : baseCode)
    )

    return Purchase.create({
      supplierId: input.supplier_id ?? null,
      accountId: data.accountId ?? null,
      date: data.date,
      receivedDate: data.receivedDate,
      invoiceNumber: data.invoiceNumber,
      entryCurrencyCode,
      usdRate: entryCurrencyCode === baseCode ? null : data.usdRate,
      totalBs: '0.00',
      totalUsd: '0.0000',
      status: 'DRAFT',
      notes: data.notes,
    })
  }

  async actualizar(id: number, input: PurchaseInput): Promise<Purchase> {
    const purchase = await this.obtener(id)
    this.assertBorrador(purchase)

    if (input.supplier_id !== undefined) {
      if (input.supplier_id) {
        await this.supplierService.obtener(input.supplier_id)
      }
    }
    const baseCode = await this.currencyService.getBaseCurrencyCode()
    const data = await this.preparePurchaseInput(input, baseCode)

    purchase.merge({
      ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
      ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
      date: data.date,
      receivedDate: data.receivedDate,
      invoiceNumber: data.invoiceNumber,
      ...(data.entryCurrencyCode !== undefined
        ? { entryCurrencyCode: data.entryCurrencyCode }
        : {}),
      ...(data.usdRate !== undefined ? { usdRate: data.usdRate } : {}),
      notes: data.notes,
      ...(data.isCredit !== undefined ? { isCredit: data.isCredit } : {}),
      ...(data.creditDueDate !== undefined ? { creditDueDate: data.creditDueDate } : {}),
    })

    await purchase.save()
    return purchase
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const purchase = await this.obtener(id)

    if (purchase.status === 'CONFIRMED') {
      throw new PurchaseNoEditableException(
        'No se puede eliminar una compra confirmada. Primero devolvela o anulala.'
      )
    }

    if (purchase.status !== 'DRAFT' && purchase.status !== 'VOIDED') {
      throw new PurchaseNoEditableException()
    }

    if (purchase.status === 'DRAFT') {
      await purchase.delete()
      return { id: Number(purchase.id), eliminado: true }
    }

    // VOIDED: desenganchar movimientos de inventario (RESTRICT) y borrar el registro.
    return db.transaction(async (trx) => {
      const items = await PurchaseItem.query({ client: trx }).where('purchaseId', id)
      const itemIds = items.map((item) => Number(item.id))

      if (itemIds.length > 0) {
        await InventoryMovement.query({ client: trx })
          .whereIn('purchaseItemId', itemIds)
          .update({ purchaseItemId: null })
        await ProductInventoryMovement.query({ client: trx })
          .whereIn('purchaseItemId', itemIds)
          .update({ purchaseItemId: null })
      }

      purchase.useTransaction(trx)
      await purchase.delete()
      return { id: Number(purchase.id), eliminado: true }
    })
  }

  async agregarItem(purchaseId: number, input: PurchaseItemInput): Promise<PurchaseItem> {
    return db.transaction(async (trx) => {
      const purchase = await this.obtenerConLock(purchaseId, trx)
      this.assertBorrador(purchase)
      await this.assertItemReferenciaValida(input)

      const item = await this.crearItem(purchase, input, trx)
      await this.recalcularTotales(purchase, trx)
      await this.preloadItemRelaciones(item)
      return item
    })
  }

  async actualizarItem(
    purchaseId: number,
    itemId: number,
    input: Partial<PurchaseItemInput>
  ): Promise<PurchaseItem> {
    return db.transaction(async (trx) => {
      const purchase = await this.obtenerConLock(purchaseId, trx)
      this.assertBorrador(purchase)
      const item = await this.obtenerItem(purchaseId, itemId, trx)

      if (input.material_id !== undefined) {
        await this.assertMaterialExiste(input.material_id)
        item.materialId = input.material_id
        item.catalogProductId = null
      }

      if (input.catalog_product_id !== undefined) {
        await this.assertCatalogProductExiste(input.catalog_product_id)
        item.catalogProductId = input.catalog_product_id
        item.materialId = null
      }

      const quantity = input.quantity ?? Number(item.quantity)
      const unitPriceUsd = input.unit_price_usd ?? Number(item.unitPriceUsd ?? 0)
      const priced = this.calcularPreciosItem(purchase, quantity, unitPriceUsd, input.unit_price_bs)

      item.quantity = this.formatCantidad(quantity)
      item.unitPriceUsd = priced.unitPriceUsd
      item.unitPriceBs = priced.unitPriceBs
      item.subtotalUsd = priced.subtotalUsd
      item.subtotalBs = priced.subtotalBs
      item.useTransaction(trx)
      await item.save()

      await this.recalcularTotales(purchase, trx)
      await this.preloadItemRelaciones(item)
      return item
    })
  }

  async eliminarItem(purchaseId: number, itemId: number): Promise<{ id: number; eliminado: true }> {
    return db.transaction(async (trx) => {
      const purchase = await this.obtenerConLock(purchaseId, trx)
      this.assertBorrador(purchase)
      const item = await this.obtenerItem(purchaseId, itemId, trx)

      item.useTransaction(trx)
      await item.delete()

      await this.recalcularTotales(purchase, trx)
      return { id: itemId, eliminado: true }
    })
  }

  async confirmar(id: number, input: ConfirmPurchaseInput = {}): Promise<ConfirmPurchaseResult> {
    const txResult = await db.transaction(async (trx) => {
      const purchase = await this.obtenerConLock(id, trx)

      if (purchase.status === 'CONFIRMED' || purchase.status === 'VOIDED') {
        throw new PurchaseYaConfirmadaException()
      }

      if (input.supplier_id !== undefined) {
        await this.supplierService.obtener(input.supplier_id)
        purchase.supplierId = input.supplier_id
      }
      if (input.date !== undefined) {
        purchase.date = DateTime.fromISO(input.date)
      }
      if (input.date_recepcion !== undefined) {
        purchase.receivedDate = input.date_recepcion ? DateTime.fromISO(input.date_recepcion) : null
      }
      if (input.invoice_number !== undefined) {
        purchase.invoiceNumber = input.invoice_number?.trim() || null
      }
      if (input.usd_rate !== undefined) {
        purchase.usdRate = this.formatTasaUsd(input.usd_rate)
      }
      if (input.entry_currency_code !== undefined) {
        purchase.entryCurrencyCode = await this.resolveEntryCurrencyCode(input.entry_currency_code)
        if (purchase.entryCurrencyCode === 'USD') {
          purchase.usdRate = null
        }
      }
      if (input.notes !== undefined) {
        purchase.notes = input.notes?.trim() || null
      }
      if (input.account_id !== undefined) {
        if (input.account_id === null) {
          purchase.accountId = null
        } else {
          await this.accountService.assertActiva(input.account_id)
          purchase.accountId = input.account_id
        }
      }

      if (input.is_credit !== undefined) {
        purchase.isCredit = input.is_credit
      }
      if (input.credit_due_date !== undefined) {
        purchase.creditDueDate = input.credit_due_date
          ? DateTime.fromISO(input.credit_due_date)
          : null
      }

      if (!purchase.invoiceNumber?.trim()) {
        throw new NumeroFacturaRequeridoException()
      }

      if (input.items && input.items.length > 0) {
        await PurchaseItem.query({ client: trx }).where('purchaseId', Number(purchase.id)).delete()

        for (const itemInput of input.items) {
          await this.crearItem(purchase, itemInput, trx)
        }
      }

      await this.recalcularTotales(purchase, trx)

      const items = await PurchaseItem.query({ client: trx })
        .where('purchaseId', Number(purchase.id))
        .forUpdate()

      const affectsInventory = purchase.affectsInventory !== false

      if (items.length === 0 && affectsInventory) {
        throw new PurchaseSinItemsException()
      }

      const usdRate = purchase.usdRate ? Number(purchase.usdRate) : null
      let totalUsd = 0
      const materialIds = new Set<number>()

      for (const item of items) {
        const unitPriceUsd = item.unitPriceUsd ?? '0'
        const subtotalUsd = item.subtotalUsd ?? '0'

        totalUsd += Number(subtotalUsd)

        if (!affectsInventory) {
          continue
        }

        if (item.materialId) {
          await InventoryMovement.create(
            {
              materialId: Number(item.materialId),
              type: 'PURCHASE_IN',
              quantity: item.quantity,
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

          const newCostUsd = unitPriceUsd
          if (
            material.lastPurchasePriceUsd !== null &&
            material.lastPurchasePriceUsd !== newCostUsd
          ) {
            material.previousPurchasePriceUsd = material.lastPurchasePriceUsd
          }

          material.lastPurchasePriceUsd = newCostUsd

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
              quantity: Number(item.quantity),
              purchaseItemId: Number(item.id),
              note: `Compra #${purchase.id}`,
            },
            trx
          )

          const newCostUsd = unitPriceUsd
          product.costUsd = newCostUsd
          product.useTransaction(trx)
          await product.save()
        }
      }

      const costWarnings: CostWarning[] = []
      const seenProductIds = new Set<number>()
      if (affectsInventory) {
        for (const materialId of materialIds) {
          const warnings = await this.formulaService.recalcularCostosPorMaterial(materialId, trx)
          for (const warning of warnings) {
            if (!seenProductIds.has(warning.product_id)) {
              seenProductIds.add(warning.product_id)
              costWarnings.push(warning)
            }
          }
        }
      }

      if (items.length > 0) {
        purchase.totalUsd = totalUsd.toFixed(4)
      }

      const resolvedTotalUsd = items.length > 0 ? totalUsd : Number(purchase.totalUsd ?? 0)

      if (usdRate !== null && usdRate > 0 && items.length > 0) {
        purchase.totalBs = (resolvedTotalUsd * usdRate).toFixed(2)
      }

      const isCredit = input.is_credit ?? purchase.isCredit
      if (isCredit) {
        const dueDate =
          input.credit_due_date ??
          purchase.creditDueDate?.toISODate() ??
          (purchase.supplierId
            ? await this.defaultCreditDueDate(Number(purchase.supplierId))
            : null)

        if (!dueDate) {
          throw new CompraCreditoSinVencimientoException()
        }

        purchase.isCredit = true
        purchase.creditDueDate = DateTime.fromISO(dueDate)
        purchase.balanceUsd = resolvedTotalUsd.toFixed(4)
        purchase.amountPaidUsd = '0.0000'
        purchase.accountId = input.account_id === undefined ? purchase.accountId : input.account_id
      } else {
        purchase.isCredit = false
        purchase.creditDueDate = null
        purchase.balanceUsd = '0.0000'
        purchase.amountPaidUsd = resolvedTotalUsd.toFixed(4)
      }

      purchase.status = 'CONFIRMED'
      purchase.useTransaction(trx)
      await purchase.save()

      return { purchase, costWarnings, materialIds: [...materialIds] }
    })

    const fulfilledOrders = await this.orderService.intentarProducirPedidosPendientes(
      txResult.materialIds
    )

    return {
      purchase: txResult.purchase,
      costWarnings: txResult.costWarnings,
      fulfilledOrders,
    }
  }

  async devolver(id: number): Promise<Purchase> {
    return db.transaction(async (trx) => {
      const purchase = await this.obtenerConLock(id, trx)

      if (purchase.status !== 'CONFIRMED') {
        throw new PurchaseNoDevolvableException()
      }

      const items = await PurchaseItem.query({ client: trx })
        .where('purchaseId', Number(purchase.id))
        .preload('material')
        .preload('catalogProduct')
        .forUpdate()

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
          const required = Number(item.quantity)

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
          const required = Number(item.quantity)

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

      for (const item of items) {
        const qty = Number(item.quantity)

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

      purchase.status = 'VOIDED'
      purchase.voidedAt = DateTime.now()
      // Anulada: ya no hay CxP ni "por pagar".
      purchase.balanceUsd = '0.0000'
      purchase.useTransaction(trx)
      await purchase.save()

      return purchase
    })
  }

  async guardarFactura(purchaseId: number, file: MultipartFile): Promise<Purchase> {
    const purchase = await this.obtener(purchaseId)
    this.assertBorrador(purchase)

    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = tenantStorageKey(`purchases/${purchaseId}/${randomUUID()}.${extension}`)

    if (purchase.invoiceFile) {
      await drive
        .use()
        .delete(purchase.invoiceFile)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    purchase.invoiceFile = key
    await purchase.save()

    return purchase
  }

  async obtenerFactura(purchaseId: number): Promise<FacturaDownload> {
    const purchase = await this.obtener(purchaseId)

    if (!purchase.invoiceFile) {
      throw new ArchivoFacturaNoAdjuntoException()
    }

    const exists = await drive.use().exists(purchase.invoiceFile)
    if (!exists) {
      throw new ArchivoFacturaFaltanteException()
    }

    const bytes = await drive.use().getBytes(purchase.invoiceFile)
    const extension = purchase.invoiceFile.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = FACTURA_MIME[extension] ?? 'application/octet-stream'
    const filename = `factura-${purchase.invoiceNumber ?? purchase.id}.${extension}`

    return { bytes, contentType, filename }
  }

  private async crearItem(
    purchase: Purchase,
    input: PurchaseItemInput,
    trx: TransactionClientContract
  ): Promise<PurchaseItem> {
    await this.assertItemReferenciaValida(input)

    const priced = this.calcularPreciosItem(
      purchase,
      input.quantity,
      input.unit_price_usd,
      input.unit_price_bs
    )

    return PurchaseItem.create(
      {
        purchaseId: Number(purchase.id),
        materialId: input.material_id ?? null,
        catalogProductId: input.catalog_product_id ?? null,
        quantity: this.formatCantidad(input.quantity),
        unitPriceUsd: priced.unitPriceUsd,
        unitPriceBs: priced.unitPriceBs,
        subtotalUsd: priced.subtotalUsd,
        subtotalBs: priced.subtotalBs,
      },
      { client: trx }
    )
  }

  private calcularPreciosItem(
    purchase: Purchase,
    quantity: number,
    unitPriceUsd: number,
    unitPriceBsOverride?: number
  ) {
    const usdRate = purchase.usdRate ? Number(purchase.usdRate) : null
    const subtotalUsd = quantity * unitPriceUsd
    const unitPriceBs =
      unitPriceBsOverride !== undefined
        ? unitPriceBsOverride
        : usdRate && usdRate > 0
          ? unitPriceUsd * usdRate
          : 0

    return {
      unitPriceUsd: unitPriceUsd.toFixed(4),
      unitPriceBs: unitPriceBs.toFixed(2),
      subtotalUsd: subtotalUsd.toFixed(4),
      subtotalBs: (quantity * unitPriceBs).toFixed(2),
    }
  }

  private resolveTotalUsd(purchase: Purchase): number {
    if (purchase.totalUsd) {
      return Number(purchase.totalUsd)
    }
    const rate = purchase.usdRate ? Number(purchase.usdRate) : null
    if (rate && rate > 0) {
      return Number(purchase.totalBs) / rate
    }
    return 0
  }

  private async preparePurchaseInput(input: PurchaseInput, baseCurrencyCode?: string) {
    const baseCode = baseCurrencyCode ?? (await this.currencyService.getBaseCurrencyCode())

    let accountId: number | null | undefined
    if (input.account_id !== undefined) {
      if (input.account_id === null) {
        accountId = null
      } else {
        await this.accountService.assertActiva(input.account_id)
        accountId = input.account_id
      }
    }

    let entryCurrencyCode: string | undefined
    if (input.entry_currency_code !== undefined) {
      entryCurrencyCode = await this.resolveEntryCurrencyCode(input.entry_currency_code)
    }

    const resolvedEntryCurrency = entryCurrencyCode
    let usdRate: string | null | undefined
    if (input.usd_rate !== undefined) {
      usdRate = resolvedEntryCurrency === baseCode ? null : this.formatTasaUsd(input.usd_rate)
    } else if (resolvedEntryCurrency === baseCode) {
      usdRate = null
    }

    return {
      ...(input.supplier_id !== undefined ? { supplierId: input.supplier_id ?? null } : {}),
      accountId,
      date: DateTime.fromISO(input.date),
      receivedDate: input.date_recepcion ? DateTime.fromISO(input.date_recepcion) : null,
      invoiceNumber: input.invoice_number?.trim() || null,
      ...(entryCurrencyCode !== undefined ? { entryCurrencyCode } : {}),
      ...(usdRate !== undefined ? { usdRate } : {}),
      notes: input.notes?.trim() || null,
      isCredit: input.is_credit,
      creditDueDate: input.credit_due_date ? DateTime.fromISO(input.credit_due_date) : null,
    }
  }

  private async resolveEntryCurrencyCode(code: string): Promise<string> {
    const normalized = code.trim().toUpperCase()
    await this.currencyService.assertActiva(normalized)
    return normalized
  }

  private async defaultCreditDueDate(supplierId: number): Promise<string | null> {
    const supplier = await this.supplierService.obtener(supplierId)
    if (!supplier.creditDays || supplier.creditDays <= 0) {
      return null
    }
    return DateTime.now().plus({ days: supplier.creditDays }).toISODate()
  }

  private assertBorrador(purchase: Purchase) {
    if (purchase.status !== 'DRAFT') {
      throw new PurchaseNoEditableException()
    }
  }

  private async obtenerConLock(id: number, trx: TransactionClientContract) {
    const purchase = await Purchase.query({ client: trx }).where('id', id).forUpdate().first()
    if (!purchase) {
      throw new PurchaseNoEncontradaException()
    }
    return purchase
  }

  private async obtenerItem(
    purchaseId: number,
    itemId: number,
    trx?: TransactionClientContract
  ): Promise<PurchaseItem> {
    const item = await PurchaseItem.query({ client: trx })
      .where('id', itemId)
      .where('purchaseId', purchaseId)
      .first()

    if (!item) {
      throw new PurchaseItemNoEncontradoException()
    }

    return item
  }

  private async assertMaterialExiste(materialId: number) {
    const material = await Material.find(materialId)
    if (!material) {
      throw new MaterialNoEncontradoException()
    }
  }

  private async assertCatalogProductExiste(catalogProductId: number) {
    const product = await CatalogProduct.find(catalogProductId)
    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }
    if (isCatalogService(product)) {
      throw new ServicioCatalogoOperacionInvalidaException(
        'Los servicios no se pueden comprar como stock'
      )
    }
  }

  private async assertItemReferenciaValida(input: PurchaseItemInput) {
    const hasMaterial = input.material_id !== undefined && input.material_id !== null
    const hasProduct = input.catalog_product_id !== undefined && input.catalog_product_id !== null

    if (hasMaterial === hasProduct) {
      throw new PurchaseItemReferenciaInvalidaException()
    }

    if (hasMaterial) {
      await this.assertMaterialExiste(input.material_id!)
    }

    if (hasProduct) {
      await this.assertCatalogProductExiste(input.catalog_product_id!)
    }
  }

  private async preloadItemRelaciones(item: PurchaseItem) {
    if (item.materialId) {
      await item.load('material')
    }
    if (item.catalogProductId) {
      await item.load('catalogProduct')
    }
  }

  private async recalcularTotales(purchase: Purchase, trx: TransactionClientContract) {
    const resultUsd = await PurchaseItem.query({ client: trx })
      .where('purchaseId', Number(purchase.id))
      .sum('subtotal_usd as total')
      .first()

    const resultBs = await PurchaseItem.query({ client: trx })
      .where('purchaseId', Number(purchase.id))
      .sum('subtotal_bs as total')
      .first()

    const totalUsd = resultUsd?.$extras.total
    const totalBs = resultBs?.$extras.total

    purchase.totalUsd =
      totalUsd === null || totalUsd === undefined ? '0.0000' : Number(totalUsd).toFixed(4)
    purchase.totalBs =
      totalBs === null || totalBs === undefined ? '0.00' : Number(totalBs).toFixed(2)
    purchase.useTransaction(trx)
    await purchase.save()
  }

  private formatCantidad(quantity: number): string {
    return quantity.toFixed(2)
  }

  private formatTasaUsd(tasa: number): string {
    return tasa.toFixed(4)
  }
}
