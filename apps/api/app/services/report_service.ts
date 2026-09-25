import MonedaNoEncontradaException from '#exceptions/moneda_no_encontrada_exception'
import CurrencyService from '#services/currency_service'
import {
  creditPurchaseReportAmountUsd,
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseReportEffectiveDate,
  creditPurchaseReportStatus,
  creditPurchaseVisibleInReport,
} from '#utils/credit_purchase_report'
import { creditSaleReportAmountUsd, creditSaleReportStatus } from '#utils/credit_sale_report'
import { nativeAmountFromBase } from '#utils/monetary_entry'
import CustomerPayment from '#models/customer_payment'
import Expense from '#models/expense'
import Income from '#models/income'
import MachineExpense from '#models/machine_expense'
import Sale from '#models/sale'
import Purchase from '#models/purchase'
import SupplierPayment from '#models/supplier_payment'
import db from '@adonisjs/lucid/services/db'

import { DateTime } from 'luxon'

export type AccountStatementMovementType =
  | 'sale'
  | 'customer_payment'
  | 'purchase'
  | 'supplier_payment'
  | 'expense'
  | 'machine_expense'
  | 'income'

export type AccountStatementFilters = {
  from?: string

  to?: string

  month?: string

  account_id?: number

  unassigned?: boolean

  types?: Array<'purchases' | 'expenses' | 'machine_expenses' | 'sales' | 'incomes'>

  display_currency?: string
}

export type AccountStatementMovement = {
  id: number

  type: AccountStatementMovementType

  date: string

  label: string

  account: { id: number; name: string } | null

  amountNative: string

  currencyCode: string

  amountDisplay: string

  amountUsd: string

  isIncome: boolean

  referenceId: number

  status?: string

  isCreditPurchase?: boolean

  isCreditPurchaseCarryover?: boolean

  creditDueDate?: string | null

  purchaseDate?: string

  creditOverdue?: boolean

  creditReportStatus?: 'pending' | 'overdue' | 'settled'

  isCreditSale?: boolean

  creditBalanceUsd?: string

  saleDate?: string

  customerId?: number

  supplierId?: number
}

export type AccountStatementSummary = {
  displayCurrency: string

  salesUsd: string

  purchasesUsd: string

  expensesUsd: string

  machineExpensesUsd: string

  incomesUsd: string

  /** Deuda a proveedores con saldo (informativo; no resta del neto). */
  pendingPayablesUsd: string

  /** Subconjunto vencido de pendingPayablesUsd. */
  overduePayablesUsd: string

  /** CxC abierta (informativo; no suma al flujo hasta el cobro). */
  pendingReceivablesUsd: string

  overdueReceivablesUsd: string

  netUsd: string

  sales: string

  purchases: string

  expenses: string

  machineExpenses: string

  incomes: string

  pendingPayables: string

  overduePayables: string

  pendingReceivables: string

  overdueReceivables: string

  net: string

  rates: Record<string, string>
}

export type AccountStatementResult = {
  summary: AccountStatementSummary

  movements: AccountStatementMovement[]

  period: { from: string; to: string }
}

export type IncomeStatementFilters = {
  from?: string
  to?: string
  month?: string
  display_currency?: string
}

export type IncomeStatementSummary = {
  displayCurrency: string
  /** Ingresos por ventas (devengo): total_usd de facturas COMPLETED del período. */
  salesRevenueUsd: string
  /** Costo de mercancía vendida (qty neta × costo de línea / catálogo). */
  cogsUsd: string
  grossProfitUsd: string
  /** Gastos operativos + gastos máquina legacy del período. */
  operatingExpensesUsd: string
  operatingIncomeUsd: string
  /** Porcentaje; null si no hay ingresos por ventas. */
  grossMarginPct: number | null
  operatingMarginPct: number | null
  salesRevenue: string
  cogs: string
  grossProfit: string
  operatingExpenses: string
  operatingIncome: string
  rates: Record<string, string>
}

export type IncomeStatementResult = {
  summary: IncomeStatementSummary
  period: { from: string; to: string }
}

export type BalancePositionFilters = {
  display_currency?: string
}

export type BalancePositionSummary = {
  displayCurrency: string
  /** Inventario valorizado a costo (productos manuales + materiales). */
  inventoryUsd: string
  receivablesUsd: string
  machinesUsd: string
  totalAssetsUsd: string
  payablesUsd: string
  totalLiabilitiesUsd: string
  /** Activo − Pasivo (estimado operativo). */
  estimatedEquityUsd: string
  /** Aportes de capital acumulados (informativo). */
  capitalContributionsUsd: string
  inventory: string
  receivables: string
  machines: string
  totalAssets: string
  payables: string
  totalLiabilities: string
  estimatedEquity: string
  capitalContributions: string
  rates: Record<string, string>
}

export type BalancePositionResult = {
  summary: BalancePositionSummary
  asOf: string
}

export type FinancialSummaryFilters = {
  from?: string
  to?: string
  month?: string
  display_currency?: string
}

export type FinancialSummaryDiagnosisTone = 'positive' | 'caution' | 'negative'

