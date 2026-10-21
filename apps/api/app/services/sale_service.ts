import CustomerNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import DevolucionCantidadInvalidaException from '#exceptions/devolucion_cantidad_invalida_exception'
import LineaVentaInvalidaException from '#exceptions/linea_venta_invalida_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import OrderNoDevolvableException from '#exceptions/pedido_no_devolvable_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import VentaNoEditableException from '#exceptions/venta_no_editable_exception'
import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import { isCatalogService } from '#constants/catalog_item_kind'
import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Material from '#models/material'
import Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import SalesShift from '#models/sales_shift'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import SaleCodigoService from '#services/sale_code_service'
import SalesShiftService from '#services/sales_shift_service'
import SaleLineService, { type ResolvedSaleLine } from '#services/sale_line_service'
import { assertSaleOrderTransition, type SaleOrderStatus } from '#services/sale_order_state_machine'
import SalePaymentService from '#services/sale_payment_service'
import SaleQueryService from '#services/sale_query_service'
import SaleReturnService from '#services/sale_return_service'
import SaleStockService from '#services/sale_stock_service'
import {
  assertFormulaMaterialsAllowed,
  normalizeFormulaMaterialsInput,
  type SaleLineFormulaMaterialInput,
} from '#services/sale_line_formula'
import {
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
} from '#constants/inventory_units'
import { formatSaleNativeTotal } from '#utils/currency_amount'
import { applyInvoiceDiscount } from '#utils/invoice_discount'
import type { SalePaymentLineInput } from '#utils/sale_payment_lines'
import { resolveSaleReturnRequests, type SaleReturnLineInput } from '#utils/sale_return_requests'
import { resolveMaterialSaleLineCost, resolveProductSaleLineCost } from '#utils/sale_line_cost'
import { calculateSaleLineAmounts, normalizeSaleLineKitchenNote } from '#utils/sale_line_values'
import ConfiguracionMayoristaInvalidaException from '#exceptions/configuracion_mayorista_invalida_exception'
import { resolveWholesaleLineSnapshot } from '#utils/wholesale'
import { broadcastCompanyEvent } from '#services/company_realtime_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type SaleBillingMode = 'FAST' | 'ORDER'
export type { SaleOrderStatus }
export type SalePaymentType = 'CASH' | 'CREDIT'
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'RETURNED'

export type SaleLineInput = {
  catalog_product_id?: number
  material_id?: number
  quantity: number
  unit_price_usd: number
  /** Detalle libre en factura (sobre todo para servicios). */
  description?: string | null
  kitchen_note?: string | null
  catalog_product_size_id?: number | null
  size?: string | null
  is_wholesale?: boolean
  formula_materials?: SaleLineFormulaMaterialInput[]
}

export type CreateSaleInput = {
  customer_id?: number | null
  guest_name?: string | null
  payment_method_code?: string | null
  payment_type?: SalePaymentType
  billing_mode?: SaleBillingMode
  usd_rate?: number | null
  discount_usd?: number
  lines: SaleLineInput[]
  confirm?: boolean
  sold_by_user_id?: number | null
}

export type UpdateSaleInput = {
  customer_id?: number | null
  guest_name?: string | null
  payment_method_code?: string | null
  payment_type?: SalePaymentType
  billing_mode?: SaleBillingMode
  usd_rate?: number | null
  discount_usd?: number
  lines?: SaleLineInput[]
}

export type ConfirmSalePaymentInput = SalePaymentLineInput

export type ConfirmSaleInput = {
  payment_type?: SalePaymentType
  payment_method_code?: string | null
  billing_mode?: SaleBillingMode
  currency_code?: string | null
  usd_rate?: number | null
  sold_by_user_id?: number | null
  payments?: ConfirmSalePaymentInput[]
}

export type OfflineSyncSaleInput = {
  offline_client_id: string
  sold_at: string
  sales_shift_id?: number | null
  customer_id?: number | null
  guest_name?: string | null
  payment_type: SalePaymentType
  billing_mode: SaleBillingMode
  discount_usd?: number
  notes?: string | null
  lines: SaleLineInput[]
  payments?: ConfirmSalePaymentInput[]
  payment_method_code?: string | null
  currency_code?: string | null
  usd_rate?: number | null
  sold_by_user_id?: number | null
}

type ResolvedLineResult = {
  line: ResolvedSaleLine
  subtotalUsd: number
}

