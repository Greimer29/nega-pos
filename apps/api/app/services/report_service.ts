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
import CustomerPayment from '#models/customer_payment'
import Expense from '#models/expense'
import Income from '#models/income'
import MachineExpense from '#models/machine_expense'
import Sale from '#models/sale'
import Purchase from '#models/purchase'
import SupplierPayment from '#models/supplier_payment'

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

  netUsd: string

  sales: string

  purchases: string

  expenses: string

  machineExpenses: string

  incomes: string

  net: string

  rates: Record<string, string>
}

export type AccountStatementResult = {
  summary: AccountStatementSummary

  movements: AccountStatementMovement[]

  period: { from: string; to: string }
}

const SALE_STATUSES = ['COMPLETED'] as const

export default class ReportService {
  private currencyService = new CurrencyService()

  async estadoCuenta(filters: AccountStatementFilters): Promise<AccountStatementResult> {
    const period = this.resolvePeriod(filters)

    const types = new Set(
      filters.types ?? ['purchases', 'expenses', 'machine_expenses', 'sales', 'incomes']
    )

    const rates = await this.currencyService.getActiveRates()

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

          movements.push(
            this.buildMovement({
              id: Number(sale.id),

              type: 'sale',

              date: saleDate,

              label: `Factura ${sale.code} — ${saleLabel}`,

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
              creditBuilder

                .where('isCredit', true)

                .whereNotNull('creditDueDate')

                .where('creditDueDate', '<=', period.to)
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
        const currencyCode = expense.currencyCode ?? 'USD'

        const native = Number(expense.amountUsd ?? 0)

        const usd = this.currencyService.toUsd(native, currencyCode, rates)

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
        const currencyCode = income.currencyCode ?? 'USD'
        const native = Number(income.amountUsd ?? 0)
        const usd = this.currencyService.toUsd(native, currencyCode, rates)

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

    return {
      period,

      summary: {
        displayCurrency,

        salesUsd: salesUsd.toFixed(4),

        purchasesUsd: purchasesUsd.toFixed(4),

        expensesUsd: expensesUsd.toFixed(4),

        machineExpensesUsd: machineExpensesUsd.toFixed(4),

        incomesUsd: incomesUsd.toFixed(4),

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

        net: this.formatDisplay(
          this.currencyService.fromUsd(netUsd, displayCurrency, rates),

          displayCurrency
        ),

        rates: this.currencyService.formatRates(rates),
      },

      movements,
    }
  }

  private resolveSaleAmount(
    sale: Sale,
    _rates: Record<string, number>
  ): { usd: number; native: number; currencyCode: string } {
    const lines = sale.saleLines ?? []

    const usd = lines.reduce((sum, line) => {
      const active = Math.max(0, Number(line.quantity) - Number(line.returnedQuantity ?? 0))

      return sum + active * Number(line.unitPriceUsd)
    }, 0)

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