export type FinancialSummaryDiagnosis = {
  tone: FinancialSummaryDiagnosisTone
  headline: string
  detail: string
}

export type FinancialSummaryResult = {
  period: { from: string; to: string }
  asOf: string
  diagnosis: FinancialSummaryDiagnosis
  displayCurrency: string
  rates: Record<string, string>
  resultado: {
    salesRevenueUsd: string
    cogsUsd: string
    grossProfitUsd: string
    operatingExpensesUsd: string
    operatingIncomeUsd: string
    grossMarginPct: number | null
    operatingMarginPct: number | null
    salesRevenue: string
    cogs: string
    grossProfit: string
    operatingExpenses: string
    operatingIncome: string
  }
  flujo: {
    netUsd: string
    salesUsd: string
    incomesUsd: string
    purchasesUsd: string
    expensesUsd: string
    net: string
    sales: string
    incomes: string
    purchases: string
    expenses: string
  }
  patrimonio: {
    inventoryUsd: string
    receivablesUsd: string
    machinesUsd: string
    totalAssetsUsd: string
    payablesUsd: string
    totalLiabilitiesUsd: string
    estimatedEquityUsd: string
    capitalContributionsUsd: string
    inventory: string
    receivables: string
    machines: string
    totalAssets: string
    payables: string
    totalLiabilities: string
    estimatedEquity: string
    capitalContributions: string
  }
}

const SALE_STATUSES = ['COMPLETED'] as const

export default class ReportService {
  private currencyService = new CurrencyService()

  async resumenFinanciero(filters: FinancialSummaryFilters): Promise<FinancialSummaryResult> {
    const displayCurrency = filters.display_currency
    const periodFilters = {
      from: filters.from,
      to: filters.to,
      month: filters.month,
      display_currency: displayCurrency,
    }

    const [resultados, flujo, patrimonio] = await Promise.all([
      this.estadoResultados(periodFilters),
      this.estadoCuenta({
        ...periodFilters,
        types: ['sales', 'incomes', 'purchases', 'expenses'],
      }),
      this.situacionPatrimonial({ display_currency: displayCurrency }),
    ])

    const diagnosis = this.buildFinancialDiagnosis(
      Number(resultados.summary.operatingIncomeUsd),
      Number(flujo.summary.netUsd),
      Number(patrimonio.summary.estimatedEquityUsd)
    )

    return {
      period: resultados.period,
      asOf: patrimonio.asOf,
      diagnosis,
      displayCurrency: resultados.summary.displayCurrency,
      rates: resultados.summary.rates,
      resultado: {
        salesRevenueUsd: resultados.summary.salesRevenueUsd,
        cogsUsd: resultados.summary.cogsUsd,
        grossProfitUsd: resultados.summary.grossProfitUsd,
        operatingExpensesUsd: resultados.summary.operatingExpensesUsd,
        operatingIncomeUsd: resultados.summary.operatingIncomeUsd,
        grossMarginPct: resultados.summary.grossMarginPct,
        operatingMarginPct: resultados.summary.operatingMarginPct,
        salesRevenue: resultados.summary.salesRevenue,
        cogs: resultados.summary.cogs,
        grossProfit: resultados.summary.grossProfit,
        operatingExpenses: resultados.summary.operatingExpenses,
        operatingIncome: resultados.summary.operatingIncome,
      },
      flujo: {
        netUsd: flujo.summary.netUsd,
        salesUsd: flujo.summary.salesUsd,
        incomesUsd: flujo.summary.incomesUsd,
        purchasesUsd: flujo.summary.purchasesUsd,
        expensesUsd: flujo.summary.expensesUsd,
        net: flujo.summary.net,
        sales: flujo.summary.sales,
        incomes: flujo.summary.incomes,
        purchases: flujo.summary.purchases,
        expenses: flujo.summary.expenses,
      },
      patrimonio: {
        inventoryUsd: patrimonio.summary.inventoryUsd,
        receivablesUsd: patrimonio.summary.receivablesUsd,
        machinesUsd: patrimonio.summary.machinesUsd,
        totalAssetsUsd: patrimonio.summary.totalAssetsUsd,
        payablesUsd: patrimonio.summary.payablesUsd,
        totalLiabilitiesUsd: patrimonio.summary.totalLiabilitiesUsd,
        estimatedEquityUsd: patrimonio.summary.estimatedEquityUsd,
        capitalContributionsUsd: patrimonio.summary.capitalContributionsUsd,
        inventory: patrimonio.summary.inventory,
        receivables: patrimonio.summary.receivables,
        machines: patrimonio.summary.machines,
        totalAssets: patrimonio.summary.totalAssets,
        payables: patrimonio.summary.payables,
        totalLiabilities: patrimonio.summary.totalLiabilities,
        estimatedEquity: patrimonio.summary.estimatedEquity,
        capitalContributions: patrimonio.summary.capitalContributions,
      },
    }
  }

