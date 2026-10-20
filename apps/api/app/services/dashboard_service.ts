import MaterialService from '#services/material_service'
import CurrencyService from '#services/currency_service'
import DashboardShiftSalesService from '#services/dashboard_shift_sales_service'
import CatalogProduct from '#models/catalog_product'
import db from '@adonisjs/lucid/services/db'
import {
  currentMonthRange,
  datetimeRangeUtcSql,
  nowInAppZone,
  sqlDateToIsoDate,
  todayIsoDate,
} from '#utils/app_timezone'
import {
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseReportAmountUsd,
  creditPurchaseVisibleInReport,
  type CreditPurchaseReportContext,
} from '#utils/credit_purchase_report'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import { resolvePurchaseTotalUsd } from '#utils/purchase_totals'
import {
  buildDailyVentasBuckets,
  buildMonthlyVentasBuckets,
  buildWeeklyVentasBuckets,
} from '#utils/dashboard_chart_periods'
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
  /** Abonos a proveedores del turno (CxP); no son gasto operativo ni restan a ventas. */
  pagosProveedoresCantidad: number
  pagosProveedoresMontoUsd: string
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
  originalTotalUsd: string
  returnedTotalUsd: string
  totalBs: string | null
  status: string
  returnedAt: string | null
}

export type DailyClosingReturnItem = {
  saleId: number
  saleCode: string | null
  returnedAt: string | null
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
    /** Contado − gastos operativos (no incluye abonos ni compras de inventario). */
    netCashUsd: string
    supplierPaymentsCount: number
    supplierPaymentsTotalUsd: string
    cashPurchasesCount: number
    cashPurchasesTotalUsd: string
    /**
     * Contado − gastos − abonos a proveedores − compras de inventario al contado.
     * Sirve para conciliar caja; no mide el resultado de ventas del día.
     */
    drawerCashUsd: string
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
  private shiftSalesService = new DashboardShiftSalesService()

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
      this.shiftSalesService.ventasDelDia(),
      this.shiftSalesService.gananciaDelDia(),
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
    const { from: inicioMes, to: finMes } = currentMonthRange()
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
      const purchaseDate = sqlDateToIsoDate(purchase.date)!
      const creditDueDate = sqlDateToIsoDate(purchase.credit_due_date)

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
        : resolvePurchaseTotalUsd({
            totalUsd: purchase.total_usd,
            totalBs: purchase.total_bs,
            usdRate: purchase.usd_rate,
          })

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

  private async gastosMaquinasDelMes(): Promise<MachineExpensesMonthSummary> {
    const { from: inicioMes, to: finMes } = currentMonthRange()
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

  private async ventasSeries(chart: 'daily' | 'weekly' | 'monthly'): Promise<VentasSeriePoint[]> {
    const hoy = nowInAppZone()
    const buckets =
      chart === 'daily'
        ? buildDailyVentasBuckets(hoy)
        : chart === 'weekly'
          ? buildWeeklyVentasBuckets(hoy)
          : buildMonthlyVentasBuckets(hoy)

    const points: VentasSeriePoint[] = []
    let prevTotal = 0

    for (const bucket of buckets) {
      const { fromSql, toExclusiveSql } = datetimeRangeUtcSql(bucket.desde, bucket.hasta)
      const row = await db
        .from('sales')
        .whereIn('sales.status', [...SALE_STATUSES])
        .where('sales.sold_at', '>=', fromSql)
        .where('sales.sold_at', '<', toExclusiveSql)
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
    const hoy = todayIsoDate()

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
    const hoy = todayIsoDate()

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
}
