import CatalogProduct from '#models/catalog_product'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import DashboardCashOutflowService from '#services/dashboard_cash_outflow_service'
import type {
  DailyExpensesResult,
  DailyProductSalesResult,
  DailySoldProductItem,
  GananciaDelDia,
  VentasDelDia,
} from '#services/dashboard_service'
import SalesShiftService from '#services/sales_shift_service'
import { allocateInvoiceDiscountToSaleLines } from '#utils/allocate_invoice_discount'
import { datetimeRangeUtcSql, todayIsoDate } from '#utils/app_timezone'
import { lineInventoryQuantity } from '#utils/wholesale'
import db from '@adonisjs/lucid/services/db'

const SALE_STATUSES = ['COMPLETED'] as const

/** Sales KPIs of the open sales shift (by `sales_shift_id`, not by calendar day). */
export default class DashboardShiftSalesService {
  private catalogProductStockService = new CatalogProductStockService()
  private salesShiftService = new SalesShiftService()
  private cashOutflowService = new DashboardCashOutflowService()
  /** Ventas del dashboard usan el turno abierto actual (sales_shift_id).
   * Montos = `sales.total_usd` (ya neto de descuento de factura), no suma bruta de líneas. */
  async ventasDelDia(): Promise<VentasDelDia> {
    const shift = await this.salesShiftService.current()
    if (!shift) {
      return {
        productosVendidos: 0,
        montoProductosUsd: '0.0000',
        montoCreditoUsd: '0.0000',
        pedidosCredito: 0,
        gastosCantidad: 0,
        gastosMontoUsd: '0.0000',
        pagosProveedoresCantidad: 0,
        pagosProveedoresMontoUsd: '0.0000',
      }
    }

    const shiftId = Number(shift.id)

    const money = await db
      .from('sales')
      .whereIn('sales.status', [...SALE_STATUSES])
      .where('sales.sales_shift_id', shiftId)
      .select(
        db.raw('COALESCE(SUM(sales.total_usd), 0) as total_usd'),
        db.raw(
          `COALESCE(SUM(CASE WHEN sales.payment_type = 'CREDIT' THEN sales.total_usd ELSE 0 END), 0) as credit_usd`
        ),
        db.raw(`COUNT(CASE WHEN sales.payment_type = 'CREDIT' THEN 1 END) as pedidos_credito`)
      )
      .first()

    const qtyRow = await db
      .from('sales')
      .join('sale_lines', 'sale_lines.sale_id', 'sales.id')
      .whereIn('sales.status', [...SALE_STATUSES])
      .where('sales.sales_shift_id', shiftId)
      .select(
        db.raw(`COALESCE(SUM(
          CASE
            WHEN sale_lines.is_wholesale = 1 AND sale_lines.units_per_pack IS NOT NULL
              THEN (sale_lines.quantity - sale_lines.returned_quantity) * sale_lines.units_per_pack
            ELSE (sale_lines.quantity - sale_lines.returned_quantity)
          END
        ), 0) as qty`)
      )
      .first()

    const dates = this.salesShiftService.calendarDatesForShift(shift)
    const gastos = await this.cashOutflowService.gastosForDates(dates)
    const pagosProveedores = await this.cashOutflowService.pagosProveedoresForDates(dates)

    return {
      productosVendidos: Number(qtyRow?.qty ?? 0),
      montoProductosUsd: Number(money?.total_usd ?? 0).toFixed(4),
      montoCreditoUsd: Number(money?.credit_usd ?? 0).toFixed(4),
      pedidosCredito: Number(money?.pedidos_credito ?? 0),
      gastosCantidad: gastos.cantidad,
      gastosMontoUsd: gastos.montoUsd.toFixed(4),
      pagosProveedoresCantidad: pagosProveedores.cantidad,
      pagosProveedoresMontoUsd: pagosProveedores.montoUsd.toFixed(4),
    }
  }