  private buildFinancialDiagnosis(
    operatingIncomeUsd: number,
    cashFlowUsd: number,
    _estimatedEquityUsd: number
  ): FinancialSummaryDiagnosis {
    const opOk = operatingIncomeUsd >= 0
    const cashOk = cashFlowUsd >= 0

    if (opOk && cashOk) {
      return {
        tone: 'positive',
        headline: 'Utilidad operativa y flujo de caja positivos',
        detail:
          'El período generó resultado favorable a devengo y también entró más caja de la que salió.',
      }
    }

    if (opOk && !cashOk) {
      return {
        tone: 'caution',
        headline: 'Utilidad operativa con flujo de caja negativo',
        detail:
          'Hubo utilidad a devengo, pero salió más caja que la que entró (crédito, compras de inventario o egresos).',
      }
    }

    if (!opOk && cashOk) {
      return {
        tone: 'caution',
        headline: 'Flujo de caja positivo con pérdida operativa',
        detail:
          'Entró más caja de la que salió, pero el resultado operativo del período fue negativo.',
      }
    }

    return {
      tone: 'negative',
      headline: 'Pérdida operativa y flujo de caja negativo',
      detail:
        'El período cerró con resultado operativo adverso y más salidas de caja que entradas.',
    }
  }

  async situacionPatrimonial(filters: BalancePositionFilters = {}): Promise<BalancePositionResult> {
    const rates = await this.currencyService.getActiveRates()
    const displayCurrency = (filters.display_currency ?? 'USD').toUpperCase()

    if (!rates[displayCurrency]) {
      throw new MonedaNoEncontradaException(
        'La moneda de visualización no está configurada o activa'
      )
    }

    const [inventoryUsd, receivables, payablesUsd, machinesUsd, capitalUsd] = await Promise.all([
      this.computeInventoryValueUsd(),
      this.computeOpenReceivables(),
      this.computeOpenPayablesUsd(),
      this.computeMachinesValueUsd(),
      this.computeCapitalContributionsUsd(),
    ])

    const receivablesUsd = receivables.pendingReceivablesUsd
    const totalAssetsUsd = inventoryUsd + receivablesUsd + machinesUsd
    const totalLiabilitiesUsd = payablesUsd
    const estimatedEquityUsd = totalAssetsUsd - totalLiabilitiesUsd

    const fmt = (usd: number) =>
      this.formatDisplay(this.currencyService.fromUsd(usd, displayCurrency, rates), displayCurrency)

    return {
      asOf: DateTime.now().toISODate()!,
      summary: {
        displayCurrency,
        inventoryUsd: inventoryUsd.toFixed(4),
        receivablesUsd: receivablesUsd.toFixed(4),
        machinesUsd: machinesUsd.toFixed(4),
        totalAssetsUsd: totalAssetsUsd.toFixed(4),
        payablesUsd: payablesUsd.toFixed(4),
        totalLiabilitiesUsd: totalLiabilitiesUsd.toFixed(4),
        estimatedEquityUsd: estimatedEquityUsd.toFixed(4),
        capitalContributionsUsd: capitalUsd.toFixed(4),
        inventory: fmt(inventoryUsd),
        receivables: fmt(receivablesUsd),
        machines: fmt(machinesUsd),
        totalAssets: fmt(totalAssetsUsd),
        payables: fmt(payablesUsd),
        totalLiabilities: fmt(totalLiabilitiesUsd),
        estimatedEquity: fmt(estimatedEquityUsd),
        capitalContributions: fmt(capitalUsd),
        rates: this.currencyService.formatRates(rates),
      },
    }
  }

