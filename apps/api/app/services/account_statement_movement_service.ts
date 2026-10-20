import CustomerPayment from '#models/customer_payment'
import Expense from '#models/expense'
import Income from '#models/income'
import MachineExpense from '#models/machine_expense'
import Purchase from '#models/purchase'
import Sale from '#models/sale'
import SupplierPayment from '#models/supplier_payment'
import CurrencyService from '#services/currency_service'
import type {
  AccountStatementFilters,
  AccountStatementMovement,
  AccountStatementMovementType,
} from '#services/report_service'
import { datetimeRangeUtcSql, dayStartUtcSql, toAppIsoDate } from '#utils/app_timezone'
import {
  creditPurchaseCountsTowardPeriodTotal,
  creditPurchaseReportAmountUsd,
  creditPurchaseReportEffectiveDate,
  creditPurchaseReportStatus,
  creditPurchaseVisibleInReport,
} from '#utils/credit_purchase_report'
import { creditSaleReportAmountUsd, creditSaleReportStatus } from '#utils/credit_sale_report'
import { machineExpenseRowUsd, sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import { nativeAmountFromBase } from '#utils/monetary_entry'
import { formatReportDisplay, formatReportNative } from '#utils/report_amount_format'
import db from '@adonisjs/lucid/services/db'

const SALE_STATUSES = ['COMPLETED'] as const

export type AccountStatementContext = {
  period: { from: string; to: string }
  filters: AccountStatementFilters
  rates: Record<string, number>
  baseCurrencyCode: string
  displayCurrency: string
}

type SourceResult = {
  movements: AccountStatementMovement[]
  totalUsd: number
}

type PurchaseSourceResult = SourceResult & {
  pendingPayablesUsd: number
  overduePayablesUsd: number
}

type MovementOptions = {
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
}

/**
 * Builds account statement movements per source. Cash sales, customer payments, incomes,
 * cash purchases, supplier payments and expenses move cash; credit sales are listed for
 * information only. Credit purchases add to the period total only when
 * `creditPurchaseCountsTowardPeriodTotal` says so; otherwise they are a carryover line.
 */
export default class AccountStatementMovementService {
  private currencyService = new CurrencyService()

  /** Cash sales and customer payments (inflows); credit sales are informative. */
  async collectSales(ctx: AccountStatementContext): Promise<SourceResult> {
    const { period, filters, rates, displayCurrency } = ctx
    const movements: AccountStatementMovement[] = []
    let totalUsd = 0

    const { fromSql: soldFrom, toExclusiveSql: soldToExclusive } = datetimeRangeUtcSql(
      period.from,
      period.to
    )
    const sales = await Sale.query()
      .whereIn('status', [...SALE_STATUSES])
      .where('soldAt', '>=', soldFrom)
      .where('soldAt', '<', soldToExclusive)
      .preload('saleLines')
      .preload('customer')
      .orderBy('soldAt', 'desc')
      .orderBy('id', 'desc')

    for (const sale of sales) {
      const { usd: grossUsd, native, currencyCode } = this.resolveSaleAmount(sale)

      if (grossUsd <= 0) {
        continue
      }

      const saleDate = sale.soldAt
        ? toAppIsoDate(sale.soldAt)
        : sale.confirmedAt
          ? toAppIsoDate(sale.confirmedAt)
          : period.to
      const saleLabel = sale.guestName ?? sale.customer?.name ?? 'Cliente'

      if (sale.paymentType === 'CREDIT') {
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
        totalUsd += grossUsd

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

      totalUsd += usd

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

    return { movements, totalUsd }
  }

  /**
   * Cash purchases and supplier payments (outflows). Credit purchases with balance are
   * payables: listed and summed into pending/overdue, but only count toward the period
   * total when `creditPurchaseCountsTowardPeriodTotal` says so.
   */
  async collectPurchases(ctx: AccountStatementContext): Promise<PurchaseSourceResult> {
    const { period, filters, rates, displayCurrency } = ctx
    const movements: AccountStatementMovement[] = []
    let totalUsd = 0
    let pendingPayablesUsd = 0
    let overduePayablesUsd = 0

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

      totalUsd += usd

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
          native: balanceUsdAmount,
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

      totalUsd += usd

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

    return { movements, totalUsd, pendingPayablesUsd, overduePayablesUsd }
  }

  async collectExpenses(ctx: AccountStatementContext): Promise<SourceResult> {
    const { period, filters, rates, baseCurrencyCode, displayCurrency } = ctx
    const movements: AccountStatementMovement[] = []
    let totalUsd = 0

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

      totalUsd += usd

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

    return { movements, totalUsd }
  }

  /** Legacy machine expenses, stored in their native currency. */
  async collectMachineExpenses(ctx: AccountStatementContext): Promise<SourceResult> {
    const { period, filters, rates, displayCurrency } = ctx
    const movements: AccountStatementMovement[] = []
    let totalUsd = 0

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
      const usd = machineExpenseRowUsd(
        { amount: native, currency_code: currencyCode },
        rates,
        this.currencyService
      )

      totalUsd += usd

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

    return { movements, totalUsd }
  }

  async collectIncomes(ctx: AccountStatementContext): Promise<SourceResult> {
    const { period, filters, rates, baseCurrencyCode, displayCurrency } = ctx
    const movements: AccountStatementMovement[] = []
    let totalUsd = 0

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

      totalUsd += usd

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

    return { movements, totalUsd }
  }

  /**
   * Cash flow accumulated before `beforeDate` with the same rules as the period: cash sales,
   * customer payments and incomes in; cash purchases, supplier payments, expenses and legacy
   * machine expenses out.
   */
  async computeOpeningBalanceUsd(options: {
    beforeDate: string
    types: Set<string>
    filters: AccountStatementFilters
    rates: Record<string, number>
  }): Promise<number> {
    const { beforeDate, types, filters, rates } = options
    let inflows = 0
    let outflows = 0

    if (types.has('sales')) {
      const cashSales = await db
        .from('sales')
        .where('status', 'COMPLETED')
        .where('payment_type', 'CASH')
        .where('sold_at', '<', dayStartUtcSql(beforeDate))
        .select(db.raw('COALESCE(SUM(total_usd), 0) as total_usd'))
        .first()
      inflows += Number(cashSales?.total_usd ?? 0)

      let paymentQuery = db
        .from('customer_payments')
        .where('date', '<', beforeDate)
        .select(db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      paymentQuery = this.applyAccountFilterToKnex(paymentQuery, filters)
      const customerPayments = await paymentQuery.first()
      inflows += Number(customerPayments?.total_usd ?? 0)
    }

    if (types.has('incomes')) {
      let incomeQuery = db
        .from('incomes')
        .where('date', '<', beforeDate)
        .select(db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      incomeQuery = this.applyAccountFilterToKnex(incomeQuery, filters)
      const incomes = await incomeQuery.first()
      inflows += Number(incomes?.total_usd ?? 0)
    }

    if (types.has('purchases')) {
      let purchaseQuery = db
        .from('purchases')
        .where('status', 'CONFIRMED')
        .where('is_credit', false)
        .where('date', '<', beforeDate)
        .select(db.raw('COALESCE(SUM(total_usd), 0) as total_usd'))
      purchaseQuery = this.applyAccountFilterToKnex(purchaseQuery, filters)
      const cashPurchases = await purchaseQuery.first()
      outflows += Number(cashPurchases?.total_usd ?? 0)

      let supplierPaymentQuery = db
        .from('supplier_payments')
        .where('date', '<', beforeDate)
        .select(db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      supplierPaymentQuery = this.applyAccountFilterToKnex(supplierPaymentQuery, filters)
      const supplierPayments = await supplierPaymentQuery.first()
      outflows += Number(supplierPayments?.total_usd ?? 0)
    }

    if (types.has('expenses')) {
      let expenseQuery = db
        .from('expenses')
        .where('date', '<', beforeDate)
        .select(db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      expenseQuery = this.applyAccountFilterToKnex(expenseQuery, filters)
      const expenses = await expenseQuery.first()
      outflows += Number(expenses?.total_usd ?? 0)
    }

    if (types.has('machine_expenses')) {
      let machineQuery = db
        .from('machine_expenses')
        .where('date', '<', beforeDate)
        .select('amount', 'currency_code')
      machineQuery = this.applyAccountFilterToKnex(machineQuery, filters)
      const machineRows = await machineQuery
      outflows += sumMachineExpenseRowsUsd(machineRows, rates, this.currencyService)
    }

    return inflows - outflows
  }

  /** Invoice net (lines − invoice discount − returns already reflected in total_usd). */
  private resolveSaleAmount(sale: Sale): { usd: number; native: number; currencyCode: string } {
    const usd = Math.max(0, Number(sale.totalUsd ?? 0))

    return { usd, native: usd, currencyCode: 'USD' }
  }

  private buildMovement(options: MovementOptions): AccountStatementMovement {
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
      amountNative: formatReportNative(options.native, options.currencyCode),
      currencyCode: options.currencyCode,
      amountDisplay: formatReportDisplay(displayAmount, options.displayCurrency),
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

  private applyAccountFilterToKnex<
    T extends { whereNull(column: string): T; where(column: string, value: unknown): T },
  >(query: T, filters: AccountStatementFilters): T {
    if (filters.unassigned) {
      return query.whereNull('account_id')
    }
    if (filters.account_id) {
      return query.where('account_id', filters.account_id)
    }
    return query
  }
}
