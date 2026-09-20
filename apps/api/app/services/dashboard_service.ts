import MaterialService from '#services/material_service'
import CurrencyService from '#services/currency_service'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import SalesShiftService from '#services/sales_shift_service'
import CatalogProduct from '#models/catalog_product'
import SalesShift from '#models/sales_shift'
import TurnoNoEncontradoException from '#exceptions/turno_no_encontrado_exception'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { todayIsoDate } from '#utils/app_timezone'
import {
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseReportAmountUsd,
  creditPurchaseVisibleInReport,
  type CreditPurchaseReportContext,
} from '#utils/credit_purchase_report'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import {
  buildDailyVentasBuckets,
  buildMonthlyVentasBuckets,
  buildWeeklyVentasBuckets,
} from '#utils/dashboard_chart_periods'
import { allocateInvoiceDiscountToSaleLines } from '#utils/allocate_invoice_discount'

export type BajoStockItem = {
  id: number
  code: string
  name: string
  category: string
  unit: string
  minimumStock: string
  stockActual: number
}

export type BajoStockProductoItem = {
  id: number
  name: string
  stock: string
  minimumStock: string
  saleUnit: string
}

export type PurchasesMonthSummary = {
  quantity: number
  totalUsd: string
}

export type MachineExpensesMonthSummary = {
  quantity: number
  totalAmount: string
}

export type VentasDelDia = {
  productosVendidos: number
  montoProductosUsd: string
  montoCreditoUsd: string
  pedidosCredito: number
  gastosCantidad: number
  gastosMontoUsd: string
}

export type GananciaDelDia = {
  montoUsd: string
  gananciaCreditoUsd: string
  porcentajeSobreVentas: number
}

export type VentasSeriePoint = {
  label: string
  totalUsd: string
  variacionPct: number | null
}

export type ClienteCreditoItem = {
  id: number
  name: string
  pedidosConSaldo: number
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
}

export type ProveedorCreditoItem = {
  id: number
  name: string
  saldoPendienteUsd: string
  estado: 'vigente' | 'vencida'
}

export type DailySoldProductItem = {
  id: number
  name: string
  category: string
  saleUnit: string
  imagePath: string | null
  stockQuantity: string
  quantitySold: number
  unitPriceUsd: string
  totalUsd: string
}

export type DailyProductSalesResult = {
  date: string
  products: DailySoldProductItem[]
  summary: {
    productosVendidos: number
    montoProductosUsd: string
  }
}

export type DailyExpenseItem = {
  id: number
  kind: 'expense' | 'machine_expense'
  description: string
  amountUsd: string
  machineName: string | null
  category: string | null
}

export type DailyExpensesResult = {
  date: string
  items: DailyExpenseItem[]
  summary: {
    gastosCantidad: number
    gastosMontoUsd: string
  }
}

export type DailyClosingPaymentMethodItem = {
  code: string
  name: string
  currencyCode: string
  salesCount: number
  totalUsd: string
  totalInCurrency: string | null
}

export type DailyClosingInvoiceItem = {
  id: number
  code: string | null
  customerName: string
  paymentType: string
  paymentMethodCode: string | null
  paymentMethodName: string | null
  paymentMethods: Array<{
    code: string
    name: string
    amountUsd: string
  }>
  discountUsd: string
  totalUsd: string
  totalBs: string | null
  status: string
}

export type DailyClosingReturnItem = {
  saleId: number
  saleCode: string | null
  returnedAt: string
  totalReturnedUsd: string
}

export type DailyClosingResult = {
  date: string
  summary: {
    invoicesCount: number
    returnsCount: number
    cashTotalUsd: string
    creditTotalUsd: string
    productsSold: number
    productsAmountUsd: string
    discountsTotalUsd: string
    expensesCount: number
    expensesTotalUsd: string
    netCashUsd: string
  }
  byPaymentMethod: DailyClosingPaymentMethodItem[]
  products: DailySoldProductItem[]
  invoices: DailyClosingInvoiceItem[]
  returns: DailyClosingReturnItem[]
  expenses: DailyExpensesResult
}