  async estadoResultados(filters: IncomeStatementFilters): Promise<IncomeStatementResult> {
    const period = this.resolvePeriod(filters)
    const rates = await this.currencyService.getActiveRates()
    const displayCurrency = (filters.display_currency ?? 'USD').toUpperCase()

    if (!rates[displayCurrency]) {
      throw new MonedaNoEncontradaException(
        'La moneda de visualización no está configurada o activa'
      )
    }

    const soldFrom = `${period.from} 00:00:00`
    const soldTo = `${period.to} 23:59:59`

    const revenueRow = await db
      .from('sales')
      .whereIn('status', [...SALE_STATUSES])
      .where('sold_at', '>=', soldFrom)
      .where('sold_at', '<=', soldTo)
      .select(db.raw('COALESCE(SUM(total_usd), 0) as revenue'))
      .first()

    const cogsRow = await db
      .from('sales')
      .join('sale_lines', 'sale_lines.sale_id', 'sales.id')
      .leftJoin('catalog_products', 'catalog_products.id', 'sale_lines.catalog_product_id')
      .leftJoin('materials', 'materials.id', 'sale_lines.material_id')
      .whereIn('sales.status', [...SALE_STATUSES])
      .where('sales.sold_at', '>=', soldFrom)
      .where('sales.sold_at', '<=', soldTo)
      .select(
        db.raw(
          `COALESCE(SUM(
            COALESCE(
              sale_lines.cost_usd,
              catalog_products.cost_usd,
              materials.last_purchase_price_usd,
              materials.reference_cost_usd,
              0
            ) * (sale_lines.quantity - sale_lines.returned_quantity)
          ), 0) as cogs`
        )
      )
      .first()

    const expensesRow = await db
      .from('expenses')
      .where('date', '>=', period.from)
      .where('date', '<=', period.to)
      .select(db.raw('COALESCE(SUM(amount_usd), 0) as total'))
      .first()

    const machineExpenses = await MachineExpense.query()
      .where('date', '>=', period.from)
      .where('date', '<=', period.to)

    let machineExpensesUsd = 0
    for (const expense of machineExpenses) {
      const currencyCode = expense.currencyCode ?? 'USD'
      const native = Number(expense.amount ?? 0)
      machineExpensesUsd += this.currencyService.toUsd(native, currencyCode, rates)
    }

    const salesRevenueUsd = Number(revenueRow?.revenue ?? 0)
    const cogsUsd = Number(cogsRow?.cogs ?? 0)
    const operatingExpensesUsd = Number(expensesRow?.total ?? 0) + machineExpensesUsd
    const grossProfitUsd = salesRevenueUsd - cogsUsd
    const operatingIncomeUsd = grossProfitUsd - operatingExpensesUsd

    const grossMarginPct =
      salesRevenueUsd > 0 ? Math.round((grossProfitUsd / salesRevenueUsd) * 10000) / 100 : null
    const operatingMarginPct =
      salesRevenueUsd > 0 ? Math.round((operatingIncomeUsd / salesRevenueUsd) * 10000) / 100 : null

    const fmt = (usd: number) =>
      this.formatDisplay(this.currencyService.fromUsd(usd, displayCurrency, rates), displayCurrency)

    return {
      period,
      summary: {
        displayCurrency,
        salesRevenueUsd: salesRevenueUsd.toFixed(4),
        cogsUsd: cogsUsd.toFixed(4),
        grossProfitUsd: grossProfitUsd.toFixed(4),
        operatingExpensesUsd: operatingExpensesUsd.toFixed(4),
        operatingIncomeUsd: operatingIncomeUsd.toFixed(4),
        grossMarginPct,
        operatingMarginPct,
        salesRevenue: fmt(salesRevenueUsd),
        cogs: fmt(cogsUsd),
        grossProfit: fmt(grossProfitUsd),
        operatingExpenses: fmt(operatingExpensesUsd),
        operatingIncome: fmt(operatingIncomeUsd),
        rates: this.currencyService.formatRates(rates),
      },
    }
  }