  /**
   * Product sales with invoice-level discount allocated proportionally across lines
   * so product totals sum to cash/net billed amount.
   */
  async aggregateSoldCatalogProductsNet(options: {
    salesShiftId?: number
    date?: string
  }): Promise<DailySoldProductItem[]> {
    const lineQuery = db
      .from('sales')
      .join('sale_lines', 'sale_lines.sale_id', 'sales.id')
      .join('catalog_products', 'catalog_products.id', 'sale_lines.catalog_product_id')
      .whereIn('sales.status', [...SALE_STATUSES])
      .whereNotNull('sale_lines.catalog_product_id')

    if (options.salesShiftId) {
      lineQuery.where('sales.sales_shift_id', options.salesShiftId)
    } else if (options.date) {
      const { fromSql, toExclusiveSql } = datetimeRangeUtcSql(options.date, options.date)
      lineQuery.where('sales.sold_at', '>=', fromSql).where('sales.sold_at', '<', toExclusiveSql)
    } else {
      return []
    }

    const lineRows = await lineQuery.select(
      'sales.id as saleId',
      'sales.discount_usd as discountUsd',
      'catalog_products.id as productId',
      'catalog_products.name as name',
      'catalog_products.category as category',
      'catalog_products.sale_unit as saleUnit',
      'catalog_products.image_path as imagePath',
      'catalog_products.stock_quantity as stockQuantity',
      'sale_lines.is_wholesale as isWholesale',
      'sale_lines.units_per_pack as unitsPerPack',
      db.raw('(sale_lines.quantity - sale_lines.returned_quantity) as quantity'),
      db.raw(
        '((sale_lines.quantity - sale_lines.returned_quantity) * sale_lines.unit_price_usd) as grossUsd'
      )
    )

    type Agg = {
      id: number
      name: string
      category: string
      saleUnit: string
      imagePath: string | null
      stockQuantity: number
      quantitySold: number
      totalUsd: number
    }

    const byProduct = new Map<number, Agg>()
    const linesBySale = new Map<
      number,
      Array<{
        productId: number
        name: string
        category: string
        saleUnit: string
        imagePath: string | null
        stockQuantity: number
        quantity: number
        grossUsd: number
        discountUsd: number
      }>
    >()

    for (const row of lineRows) {
      const lineQty = Number(row.quantity ?? 0)
      if (lineQty <= 0) continue

      const quantity = lineInventoryQuantity(
        lineQty,
        Boolean(row.isWholesale),
        row.unitsPerPack as string | number | null | undefined
      )
      if (quantity <= 0) continue

      const saleId = Number(row.saleId)
      const list = linesBySale.get(saleId) ?? []
      list.push({
        productId: Number(row.productId),
        name: String(row.name),
        category: String(row.category),
        saleUnit: String(row.saleUnit),
        imagePath: row.imagePath ? String(row.imagePath) : null,
        stockQuantity: Number(row.stockQuantity ?? 0),
        quantity,
        grossUsd: Number(row.grossUsd ?? 0),
        discountUsd: Number(row.discountUsd ?? 0),
      })
      linesBySale.set(saleId, list)
    }

    for (const [, saleLines] of linesBySale) {
      const discountUsd = saleLines[0]?.discountUsd ?? 0
      const allocated = allocateInvoiceDiscountToSaleLines(
        saleLines.map((line) => ({
          key: line.productId,
          grossUsd: line.grossUsd,
          quantity: line.quantity,
        })),
        discountUsd
      )

      for (const [index, saleLine] of saleLines.entries()) {
        const line = saleLine!
        const net = allocated[index]!
        const current = byProduct.get(line.productId) ?? {
          id: line.productId,
          name: line.name,
          category: line.category,
          saleUnit: line.saleUnit,
          imagePath: line.imagePath,
          stockQuantity: line.stockQuantity,
          quantitySold: 0,
          totalUsd: 0,
        }
        current.quantitySold += line.quantity
        current.totalUsd += net.netUsd
        byProduct.set(line.productId, current)
      }
    }

    const productIds = [...byProduct.keys()]
    const catalogProducts =
      productIds.length > 0
        ? await CatalogProduct.query()
            .whereIn('id', productIds)
            .preload('formula', (query) =>
              query.preload('materials', (materialQuery) => materialQuery.preload('material'))
            )
        : []
    const stockByProductId =
      await this.catalogProductStockService.calcularStockForProducts(catalogProducts)

    return [...byProduct.values()]
      .map((row) => {
        const stock = stockByProductId.get(row.id)
        const quantitySold = row.quantitySold
        const totalUsd = row.totalUsd
        const unitPriceUsd = quantitySold > 0 ? (totalUsd / quantitySold).toFixed(4) : '0.0000'

        return {
          id: row.id,
          name: row.name,
          category: row.category,
          saleUnit: row.saleUnit,
          imagePath: row.imagePath,
          stockQuantity: (stock?.quantity ?? row.stockQuantity).toFixed(3),
          quantitySold,
          unitPriceUsd,
          totalUsd: totalUsd.toFixed(4),
        }
      })
      .sort((a, b) => Number(b.totalUsd) - Number(a.totalUsd))
  }

