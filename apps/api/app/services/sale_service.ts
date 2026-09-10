import ClienteSinCreditoException from '#exceptions/cliente_sin_credito_exception'
import CustomerNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import DevolucionCantidadInvalidaException from '#exceptions/devolucion_cantidad_invalida_exception'
import LineaVentaInvalidaException from '#exceptions/linea_venta_invalida_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import MetodoPagoRequeridoException from '#exceptions/metodo_pago_requerido_exception'
import OrderNoDevolvableException from '#exceptions/pedido_no_devolvable_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import TasaCambioInvalidaException from '#exceptions/tasa_cambio_invalida_exception'
import TransicionInvalidaException from '#exceptions/transicion_invalida_exception'
import VentaNoEditableException from '#exceptions/venta_no_editable_exception'
import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import { isCatalogService } from '#constants/catalog_item_kind'
import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Customer from '#models/customer'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import SaleLineMaterial from '#models/sale_line_material'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import CatalogProductSizeService from '#services/catalog_product_size_service'
import CurrencyService from '#services/currency_service'
import MaterialService from '#services/material_service'
import PaymentMethodService from '#services/payment_method_service'
import ProductInventoryService from '#services/product_inventory_service'
import SaleCodigoService from '#services/sale_code_service'
import SalesShiftService from '#services/sales_shift_service'
import {
  assertFormulaMaterialsAllowed,
  normalizeFormulaMaterialsInput,
  resolveEffectiveFormulaMaterials,
  sumEffectiveMaterialCostUsd,
  type ResolvedSaleLineFormulaMaterial,
  type SaleLineFormulaMaterialInput,
} from '#services/sale_line_formula'
import { formatCantidadMovimiento } from '#services/order_stock'
import {
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
} from '#constants/inventory_units'
import { formatSaleNativeTotal } from '#utils/currency_amount'
import { applyInvoiceDiscount } from '#utils/invoice_discount'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type SaleBillingMode = 'FAST' | 'ORDER'
export type SaleOrderStatus = 'PENDING' | 'IN_PROCESS' | 'DELIVERED'
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

export type ConfirmSaleInput = {
  payment_type?: SalePaymentType
  payment_method_code?: string | null
  billing_mode?: SaleBillingMode
  currency_code?: string | null
  usd_rate?: number | null
  sold_by_user_id?: number | null
}

export type SaleReturnLineInput = {
  line_id: number
  quantity: number
}

export type ListSalesFilters = {
  page?: number
  perPage?: number
  customer_id?: number
  status?: SaleStatus
  exclude_status?: SaleStatus
  search?: string
  date_from?: string
  date_to?: string
}

type ResolvedLine = {
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
  formulaMaterials: ResolvedSaleLineFormulaMaterial[] | null
}