export type DashboardOverview = {
  bajoStock: BajoStockItem[]
  bajoStockProductos: BajoStockProductoItem[]
  purchasesMonth: PurchasesMonthSummary
  machineExpensesMonth: MachineExpensesMonthSummary
  ventasDelDia: VentasDelDia
  gananciaDelDia: GananciaDelDia
  ventasSeries: VentasSeriePoint[]
  clientesCredito: ClienteCreditoItem[]
  proveedoresCredito: ProveedorCreditoItem[]
}

const SALE_STATUSES = ['COMPLETED'] as const

export default class DashboardService {
  private materialService = new MaterialService()
  private currencyService = new CurrencyService()
  private catalogProductStockService = new CatalogProductStockService()
  private salesShiftService = new SalesShiftService()

  private sumMachineExpensesUsd(
    rows: Array<{ amount: string | number; currency_code?: string | null }>,
    rates: Record<string, number>
  ): number {
    return sumMachineExpenseRowsUsd(rows, rates, this.currencyService)
  }

  async overview(chart: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<DashboardOverview> {
    const [
      bajoStock,
      bajoStockProductos,
      purchasesMonth,
      machineExpensesMonth,
      ventasDelDia,
      gananciaDelDia,
      ventasSeries,
      clientesCredito,
      proveedoresCredito,
    ] = await Promise.all([
      this.materialsBajoStock(),
      this.productosBajoStock(),
      this.comprasDelMes(),
      this.gastosMaquinasDelMes(),
      this.ventasDelDia(),
      this.gananciaDelDia(),
      this.ventasSeries(chart),
      this.clientesConCredito(),
      this.proveedoresConCredito(),
    ])

    return {
      bajoStock,
      bajoStockProductos,
      purchasesMonth,
      machineExpensesMonth,
      ventasDelDia,
      gananciaDelDia,
      ventasSeries,
      clientesCredito,
      proveedoresCredito,
    }
  }

  /** @deprecated use overview */
  async resumen() {
    const data = await this.overview('weekly')
    return {
      bajoStock: data.bajoStock,
      purchasesMonth: data.purchasesMonth,
      machineExpensesMonth: data.machineExpensesMonth,
    }
  }

  private async materialsBajoStock(): Promise<BajoStockItem[]> {
    const rows = await this.materialService.materialsLowStock()
    return rows.map(({ material, stockActual }) => ({
      id: Number(material.id),
      code: material.code,
      name: material.name,
      category: material.category,
      unit: material.unit,
      minimumStock: material.minimumStock,
      stockActual,
    }))
  }

  private async productosBajoStock(): Promise<BajoStockProductoItem[]> {
    const products = await CatalogProduct.query()
      .where('active', true)
      .whereRaw('stock_quantity < minimum_stock')
      .where('minimum_stock', '>', 0)
      .orderBy('name', 'asc')
      .limit(20)

    return products.map((p) => ({
      id: Number(p.id),
      name: p.name,
      stock: p.stockQuantity,
      minimumStock: p.minimumStock,
      saleUnit: p.saleUnit,
    }))
  }

  private async comprasDelMes(): Promise<PurchasesMonthSummary> {
    const inicioMes = DateTime.now().startOf('month').toISODate()!
    const finMes = DateTime.now().endOf('month').toISODate()!
    const period = { from: inicioMes, to: finMes }

    const purchases = await db
      .from('purchases')
      .where('status', 'CONFIRMED')
      .select(
        'id',
        'date',
        'is_credit',
        'credit_due_date',
        'balance_usd',
        'total_usd',
        'total_bs',
        'usd_rate'
      )

    let quantity = 0
    let totalUsd = 0

    for (const purchase of purchases) {
      const purchaseDate =
        purchase.date instanceof Date
          ? DateTime.fromJSDate(purchase.date).toISODate()!
          : String(purchase.date).slice(0, 10)
      const creditDueDate = purchase.credit_due_date
        ? purchase.credit_due_date instanceof Date
          ? DateTime.fromJSDate(purchase.credit_due_date).toISODate()!
          : String(purchase.credit_due_date).slice(0, 10)
        : null

      const reportContext: CreditPurchaseReportContext = {
        isCredit: Boolean(purchase.is_credit),
        purchaseDate,
        creditDueDate,
        balanceUsd: Number(purchase.balance_usd ?? 0),
      }

      if (!creditPurchaseVisibleInReport(reportContext, period)) {
        continue
      }

      const balanceUsdAmount = reportContext.isCredit
        ? creditPurchaseReportAmountUsd(reportContext)
        : this.resolvePurchaseTotalUsd(purchase)

      const countsTowardTotal = reportContext.isCredit
        ? creditPurchaseCountsTowardPeriodTotal(reportContext, period)
        : true

      const contributionUsd = countsTowardTotal ? balanceUsdAmount : 0

      if (contributionUsd > 0) {
        quantity += 1
        totalUsd += contributionUsd
      }
    }

    const supplierPayments = await db
      .from('supplier_payments')
      .where('date', '>=', inicioMes)
      .where('date', '<=', finMes)
      .select('amount_usd')

    for (const payment of supplierPayments) {
      const usd = Number(payment.amount_usd ?? 0)
      if (usd > 0) {
        totalUsd += usd
      }
    }

    return {
      quantity,
      totalUsd: totalUsd.toFixed(2),
    }
  }

  private resolvePurchaseTotalUsd(purchase: {
    total_usd?: string | null
    total_bs?: string | null
    usd_rate?: string | null
  }): number {
    if (purchase.total_usd) {
      return Number(purchase.total_usd)
    }
    const rate = purchase.usd_rate ? Number(purchase.usd_rate) : null
    if (rate && rate > 0) {
      return Number(purchase.total_bs ?? 0) / rate
    }
    return 0
  }

  private async gastosMaquinasDelMes(): Promise<MachineExpensesMonthSummary> {
    const inicioMes = DateTime.now().startOf('month').toISODate()!
    const finMes = DateTime.now().endOf('month').toISODate()!
    const rates = await this.currencyService.getActiveRates()

    const machineRows = await db
      .from('machine_expenses')
      .where('date', '>=', inicioMes)
      .where('date', '<=', finMes)
      .select('amount', 'currency_code')

    const totalAmount = this.sumMachineExpensesUsd(machineRows, rates)

    return {
      quantity: machineRows.length,
      totalAmount: totalAmount.toFixed(2),
    }
  }

  private resolveDashboardDate(dateInput?: string): string {
    return dateInput?.trim() || DateTime.now().toISODate()!
  }

  private async gastosDelDia(dateInput?: string): Promise<{ cantidad: number; montoUsd: number }> {
    const date = this.resolveDashboardDate(dateInput)
    const rates = await this.currencyService.getActiveRates()

    const expenseRows = await db.from('expenses').where('date', date).select('amount_usd')

    let expenseUsd = 0
    for (const row of expenseRows) {
      expenseUsd += Number(row.amount_usd ?? 0)
    }

    const machineRows = await db
      .from('machine_expenses')
      .where('date', date)
      .select('amount', 'currency_code')

    const machineUsd = this.sumMachineExpensesUsd(machineRows, rates)

    return {
      cantidad: expenseRows.length + machineRows.length,
      montoUsd: expenseUsd + machineUsd,
    }
  }

  private async gastosDelTurno(shift: {
    openedAt: DateTime
    closedAt: DateTime | null
  }): Promise<{ cantidad: number; montoUsd: number }> {
    const dates = this.salesShiftService.calendarDatesForShift(shift)
    if (dates.length === 0) {
      return { cantidad: 0, montoUsd: 0 }
    }

    const rates = await this.currencyService.getActiveRates()
    const expenses = await db
      .from('expenses')
      .whereIn('date', dates)
      .select(db.raw('COUNT(*) as qty'), db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      .first()

    const machineRows = await db
      .from('machine_expenses')
      .whereIn('date', dates)
      .select('amount', 'currency_code')

    const machineUsd = this.sumMachineExpensesUsd(machineRows, rates)

    return {
      cantidad: Number(expenses?.qty ?? 0) + machineRows.length,
      montoUsd: Number(expenses?.total_usd ?? 0) + machineUsd,
    }
  }

  /** Ventas del dashboard usan el turno abierto actual (sales_shift_id).
   * Montos = `sales.total_usd` (ya neto de descuento de factura), no suma bruta de líneas. */
  private async ventasDelDia(): Promise<VentasDelDia> {
    const shift = await this.salesShiftService.current()
    if (!shift) {
      return {
        productosVendidos: 0,
        montoProductosUsd: '0.0000',
        montoCreditoUsd: '0.0000',
        pedidosCredito: 0,
        gastosCantidad: 0,
        gastosMontoUsd: '0.0000',
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
      .select(db.raw('COALESCE(SUM(sale_lines.quantity - sale_lines.returned_quantity), 0) as qty'))
      .first()

    const gastos = await this.gastosDelTurno(shift)

    return {
      productosVendidos: Number(qtyRow?.qty ?? 0),
      montoProductosUsd: Number(money?.total_usd ?? 0).toFixed(4),
      montoCreditoUsd: Number(money?.credit_usd ?? 0).toFixed(4),
      pedidosCredito: Number(money?.pedidos_credito ?? 0),
      gastosCantidad: gastos.cantidad,
      gastosMontoUsd: gastos.montoUsd.toFixed(4),
    }
  }

  /**
   * Product sales with invoice-level discount allocated proportionally across lines
   * so product totals sum to cash/net billed amount.
   */
  private async aggregateSoldCatalogProductsNet(options: {
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
      lineQuery.whereRaw('DATE(sales.sold_at) = ?', [options.date])
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
      const quantity = Number(row.quantity ?? 0)
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

  async gastosDelDiaDetalleForDates(dates: string[]): Promise<DailyExpensesResult> {
    if (dates.length === 0) {
      return {
        date: todayIsoDate(),
        items: [],
        summary: {
          gastosCantidad: 0,
          gastosMontoUsd: '0.0000',
        },
      }
    }

    const rates = await this.currencyService.getActiveRates()

    const expenseRows = await db
      .from('expenses')
      .leftJoin('machines', 'machines.id', 'expenses.machine_id')
      .whereIn('expenses.date', dates)
      .select(
        'expenses.id',
        'expenses.description',
        'expenses.amount_usd as amountUsd',
        'expenses.currency_code as currencyCode',
        'machines.name as machineName'
      )
      .orderBy('expenses.amount_usd', 'desc')

    const machineRows = await db
      .from('machine_expenses')
      .join('machines', 'machines.id', 'machine_expenses.machine_id')
      .whereIn('machine_expenses.date', dates)
      .select(
        'machine_expenses.id',
        'machine_expenses.description',
        'machine_expenses.amount',
        'machine_expenses.currency_code as currencyCode',
        'machine_expenses.category',
        'machines.name as machineName'
      )
      .orderBy('machine_expenses.amount', 'desc')

    const items: DailyExpenseItem[] = [
      ...expenseRows.map((row) => {
        const amountUsd = Number(row.amountUsd ?? 0)

        return {
          id: Number(row.id),
          kind: 'expense' as const,
          description: String(row.description),
          amountUsd: amountUsd.toFixed(4),
          machineName: row.machineName ? String(row.machineName) : null,
          category: null,
        }
      }),
      ...machineRows.map((row) => {
        const currencyCode = row.currencyCode ? String(row.currencyCode) : 'USD'
        const amountUsd = this.currencyService.toUsd(Number(row.amount ?? 0), currencyCode, rates)

        return {
          id: Number(row.id),
          kind: 'machine_expense' as const,
          description: String(row.description),
          amountUsd: amountUsd.toFixed(4),
          machineName: row.machineName ? String(row.machineName) : null,
          category: row.category ? String(row.category) : null,
        }
      }),
    ].sort((a, b) => Number(b.amountUsd) - Number(a.amountUsd))

    const gastosMontoUsd = items.reduce((sum, item) => sum + Number(item.amountUsd), 0)

    return {
      date: dates[0],
      items,
      summary: {
        gastosCantidad: items.length,
        gastosMontoUsd: gastosMontoUsd.toFixed(4),
      },
    }
  }

  async gastosDelDiaDetalle(dateInput?: string): Promise<DailyExpensesResult> {
    const date = this.resolveDashboardDate(dateInput)
    const rates = await this.currencyService.getActiveRates()

    const expenseRows = await db
      .from('expenses')
      .leftJoin('machines', 'machines.id', 'expenses.machine_id')
      .where('expenses.date', date)
      .select(
        'expenses.id',
        'expenses.description',
        'expenses.amount_usd as amountUsd',
        'expenses.currency_code as currencyCode',
        'machines.name as machineName'
      )
      .orderBy('expenses.amount_usd', 'desc')

    const machineRows = await db
      .from('machine_expenses')
      .join('machines', 'machines.id', 'machine_expenses.machine_id')
      .where('machine_expenses.date', date)
      .select(
        'machine_expenses.id',
        'machine_expenses.description',
        'machine_expenses.amount',
        'machine_expenses.currency_code as currencyCode',
        'machine_expenses.category',
        'machines.name as machineName'
      )
      .orderBy('machine_expenses.amount', 'desc')

    const items: DailyExpenseItem[] = [
      ...expenseRows.map((row) => {
        const amountUsd = Number(row.amountUsd ?? 0)

        return {
          id: Number(row.id),
          kind: 'expense' as const,
          description: String(row.description),
          amountUsd: amountUsd.toFixed(4),
          machineName: row.machineName ? String(row.machineName) : null,
          category: null,
        }
      }),
      ...machineRows.map((row) => {
        const currencyCode = row.currencyCode ? String(row.currencyCode) : 'USD'
        const amountUsd = this.currencyService.toUsd(Number(row.amount ?? 0), currencyCode, rates)

        return {
          id: Number(row.id),
          kind: 'machine_expense' as const,
          description: String(row.description),
          amountUsd: amountUsd.toFixed(4),
          machineName: row.machineName ? String(row.machineName) : null,
          category: row.category ? String(row.category) : null,
        }
      }),
    ].sort((a, b) => Number(b.amountUsd) - Number(a.amountUsd))

    const summary = await this.gastosDelDia(date)

    return {
      date,
      items,
      summary: {
        gastosCantidad: summary.cantidad,
        gastosMontoUsd: summary.montoUsd.toFixed(4),
      },
    }
  }

  private async gananciaDelDia(): Promise<GananciaDelDia> {
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
    const gastos = await this.gastosDelTurno(shift)
    const netProfit = profit - creditProfitGross - cashDiscount - gastos.montoUsd
    const ventasContado = Number(money?.cash_sales ?? 0)
    const porcentaje = ventasContado > 0 ? (netProfit / ventasContado) * 100 : 0

    return {
      montoUsd: netProfit.toFixed(4),
      gananciaCreditoUsd: creditProfit.toFixed(4),
      porcentajeSobreVentas: Math.round(porcentaje * 100) / 100,
    }
  }

  private async ventasSeries(chart: 'daily' | 'weekly' | 'monthly'): Promise<VentasSeriePoint[]> {
    const hoy = DateTime.now()
    const buckets =
      chart === 'daily'
        ? buildDailyVentasBuckets(hoy)
        : chart === 'weekly'
          ? buildWeeklyVentasBuckets(hoy)
          : buildMonthlyVentasBuckets(hoy)

    const points: VentasSeriePoint[] = []
    let prevTotal = 0

    for (const bucket of buckets) {
      const row = await db
        .from('sales')
        .whereIn('sales.status', [...SALE_STATUSES])
        .whereRaw('DATE(sales.sold_at) >= ?', [bucket.desde])
        .whereRaw('DATE(sales.sold_at) <= ?', [bucket.hasta])
        .select(db.raw('COALESCE(SUM(sales.total_usd), 0) as total_usd'))
        .first()

      const total = Number(row?.total_usd ?? 0)
      const variacionPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null

      points.push({
        label: bucket.label,
        totalUsd: total.toFixed(4),
        variacionPct: variacionPct !== null ? Math.round(variacionPct * 100) / 100 : null,
      })
      prevTotal = total
    }

    return points
  }

  private async clientesConCredito(): Promise<ClienteCreditoItem[]> {
    const hoy = DateTime.now().toISODate()!

    const rows = await db
      .from('customers')
      .join('sales', 'sales.customer_id', 'customers.id')
      .where('sales.balance_usd', '>', 0)
      .whereIn('sales.status', [...SALE_STATUSES])
      .groupBy('customers.id', 'customers.name')
      .select(
        'customers.id',
        'customers.name',
        db.raw('COUNT(sales.id) as pedidos'),
        db.raw('SUM(sales.balance_usd) as saldo'),
        db.raw(
          `MAX(CASE WHEN sales.credit_due_date < ? AND sales.balance_usd > 0 THEN 1 ELSE 0 END) as vencida`,
          [hoy]
        )
      )

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      pedidosConSaldo: Number(row.pedidos),
      saldoPendienteUsd: Number(row.saldo).toFixed(4),
      estado: Number(row.vencida) > 0 ? 'vencida' : 'vigente',
    }))
  }

  private async proveedoresConCredito(): Promise<ProveedorCreditoItem[]> {
    const hoy = DateTime.now().toISODate()!

    const rows = await db
      .from('suppliers')
      .join('purchases', 'purchases.supplier_id', 'suppliers.id')
      .where('purchases.is_credit', true)
      .where('purchases.status', 'CONFIRMED')
      .where('purchases.balance_usd', '>', 0)
      .groupBy('suppliers.id', 'suppliers.name')
      .select(
        'suppliers.id',
        'suppliers.name',
        db.raw('SUM(purchases.balance_usd) as saldo'),
        db.raw(
          `MAX(CASE WHEN purchases.credit_due_date < ? AND purchases.balance_usd > 0 THEN 1 ELSE 0 END) as vencida`,
          [hoy]
        )
      )

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      saldoPendienteUsd: Number(row.saldo).toFixed(4),
      estado: Number(row.vencida) > 0 ? 'vencida' : 'vigente',
    }))
  }