  async productosVendidosDelDia(): Promise<DailyProductSalesResult> {
    const shift = await this.salesShiftService.current()
    const hoy = todayIsoDate()

    if (!shift) {
      return {
        date: hoy,
        products: [],
        summary: {
          productosVendidos: 0,
          montoProductosUsd: '0.0000',
        },
      }
    }

    const products = await this.aggregateSoldCatalogProductsNet({
      salesShiftId: Number(shift.id),
    })
    const summary = await this.ventasDelDia()

    return {
      date: shift.openedAt.toISO()!.slice(0, 10),
      products,
      summary: {
        productosVendidos: summary.productosVendidos,
        montoProductosUsd: summary.montoProductosUsd,
      },
    }
  }

  /** Same dates as the open-shift KPI (`ventasDelDia.gastos*`); today when no shift is open. */
  async gastosDelTurnoDetalle(): Promise<DailyExpensesResult> {
    const shift = await this.salesShiftService.current()
    if (!shift) {
      return this.cashOutflowService.gastosDelDiaDetalle()
    }

    return this.cashOutflowService.gastosDelDiaDetalleForDates(
      this.salesShiftService.calendarDatesForShift(shift)
    )
  }

  async gananciaDelDia(): Promise<GananciaDelDia> {
    const shift = await this.salesShiftService.current()
    if (!shift) {
      return {
        montoUsd: '0.0000',
        gananciaCreditoUsd: '0.0000',
        porcentajeSobreVentas: 0,
      }
    }

    const shiftId = Number(shift.id)

    const row = await db
      .from('sales')
      .join('sale_lines', 'sale_lines.sale_id', 'sales.id')
      .join('catalog_products', 'catalog_products.id', 'sale_lines.catalog_product_id')
      .whereIn('sales.status', [...SALE_STATUSES])
      .where('sales.sales_shift_id', shiftId)
      .select(
        db.raw(
          'COALESCE(SUM((sale_lines.unit_price_usd - COALESCE(sale_lines.cost_usd, catalog_products.cost_usd)) * (sale_lines.quantity - sale_lines.returned_quantity)), 0) as profit'
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN sales.payment_type = 'CREDIT' THEN (sale_lines.unit_price_usd - COALESCE(sale_lines.cost_usd, catalog_products.cost_usd)) * (sale_lines.quantity - sale_lines.returned_quantity) ELSE 0 END), 0) as credit_profit`
        )
      )
      .first()

    const money = await db
      .from('sales')
      .whereIn('sales.status', [...SALE_STATUSES])
      .where('sales.sales_shift_id', shiftId)
      .select(
        db.raw(
          `COALESCE(SUM(CASE WHEN sales.payment_type = 'CASH' THEN sales.discount_usd ELSE 0 END), 0) as cash_discount`
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN sales.payment_type = 'CREDIT' THEN sales.discount_usd ELSE 0 END), 0) as credit_discount`
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN sales.payment_type = 'CASH' THEN sales.total_usd ELSE 0 END), 0) as cash_sales`
        )
      )
      .first()

    const profit = Number(row?.profit ?? 0)
    const creditProfitGross = Number(row?.credit_profit ?? 0)
    const cashDiscount = Number(money?.cash_discount ?? 0)
    const creditDiscount = Number(money?.credit_discount ?? 0)
    const creditProfit = creditProfitGross - creditDiscount
    const gastos = await this.cashOutflowService.gastosForDates(
      this.salesShiftService.calendarDatesForShift(shift)
    )
    // Gastos operativos del día sí restan. Abonos/facturas a proveedor no (van aparte).
    const netProfit = profit - creditProfitGross - cashDiscount - gastos.montoUsd
    const ventasContado = Number(money?.cash_sales ?? 0)
    const porcentaje = ventasContado > 0 ? (netProfit / ventasContado) * 100 : 0

    return {
      montoUsd: netProfit.toFixed(4),
      gananciaCreditoUsd: creditProfit.toFixed(4),
      porcentajeSobreVentas: Math.round(porcentaje * 100) / 100,
    }
  }
}