export default class SaleService {
  private codeService = new SaleCodigoService()
  private sizeService = new CatalogProductSizeService()
  private salesShiftService = new SalesShiftService()
  private saleLineService = new SaleLineService()
  private salePaymentService = new SalePaymentService()
  private saleQueryService = new SaleQueryService()
  private saleReturnService = new SaleReturnService()
  private saleStockService = new SaleStockService()

  previewNextCode(): Promise<string> {
    return this.codeService.preview()
  }

  async crear(input: CreateSaleInput): Promise<Sale> {
    const sale = await this.guardarBorrador(input)

    if (input.confirm) {
      return this.confirmar(Number(sale.id), {
        payment_type: input.payment_type,
        payment_method_code: input.payment_method_code,
        billing_mode: input.billing_mode,
        sold_by_user_id: input.sold_by_user_id,
      })
    }

    return sale
  }

  async guardarBorrador(input: CreateSaleInput): Promise<Sale> {
    if (input.lines.length === 0) {
      throw new LineaVentaInvalidaException('Debe incluir al menos una línea de venta')
    }

    await this.assertCustomer(input.customer_id)

    return db.transaction(async (trx) => {
      const { totalUsd: subtotalUsd, resolvedLines } = await this.resolveLines(input.lines, trx)
      const { discountUsd, totalUsd } = applyInvoiceDiscount(subtotalUsd, input.discount_usd)
      const totalBs =
        input.usd_rate && input.usd_rate > 0
          ? formatSaleNativeTotal(totalUsd, 'VES', input.usd_rate)
          : null

      const sale = await Sale.create(
        {
          code: null,
          customerId: input.customer_id ?? null,
          guestName: input.guest_name?.trim() || null,
          paymentMethodCode: null,
          paymentType: input.payment_type ?? 'CASH',
          billingMode: input.billing_mode ?? 'FAST',
          orderStatus: 'DELIVERED',
          discountUsd: discountUsd.toFixed(4),
          totalUsd: totalUsd.toFixed(4),
          totalBs,
          usdRate: input.usd_rate ? input.usd_rate.toFixed(4) : null,
          amountPaidUsd: '0.0000',
          balanceUsd: '0.0000',
          creditDueDate: null,
          status: 'DRAFT',
          soldAt: null,
          confirmedAt: null,
          returnedAt: null,
        },
        { client: trx }
      )

      await this.saleLineService.persistLines(Number(sale.id), resolvedLines, trx)

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('saleLines', (q) => {
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
          .preload('material')
          .preload('saleLineMaterials', (slm) => slm.preload('material'))
          .orderBy('id', 'asc')
      })

      return sale
    })
  }

  async actualizar(id: number, input: UpdateSaleInput): Promise<Sale> {
    const sale = await this.saleQueryService.obtenerDetalle(id)

    if (sale.status !== 'DRAFT') {
      throw new VentaNoEditableException()
    }

    if (input.customer_id !== undefined) {
      await this.assertCustomer(input.customer_id ?? null)
    }

    return db.transaction(async (trx) => {
      if (input.lines) {
        if (input.lines.length === 0) {
          throw new LineaVentaInvalidaException('Debe incluir al menos una línea de venta')
        }

        await SaleLine.query({ client: trx }).where('saleId', Number(sale.id)).delete()
        const { totalUsd: subtotalUsd, resolvedLines } = await this.resolveLines(input.lines, trx)
        await this.saleLineService.persistLines(Number(sale.id), resolvedLines, trx)
        const { discountUsd, totalUsd } = applyInvoiceDiscount(
          subtotalUsd,
          input.discount_usd !== undefined ? input.discount_usd : Number(sale.discountUsd)
        )
        sale.discountUsd = discountUsd.toFixed(4)
        sale.totalUsd = totalUsd.toFixed(4)
      } else if (input.discount_usd !== undefined) {
        const lines = await SaleLine.query({ client: trx }).where('saleId', Number(sale.id))
        const subtotalUsd = lines.reduce(
          (sum, line) =>
            sum +
            calculateSaleLineAmounts(Number(line.quantity), Number(line.unitPriceUsd)).subtotal,
          0
        )
        const { discountUsd, totalUsd } = applyInvoiceDiscount(subtotalUsd, input.discount_usd)
        sale.discountUsd = discountUsd.toFixed(4)
        sale.totalUsd = totalUsd.toFixed(4)
      }

      if (input.customer_id !== undefined) {
        sale.customerId = input.customer_id
      }
      if (input.guest_name !== undefined) {
        sale.guestName = input.guest_name?.trim() || null
      }
      if (input.payment_method_code !== undefined) {
        sale.paymentMethodCode = input.payment_method_code
      }
      if (input.payment_type !== undefined) {
        sale.paymentType = input.payment_type
      }
      if (input.billing_mode !== undefined) {
        sale.billingMode = input.billing_mode
      }
      if (input.usd_rate !== undefined) {
        sale.usdRate = input.usd_rate ? input.usd_rate.toFixed(4) : null
        const total = Number(sale.totalUsd)
        const currencyCode = sale.paymentMethod?.currencyCode ?? 'VES'
        sale.totalBs =
          input.usd_rate && input.usd_rate > 0
            ? formatSaleNativeTotal(total, currencyCode, input.usd_rate)
            : null
      }

      sale.useTransaction(trx)
      await sale.save()

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('saleLines', (q) => {
        q.preload('catalogProduct')
          .preload('material')
          .preload('saleLineMaterials', (slm) => slm.preload('material'))
          .orderBy('id', 'asc')
      })

      return sale
    })
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const sale = await this.saleQueryService.obtenerDetalle(id)

    if (sale.status !== 'DRAFT') {
      throw new VentaNoEditableException()
    }

    await sale.delete()
    return { id, eliminado: true }
  }