  async cierreDiario(input?: {
    salesShiftId?: number
    date?: string
  }): Promise<DailyClosingResult> {
    let date: string
    let salesShiftId: number | null = null
    let shiftForExpenses: SalesShift | null = null

    if (input?.salesShiftId) {
      const shift = await SalesShift.find(input.salesShiftId)
      if (!shift) {
        throw new TurnoNoEncontradoException()
      }
      salesShiftId = Number(shift.id)
      shiftForExpenses = shift
      date = shift.openedAt.toISO()!.slice(0, 10)
    } else {
      date = input?.date?.trim() || DateTime.now().toISODate()!
    }

    const salesQuery = db
      .from('sales')
      .leftJoin('customers', 'customers.id', 'sales.customer_id')
      .leftJoin('payment_methods', 'payment_methods.code', 'sales.payment_method_code')
      .whereIn('sales.status', ['COMPLETED', 'RETURNED'])

    if (salesShiftId) {
      salesQuery.where('sales.sales_shift_id', salesShiftId)
    } else {
      salesQuery.whereRaw('DATE(sales.confirmed_at) = ?', [date])
    }

    const sales = await salesQuery
      .select(
        'sales.id',
        'sales.code',
        'sales.payment_type as paymentType',
        'sales.payment_method_code as paymentMethodCode',
        'sales.discount_usd as discountUsd',
        'sales.total_usd as totalUsd',
        'sales.total_bs as totalBs',
        'sales.status',
        'sales.returned_at as returnedAt',
        'customers.name as customerName',
        'payment_methods.name as paymentMethodName',
        'payment_methods.currency_code as currencyCode'
      )
      .orderBy('sales.confirmed_at', 'asc')

    const productQueryOptions = salesShiftId ? { salesShiftId } : { date }

    const products = await this.aggregateSoldCatalogProductsNet(productQueryOptions)

    let cashTotalUsd = 0
    let creditTotalUsd = 0
    let productsSold = 0
    let discountsTotalUsd = 0

    for (const product of products) {
      productsSold += product.quantitySold
    }

    const methodTotals = new Map<
      string,
      { code: string; name: string; currencyCode: string; salesCount: number; totalUsd: number }
    >()

    const invoices: DailyClosingInvoiceItem[] = []
    const saleIds = sales.map((sale) => Number(sale.id))
    const paymentRows =
      saleIds.length === 0
        ? []
        : await db
            .from('sale_payments')
            .leftJoin(
              'payment_methods',
              'payment_methods.code',
              'sale_payments.payment_method_code'
            )
            .whereIn('sale_payments.sale_id', saleIds)
            .select(
              'sale_payments.sale_id as saleId',
              'sale_payments.payment_method_code as paymentMethodCode',
              'sale_payments.amount_usd as amountUsd',
              'sale_payments.amount_native as amountNative',
              'payment_methods.name as paymentMethodName',
              'payment_methods.currency_code as currencyCode'
            )
            .orderBy('sale_payments.sort_order', 'asc')
            .orderBy('sale_payments.id', 'asc')

    const paymentsBySale = new Map<number, typeof paymentRows>()
    for (const row of paymentRows) {
      const saleId = Number(row.saleId)
      const current = paymentsBySale.get(saleId) ?? []
      current.push(row)
      paymentsBySale.set(saleId, current)
    }

    for (const sale of sales) {
      const totalUsd = Number(sale.totalUsd ?? 0)
      const discountUsd = Number(sale.discountUsd ?? 0)
      const paymentType = String(sale.paymentType)

      discountsTotalUsd += discountUsd

      if (paymentType === 'CREDIT') {
        creditTotalUsd += totalUsd
      } else {
        cashTotalUsd += totalUsd
      }

      const saleId = Number(sale.id)
      const salePayments = paymentsBySale.get(saleId) ?? []
      const paymentMethodNames = salePayments
        .map((row) => (row.paymentMethodName ? String(row.paymentMethodName) : null))
        .filter((name): name is string => Boolean(name))

      invoices.push({
        id: saleId,
        code: sale.code ? String(sale.code) : null,
        customerName: sale.customerName ? String(sale.customerName) : 'Cliente general',
        paymentType,
        paymentMethodCode: sale.paymentMethodCode ? String(sale.paymentMethodCode) : null,
        paymentMethodName:
          paymentMethodNames.length > 0
            ? paymentMethodNames.join(' + ')
            : sale.paymentMethodName
              ? String(sale.paymentMethodName)
              : null,
        paymentMethods: salePayments.map((row) => ({
          code: String(row.paymentMethodCode),
          name: row.paymentMethodName
            ? String(row.paymentMethodName)
            : String(row.paymentMethodCode),
          amountUsd: Number(row.amountUsd ?? 0).toFixed(4),
        })),
        discountUsd: discountUsd.toFixed(4),
        totalUsd: totalUsd.toFixed(4),
        totalBs: sale.totalBs ? String(sale.totalBs) : null,
        status: String(sale.status),
      })

      if (paymentType === 'CASH') {
        const methodLines =
          salePayments.length > 0
            ? salePayments.map((row) => ({
                code: String(row.paymentMethodCode),
                name: row.paymentMethodName
                  ? String(row.paymentMethodName)
                  : String(row.paymentMethodCode),
                currencyCode: row.currencyCode ? String(row.currencyCode) : 'USD',
                amountUsd: Number(row.amountUsd ?? 0),
              }))
            : sale.paymentMethodCode
              ? [
                  {
                    code: String(sale.paymentMethodCode),
                    name: sale.paymentMethodName
                      ? String(sale.paymentMethodName)
                      : String(sale.paymentMethodCode),
                    currencyCode: sale.currencyCode ? String(sale.currencyCode) : 'USD',
                    amountUsd: totalUsd,
                  },
                ]
              : []

        const counted = new Set<string>()
        for (const line of methodLines) {
          const current = methodTotals.get(line.code) ?? {
            code: line.code,
            name: line.name,
            currencyCode: line.currencyCode,
            salesCount: 0,
            totalUsd: 0,
          }
          if (!counted.has(line.code)) {
            current.salesCount += 1
            counted.add(line.code)
          }
          current.totalUsd += line.amountUsd
          methodTotals.set(line.code, current)
        }
      }
    }

    // Net billed amount (after invoice discounts), not gross line subtotals.
    const productsAmountUsd = cashTotalUsd + creditTotalUsd

    const returnsQuery = db.from('sales').where('status', 'RETURNED')

    if (salesShiftId) {
      returnsQuery.where('sales_shift_id', salesShiftId)
    } else {
      returnsQuery.whereRaw('DATE(sales.returned_at) = ?', [date])
    }

    const returnsRows = await returnsQuery.select(
      'id',
      'code',
      'returned_at as returnedAt',
      'total_usd as totalUsd'
    )

    const returns: DailyClosingReturnItem[] = returnsRows.map((row) => ({
      saleId: Number(row.id),
      saleCode: row.code ? String(row.code) : null,
      returnedAt: row.returnedAt ? String(row.returnedAt) : date,
      totalReturnedUsd: Number(row.totalUsd ?? 0).toFixed(4),
    }))

    const byPaymentMethod: DailyClosingPaymentMethodItem[] = [...methodTotals.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        code: item.code,
        name: item.name,
        currencyCode: item.currencyCode,
        salesCount: item.salesCount,
        totalUsd: item.totalUsd.toFixed(4),
        totalInCurrency: item.currencyCode === 'USD' ? item.totalUsd.toFixed(2) : null,
      }))

    // Enrich totals in local currency using sale payment snapshots when available
    for (const method of byPaymentMethod) {
      if (method.currencyCode === 'USD') {
        method.totalInCurrency = method.totalUsd
        continue
      }

      const nativeTotal = paymentRows
        .filter((row) => String(row.paymentMethodCode) === method.code && row.amountNative)
        .reduce((sum, row) => sum + Number(row.amountNative ?? 0), 0)

      if (nativeTotal > 0) {
        method.totalInCurrency = nativeTotal.toFixed(2)
        continue
      }

      const methodSales = sales.filter(
        (sale) =>
          String(sale.paymentType) === 'CASH' &&
          String(sale.paymentMethodCode) === method.code &&
          sale.totalBs
      )

      if (methodSales.length > 0) {
        const totalBs = methodSales.reduce((sum, sale) => sum + Number(sale.totalBs ?? 0), 0)
        method.totalInCurrency = totalBs.toFixed(2)
      }
    }

    const expenses = shiftForExpenses
      ? await this.gastosDelDiaDetalleForDates(
          this.salesShiftService.calendarDatesForShift(shiftForExpenses)
        )
      : await this.gastosDelDiaDetalle(date)
    const expensesTotalUsd = Number(expenses.summary.gastosMontoUsd)
    const netCashUsd = cashTotalUsd - expensesTotalUsd

    return {
      date,
      summary: {
        invoicesCount: sales.length,
        returnsCount: returns.length,
        cashTotalUsd: cashTotalUsd.toFixed(4),
        creditTotalUsd: creditTotalUsd.toFixed(4),
        productsSold,
        productsAmountUsd: productsAmountUsd.toFixed(4),
        discountsTotalUsd: discountsTotalUsd.toFixed(4),
        expensesCount: expenses.summary.gastosCantidad,
        expensesTotalUsd: expenses.summary.gastosMontoUsd,
        netCashUsd: netCashUsd.toFixed(4),
      },
      byPaymentMethod,
      products,
      invoices,
      returns,
      expenses,
    }
  }
}