  async estadoCuenta(filters: AccountStatementFilters): Promise<AccountStatementResult> {
    const period = this.resolvePeriod(filters)

    const types = new Set(
      filters.types ?? ['purchases', 'expenses', 'machine_expenses', 'sales', 'incomes']
    )

    const rates = await this.currencyService.getActiveRates()
    const baseCurrencyCode = await this.currencyService.getBaseCurrencyCode()

    const displayCurrency = (filters.display_currency ?? 'USD').toUpperCase()

    if (!rates[displayCurrency]) {
      throw new MonedaNoEncontradaException(
        'La moneda de visualización no está configurada o activa'
      )
    }

    const movements: AccountStatementMovement[] = []

    let salesUsd = 0

    let purchasesUsd = 0

    let expensesUsd = 0

    let machineExpensesUsd = 0

    let incomesUsd = 0

    let pendingPayablesUsd = 0

    let overduePayablesUsd = 0

    if (types.has('sales')) {
      const sales = await Sale.query()
        .whereIn('status', [...SALE_STATUSES])
        .where('soldAt', '>=', `${period.from} 00:00:00`)
        .where('soldAt', '<=', `${period.to} 23:59:59`)
        .preload('saleLines')
        .preload('customer')
        .orderBy('soldAt', 'desc')
        .orderBy('id', 'desc')

      for (const sale of sales) {
        const { usd: grossUsd, native, currencyCode } = this.resolveSaleAmount(sale, rates)

        if (grossUsd <= 0) {
          continue
        }

        const saleDate = sale.soldAt?.toISODate() ?? sale.confirmedAt?.toISODate() ?? period.to
        const saleLabel = sale.guestName ?? sale.customer?.name ?? 'Cliente'

        const isCredit = sale.paymentType === 'CREDIT'

        if (isCredit) {
          const creditDueDate = sale.creditDueDate?.toISODate() ?? null

          const balanceUsd = Number(sale.balanceUsd ?? 0)

          const creditStatus = creditSaleReportStatus(balanceUsd, creditDueDate)

          const reportUsd = creditSaleReportAmountUsd(balanceUsd)

          movements.push(
            this.buildMovement({
              id: Number(sale.id),

              type: 'sale',

              date: saleDate,

              label: `Factura ${sale.code} — ${saleLabel}`,

              account: null,

              native: reportUsd > 0 ? reportUsd : grossUsd,

              currencyCode,

              usd: reportUsd,

              displayCurrency,

              rates,

              referenceId: Number(sale.id),

              status: sale.status,

              isIncome: false,

              isCreditSale: true,

              creditDueDate,

              saleDate,

              creditBalanceUsd: balanceUsd,

              creditReportStatus: creditStatus ?? undefined,
            })
          )
        } else {
          salesUsd += grossUsd

          const discountUsd = Number(sale.discountUsd ?? 0)
          const discountNote = discountUsd > 0.0001 ? ` · descuento −${discountUsd.toFixed(2)}` : ''

          movements.push(
            this.buildMovement({
              id: Number(sale.id),

              type: 'sale',

              date: saleDate,

              label: `Factura ${sale.code} — ${saleLabel}${discountNote}`,

              account: null,

              native,

              currencyCode,

              usd: grossUsd,

              displayCurrency,

              rates,

              referenceId: Number(sale.id),

              status: sale.status,

              isIncome: true,
            })
          )
        }
      }

      const paymentQuery = CustomerPayment.query()

        .where('date', '>=', period.from)

        .where('date', '<=', period.to)

        .preload('customer')

        .preload('sale')

        .preload('order')

        .preload('account')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')

      this.applyAccountFilter(paymentQuery, filters)

      const payments = await paymentQuery

      for (const payment of payments) {
        const usd = Number(payment.amountUsd)

        if (usd <= 0) {
          continue
        }

        salesUsd += usd

        const customerName = payment.customer?.name ?? 'Cliente'

        const saleRef = payment.sale?.code
          ? ` (${payment.sale.code})`
          : payment.order
            ? ` (${payment.order.code})`
            : ''

        movements.push(
          this.buildMovement({
            id: Number(payment.id),

            type: 'customer_payment',

            date: payment.date.toISODate()!,

            label: `Abono — ${customerName}${saleRef}`,

            account: payment.account
              ? { id: Number(payment.account.id), name: payment.account.name }
              : null,

            native: usd,

            currencyCode: 'USD',

            usd,

            displayCurrency,

            rates,

            referenceId: Number(payment.id),

            customerId: Number(payment.customerId),

            isIncome: true,
          })
        )
      }
    }

    if (types.has('purchases')) {
      const query = Purchase.query()

        .where('status', 'CONFIRMED')

        .where((builder) => {
          builder

            .where((cashBuilder) => {
              cashBuilder

                .where('isCredit', false)

                .where('date', '>=', period.from)

                .where('date', '<=', period.to)
            })

            .orWhere((creditBuilder) => {
              creditBuilder.where('isCredit', true).where((creditScope) => {
                creditScope
                  .where((withDue) => {
                    withDue.whereNotNull('creditDueDate').where('creditDueDate', '<=', period.to)
                  })
                  .orWhere((withoutDue) => {
                    withoutDue.whereNull('creditDueDate').where('date', '<=', period.to)
                  })
              })
            })
        })

        .preload('account')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')

      this.applyAccountFilter(query, filters)

      const purchases = await query

      for (const purchase of purchases) {
        const purchaseDate = purchase.date.toISODate()!

        const creditDueDate = purchase.creditDueDate?.toISODate() ?? null

        const balanceUsd = Number(purchase.balanceUsd ?? 0)

        const reportContext = {
          isCredit: purchase.isCredit,

          purchaseDate,

          creditDueDate,

          balanceUsd,
        }

        if (!creditPurchaseVisibleInReport(reportContext, period)) {
          continue
        }

        const reportDate = creditPurchaseReportEffectiveDate(reportContext)

        const creditStatus = creditPurchaseReportStatus(reportContext)

        const balanceUsdAmount = purchase.isCredit
          ? creditPurchaseReportAmountUsd(reportContext)
          : Number(purchase.totalUsd ?? 0) ||
            this.currencyService.toUsd(Number(purchase.totalBs ?? 0), 'VES', rates)

        const countsTowardTotal = purchase.isCredit
          ? creditPurchaseCountsTowardPeriodTotal(reportContext, period)
          : true

        const usd = countsTowardTotal ? balanceUsdAmount : 0
        const isCreditPurchaseCarryover =
          Boolean(purchase.isCredit) && balanceUsdAmount > 0 && !countsTowardTotal

        const nativeUsd = balanceUsdAmount

        purchasesUsd += usd

        if (purchase.isCredit && balanceUsdAmount > 0) {
          pendingPayablesUsd += balanceUsdAmount
          if (creditStatus === 'overdue') {
            overduePayablesUsd += balanceUsdAmount
          }
        }

        movements.push(
          this.buildMovement({
            id: Number(purchase.id),

            type: 'purchase',

            date: reportDate,

            label: `Compra #${purchase.id}${purchase.invoiceNumber ? ` — Factura ${purchase.invoiceNumber}` : ''}`,

            account: purchase.account
              ? { id: Number(purchase.account.id), name: purchase.account.name }
              : null,

            native: nativeUsd,

            currencyCode: 'USD',

            usd,

            displayCurrency,

            rates,

            referenceId: Number(purchase.id),

            status: purchase.status,

            isIncome: false,

            isCreditPurchase: Boolean(purchase.isCredit),

            isCreditPurchaseCarryover,

            creditDueDate,

            purchaseDate,

            creditBalanceUsd: balanceUsd,

            creditOverdue: creditStatus === 'overdue',

            creditReportStatus: creditStatus ?? undefined,
          })
        )
      }

      const supplierPaymentQuery = SupplierPayment.query()
        .where('date', '>=', period.from)
        .where('date', '<=', period.to)
        .preload('supplier')
        .preload('purchase')
        .preload('account')
        .orderBy('date', 'desc')
        .orderBy('id', 'desc')

      this.applyAccountFilter(supplierPaymentQuery, filters)

      const supplierPayments = await supplierPaymentQuery

      for (const payment of supplierPayments) {
        const usd = Number(payment.amountUsd)

        if (usd <= 0) {
          continue
        }

        purchasesUsd += usd

        const supplierName = payment.supplier?.name ?? 'Proveedor'
        const purchaseRef = payment.purchase ? ` (Compra #${payment.purchase.id})` : ''

        movements.push(
          this.buildMovement({
            id: Number(payment.id),
            type: 'supplier_payment',
            date: payment.date.toISODate()!,
            label: `Pago proveedor — ${supplierName}${purchaseRef}`,
            account: payment.account
              ? { id: Number(payment.account.id), name: payment.account.name }
              : null,
            native: usd,
            currencyCode: 'USD',
            usd,
            displayCurrency,
            rates,
            referenceId: Number(payment.id),
            supplierId: Number(payment.supplierId),
            isIncome: false,
          })
        )
      }
    }

    if (types.has('expenses')) {
      const query = Expense.query()

        .where('date', '>=', period.from)

        .where('date', '<=', period.to)

        .preload('account')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')

      this.applyAccountFilter(query, filters)

      const expenses = await query

      for (const expense of expenses) {
        const currencyCode = expense.currencyCode ?? baseCurrencyCode

        const usd = Number(expense.amountUsd ?? 0)

        const native = Number(
          nativeAmountFromBase(usd, expense.entryRate, currencyCode, baseCurrencyCode)
        )

        expensesUsd += usd

        movements.push(
          this.buildMovement({
            id: Number(expense.id),

            type: 'expense',

            date: expense.date.toISODate()!,

            label: expense.description,

            account: expense.account
              ? { id: Number(expense.account.id), name: expense.account.name }
              : null,

            native,

            currencyCode,

            usd,

            displayCurrency,

            rates,

            referenceId: Number(expense.id),

            isIncome: false,
          })
        )
      }
    }

    if (types.has('machine_expenses')) {
      const query = MachineExpense.query()

        .where('date', '>=', period.from)

        .where('date', '<=', period.to)

        .preload('account')

        .preload('machine')

        .orderBy('date', 'desc')

        .orderBy('id', 'desc')

      this.applyAccountFilter(query, filters)

      const machineExpenses = await query

      for (const expense of machineExpenses) {
        const currencyCode = expense.currencyCode ?? 'USD'

        const native = Number(expense.amount ?? 0)

        const usd = this.currencyService.toUsd(native, currencyCode, rates)

        machineExpensesUsd += usd

        const machineName = expense.machine?.name ?? 'Máquina'

        movements.push(
          this.buildMovement({
            id: Number(expense.id),

            type: 'machine_expense',

            date: expense.date.toISODate()!,

            label: `${machineName} — ${expense.description}`,

            account: expense.account
              ? { id: Number(expense.account.id), name: expense.account.name }
              : null,

            native,

            currencyCode,

            usd,

            displayCurrency,

            rates,

            referenceId: Number(expense.id),

            isIncome: false,
          })
        )
      }
    }

    if (types.has('incomes')) {
      const query = Income.query()
        .where('date', '>=', period.from)
        .where('date', '<=', period.to)
        .preload('account')
        .orderBy('date', 'desc')
        .orderBy('id', 'desc')

      this.applyAccountFilter(query, filters)

      const incomes = await query

      for (const income of incomes) {
        const currencyCode = income.currencyCode ?? baseCurrencyCode
        const usd = Number(income.amountUsd ?? 0)
        const native = Number(
          nativeAmountFromBase(usd, income.entryRate, currencyCode, baseCurrencyCode)
        )

        incomesUsd += usd

        movements.push(
          this.buildMovement({
            id: Number(income.id),
            type: 'income',
            date: income.date.toISODate()!,
            label: income.description,
            account: income.account
              ? { id: Number(income.account.id), name: income.account.name }
              : null,
            native,
            currencyCode,
            usd,
            displayCurrency,
            rates,
            referenceId: Number(income.id),
            isIncome: true,
          })
        )
      }
    }

    movements.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)