  async confirmar(id: number, input: ConfirmSaleInput = {}): Promise<Sale> {
    const confirmed = await this.confirmarInternal(id, input)
    broadcastCompanyEvent('sale.changed')
    return confirmed
  }

  private async confirmarInternal(id: number, input: ConfirmSaleInput = {}): Promise<Sale> {
    return db.transaction(async (trx) => {
      const sale = await Sale.query({ client: trx })
        .where('id', id)
        .preload('customer')
        .preload('paymentMethod')
        .preload('saleLines', (q) => {
          q.preload('catalogProduct', (cp) =>
            cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
          ).preload('saleLineMaterials', (slm) => slm.preload('material'))
        })
        .forUpdate()
        .first()

      if (!sale) {
        throw new VentaNoEncontradaException()
      }

      if (sale.status !== 'DRAFT') {
        throw new VentaNoEditableException('La factura ya fue confirmada.')
      }

      if (sale.saleLines.length === 0) {
        throw new LineaVentaInvalidaException('Debe incluir al menos una línea de venta')
      }

      const billingMode = input.billing_mode ?? (sale.billingMode as SaleBillingMode) ?? 'FAST'
      const paymentType = input.payment_type ?? (sale.paymentType as SalePaymentType) ?? 'CASH'

      sale.billingMode = billingMode
      sale.paymentType = paymentType

      await this.salePaymentService.applyConfirmationPayments(sale, paymentType, input, trx)

      sale.code = await this.codeService.generar(trx)
      sale.status = 'COMPLETED'
      sale.soldAt = DateTime.now()
      sale.confirmedAt = DateTime.now()
      sale.orderStatus = billingMode === 'FAST' ? 'DELIVERED' : 'PENDING'
      if (input.sold_by_user_id) {
        sale.soldByUserId = input.sold_by_user_id
      }

      const shift = await this.salesShiftService.requireOpen(trx)
      sale.salesShiftId = shift.id

      await this.saleLineService.freezeCosts(sale, trx)
      await this.saleStockService.deductSaleStock(sale, trx)
      await this.salePaymentService.applySaleBalanceAndDueDate(sale, paymentType, trx)

      sale.useTransaction(trx)
      await sale.save()

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('soldBy')
      await sale.load('salePayments', (q) => {
        q.preload('paymentMethod').orderBy('sortOrder', 'asc').orderBy('id', 'asc')
      })
      await sale.load('saleLines', (q) => {
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
          .preload('material')
          .preload('saleLineMaterials', (slm) => slm.preload('material'))
          .orderBy('id', 'asc')
      })

      return sale
    })
  }

