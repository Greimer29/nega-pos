import TurnoNoEncontradoException from '#exceptions/turno_no_encontrado_exception'
import SalesShift from '#models/sales_shift'
import DashboardCashOutflowService from '#services/dashboard_cash_outflow_service'
import type {
  DailyClosingInvoiceItem,
  DailyClosingPaymentMethodItem,
  DailyClosingResult,
  DailyClosingReturnItem,
} from '#services/dashboard_service'
import DashboardShiftSalesService from '#services/dashboard_shift_sales_service'
import SalesShiftService from '#services/sales_shift_service'
import { datetimeRangeUtcSql, todayIsoDate, toAppIsoDate } from '#utils/app_timezone'
import { computeSaleOriginalReturnedNet } from '#utils/sale_original_returned_net'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
function toIsoDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (DateTime.isDateTime(value) && value.isValid) {
    return value.toISO()
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return DateTime.fromJSDate(value).toISO()
  }

  const text = String(value)
  const iso = DateTime.fromISO(text)
  if (iso.isValid) {
    return iso.toISO()
  }

  const sql = DateTime.fromSQL(text)
  if (sql.isValid) {
    return sql.toISO()
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return DateTime.fromJSDate(parsed).toISO()
  }

  return null
}

/**
 * Daily closing by sales shift (sales of the shift, expenses of every calendar day it covers)
 * or by calendar day (sales confirmed that day in America/Caracas).
 */
export default class DashboardDailyClosingService {
  private salesShiftService = new SalesShiftService()
  private cashOutflowService = new DashboardCashOutflowService()
  private shiftSalesService = new DashboardShiftSalesService()
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
      date = toAppIsoDate(shift.openedAt)
    } else {
      date = input?.date?.trim() || todayIsoDate()
    }

    const salesQuery = db
      .from('sales')
      .leftJoin('customers', 'customers.id', 'sales.customer_id')
      .leftJoin('payment_methods', 'payment_methods.code', 'sales.payment_method_code')
      .whereIn('sales.status', ['COMPLETED', 'RETURNED'])

    if (salesShiftId) {
      salesQuery.where('sales.sales_shift_id', salesShiftId)
    } else {
      const { fromSql, toExclusiveSql } = datetimeRangeUtcSql(date, date)
      salesQuery
        .where('sales.confirmed_at', '>=', fromSql)
        .where('sales.confirmed_at', '<', toExclusiveSql)
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

    const products =
      await this.shiftSalesService.aggregateSoldCatalogProductsNet(productQueryOptions)

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
    /** Cash sales not fully returned: the only ones that feed the payment method totals. */
    const countedSaleIds = new Set<number>()
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

    const lineRows =
      saleIds.length === 0
        ? []
        : await db
            .from('sale_lines')
            .whereIn('sale_id', saleIds)
            .select(
              'sale_id as saleId',
              'quantity',
              'returned_quantity as returnedQuantity',
              'unit_price_usd as unitPriceUsd'
            )

    const linesBySale = new Map<number, typeof lineRows>()
    for (const row of lineRows) {
      const saleId = Number(row.saleId)
      const current = linesBySale.get(saleId) ?? []
      current.push(row)
      linesBySale.set(saleId, current)
    }

    for (const sale of sales) {
      const totalUsd = Number(sale.totalUsd ?? 0)
      const discountUsd = Number(sale.discountUsd ?? 0)
      const paymentType = String(sale.paymentType)
      const status = String(sale.status)

      discountsTotalUsd += discountUsd

      if (paymentType === 'CREDIT') {
        creditTotalUsd += totalUsd
      } else {
        cashTotalUsd += totalUsd
      }

      const saleId = Number(sale.id)
      const salePayments = paymentsBySale.get(saleId) ?? []
      const saleLines = linesBySale.get(saleId) ?? []
      const paymentMethodNames = salePayments
        .map((row) => (row.paymentMethodName ? String(row.paymentMethodName) : null))
        .filter((name): name is string => Boolean(name))
      const originalPaymentsUsd = salePayments.reduce(
        (sum, row) => sum + Number(row.amountUsd ?? 0),
        0
      )
      const nets = computeSaleOriginalReturnedNet({
        lines: saleLines.map((row) => ({
          quantity: Number(row.quantity ?? 0),
          returnedQuantity: Number(row.returnedQuantity ?? 0),
          unitPriceUsd: Number(row.unitPriceUsd ?? 0),
        })),
        remainingTotalUsd: totalUsd,
        remainingDiscountUsd: discountUsd,
        originalPaymentsUsd,
      })
      const returnedAt = toIsoDateTime(sale.returnedAt)
      const isFullyReturned =
        status === 'RETURNED' || (nets.returnedNetUsd > 0.0001 && totalUsd <= 0.0001)

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
        originalTotalUsd: nets.originalNetUsd.toFixed(4),
        returnedTotalUsd: nets.returnedNetUsd.toFixed(4),
        totalBs: sale.totalBs ? String(sale.totalBs) : null,
        status,
        returnedAt,
      })

      if (paymentType === 'CASH' && !isFullyReturned) {
        countedSaleIds.add(saleId)
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

    const returns: DailyClosingReturnItem[] = invoices
      .filter((invoice) => Number(invoice.returnedTotalUsd) > 0.0001)
      .map((invoice) => ({
        saleId: invoice.id,
        saleCode: invoice.code,
        returnedAt: invoice.returnedAt,
        totalReturnedUsd: invoice.returnedTotalUsd,
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
        .filter(
          (row) =>
            countedSaleIds.has(Number(row.saleId)) &&
            String(row.paymentMethodCode) === method.code &&
            row.amountNative
        )
        .reduce((sum, row) => sum + Number(row.amountNative ?? 0), 0)

      if (nativeTotal > 0) {
        method.totalInCurrency = nativeTotal.toFixed(2)
        continue
      }

      const methodSales = sales.filter(
        (sale) =>
          countedSaleIds.has(Number(sale.id)) &&
          String(sale.paymentMethodCode) === method.code &&
          sale.totalBs
      )

      if (methodSales.length > 0) {
        const totalBs = methodSales.reduce((sum, sale) => sum + Number(sale.totalBs ?? 0), 0)
        method.totalInCurrency = totalBs.toFixed(2)
      }
    }

    const closingDates = shiftForExpenses
      ? this.salesShiftService.calendarDatesForShift(shiftForExpenses)
      : [date]
    const expenses = shiftForExpenses
      ? await this.cashOutflowService.gastosDelDiaDetalleForDates(closingDates)
      : await this.cashOutflowService.gastosDelDiaDetalle(date)
    const expensesTotalUsd = Number(expenses.summary.gastosMontoUsd)
    const netCashUsd = cashTotalUsd - expensesTotalUsd
    const supplierPayments = await this.cashOutflowService.pagosProveedoresForDates(closingDates)
    const cashPurchases = await this.cashOutflowService.comprasContadoForDates(closingDates)
    const drawerCashUsd =
      cashTotalUsd - expensesTotalUsd - supplierPayments.montoUsd - cashPurchases.montoUsd

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
        supplierPaymentsCount: supplierPayments.cantidad,
        supplierPaymentsTotalUsd: supplierPayments.montoUsd.toFixed(4),
        cashPurchasesCount: cashPurchases.cantidad,
        cashPurchasesTotalUsd: cashPurchases.montoUsd.toFixed(4),
        drawerCashUsd: drawerCashUsd.toFixed(4),
      },
      byPaymentMethod,
      products,
      invoices,
      returns,
      expenses,
    }
  }
}