      if (dateCompare !== 0) {
        return dateCompare
      }

      return b.id - a.id
    })

    const netUsd = salesUsd + incomesUsd - purchasesUsd - expensesUsd - machineExpensesUsd
    const { pendingReceivablesUsd, overdueReceivablesUsd } = await this.computeOpenReceivables()

    return {
      period,

      summary: {
        displayCurrency,

        salesUsd: salesUsd.toFixed(4),

        purchasesUsd: purchasesUsd.toFixed(4),

        expensesUsd: expensesUsd.toFixed(4),

        machineExpensesUsd: machineExpensesUsd.toFixed(4),

        incomesUsd: incomesUsd.toFixed(4),

        pendingPayablesUsd: pendingPayablesUsd.toFixed(4),

        overduePayablesUsd: overduePayablesUsd.toFixed(4),

        pendingReceivablesUsd: pendingReceivablesUsd.toFixed(4),

        overdueReceivablesUsd: overdueReceivablesUsd.toFixed(4),

        netUsd: netUsd.toFixed(4),

        sales: this.formatDisplay(
          this.currencyService.fromUsd(salesUsd, displayCurrency, rates),
          displayCurrency
        ),

        purchases: this.formatDisplay(
          this.currencyService.fromUsd(purchasesUsd, displayCurrency, rates),

          displayCurrency
        ),

        expenses: this.formatDisplay(
          this.currencyService.fromUsd(expensesUsd, displayCurrency, rates),

          displayCurrency
        ),

        machineExpenses: this.formatDisplay(
          this.currencyService.fromUsd(machineExpensesUsd, displayCurrency, rates),

          displayCurrency
        ),

        incomes: this.formatDisplay(
          this.currencyService.fromUsd(incomesUsd, displayCurrency, rates),

          displayCurrency
        ),

        pendingPayables: this.formatDisplay(
          this.currencyService.fromUsd(pendingPayablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        overduePayables: this.formatDisplay(
          this.currencyService.fromUsd(overduePayablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        pendingReceivables: this.formatDisplay(
          this.currencyService.fromUsd(pendingReceivablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        overdueReceivables: this.formatDisplay(
          this.currencyService.fromUsd(overdueReceivablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        net: this.formatDisplay(
          this.currencyService.fromUsd(netUsd, displayCurrency, rates),

          displayCurrency
        ),

        rates: this.currencyService.formatRates(rates),
      },

      movements,
    }
  }

  private async computeInventoryValueUsd(): Promise<number> {
    const materials = await db
      .from('materials')
      .where('active', true)
      .select('id', 'last_purchase_price_usd', 'reference_cost_usd')
    const materialIds = materials.map((row) => Number(row.id))
    const stockByMaterial = new Map<number, number>()
    if (materialIds.length > 0) {
      const stockRows = await db
        .from('inventory_movements')
        .select('material_id')
        .sum('quantity as qty')
        .whereIn('material_id', materialIds)
        .groupBy('material_id')
      for (const row of stockRows) {
        stockByMaterial.set(Number(row.material_id), Number(row.qty ?? 0))
      }
    }

    let materialsUsd = 0
    for (const material of materials) {
      const qty = stockByMaterial.get(Number(material.id)) ?? 0
      const unitCost = Number(material.last_purchase_price_usd ?? material.reference_cost_usd ?? 0)
      materialsUsd += qty * unitCost
    }

    const sizedRow = await db
      .from('catalog_product_sizes')
      .join('catalog_products', 'catalog_products.id', 'catalog_product_sizes.catalog_product_id')
      .where('catalog_products.item_kind', 'PRODUCT')
      .whereNull('catalog_products.formula_id')
      .where('catalog_products.active', true)
      .select(
        db.raw(
          'COALESCE(SUM(catalog_product_sizes.stock_quantity * catalog_products.cost_usd), 0) as total'
        )
      )
      .first()

    const products = await db
      .from('catalog_products')
      .where('item_kind', 'PRODUCT')
      .whereNull('formula_id')
      .where('active', true)
      .select('id', 'stock_quantity', 'cost_usd')

    const productIds = products.map((row) => Number(row.id))
    const sizedProductIds = new Set<number>()
    if (productIds.length > 0) {
      const sizeRows = await db
        .from('catalog_product_sizes')
        .distinct('catalog_product_id')
        .whereIn('catalog_product_id', productIds)
      for (const row of sizeRows) {
        sizedProductIds.add(Number(row.catalog_product_id))
      }
    }

    let unsizedUsd = 0
    for (const product of products) {
      if (sizedProductIds.has(Number(product.id))) continue
      unsizedUsd += Number(product.stock_quantity ?? 0) * Number(product.cost_usd ?? 0)
    }

    return materialsUsd + Number(sizedRow?.total ?? 0) + unsizedUsd
  }

  private async computeOpenPayablesUsd(): Promise<number> {
    const row = await db
      .from('purchases')
      .where('status', 'CONFIRMED')
      .where('is_credit', true)
      .where('balance_usd', '>', 0)
      .select(db.raw('COALESCE(SUM(balance_usd), 0) as total'))
      .first()

    return Number(row?.total ?? 0)
  }

  private async computeMachinesValueUsd(): Promise<number> {
    const row = await db
      .from('machines')
      .where('active', true)
      .select(db.raw('COALESCE(SUM(COALESCE(acquisition_cost, 0)), 0) as total'))
      .first()

    return Number(row?.total ?? 0)
  }

  private async computeCapitalContributionsUsd(): Promise<number> {
    const row = await db
      .from('incomes')
      .select(db.raw('COALESCE(SUM(amount_usd), 0) as total'))
      .first()

    return Number(row?.total ?? 0)
  }

  private async computeOpenReceivables() {
    const sales = await Sale.query()
      .whereIn('status', [...SALE_STATUSES])
      .where('paymentType', 'CREDIT')
      .where('balanceUsd', '>', 0)

    const asOfDate = DateTime.now().toISODate()!
    let pendingReceivablesUsd = 0
    let overdueReceivablesUsd = 0

    for (const sale of sales) {
      const balanceUsd = Number(sale.balanceUsd ?? 0)
      if (balanceUsd <= 0) {
        continue
      }

      pendingReceivablesUsd += balanceUsd
      const dueDate = sale.creditDueDate?.toISODate() ?? null
      if (creditSaleReportStatus(balanceUsd, dueDate, asOfDate) === 'overdue') {
        overdueReceivablesUsd += balanceUsd
      }
    }

    return { pendingReceivablesUsd, overdueReceivablesUsd }
  }

  private resolveSaleAmount(
    sale: Sale,
    _rates: Record<string, number>
  ): { usd: number; native: number; currencyCode: string } {
    // Invoice net (lines − invoice discount − returns already reflected in total_usd).
    const usd = Math.max(0, Number(sale.totalUsd ?? 0))

    return { usd, native: usd, currencyCode: 'USD' }
  }

  private buildMovement(options: {
    id: number

    type: AccountStatementMovementType

    date: string

    label: string

    account: { id: number; name: string } | null

    native: number

    currencyCode: string

    usd: number

    displayCurrency: string

    rates: Record<string, number>

    referenceId: number

    status?: string

    isIncome: boolean

    isCreditPurchase?: boolean

    isCreditPurchaseCarryover?: boolean

    isCreditSale?: boolean

    creditBalanceUsd?: number

    creditDueDate?: string | null

    purchaseDate?: string

    saleDate?: string

    creditOverdue?: boolean

    creditReportStatus?: 'pending' | 'overdue' | 'settled'

    customerId?: number

    supplierId?: number
  }): AccountStatementMovement {
    const displayAmount = this.currencyService.fromUsd(
      options.usd,

      options.displayCurrency,

      options.rates
    )

    return {
      id: options.id,

      type: options.type,

      date: options.date,

      label: options.label,

      account: options.account,

      amountNative: this.formatNative(options.native, options.currencyCode),

      currencyCode: options.currencyCode,

      amountDisplay: this.formatDisplay(displayAmount, options.displayCurrency),

      amountUsd: options.usd.toFixed(4),

      isIncome: options.isIncome,

      referenceId: options.referenceId,

      ...(options.status ? { status: options.status } : {}),

      ...(options.type === 'purchase'
        ? {
            isCreditPurchase: options.isCreditPurchase ?? false,

            ...(options.isCreditPurchase
              ? {
                  creditDueDate: options.creditDueDate ?? null,

                  purchaseDate: options.purchaseDate,

                  ...(options.isCreditPurchaseCarryover ? { isCreditPurchaseCarryover: true } : {}),

                  creditBalanceUsd:
                    options.creditBalanceUsd !== undefined
                      ? options.creditBalanceUsd.toFixed(4)
                      : options.usd.toFixed(4),

                  creditOverdue: options.creditOverdue ?? false,

                  ...(options.creditReportStatus
                    ? { creditReportStatus: options.creditReportStatus }
                    : {}),
                }
              : {}),
          }
        : {}),

      ...(options.type === 'sale' && options.isCreditSale
        ? {
            isCreditSale: true,

            creditDueDate: options.creditDueDate ?? null,

            saleDate: options.saleDate,

            creditBalanceUsd:
              options.creditBalanceUsd !== undefined
                ? options.creditBalanceUsd.toFixed(4)
                : options.usd.toFixed(4),

            creditOverdue: options.creditReportStatus === 'overdue',

            ...(options.creditReportStatus
              ? { creditReportStatus: options.creditReportStatus }
              : {}),
          }
        : {}),

      ...(options.type === 'customer_payment' && options.customerId
        ? { customerId: options.customerId }
        : {}),

      ...(options.type === 'supplier_payment' && options.supplierId
        ? { supplierId: options.supplierId }
        : {}),
    }
  }

  private formatNative(value: number, currencyCode: string): string {
    return currencyCode === 'USD' ? value.toFixed(4) : value.toFixed(2)
  }

  private formatDisplay(value: number, currencyCode: string): string {
    return currencyCode === 'USD' ? value.toFixed(2) : value.toFixed(2)
  }

  private resolvePeriod(filters: AccountStatementFilters) {
    if (filters.month) {
      const start = DateTime.fromISO(`${filters.month}-01`)

      return {
        from: start.startOf('month').toISODate()!,

        to: start.endOf('month').toISODate()!,
      }
    }

    const now = DateTime.now()

    return {
      from: filters.from ?? now.startOf('month').toISODate()!,

      to: filters.to ?? now.endOf('month').toISODate()!,
    }
  }

  private applyAccountFilter(
    query: {
      whereNull(column: string): unknown

      where(column: string, value: unknown): unknown
    },

    filters: AccountStatementFilters
  ) {
    if (filters.unassigned) {
      query.whereNull('accountId')
    } else if (filters.account_id) {
      query.where('accountId', filters.account_id)
    }
  }
}