  /**
   * Idempotent offline sale sync. Accepts the sale even if stock is short or the shift already closed.
   */
  async sincronizarOffline(
    input: OfflineSyncSaleInput
  ): Promise<{ sale: Sale; alreadySynced: boolean }> {
    const offlineClientId = input.offline_client_id.trim()
    if (!offlineClientId) {
      throw new LineaVentaInvalidaException('offline_client_id es obligatorio')
    }

    const existing = await Sale.query().where('offlineClientId', offlineClientId).first()
    if (existing) {
      return {
        sale: await this.saleQueryService.obtenerDetalle(Number(existing.id)),
        alreadySynced: true,
      }
    }

    if (input.lines.length === 0) {
      throw new LineaVentaInvalidaException('Debe incluir al menos una línea de venta')
    }

    await this.assertCustomer(input.customer_id)

    const soldAt = DateTime.fromISO(input.sold_at)
    if (!soldAt.isValid) {
      throw new LineaVentaInvalidaException('sold_at inválido')
    }

    const result = await db.transaction(async (trx) => {
      const raced = await Sale.query({ client: trx })
        .where('offlineClientId', offlineClientId)
        .forUpdate()
        .first()
      if (raced) {
        return { saleId: Number(raced.id), alreadySynced: true as const }
      }

      const { totalUsd: subtotalUsd, resolvedLines } = await this.resolveLines(input.lines, trx)
      const { discountUsd, totalUsd } = applyInvoiceDiscount(subtotalUsd, input.discount_usd)

      const sale = await Sale.create(
        {
          code: null,
          offlineClientId,
          needsStockReview: false,
          customerId: input.customer_id ?? null,
          guestName: input.guest_name?.trim() || null,
          paymentMethodCode: null,
          paymentType: input.payment_type,
          billingMode: input.billing_mode,
          orderStatus: input.billing_mode === 'FAST' ? 'DELIVERED' : 'PENDING',
          discountUsd: discountUsd.toFixed(4),
          totalUsd: totalUsd.toFixed(4),
          totalBs: null,
          usdRate: input.usd_rate ? input.usd_rate.toFixed(4) : null,
          amountPaidUsd: '0.0000',
          balanceUsd: '0.0000',
          creditDueDate: null,
          status: 'DRAFT',
          soldAt: null,
          confirmedAt: null,
          returnedAt: null,
          notes: input.notes?.trim() || null,
        },
        { client: trx }
      )

      await this.saleLineService.persistLines(Number(sale.id), resolvedLines, trx)

      const hydrated = await Sale.query({ client: trx })
        .where('id', Number(sale.id))
        .preload('customer')
        .preload('paymentMethod')
        .preload('saleLines', (q) => {
          q.preload('catalogProduct', (cp) =>
            cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
          ).preload('saleLineMaterials', (slm) => slm.preload('material'))
        })
        .forUpdate()
        .firstOrFail()

      await this.salePaymentService.applyConfirmationPayments(
        hydrated,
        input.payment_type,
        {
          payment_method_code: input.payment_method_code,
          currency_code: input.currency_code,
          usd_rate: input.usd_rate,
          payments: input.payments,
        },
        trx
      )

      hydrated.code = await this.codeService.generar(trx)
      hydrated.status = 'COMPLETED'
      hydrated.soldAt = soldAt
      hydrated.confirmedAt = soldAt
      hydrated.orderStatus = input.billing_mode === 'FAST' ? 'DELIVERED' : 'PENDING'
      if (input.sold_by_user_id) {
        hydrated.soldByUserId = input.sold_by_user_id
      }

      if (input.sales_shift_id) {
        const shift = await SalesShift.query({ client: trx })
          .where('id', input.sales_shift_id)
          .first()
        hydrated.salesShiftId = shift ? shift.id : null
      } else {
        const openShift = await SalesShift.query({ client: trx })
          .where('status', 'OPEN')
          .orderBy('id', 'desc')
          .first()
        hydrated.salesShiftId = openShift ? openShift.id : null
      }

      await this.saleLineService.freezeCosts(hydrated, trx)
      const needsReview = await this.saleStockService.deductSaleStock(hydrated, trx, {
        allowInsufficient: true,
      })
      hydrated.needsStockReview = needsReview
      await this.salePaymentService.applySaleBalanceAndDueDate(hydrated, input.payment_type, trx)

      hydrated.useTransaction(trx)
      await hydrated.save()

      return { saleId: Number(hydrated.id), alreadySynced: false as const }
    })

    const sale = await this.saleQueryService.obtenerDetalle(result.saleId)
    if (!result.alreadySynced) {
      broadcastCompanyEvent('sale.changed')
    }

    return {
      sale,
      alreadySynced: result.alreadySynced,
    }
  }

  async transicionar(id: number, orderStatus: SaleOrderStatus): Promise<Sale> {
    return db.transaction(async (trx) => {
      const sale = await Sale.query({ client: trx }).where('id', id).forUpdate().first()

      if (!sale) {
        throw new VentaNoEncontradaException()
      }

      assertSaleOrderTransition(sale, orderStatus)

      sale.orderStatus = orderStatus
      sale.useTransaction(trx)
      await sale.save()

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('saleLines', (q) => {
        q.preload('catalogProduct').preload('material').orderBy('id', 'asc')
      })

      return sale
    })
  }

