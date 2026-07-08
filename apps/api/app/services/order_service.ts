import ClienteSinCreditoException from '#exceptions/cliente_sin_credito_exception'
import ArchivoReferenciaNoAdjuntoException from '#exceptions/archivo_referencia_no_adjunto_exception'
import ArchivoReferenciaFaltanteException from '#exceptions/archivo_referencia_faltante_exception'
import CustomerNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import ClienteOInvitadoRequeridoException from '#exceptions/cliente_o_invitado_requerido_exception'
import MaterialDuplicadoEnRecetaException from '#exceptions/material_duplicado_en_receta_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import OrderMaterialNoEncontradoException from '#exceptions/pedido_material_no_encontrado_exception'
import OrderNoEditableException from '#exceptions/pedido_no_editable_exception'
import OrderNoDevolvableException from '#exceptions/pedido_no_devolvable_exception'
import OrderNoEncontradoException from '#exceptions/pedido_no_encontrado_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import Customer from '#models/customer'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import Order from '#models/order'
import OrderMaterial from '#models/order_material'
import OrderLine from '#models/order_line'
import CatalogProduct from '#models/catalog_product'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import ProductInventoryService from '#services/product_inventory_service'
import ProductInventoryMovement from '#models/product_inventory_movement'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import PedidoLineaNoEncontradaException from '#exceptions/pedido_linea_no_encontrada_exception'
import DevolucionCantidadInvalidaException from '#exceptions/devolucion_cantidad_invalida_exception'
import OrderCodigoService from '#services/order_code_service'
import {
  evaluarConsumoVsStock,
  formatCantidadMovimiento,
  formatCantidadReversion,
  NOTA_FORZADO_SIN_STOCK,
  RECETA_VACIA_WARNING,
  buildOrderConsumoMap,
  type ConsumoMaterialLinea,
} from '#services/order_stock'
import type { StockInsuficienteDetail } from '#exceptions/stock_insuficiente_exception'
import {
  type OrderEstado,
  type TransicionResult,
  resolverTransicion,
} from '#services/order_state_machine'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type OrderReturnLineInput = {
  line_id: number
  quantity: number
}

export type OrderInput = {
  customer_id?: number
  guest_name?: string
  modality: string
  description?: string
  total_quantity?: number
  order_date: string
  estimated_delivery_date?: string
  total_price?: number
  notes?: string
  payment_type?: 'CASH' | 'CREDIT'
  lines?: OrderLineInput[]
}

export type OrderLineInput = {
  catalog_product_id: number
  quantity: number
}

export type OrderLineUpdateInput = {
  quantity: number
}

export type OrderBudget = {
  lines: {
    id: number
    catalog_product_id: number
    product_name: string
    quantity: string
    unit_price_usd: string
    subtotal_usd: string
  }[]
  total_usd: string
}

export type OrderMaterialInput = {
  material_id: number
  quantity_per_garment: number
  notes?: string
}

export type OrderMaterialUpdateInput = {
  material_id?: number
  quantity_per_garment?: number
  notes?: string
}

export type TransicionOptions = {
  force?: boolean
  payment_type?: 'CASH' | 'CREDIT'
}

export type ListOrdersFilters = {
  page?: number
  perPage?: number
  customer_id?: number
  status?: string
  exclude_status?: string
  modality?: string
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'order_date' | 'code' | 'created_at' | 'confirmed_at'
  direction?: 'asc' | 'desc'
}

export type ReferenciaDownload = {
  bytes: Buffer | Uint8Array
  contentType: string
  filename: string
}

export type MaterialAvailabilityResult = {
  sufficient: boolean
  has_recipe: boolean
  missing: StockInsuficienteDetail[]
}

export type FulfilledPendingOrder = {
  id: number
  code: string
}

const REFERENCIA_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const ORDER_COLUMN: Record<NonNullable<ListOrdersFilters['sort_by']>, string> = {
  order_date: 'order_date',
  code: 'code',
  created_at: 'created_at',
  confirmed_at: 'confirmed_at',
}

export default class OrderService {
  private codeService = new OrderCodigoService()
  private productInventoryService = new ProductInventoryService()
  private catalogProductStockService = new CatalogProductStockService()

  async listar(filters: ListOrdersFilters = {}): Promise<ModelPaginatorContract<Order>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const sortBy = filters.sort_by ?? 'order_date'
    const direction = filters.direction ?? 'desc'
    const column = ORDER_COLUMN[sortBy]

    const query = Order.query()
      .preload('customer')
      .preload('orderLines', (linesQuery) => linesQuery.preload('catalogProduct'))
      .orderBy(column, direction)
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

    if (filters.modality) {
      query.where('modality', filters.modality)
    }

    if (filters.date_from) {
      query.where((builder) => {
        builder.where('confirmedAt', '>=', `${filters.date_from} 00:00:00`).orWhere((sub) => {
          sub.whereNull('confirmedAt').where('orderDate', '>=', filters.date_from!)
        })
      })
    }