function normalizeKitchenNote(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const ORDER_STATUS_TRANSITIONS: Record<SaleOrderStatus, SaleOrderStatus[]> = {
  PENDING: ['IN_PROCESS', 'DELIVERED'],
  IN_PROCESS: ['DELIVERED'],
  DELIVERED: [],
}

export default class SaleService {
  private codeService = new SaleCodigoService()
  private materialService = new MaterialService()
  private productInventoryService = new ProductInventoryService()
  private catalogProductStockService = new CatalogProductStockService()
  private sizeService = new CatalogProductSizeService()
  private paymentMethodService = new PaymentMethodService()
  private currencyService = new CurrencyService()
  private salesShiftService = new SalesShiftService()

  previewNextCode(): Promise<string> {
    return this.codeService.preview()
  }

  async listar(filters: ListSalesFilters = {}): Promise<ModelPaginatorContract<Sale>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Sale.query()
      .preload('customer')
      .preload('paymentMethod')
      .orderBy('soldAt', 'desc')
      .orderBy('id', 'desc')

    if (filters.customer_id) {
      query.where('customerId', filters.customer_id)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.exclude_status) {
      query.whereNot('status', filters.exclude_status)
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('code', term)
          .orWhereILike('guestName', term)
          .orWhereHas('customer', (customerQuery) => {
            customerQuery.whereILike('name', term)
          })
      })
    }

    if (filters.date_from) {
      query.where('soldAt', '>=', filters.date_from)
    }

    if (filters.date_to) {
      query.where('soldAt', '<=', `${filters.date_to} 23:59:59`)
    }

    return query.paginate(page, perPage)
  }

  async obtenerDetalle(id: number): Promise<Sale> {
    const sale = await Sale.query()
      .where('id', id)
      .preload('customer')
      .preload('paymentMethod')
      .preload('soldBy')
      .preload('saleLines', (q) => {
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
          .preload('material')
          .preload('saleLineMaterials', (slm) => slm.preload('material'))
          .orderBy('id', 'asc')
      })
      .first()

    if (!sale) {
      throw new VentaNoEncontradaException()
    }

    return sale
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

      await this.persistLines(Number(sale.id), resolvedLines, trx)

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
    const sale = await this.obtenerDetalle(id)

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
        await this.persistLines(Number(sale.id), resolvedLines, trx)
        const { discountUsd, totalUsd } = applyInvoiceDiscount(
          subtotalUsd,
          input.discount_usd !== undefined ? input.discount_usd : Number(sale.discountUsd)
        )
        sale.discountUsd = discountUsd.toFixed(4)
        sale.totalUsd = totalUsd.toFixed(4)
      } else if (input.discount_usd !== undefined) {
        const lines = await SaleLine.query({ client: trx }).where('saleId', Number(sale.id))
        const subtotalUsd = lines.reduce(
          (sum, line) => sum + Number(line.quantity) * Number(line.unitPriceUsd),
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
    const sale = await this.obtenerDetalle(id)

    if (sale.status !== 'DRAFT') {
      throw new VentaNoEditableException()
    }

    await sale.delete()
    return { id, eliminado: true }
  }

  async confirmar(id: number, input: ConfirmSaleInput = {}): Promise<Sale> {
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

      await this.aplicarMetodoPagoAlConfirmar(sale, paymentType, input.payment_method_code, {
        currency_code: input.currency_code,
        usd_rate: input.usd_rate,
      })

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

      await this.congelarCostoLineas(sale, trx)
      await this.descontarStock(sale, trx)
      await this.aplicarPagoAlConfirmar(sale, paymentType, trx)

      sale.useTransaction(trx)
      await sale.save()

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('soldBy')
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

  async transicionar(id: number, orderStatus: SaleOrderStatus): Promise<Sale> {
    return db.transaction(async (trx) => {
      const sale = await Sale.query({ client: trx }).where('id', id).forUpdate().first()

      if (!sale) {
        throw new VentaNoEncontradaException()
      }

      if (sale.status !== 'COMPLETED') {
        throw new TransicionInvalidaException(sale.status, orderStatus)
      }

      if (sale.billingMode !== 'ORDER') {
        throw new TransicionInvalidaException(sale.orderStatus, orderStatus)
      }

      const current = sale.orderStatus as SaleOrderStatus
      const allowed = ORDER_STATUS_TRANSITIONS[current] ?? []

      if (!allowed.includes(orderStatus)) {
        throw new TransicionInvalidaException(current, orderStatus)
      }

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

      const returnRequests = this.resolveReturnRequests(sale.saleLines, lines)

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

        if (line.catalogProductId) {
          const product =
            line.catalogProduct ??
            (await CatalogProduct.query({ client: trx })
              .where('id', Number(line.catalogProductId))
              .first())

          if (product && isCatalogService(product)) {
            continue
          }

          await this.revertirStockProductoParcial(
            Number(sale.id),
            Number(line.catalogProductId),
            returnQty,
            trx,
            note
          )
          if (line.catalogProductSizeId) {
            await this.sizeService.restoreSizeStock(
              Number(line.catalogProductSizeId),
              returnQty,
              trx
            )
          }
          await this.revertirMaterialesLineaParcial(sale, line, returnQty, trx, note)
        }

        if (line.materialId) {
          await InventoryMovement.create(
            {
              materialId: Number(line.materialId),
              type: 'REVERSAL_ADJUSTMENT',
              quantity: formatInventoryQuantityForStorage(returnQty, unit),
              note,
            },
            { client: trx }
          )
        }
      }

      await this.actualizarMontosTrasDevolucion(sale, trx)

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
    const resolvedLines: ResolvedLine[] = []

    for (const line of lines) {
      const hasCatalog = line.catalog_product_id !== undefined && line.catalog_product_id !== null
      const hasMaterial = line.material_id !== undefined && line.material_id !== null

      if (hasCatalog === hasMaterial) {
        throw new LineaVentaInvalidaException()
      }

      const unitPrice = line.unit_price_usd

      if (hasCatalog) {
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
          throw new LineaVentaInvalidaException(
            'Los materiales personalizados no aplican a servicios'
          )
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

        const subtotal = quantity * unitPrice
        totalUsd += subtotal

        const detail = line.description?.trim()
        resolvedLines.push({
          catalogProductId: line.catalog_product_id!,
          materialId: null,
          catalogProductSizeId: resolvedSize.sizeId,
          size: resolvedSize.sizeLabel,
          description: detail && detail.length > 0 ? detail : product.name,
          quantity: formatInventoryQuantityForStorage(quantity, unit),
          unitPriceUsd: unitPrice.toFixed(4),
          subtotalUsd: subtotal.toFixed(4),
          costUsd: product.costUsd,
          kitchenNote: normalizeKitchenNote(line.kitchen_note),
          formulaMaterials,
        })
      } else if (hasMaterial) {
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
        const subtotal = quantity * unitPrice
        totalUsd += subtotal

        resolvedLines.push({
          catalogProductId: null,
          materialId: line.material_id!,
          catalogProductSizeId: null,
          size: null,
          description: material.name,
          quantity: formatInventoryQuantityForStorage(quantity, unit),
          unitPriceUsd: unitPrice.toFixed(4),
          subtotalUsd: subtotal.toFixed(4),
          costUsd: material.lastPurchasePriceUsd,
          kitchenNote: normalizeKitchenNote(line.kitchen_note),
          formulaMaterials: null,
        })
      }
    }

    return { totalUsd, resolvedLines }
  }

  private async persistLines(
    saleId: number,
    lines: ResolvedLine[],
    trx: TransactionClientContract
  ) {
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

  private async congelarCostoLineas(sale: Sale, trx: TransactionClientContract) {
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
            line.costUsd = sumEffectiveMaterialCostUsd(effectiveMaterials)
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

  private async descontarStock(sale: Sale, trx: TransactionClientContract) {
    const saleId = Number(sale.id)

    for (const line of sale.saleLines) {
      const quantity = Number(line.quantity)

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

        const { quantity: disponible } =
          await this.catalogProductStockService.calcularStockDisponible(product, { trx })

        if (quantity > disponible) {
          throw new StockInsuficienteException([
            {
              material_id: Number(product.id),
              name: product.name,
              stock_actual: disponible,
              consumo_proyectado: quantity,
              faltante: quantity - disponible,
            },
          ])
        }

        if (line.catalogProductSizeId) {
          const sizeRow = await CatalogProductSize.query({ client: trx })
            .where('id', Number(line.catalogProductSizeId))
            .forUpdate()
            .first()
          const sizeStock = sizeRow ? Number(sizeRow.stockQuantity) : 0
          if (quantity > sizeStock) {
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
        }

        if (product.formulaId) {
          const formulaMaterials = resolveEffectiveFormulaMaterials(line, product)
          for (const formulaItem of formulaMaterials) {
            const materialId = formulaItem.materialId
            const consumo = quantity * formulaItem.quantityPerUnit
            if (consumo <= 0) {
              continue
            }

            const stockActual = await this.materialService.calcularStock(materialId, trx)
            if (stockActual < consumo) {
              const material = formulaItem.material ?? (await Material.findOrFail(materialId))
              throw new StockInsuficienteException([
                {
                  material_id: materialId,
                  name: material.name,
                  stock_actual: stockActual,
                  consumo_proyectado: consumo,
                  faltante: consumo - stockActual,
                },
              ])
            }

            await InventoryMovement.create(
              {
                materialId,
                type: 'SALE_OUT',
                quantity: formatCantidadMovimiento(consumo),
                note: `Factura ${sale.code}`,
              },
              { client: trx }
            )
          }
          continue
        }

        const sizeLabel = line.size?.trim()
        const sizeNote = sizeLabel ? ` talla ${sizeLabel}` : ''
        const movementNote = `Venta ${sale.code}${sizeNote}`

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
          },
          trx
        )
      }

      if (line.materialId) {
        const materialId = Number(line.materialId)
        const stockActual = await this.materialService.calcularStock(materialId, trx)
        if (stockActual < quantity) {
          const material = line.material ?? (await Material.findOrFail(materialId))
          throw new StockInsuficienteException([
            {
              material_id: materialId,
              name: material.name,
              stock_actual: stockActual,
              consumo_proyectado: quantity,
              faltante: quantity - stockActual,
            },
          ])
        }

        await InventoryMovement.create(
          {
            materialId,
            type: 'SALE_OUT',
            quantity: formatCantidadMovimiento(quantity),
            note: `Factura ${sale.code}`,
          },
          { client: trx }
        )
      }
    }
  }

  private async aplicarMetodoPagoAlConfirmar(
    sale: Sale,
    paymentType: SalePaymentType,
    paymentMethodCode?: string | null,
    options: { currency_code?: string | null; usd_rate?: number | null } = {}
  ) {
    const totalUsd = Number(sale.totalUsd)

    if (paymentType === 'CREDIT') {
      sale.paymentMethodCode = null
      sale.usdRate = null
      sale.totalBs = null
      return
    }

    const code = paymentMethodCode?.trim()
    if (!code) {
      throw new MetodoPagoRequeridoException()
    }

    const method = await this.paymentMethodService.assertActivo(code)
    const currencyCode = (options.currency_code?.trim() || method.currencyCode).toUpperCase()
    const currency = await this.currencyService.assertActiva(currencyCode)
    const overrideRate =
      options.usd_rate !== undefined && options.usd_rate !== null
        ? Number(options.usd_rate)
        : Number.NaN
    const rate = overrideRate > 0 ? overrideRate : Number(currency.ratePerUsd)
    const baseCode = await this.currencyService.getBaseCurrencyCode()

    if (!(rate > 0)) {
      throw new TasaCambioInvalidaException(`La tasa de cambio de ${currencyCode} no es válida`)
    }

    sale.paymentMethodCode = method.code
    sale.usdRate = rate.toFixed(4)
    sale.totalBs = formatSaleNativeTotal(totalUsd, currencyCode, rate, baseCode)
  }

  private async aplicarPagoAlConfirmar(
    sale: Sale,
    paymentType: SalePaymentType,
    trx: TransactionClientContract
  ) {
    const totalUsd = Number(sale.totalUsd)

    if (paymentType === 'CREDIT') {
      if (!sale.customerId) {
        throw new ClienteSinCreditoException()
      }
      const customer = sale.customer ?? (await Customer.find(sale.customerId))
      if (!customer?.creditDays || customer.creditDays <= 0) {
        throw new ClienteSinCreditoException()
      }
      sale.balanceUsd = totalUsd.toFixed(4)
      sale.amountPaidUsd = '0.0000'
      sale.creditDueDate = DateTime.now().plus({ days: customer.creditDays })
    } else {
      sale.balanceUsd = '0.0000'
      sale.amountPaidUsd = totalUsd.toFixed(4)
      sale.creditDueDate = null
    }

    sale.useTransaction(trx)
    await sale.save()
  }

  private resolveReturnRequests(
    lines: SaleLine[],
    input?: SaleReturnLineInput[]
  ): { lineId: number; quantity: number }[] {
    if (!input || input.length === 0) {
      return lines
        .map((line) => {
          const remaining = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
          return remaining > 0 ? { lineId: Number(line.id), quantity: remaining } : null
        })
        .filter((item): item is { lineId: number; quantity: number } => item !== null)
    }

    return input.map((item) => ({
      lineId: item.line_id,
      quantity: item.quantity,
    }))
  }

  private async revertirStockProductoParcial(
    saleId: number,
    catalogProductId: number,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const salidas = await ProductInventoryMovement.query({ client: trx })
      .where('saleId', saleId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'SALE_OUT')

    let soldTotal = 0
    for (const salida of salidas) {
      soldTotal += Math.abs(Number(salida.quantity))
    }

    const reversiones = await ProductInventoryMovement.query({ client: trx })
      .where('saleId', saleId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'REVERSAL_ADJUSTMENT')

    let revertedTotal = 0
    for (const reversion of reversiones) {
      revertedTotal += Math.abs(Number(reversion.quantity))
    }

    const remaining = soldTotal - revertedTotal
    const toRevert = Math.min(quantity, remaining)

    if (toRevert <= 0) {
      return
    }

    await this.productInventoryService.registrarMovimiento(
      {
        catalogProductId,
        type: 'REVERSAL_ADJUSTMENT',
        quantity: toRevert,
        saleId,
        note,
      },
      trx
    )
  }

  private async revertirMaterialesLineaParcial(
    _sale: Sale,
    line: SaleLine,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const product =
      line.catalogProduct ??
      (line.catalogProductId
        ? await CatalogProduct.query({ client: trx })
            .where('id', Number(line.catalogProductId))
            .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
            .first()
        : null)

    if (!product?.formulaId) {
      return
    }

    if (!line.saleLineMaterials) {
      await line.load('saleLineMaterials', (q) => q.preload('material'))
    }

    for (const formulaItem of resolveEffectiveFormulaMaterials(line, product)) {
      const consumo = quantity * formulaItem.quantityPerUnit
      if (consumo <= 0) {
        continue
      }

      await InventoryMovement.create(
        {
          materialId: formulaItem.materialId,
          type: 'REVERSAL_ADJUSTMENT',
          quantity: consumo.toFixed(3),
          note,
        },
        { client: trx }
      )
    }
  }

  private async actualizarMontosTrasDevolucion(sale: Sale, trx: TransactionClientContract) {
    const lines = await SaleLine.query({ client: trx }).where('saleId', Number(sale.id))
    let netTotal = 0

    for (const line of lines) {
      const activeQty = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
      netTotal += activeQty * Number(line.unitPriceUsd)
    }

    const { discountUsd, totalUsd } = applyInvoiceDiscount(netTotal, Number(sale.discountUsd))
    sale.discountUsd = discountUsd.toFixed(4)
    sale.totalUsd = totalUsd.toFixed(4)

    if (sale.paymentType === 'CREDIT') {
      const paid = Number(sale.amountPaidUsd)
      sale.balanceUsd = Math.max(0, totalUsd - paid).toFixed(4)
    } else {
      sale.amountPaidUsd = sale.totalUsd
      sale.balanceUsd = '0.0000'
    }

    sale.useTransaction(trx)
    await sale.save()
  }
}