  async devolver(id: number, lines?: SaleReturnLineInput[]): Promise<Sale> {
    const returned = await this.devolverInternal(id, lines)
    broadcastCompanyEvent('sale.changed')
    return returned
  }

  private async devolverInternal(id: number, lines?: SaleReturnLineInput[]): Promise<Sale> {
    return db.transaction(async (trx) => {
      const sale = await Sale.query({ client: trx })
        .where('id', id)
        .preload('saleLines', (query) =>
          query
            .preload('catalogProduct', (cp) =>
              cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
            )
            .preload('material')
            .preload('saleLineMaterials', (slm) => slm.preload('material'))
        )
        .forUpdate()
        .first()

      if (!sale) {
        throw new VentaNoEncontradaException()
      }

      if (sale.status !== 'COMPLETED') {
        throw new OrderNoDevolvableException()
      }

      // Factura de monto (ficha cliente / sin ítems): anula total y saldo, sin stock.
      if (sale.saleLines.length === 0) {
        const outstanding = Math.max(Number(sale.totalUsd ?? 0), Number(sale.balanceUsd ?? 0))
        if (outstanding <= 0.0001) {
          throw new OrderNoDevolvableException()
        }

        sale.totalUsd = '0.0000'
        sale.discountUsd = '0.0000'
        sale.amountPaidUsd = '0.0000'
        sale.balanceUsd = '0.0000'
        sale.status = 'RETURNED'
        sale.returnedAt = DateTime.now()
        sale.useTransaction(trx)
        await sale.save()

        await sale.load('paymentMethod')
        await sale.load('customer')
        await sale.load('saleLines', (q) => {
          q.preload('catalogProduct').preload('material').orderBy('id', 'asc')
        })

        return sale
      }

      const returnRequests = resolveSaleReturnRequests(sale.saleLines, lines)

      if (returnRequests.length === 0) {
        throw new OrderNoDevolvableException()
      }

      const note = `Devolución factura ${sale.code}`

      for (const request of returnRequests) {
        const line = sale.saleLines.find((item) => Number(item.id) === request.lineId)
        if (!line) {
          throw new LineaVentaInvalidaException('Línea de venta no encontrada')
        }

        const alreadyReturned = Number(line.returnedQuantity ?? 0)
        const remaining = Number(line.quantity) - alreadyReturned
        const unit = line.catalogProduct?.saleUnit ?? line.material?.unit ?? 'UND'
        const returnQty = normalizeInventoryQuantity(request.quantity, unit)

        if (returnQty > remaining + 0.0005) {
          throw new DevolucionCantidadInvalidaException()
        }

        line.returnedQuantity = formatInventoryQuantityForStorage(alreadyReturned + returnQty, unit)
        line.useTransaction(trx)
        await line.save()

        await this.saleReturnService.restoreLineInventory(sale, line, returnQty, unit, trx, note)
      }

      await this.saleReturnService.recalculateAmounts(sale, trx)

      const refreshedLines = await SaleLine.query({ client: trx }).where('saleId', Number(sale.id))
      const allReturned = refreshedLines.every(
        (line) => Number(line.returnedQuantity ?? 0) >= Number(line.quantity)
      )

      if (allReturned) {
        sale.status = 'RETURNED'
        sale.returnedAt = DateTime.now()
      }

      sale.useTransaction(trx)
      await sale.save()

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('saleLines', (q) => {
        q.preload('catalogProduct').preload('material').orderBy('id', 'asc')
      })

      return sale
    })
  }

  private async assertCustomer(customerId?: number | null) {
    if (!customerId) {
      return
    }

    const customer = await Customer.find(customerId)
    if (!customer) {
      throw new CustomerNoEncontradoException()
    }
  }

  private async resolveLines(lines: SaleLineInput[], trx: TransactionClientContract) {
    let totalUsd = 0
    const resolvedLines: ResolvedSaleLine[] = []

    for (const line of lines) {
      const hasCatalog = line.catalog_product_id !== undefined && line.catalog_product_id !== null
      const hasMaterial = line.material_id !== undefined && line.material_id !== null
      if (hasCatalog === hasMaterial) {
        throw new LineaVentaInvalidaException()
      }

      const resolved = hasCatalog
        ? await this.resolveCatalogLine(line, trx)
        : await this.resolveMaterialLine(line)
      totalUsd += resolved.subtotalUsd
      resolvedLines.push(resolved.line)
    }

    return { totalUsd, resolvedLines }
  }