    if (filters.date_to) {
      query.where((builder) => {
        builder.where('confirmedAt', '<=', `${filters.date_to} 23:59:59`).orWhere((sub) => {
          sub.whereNull('confirmedAt').where('orderDate', '<=', filters.date_to!)
        })
      })
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query.where((builder) => {
        builder
          .whereILike('code', term)
          .orWhereILike('description', term)
          .orWhereHas('customer', (customerQuery) => {
            customerQuery.whereILike('name', term)
          })
          .orWhereHas('orderLines', (lineQuery) => {
            lineQuery.whereHas('catalogProduct', (productQuery) => {
              productQuery.whereILike('name', term)
            })
          })
      })
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Order> {
    const order = await Order.find(id)
    if (!order) {
      throw new OrderNoEncontradoException()
    }
    return order
  }

  async obtenerDetalle(id: number): Promise<Order> {
    const order = await Order.query()
      .where('id', id)
      .preload('customer')
      .preload('orderLines', (query) => {
        query.preload('catalogProduct').orderBy('id', 'asc')
      })
      .preload('orderMaterials', (query) => {
        query.preload('material').orderBy('id', 'asc')
      })
      .first()

    if (!order) {
      throw new OrderNoEncontradoException()
    }

    return order
  }

  async obtenerPresupuesto(orderId: number): Promise<OrderBudget> {
    const order = await this.obtener(orderId)
    const lines = await OrderLine.query()
      .where('orderId', orderId)
      .preload('catalogProduct')
      .orderBy('id', 'asc')

    let total = 0
    const serialized = lines.map((line) => {
      const subtotal = Number(line.subtotalUsd)
      total += subtotal
      return {
        id: Number(line.id),
        catalog_product_id: Number(line.catalogProductId),
        product_name: line.catalogProduct?.name ?? '',
        quantity: line.quantity,
        unit_price_usd: line.unitPriceUsd,
        subtotal_usd: line.subtotalUsd,
      }
    })

    if (order.status === 'DRAFT' && lines.length > 0) {
      return { lines: serialized, total_usd: total.toFixed(4) }
    }

    return { lines: serialized, total_usd: total.toFixed(4) }
  }

  async agregarLinea(orderId: number, input: OrderLineInput): Promise<OrderLine> {
    return db.transaction(async (trx) => {
      const order = await this.obtenerConLock(orderId, trx)
      this.assertBorrador(order)

      const line = await this.crearLineaEnTrx(order, input, trx)
      await line.load('catalogProduct')
      return line
    })
  }

  async actualizarLinea(
    orderId: number,
    lineId: number,
    input: OrderLineUpdateInput
  ): Promise<OrderLine> {
    return db.transaction(async (trx) => {
      const order = await this.obtenerConLock(orderId, trx)
      this.assertBorrador(order)

      const line = await OrderLine.query({ client: trx })
        .where('id', lineId)
        .where('orderId', Number(order.id))
        .forUpdate()
        .first()

      if (!line) {
        throw new PedidoLineaNoEncontradaException()
      }

      line.quantity = input.quantity.toFixed(3)
      line.subtotalUsd = (input.quantity * Number(line.unitPriceUsd)).toFixed(4)
      line.useTransaction(trx)
      await line.save()
      await line.load('catalogProduct')

      return line
    })
  }

  async eliminarLinea(orderId: number, lineId: number): Promise<{ id: number; eliminado: true }> {
    return db.transaction(async (trx) => {
      const order = await this.obtenerConLock(orderId, trx)
      this.assertBorrador(order)

      const line = await OrderLine.query({ client: trx })
        .where('id', lineId)
        .where('orderId', Number(order.id))
        .forUpdate()
        .first()

      if (!line) {
        throw new PedidoLineaNoEncontradaException()
      }

      line.useTransaction(trx)
      await line.delete()

      return { id: lineId, eliminado: true }
    })
  }

  async crear(input: OrderInput): Promise<Order> {
    this.assertClienteOInvitado(input)
    if (input.customer_id) {
      await this.assertCustomerExiste(input.customer_id)
    }
    const data = this.prepareInput(input)
    await this.assertCreditoEnBorrador(data.customerId, input.payment_type)

    return db.transaction(async (trx) => {
      const code = await this.codeService.generar(data.orderDate, trx)

      const order = await Order.create(
        {
          code,
          customerId: data.customerId,
          guestName: data.guestName,
          modality: data.modality,
          description: data.description,
          totalQuantity: data.totalQuantity,
          orderDate: data.orderDate,
          estimatedDeliveryDate: data.estimatedDeliveryDate,
          status: 'DRAFT',
          totalPrice: data.totalPrice,
          notes: data.notes,
          paymentType: input.payment_type ?? 'CASH',
        },
        { client: trx }
      )

      if (input.lines) {
        await this.reemplazarLineasEnTrx(order, input.lines, trx)
      }

      return order
    })
  }

  async actualizar(id: number, input: OrderInput): Promise<Order> {
    if (input.lines) {
      return db.transaction(async (trx) => {
        const order = await this.obtenerConLock(id, trx)
        this.assertBorrador(order)
        this.assertClienteOInvitado(input)
        if (input.customer_id) {
          await this.assertCustomerExiste(input.customer_id)
        }

        const data = this.prepareInput(input)
        await this.assertCreditoEnBorrador(data.customerId, input.payment_type)

        order.merge({
          customerId: data.customerId,
          guestName: data.guestName,
          modality: data.modality,
          description: data.description,
          totalQuantity: data.totalQuantity,
          orderDate: data.orderDate,
          estimatedDeliveryDate: data.estimatedDeliveryDate,
          totalPrice: data.totalPrice,
          notes: data.notes,
          ...(input.payment_type !== undefined ? { paymentType: input.payment_type } : {}),
        })

        order.useTransaction(trx)
        await order.save()
        await this.reemplazarLineasEnTrx(order, input.lines!, trx)

        return order
      })
    }

    const order = await this.obtener(id)
    this.assertBorrador(order)
    this.assertClienteOInvitado(input)
    if (input.customer_id) {
      await this.assertCustomerExiste(input.customer_id)
    }

    const data = this.prepareInput(input)
    await this.assertCreditoEnBorrador(data.customerId, input.payment_type)

    order.merge({
      customerId: data.customerId,
      guestName: data.guestName,
      modality: data.modality,
      description: data.description,
      totalQuantity: data.totalQuantity,
      orderDate: data.orderDate,
      estimatedDeliveryDate: data.estimatedDeliveryDate,
      totalPrice: data.totalPrice,
      notes: data.notes,
      ...(input.payment_type !== undefined ? { paymentType: input.payment_type } : {}),
    })

    await order.save()
    return order
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const order = await this.obtener(id)
    this.assertBorrador(order)

    if (order.referenceFile) {
      await drive
        .use()
        .delete(order.referenceFile)
        .catch(() => undefined)
    }

    await order.delete()
    return { id: Number(order.id), eliminado: true }
  }

  async agregarMaterial(orderId: number, input: OrderMaterialInput): Promise<OrderMaterial> {
    return db.transaction(async (trx) => {
      const order = await this.obtenerConLock(orderId, trx)
      this.assertBorrador(order)
      await this.assertMaterialExiste(input.material_id)
      await this.assertMaterialNoDuplicadoEnReceta(
        Number(order.id),
        input.material_id,
        undefined,
        trx
      )

      const orderMaterial = await OrderMaterial.create(
        {
          orderId: Number(order.id),
          materialId: input.material_id,
          quantityPerGarment: this.formatQuantityPerGarment(input.quantity_per_garment),
          notes: input.notes?.trim() || null,
        },
        { client: trx }
      )

      await orderMaterial.load('material')
      return orderMaterial
    })
  }

  async actualizarMaterial(
    orderId: number,
    orderMaterialId: number,
    input: OrderMaterialUpdateInput
  ): Promise<OrderMaterial> {
    return db.transaction(async (trx) => {
      const order = await this.obtenerConLock(orderId, trx)
      this.assertBorrador(order)

      const orderMaterial = await OrderMaterial.query({ client: trx })
        .where('id', orderMaterialId)
        .where('orderId', Number(order.id))
        .forUpdate()
        .first()

      if (!orderMaterial) {
        throw new OrderMaterialNoEncontradoException()
      }

      if (input.material_id !== undefined) {
        await this.assertMaterialExiste(input.material_id)
        await this.assertMaterialNoDuplicadoEnReceta(
          Number(order.id),
          input.material_id,
          Number(orderMaterial.id),
          trx
        )
        orderMaterial.materialId = input.material_id
      }

      if (input.quantity_per_garment !== undefined) {
        orderMaterial.quantityPerGarment = this.formatQuantityPerGarment(input.quantity_per_garment)
      }

      if (input.notes !== undefined) {
        orderMaterial.notes = input.notes?.trim() || null
      }

      orderMaterial.useTransaction(trx)
      await orderMaterial.save()
      await orderMaterial.load('material')

      return orderMaterial
    })
  }

  async eliminarMaterial(
    orderId: number,
    orderMaterialId: number
  ): Promise<{ id: number; eliminado: true }> {
    return db.transaction(async (trx) => {
      const order = await this.obtenerConLock(orderId, trx)
      this.assertBorrador(order)

      const orderMaterial = await OrderMaterial.query({ client: trx })
        .where('id', orderMaterialId)
        .where('orderId', Number(order.id))
        .forUpdate()
        .first()

      if (!orderMaterial) {
        throw new OrderMaterialNoEncontradoException()
      }

      orderMaterial.useTransaction(trx)
      await orderMaterial.delete()

      return { id: orderMaterialId, eliminado: true }
    })
  }

  async transicionar(
    id: number,
    nuevoEstado: OrderEstado,
    options: TransicionOptions = {}
  ): Promise<TransicionResult & { order: Order }> {
    return db.transaction(async (trx) => {
      const order = await Order.query({ client: trx })
        .where('id', id)
        .preload('customer')
        .preload('orderLines', (query) =>
          query.preload('catalogProduct', (cp) =>
            cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
          )
        )
        .preload('orderMaterials', (query) => query.preload('material'))
        .forUpdate()
        .first()

      if (!order) {
        throw new OrderNoEncontradoException()
      }

      const statusActual = order.status as OrderEstado
      const result = resolverTransicion(order, nuevoEstado)
      const warnings = [...result.warnings]

      if (statusActual === 'DRAFT' && nuevoEstado === 'CONFIRMED') {
        await this.assertStockLineasCatalogo(order, trx)
        await this.congelarCostoLineas(order, trx)
        await this.procesarDescuentoStockProductos(order, trx)
        order.confirmedAt = DateTime.now()
        await this.aplicarPagoAlConfirmar(order, options.payment_type ?? 'CASH', trx)
      }

      if (statusActual === 'DRAFT' && nuevoEstado === 'DELIVERED') {
        await this.assertStockLineasCatalogo(order, trx)
        await this.congelarCostoLineas(order, trx)
        await this.procesarDescuentoStockProductos(order, trx)
        order.confirmedAt = DateTime.now()
        await this.aplicarPagoAlConfirmar(order, options.payment_type ?? 'CASH', trx)
        await this.procesarTransicionAProduccion(order, warnings, options.force ?? false, trx)
      }

      if (statusActual === 'CONFIRMED' && nuevoEstado === 'CANCELLED') {
        await this.revertirStockProductos(order, trx, `Cancelación pedido ${order.code}`)
      }

      if (statusActual === 'CONFIRMED' && nuevoEstado === 'IN_PRODUCTION') {
        await this.procesarTransicionAProduccion(order, warnings, options.force ?? false, trx)
      }

      if (nuevoEstado === 'CANCELLED' && statusActual === 'IN_PRODUCTION') {
        await this.revertirMovimientosOrder(
          Number(order.id),
          trx,
          `Reversión cancelación order #${order.id}`
        )
        await this.revertirStockProductos(order, trx, `Cancelación pedido ${order.code}`)
      }

      order.status = nuevoEstado
      order.useTransaction(trx)
      await order.save()

      await order.load('customer')
      await order.load('orderLines', (query) => {
        query.preload('catalogProduct').orderBy('id', 'asc')
      })
      await order.load('orderMaterials', (query) => {
        query.preload('material').orderBy('id', 'asc')
      })

      return { warnings, order }
    })
  }

  async devolver(id: number, lines?: OrderReturnLineInput[]): Promise<Order> {
    return db.transaction(async (trx) => {
      const order = await Order.query({ client: trx })
        .where('id', id)
        .preload('orderLines', (query) =>
          query.preload('catalogProduct', (cp) =>
            cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
          )
        )
        .forUpdate()
        .first()

      if (!order) {
        throw new OrderNoEncontradoException()
      }

      const statusActual = order.status as OrderEstado
      const devolvible = ['CONFIRMED', 'IN_PRODUCTION', 'DELIVERED'] as const

      if (!devolvible.includes(statusActual as (typeof devolvible)[number])) {
        throw new OrderNoDevolvableException()
      }

      const returnRequests = this.resolveReturnRequests(order.orderLines, lines)

      if (returnRequests.length === 0) {
        if (order.orderLines.length === 0) {
          order.status = 'RETURNED'
          order.returnedAt = DateTime.now()
          order.useTransaction(trx)
          await order.save()
          await order.load('customer')
          await order.load('orderLines')
          await order.load('orderMaterials')
          return order
        }

        throw new OrderNoDevolvableException()
      }

      const note = `Devolución venta ${order.code}`

      for (const request of returnRequests) {
        const line = order.orderLines.find((item) => Number(item.id) === request.lineId)
        if (!line) {
          throw new PedidoLineaNoEncontradaException()
        }

        const alreadyReturned = Number(line.returnedQuantity ?? 0)
        const remaining = Number(line.quantity) - alreadyReturned

        if (request.quantity > remaining + 0.0005) {
          throw new DevolucionCantidadInvalidaException()
        }

        line.returnedQuantity = (alreadyReturned + request.quantity).toFixed(3)
        line.useTransaction(trx)
        await line.save()

        await this.revertirStockProductoParcial(
          Number(order.id),
          Number(line.catalogProductId),
          request.quantity,
          trx,
          note
        )

        await this.revertirMaterialesLineaParcial(order, line, request.quantity, trx, note)
      }

      if (!lines || lines.length === 0) {
        const salidas = await InventoryMovement.query({ client: trx })
          .where('orderId', Number(order.id))
          .where('type', 'ORDER_OUT')

        if (salidas.length > 0) {
          const reversiones = await InventoryMovement.query({ client: trx })
            .where('orderId', Number(order.id))
            .where('type', 'REVERSAL_ADJUSTMENT')

          const consumedByMaterial = new Map<number, number>()
          for (const salida of salidas) {
            const materialId = Number(salida.materialId)
            consumedByMaterial.set(
              materialId,
              (consumedByMaterial.get(materialId) ?? 0) + Math.abs(Number(salida.quantity))
            )
          }

          const revertedByMaterial = new Map<number, number>()
          for (const reversion of reversiones) {
            const materialId = Number(reversion.materialId)
            revertedByMaterial.set(
              materialId,
              (revertedByMaterial.get(materialId) ?? 0) + Math.abs(Number(reversion.quantity))
            )
          }

          let needsFullRevert = false
          for (const [materialId, consumed] of consumedByMaterial) {
            const reverted = revertedByMaterial.get(materialId) ?? 0
            if (reverted + 0.0005 < consumed) {
              needsFullRevert = true
              break
            }
          }

          if (needsFullRevert) {
            await this.revertirMovimientosOrder(Number(order.id), trx, note)
          }
        }
      }

      await this.actualizarMontosTrasDevolucion(order, trx)

      const refreshedLines = await OrderLine.query({ client: trx }).where(
        'orderId',
        Number(order.id)
      )
      const allReturned = refreshedLines.every(
        (line) => Number(line.returnedQuantity ?? 0) >= Number(line.quantity)
      )

      if (allReturned) {
        order.status = 'RETURNED'
        order.returnedAt = DateTime.now()
      }

      order.useTransaction(trx)
      await order.save()

      await order.load('customer')
      await order.load('orderLines', (query) => {
        query.preload('catalogProduct').orderBy('id', 'asc')
      })
      await order.load('orderMaterials', (query) => {
        query.preload('material').orderBy('id', 'asc')
      })

      return order
    })
  }

  async guardarReferencia(orderId: number, file: MultipartFile): Promise<Order> {
    const order = await this.obtener(orderId)

    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = `orders/${orderId}/${randomUUID()}.${extension}`

    if (order.referenceFile) {
      await drive
        .use()
        .delete(order.referenceFile)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    order.referenceFile = key
    await order.save()

    return order
  }

  async obtenerReferencia(orderId: number): Promise<ReferenciaDownload> {
    const order = await this.obtener(orderId)

    if (!order.referenceFile) {
      throw new ArchivoReferenciaNoAdjuntoException()
    }

    const exists = await drive.use().exists(order.referenceFile)
    if (!exists) {
      throw new ArchivoReferenciaFaltanteException()
    }

    const bytes = await drive.use().getBytes(order.referenceFile)
    const extension = order.referenceFile.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = REFERENCIA_MIME[extension] ?? 'application/octet-stream'
    const filename = `referencia-${order.code}.${extension}`

    return { bytes, contentType, filename }
  }

  async calcularMaterialComprometido(
    excludeOrderId?: number,
    trx?: TransactionClientContract
  ): Promise<Map<number, number>> {
    const query = Order.query()
      .whereIn('status', ['DRAFT', 'CONFIRMED'])
      .preload('orderLines', (q) =>
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
      )
      .preload('orderMaterials', (q) => q.preload('material'))

    if (trx) {
      query.useTransaction(trx)
    }

    if (excludeOrderId) {
      query.whereNot('id', excludeOrderId)
    }

    const orders = await query
    const comprometido = new Map<number, number>()

    for (const order of orders) {
      const { consumoPorMaterial } = buildOrderConsumoMap(order)

      for (const [materialId, data] of consumoPorMaterial) {
        comprometido.set(materialId, (comprometido.get(materialId) ?? 0) + data.cantidadTotal)
      }
    }

    return comprometido
  }

  async evaluarDisponibilidadMateriales(orderId: number): Promise<MaterialAvailabilityResult> {
    const order = await this.cargarOrderParaProduccion(orderId)
    const { consumoPorMaterial, hasRecipe } = buildOrderConsumoMap(order)

    if (!hasRecipe || consumoPorMaterial.size === 0) {
      return { sufficient: true, has_recipe: hasRecipe, missing: [] }
    }

    const stockDisponible = await this.getStockDisponibleParaConsumo(
      consumoPorMaterial,
      Number(order.id)
    )
    const missing = evaluarConsumoVsStock(consumoPorMaterial, stockDisponible)

    return {
      sufficient: missing.length === 0,
      has_recipe: true,
      missing,
    }
  }

  async intentarProducirPedidosPendientes(materialIds: number[]): Promise<FulfilledPendingOrder[]> {
    if (materialIds.length === 0) {
      return []
    }

    const materialIdSet = new Set(materialIds)
    const fulfilled: FulfilledPendingOrder[] = []

    const orders = await Order.query()
      .whereIn('status', ['DRAFT', 'CONFIRMED'])
      .orderBy('orderDate', 'asc')
      .orderBy('id', 'asc')
      .preload('orderLines', (query) =>
        query.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
      )
      .preload('orderMaterials', (query) => query.preload('material'))

    for (const order of orders) {
      if (!this.orderUsesMaterials(order, materialIdSet)) {
        continue
      }

      try {
        const produced = await db.transaction(async (trx) => {
          const locked = await this.cargarOrderParaProduccion(Number(order.id), trx)
          const availability = await this.evaluarDisponibilidadMaterialesEnTrx(locked, trx)

          if (!availability.has_recipe || !availability.sufficient) {
            return false
          }

          if (locked.status === 'DRAFT') {
            await locked.load('customer')
            await this.assertStockLineasCatalogo(locked, trx)
            await this.congelarCostoLineas(locked, trx)
            await this.procesarDescuentoStockProductos(locked, trx)
            locked.status = 'CONFIRMED'
            locked.confirmedAt = DateTime.now()
            const paymentType: 'CASH' | 'CREDIT' =
              locked.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH'
            await this.aplicarPagoAlConfirmar(locked, paymentType, trx)
            locked.useTransaction(trx)
            await locked.save()
          }

          if (locked.status === 'CONFIRMED') {
            const warnings: { code: string; message: string }[] = []
            await this.procesarTransicionAProduccion(locked, warnings, false, trx)
            locked.status = 'IN_PRODUCTION'
            locked.useTransaction(trx)
            await locked.save()
          }

          return locked.status === 'IN_PRODUCTION'
        })

        if (produced) {
          fulfilled.push({ id: Number(order.id), code: order.code })
        }
      } catch {
        // Otro pedido pendiente puede consumir el stock disponible primero.
      }
    }

    return fulfilled
  }

  private async evaluarDisponibilidadMaterialesEnTrx(
    order: Order,
    trx: TransactionClientContract
  ): Promise<MaterialAvailabilityResult> {
    const { consumoPorMaterial, hasRecipe } = buildOrderConsumoMap(order)

    if (!hasRecipe || consumoPorMaterial.size === 0) {
      return { sufficient: true, has_recipe: hasRecipe, missing: [] }
    }

    const stockDisponible = await this.getStockDisponibleParaConsumo(
      consumoPorMaterial,
      Number(order.id),
      trx
    )
    const missing = evaluarConsumoVsStock(consumoPorMaterial, stockDisponible)

    return {
      sufficient: missing.length === 0,
      has_recipe: true,
      missing,
    }
  }

  private async cargarOrderParaProduccion(
    orderId: number,
    trx?: TransactionClientContract
  ): Promise<Order> {
    const query = Order.query()
      .where('id', orderId)
      .preload('orderLines', (q) =>
        q.preload('catalogProduct', (cp) =>
          cp.preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        )
      )
      .preload('orderMaterials', (q) => q.preload('material'))

    if (trx) {
      query.useTransaction(trx).forUpdate()
    }

    const order = await query.first()

    if (!order) {
      throw new OrderNoEncontradoException()
    }

    return order
  }

  private orderUsesMaterials(order: Order, materialIds: Set<number>): boolean {
    const { consumoPorMaterial, hasRecipe } = buildOrderConsumoMap(order)

    if (!hasRecipe) {
      return false
    }

    for (const materialId of consumoPorMaterial.keys()) {
      if (materialIds.has(materialId)) {
        return true
      }
    }

    return false
  }

  private async procesarTransicionAProduccion(
    order: Order,
    warnings: { code: string; message: string }[],
    force: boolean,
    trx: TransactionClientContract
  ) {
    const { consumoPorMaterial, hasRecipe } = buildOrderConsumoMap(order)

    if (!hasRecipe || consumoPorMaterial.size === 0) {
      warnings.push({ ...RECETA_VACIA_WARNING })
      return
    }

    const stockDisponible = await this.getStockDisponibleParaConsumo(
      consumoPorMaterial,
      Number(order.id),
      trx
    )
    const missingStock = evaluarConsumoVsStock(consumoPorMaterial, stockDisponible)

    if (missingStock.length > 0 && !force) {
      throw new StockInsuficienteException(missingStock)
    }

    const note = force && missingStock.length > 0 ? NOTA_FORZADO_SIN_STOCK : null

    for (const [materialId, data] of consumoPorMaterial) {
      await InventoryMovement.create(
        {
          materialId,
          type: 'ORDER_OUT',
          quantity: formatCantidadMovimiento(data.cantidadTotal),
          orderId: Number(order.id),
          note,
        },
        { client: trx }
      )
    }
  }

  private async revertirMovimientosOrder(
    orderId: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const salidas = await InventoryMovement.query({ client: trx })
      .where('orderId', orderId)
      .where('type', 'ORDER_OUT')

    for (const salida of salidas) {
      await InventoryMovement.create(
        {
          materialId: Number(salida.materialId),
          type: 'REVERSAL_ADJUSTMENT',
          quantity: formatCantidadReversion(salida.quantity),
          orderId,
          note,
        },
        { client: trx }
      )
    }
  }

  private async getStockFisicoPorMaterialIds(
    materialIds: number[],
    trx?: TransactionClientContract
  ): Promise<Map<number, number>> {
    const stockByMaterialId = new Map<number, number>()

    for (const materialId of materialIds) {
      if (stockByMaterialId.has(materialId)) {
        continue
      }

      const query = InventoryMovement.query()
        .where('materialId', materialId)
        .sum('quantity as total')

      if (trx) {
        query.useTransaction(trx)
      }

      const result = await query.first()
      stockByMaterialId.set(materialId, Number(result?.$extras.total ?? 0))
    }

    return stockByMaterialId
  }

  private async getStockDisponibleParaConsumo(
    consumoPorMaterial: Map<number, ConsumoMaterialLinea>,
    excludeOrderId: number,
    trx?: TransactionClientContract
  ): Promise<Map<number, number>> {
    const materialIds = [...consumoPorMaterial.keys()]
    const stockFisico = await this.getStockFisicoPorMaterialIds(materialIds, trx)
    const comprometido = await this.calcularMaterialComprometido(excludeOrderId, trx)
    const stockDisponible = new Map<number, number>()

    for (const materialId of materialIds) {
      const fisico = stockFisico.get(materialId) ?? 0
      const reservado = comprometido.get(materialId) ?? 0
      stockDisponible.set(materialId, fisico - reservado)
    }

    return stockDisponible
  }

  private async obtenerConLock(orderId: number, trx: TransactionClientContract): Promise<Order> {
    const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().first()

    if (!order) {
      throw new OrderNoEncontradoException()
    }

    return order
  }

  private formatQuantityPerGarment(value: number) {
    return value.toFixed(3)
  }

  private prepareInput(input: OrderInput) {
    const guestName = input.guest_name?.trim() || null

    return {
      customerId: input.customer_id ?? null,
      guestName: input.customer_id ? null : guestName,
      modality: input.modality,
      description: input.description?.trim() || 'Pedido desde catálogo',
      totalQuantity: input.total_quantity ?? 1,
      orderDate: DateTime.fromISO(input.order_date),
      estimatedDeliveryDate: input.estimated_delivery_date
        ? DateTime.fromISO(input.estimated_delivery_date)
        : null,
      totalPrice: input.total_price !== undefined ? input.total_price.toFixed(2) : null,
      notes: input.notes?.trim() || null,
    }
  }

  private async crearLineaEnTrx(
    order: Order,
    input: OrderLineInput,
    trx: TransactionClientContract
  ): Promise<OrderLine> {
    const product = await CatalogProduct.query({ client: trx })
      .where('id', input.catalog_product_id)
      .first()

    if (!product) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const unitPrice = product.salePriceUsd
    const subtotal = (input.quantity * Number(unitPrice)).toFixed(4)

    return OrderLine.create(
      {
        orderId: Number(order.id),
        catalogProductId: input.catalog_product_id,
        quantity: input.quantity.toFixed(3),
        returnedQuantity: '0.000',
        unitPriceUsd: unitPrice,
        subtotalUsd: subtotal,
      },
      { client: trx }
    )
  }

  private async reemplazarLineasEnTrx(
    order: Order,
    inputs: OrderLineInput[],
    trx: TransactionClientContract
  ) {
    await OrderLine.query({ client: trx }).where('orderId', Number(order.id)).delete()

    for (const input of inputs) {
      await this.crearLineaEnTrx(order, input, trx)
    }
  }

  private assertBorrador(order: Order) {
    if (order.status !== 'DRAFT') {
      throw new OrderNoEditableException()
    }
  }

  private assertClienteOInvitado(input: OrderInput) {
    const hasCustomer = Boolean(input.customer_id && input.customer_id > 0)
    const hasGuest = Boolean(input.guest_name?.trim())

    if (!hasCustomer && !hasGuest) {
      throw new ClienteOInvitadoRequeridoException()
    }
  }

  private async assertCreditoEnBorrador(
    customerId: number | null,
    paymentType: 'CASH' | 'CREDIT' | undefined
  ) {
    if (paymentType !== 'CREDIT') {
      return
    }

    if (!customerId) {
      throw new ClienteSinCreditoException()
    }

    const customer = await Customer.find(customerId)
    if (!customer?.creditDays || customer.creditDays <= 0) {
      throw new ClienteSinCreditoException()
    }
  }

  private async assertCustomerExiste(customerId: number) {
    const customer = await Customer.find(customerId)
    if (!customer) {
      throw new CustomerNoEncontradoException()
    }
  }

  private async assertMaterialExiste(materialId: number) {
    const material = await Material.find(materialId)
    if (!material) {
      throw new MaterialNoEncontradoException()
    }
  }

  private async assertMaterialNoDuplicadoEnReceta(
    orderId: number,
    materialId: number,
    excludeOrderMaterialId: number | undefined,
    trx: TransactionClientContract
  ) {
    const query = OrderMaterial.query({ client: trx })
      .where('orderId', orderId)
      .where('materialId', materialId)

    if (excludeOrderMaterialId !== undefined) {
      query.whereNot('id', excludeOrderMaterialId)
    }

    const duplicado = await query.first()
    if (duplicado) {
      throw new MaterialDuplicadoEnRecetaException()
    }
  }

  private async assertStockLineasCatalogo(order: Order, trx: TransactionClientContract) {
    const faltantes: {
      material_id: number
      name: string
      stock_actual: number
      consumo_proyectado: number
      faltante: number
    }[] = []

    for (const line of order.orderLines ?? []) {
      if (!line.catalogProductId) {
        continue
      }

      const product =
        line.catalogProduct ??
        (await CatalogProduct.query({ client: trx })
          .where('id', Number(line.catalogProductId))
          .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
          .first())

      if (!product) {
        continue
      }

      const { quantity: disponible } =
        await this.catalogProductStockService.calcularStockDisponible(product, {
          trx,
          excludeOrderId: Number(order.id),
        })
      const qty = Number(line.quantity)

      if (qty > disponible) {
        faltantes.push({
          material_id: Number(product.id),
          name: product.name,
          stock_actual: disponible,
          consumo_proyectado: qty,
          faltante: qty - disponible,
        })
      }
    }

    if (faltantes.length > 0) {
      throw new StockInsuficienteException(faltantes)
    }
  }

  private async congelarCostoLineas(order: Order, trx: TransactionClientContract) {
    for (const line of order.orderLines) {
      const product =
        line.catalogProduct ??
        (await CatalogProduct.query({ client: trx })
          .where('id', Number(line.catalogProductId))
          .first())

      if (!product) {
        continue
      }

      line.costUsd = product.costUsd
      line.useTransaction(trx)
      await line.save()
    }
  }

  private async procesarDescuentoStockProductos(order: Order, trx: TransactionClientContract) {
    for (const line of order.orderLines) {
      const qty = Number(line.quantity)
      const product =
        line.catalogProduct ??
        (await CatalogProduct.query({ client: trx })
          .where('id', Number(line.catalogProductId))
          .first())

      if (!product) {
        continue
      }

      if (product.formulaId) {
        continue
      }

      const stockActual = Number(product.stockQuantity)
      const toDeduct = Math.min(qty, stockActual)

      if (toDeduct <= 0) {
        continue
      }

      await this.productInventoryService.registrarMovimiento(
        {
          catalogProductId: Number(line.catalogProductId),
          type: 'SALE_OUT',
          quantity: -toDeduct,
          orderId: Number(order.id),
          note: `Venta ${order.code}`,
        },
        trx
      )
    }
  }

  private async aplicarPagoAlConfirmar(
    order: Order,
    paymentType: 'CASH' | 'CREDIT',
    trx: TransactionClientContract
  ) {
    const lines = await OrderLine.query({ client: trx }).where('orderId', Number(order.id))
    const totalUsd = lines.reduce((sum, line) => sum + Number(line.subtotalUsd), 0)

    order.paymentType = paymentType

    if (paymentType === 'CREDIT') {
      if (!order.customerId) {
        throw new ClienteSinCreditoException()
      }
      const customer = order.customer ?? (await Customer.find(order.customerId))
      if (!customer?.creditDays || customer.creditDays <= 0) {
        throw new ClienteSinCreditoException()
      }
      order.balanceUsd = totalUsd.toFixed(4)
      order.amountPaidUsd = '0.0000'
      order.creditDueDate = DateTime.now().plus({ days: customer.creditDays })
    } else {
      order.balanceUsd = '0.0000'
      order.amountPaidUsd = totalUsd.toFixed(4)
      order.creditDueDate = null
    }
  }

  private async revertirStockProductos(order: Order, trx: TransactionClientContract, note: string) {
    const salidas = await ProductInventoryMovement.query({ client: trx })
      .where('orderId', Number(order.id))
      .where('type', 'SALE_OUT')

    for (const movimiento of salidas) {
      const qty = Math.abs(Number(movimiento.quantity))
      await this.productInventoryService.registrarMovimiento(
        {
          catalogProductId: Number(movimiento.catalogProductId),
          type: 'REVERSAL_ADJUSTMENT',
          quantity: qty,
          orderId: Number(order.id),
          note,
        },
        trx
      )
    }
  }

  private resolveReturnRequests(
    lines: OrderLine[],
    input?: OrderReturnLineInput[]
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
    orderId: number,
    catalogProductId: number,
    quantity: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const salidas = await ProductInventoryMovement.query({ client: trx })
      .where('orderId', orderId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'SALE_OUT')

    let soldTotal = 0
    for (const salida of salidas) {
      soldTotal += Math.abs(Number(salida.quantity))
    }

    const reversiones = await ProductInventoryMovement.query({ client: trx })
      .where('orderId', orderId)
      .where('catalogProductId', catalogProductId)
      .where('type', 'REVERSAL_ADJUSTMENT')

    let reversedTotal = 0
    for (const reversion of reversiones) {
      reversedTotal += Number(reversion.quantity)
    }

    const toReverse = Math.min(quantity, Math.max(0, soldTotal - reversedTotal))
    if (toReverse <= 0) {
      return
    }

    await this.productInventoryService.registrarMovimiento(
      {
        catalogProductId,
        type: 'REVERSAL_ADJUSTMENT',
        quantity: toReverse,
        orderId,
        note,
      },
      trx
    )
  }

  private async revertirMaterialesLineaParcial(
    order: Order,
    line: OrderLine,
    returnQty: number,
    trx: TransactionClientContract,
    note: string
  ) {
    const salidas = await InventoryMovement.query({ client: trx })
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    if (salidas.length === 0) {
      return
    }

    const product =
      line.catalogProduct ??
      (await CatalogProduct.query({ client: trx })
        .where('id', Number(line.catalogProductId))
        .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
        .first())

    const formulaMaterials = product?.formula?.materials
    if (!formulaMaterials?.length) {
      return
    }

    for (const formulaItem of formulaMaterials) {
      const materialId = Number(formulaItem.materialId)
      const consumoDevuelto = returnQty * Number(formulaItem.quantity)
      if (consumoDevuelto <= 0) {
        continue
      }

      await InventoryMovement.create(
        {
          materialId,
          type: 'REVERSAL_ADJUSTMENT',
          quantity: consumoDevuelto.toFixed(3),
          orderId: Number(order.id),
          note,
        },
        { client: trx }
      )
    }
  }

  private async actualizarMontosTrasDevolucion(order: Order, trx: TransactionClientContract) {
    const lines = await OrderLine.query({ client: trx }).where('orderId', Number(order.id))

    let activeTotal = 0
    let activeQty = 0

    for (const line of lines) {
      const active = Number(line.quantity) - Number(line.returnedQuantity ?? 0)
      if (active <= 0) {
        continue
      }
      activeTotal += active * Number(line.unitPriceUsd)
      activeQty += active
    }

    order.totalPrice = activeTotal.toFixed(4)
    order.totalQuantity = Math.max(0, Math.ceil(activeQty))

    const paid = Number(order.amountPaidUsd ?? 0)

    if (order.paymentType === 'CREDIT') {
      order.balanceUsd = Math.max(0, activeTotal - paid).toFixed(4)
    } else {
      order.amountPaidUsd = activeTotal.toFixed(4)
      order.balanceUsd = '0.0000'
    }
  }
}