  private async resolveCatalogLine(
    line: SaleLineInput,
    trx: TransactionClientContract
  ): Promise<ResolvedLineResult> {
    const product = await CatalogProduct.query({ client: trx })
      .where('id', line.catalog_product_id!)
      .preload('formula', (f) => f.preload('materials'))
      .preload('sizes')
      .first()

    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const isService = isCatalogService(product)
    const unit = product.saleUnit ?? 'UND'
    const quantity = normalizeInventoryQuantity(line.quantity, unit)

    if (isService && line.formula_materials !== undefined) {
      throw new LineaVentaInvalidaException('Los materiales personalizados no aplican a servicios')
    }

    if (!isService) {
      await assertFormulaMaterialsAllowed(product, line.formula_materials)
    }
    const formulaMaterials = isService
      ? null
      : normalizeFormulaMaterialsInput(line.formula_materials)
    const resolvedSize = isService
      ? { sizeId: null, sizeLabel: null }
      : await this.sizeService.resolveForLine(
          product,
          {
            catalog_product_size_id: line.catalog_product_size_id,
            size: line.size,
          },
          trx
        )

    if (line.is_wholesale && resolvedSize.sizeId) {
      throw new ConfiguracionMayoristaInvalidaException(
        'Un producto con tallas no admite modo mayorista'
      )
    }

    const wholesale = resolveWholesaleLineSnapshot(Boolean(line.is_wholesale), product)
    const lineCost = resolveProductSaleLineCost({
      isWholesale: wholesale.isWholesale,
      unitsPerPack: wholesale.unitsPerPack,
      unitCostUsd: product.costUsd,
      wholesaleCostUsd: product.wholesaleCostUsd,
    })
    const amounts = calculateSaleLineAmounts(quantity, line.unit_price_usd)
    const detail = line.description?.trim()

    return {
      subtotalUsd: amounts.subtotal,
      line: {
        catalogProductId: line.catalog_product_id!,
        materialId: null,
        catalogProductSizeId: resolvedSize.sizeId,
        size: resolvedSize.sizeLabel,
        description: detail && detail.length > 0 ? detail : product.name,
        quantity: formatInventoryQuantityForStorage(quantity, unit),
        unitPriceUsd: amounts.unitPriceUsd,
        subtotalUsd: amounts.subtotalUsd,
        costUsd: lineCost,
        kitchenNote: normalizeSaleLineKitchenNote(line.kitchen_note),
        isWholesale: wholesale.isWholesale,
        unitsPerPack: wholesale.unitsPerPack,
        formulaMaterials,
      },
    }
  }

  private async resolveMaterialLine(line: SaleLineInput): Promise<ResolvedLineResult> {
    if (line.formula_materials !== undefined) {
      throw new LineaVentaInvalidaException(
        'Los materiales personalizados solo aplican a productos de catálogo con fórmula'
      )
    }

    const material = await Material.find(line.material_id!)
    if (!material) {
      throw new MaterialNoEncontradoException()
    }

    const unit = material.unit ?? 'UND'
    const quantity = normalizeInventoryQuantity(line.quantity, unit)
    const amounts = calculateSaleLineAmounts(quantity, line.unit_price_usd)
    const wholesale = resolveWholesaleLineSnapshot(Boolean(line.is_wholesale), material)
    const lineCost = resolveMaterialSaleLineCost({
      isWholesale: wholesale.isWholesale,
      unitsPerPack: wholesale.unitsPerPack,
      unitCostUsd: material.lastPurchasePriceUsd,
      wholesaleCostUsd: material.wholesaleCostUsd,
    })

    return {
      subtotalUsd: amounts.subtotal,
      line: {
        catalogProductId: null,
        materialId: line.material_id!,
        catalogProductSizeId: null,
        size: null,
        description: material.name,
        quantity: formatInventoryQuantityForStorage(quantity, unit),
        unitPriceUsd: amounts.unitPriceUsd,
        subtotalUsd: amounts.subtotalUsd,
        costUsd: lineCost,
        kitchenNote: normalizeSaleLineKitchenNote(line.kitchen_note),
        isWholesale: wholesale.isWholesale,
        unitsPerPack: wholesale.unitsPerPack,
        formulaMaterials: null,
      },
    }
  }
}
