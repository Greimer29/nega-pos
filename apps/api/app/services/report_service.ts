import MonedaNoEncontradaException from '#exceptions/moneda_no_encontrada_exception'
import AccountStatementMovementService, {
  type AccountStatementContext,
} from '#services/account_statement_movement_service'
import CurrencyService from '#services/currency_service'
import { formatReportDisplay } from '#utils/report_amount_format'
import { creditSaleReportStatus } from '#utils/credit_sale_report'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import MachineExpense from '#models/machine_expense'
import Sale from '#models/sale'
import db from '@adonisjs/lucid/services/db'
import { APP_TIMEZONE, datetimeRangeUtcSql, nowInAppZone, todayIsoDate } from '#utils/app_timezone'

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

  /** Movimiento del período: entradas − salidas (puede ser negativo). */
  netUsd: string

  /** Flujo acumulado antes de `period.from` (mismas reglas que el período). */
  openingBalanceUsd: string

  /** openingBalanceUsd + netUsd. */
  closingBalanceUsd: string

  sales: string

  purchases: string

  expenses: string

  machineExpenses: string

  incomes: string

  pendingPayables: string

  overduePayables: string

  pendingReceivables: string

  overdueReceivables: string

  openingBalance: string

  closingBalance: string

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
    openingBalanceUsd: string
    closingBalanceUsd: string
    salesUsd: string
    incomesUsd: string
    purchasesUsd: string
    expensesUsd: string
    net: string
    openingBalance: string
    closingBalance: string
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
  private movementService = new AccountStatementMovementService()

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
        openingBalanceUsd: flujo.summary.openingBalanceUsd,
        closingBalanceUsd: flujo.summary.closingBalanceUsd,
        salesUsd: flujo.summary.salesUsd,
        incomesUsd: flujo.summary.incomesUsd,
        purchasesUsd: flujo.summary.purchasesUsd,
        expensesUsd: flujo.summary.expensesUsd,
        net: flujo.summary.net,
        openingBalance: flujo.summary.openingBalance,
        closingBalance: flujo.summary.closingBalance,
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
      formatReportDisplay(
        this.currencyService.fromUsd(usd, displayCurrency, rates),
        displayCurrency
      )

    return {
      asOf: todayIsoDate(),
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

    const { fromSql: soldFrom, toExclusiveSql: soldToExclusive } = datetimeRangeUtcSql(
      period.from,
      period.to
    )

    const revenueRow = await db
      .from('sales')
      .whereIn('status', [...SALE_STATUSES])
      .where('sold_at', '>=', soldFrom)
      .where('sold_at', '<', soldToExclusive)
      .select(db.raw('COALESCE(SUM(total_usd), 0) as revenue'))
      .first()

    const cogsRow = await db
      .from('sales')
      .join('sale_lines', 'sale_lines.sale_id', 'sales.id')
      .leftJoin('catalog_products', 'catalog_products.id', 'sale_lines.catalog_product_id')
      .leftJoin('materials', 'materials.id', 'sale_lines.material_id')
      .whereIn('sales.status', [...SALE_STATUSES])
      .where('sales.sold_at', '>=', soldFrom)
      .where('sales.sold_at', '<', soldToExclusive)
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

    const machineExpensesUsd = sumMachineExpenseRowsUsd(
      machineExpenses.map((expense) => ({
        amount: expense.amount,
        currency_code: expense.currencyCode,
      })),
      rates,
      this.currencyService
    )

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
      formatReportDisplay(
        this.currencyService.fromUsd(usd, displayCurrency, rates),
        displayCurrency
      )

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

    const ctx: AccountStatementContext = {
      period,
      filters,
      rates,
      baseCurrencyCode,
      displayCurrency,
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
      const result = await this.movementService.collectSales(ctx)
      movements.push(...result.movements)
      salesUsd = result.totalUsd
    }

    if (types.has('purchases')) {
      const result = await this.movementService.collectPurchases(ctx)
      movements.push(...result.movements)
      purchasesUsd = result.totalUsd
      pendingPayablesUsd = result.pendingPayablesUsd
      overduePayablesUsd = result.overduePayablesUsd
    }

    if (types.has('expenses')) {
      const result = await this.movementService.collectExpenses(ctx)
      movements.push(...result.movements)
      expensesUsd = result.totalUsd
    }

    if (types.has('machine_expenses')) {
      const result = await this.movementService.collectMachineExpenses(ctx)
      movements.push(...result.movements)
      machineExpensesUsd = result.totalUsd
    }

    if (types.has('incomes')) {
      const result = await this.movementService.collectIncomes(ctx)
      movements.push(...result.movements)
      incomesUsd = result.totalUsd
    }

    movements.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)

      if (dateCompare !== 0) {
        return dateCompare
      }

      return b.id - a.id
    })

    const netUsd = salesUsd + incomesUsd - purchasesUsd - expensesUsd - machineExpensesUsd
    const openingBalanceUsd = await this.movementService.computeOpeningBalanceUsd({
      beforeDate: period.from,
      types,
      filters,
      rates,
    })
    const closingBalanceUsd = openingBalanceUsd + netUsd
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

        openingBalanceUsd: openingBalanceUsd.toFixed(4),

        closingBalanceUsd: closingBalanceUsd.toFixed(4),

        sales: formatReportDisplay(
          this.currencyService.fromUsd(salesUsd, displayCurrency, rates),
          displayCurrency
        ),

        purchases: formatReportDisplay(
          this.currencyService.fromUsd(purchasesUsd, displayCurrency, rates),

          displayCurrency
        ),

        expenses: formatReportDisplay(
          this.currencyService.fromUsd(expensesUsd, displayCurrency, rates),

          displayCurrency
        ),

        machineExpenses: formatReportDisplay(
          this.currencyService.fromUsd(machineExpensesUsd, displayCurrency, rates),

          displayCurrency
        ),

        incomes: formatReportDisplay(
          this.currencyService.fromUsd(incomesUsd, displayCurrency, rates),

          displayCurrency
        ),

        pendingPayables: formatReportDisplay(
          this.currencyService.fromUsd(pendingPayablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        overduePayables: formatReportDisplay(
          this.currencyService.fromUsd(overduePayablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        pendingReceivables: formatReportDisplay(
          this.currencyService.fromUsd(pendingReceivablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        overdueReceivables: formatReportDisplay(
          this.currencyService.fromUsd(overdueReceivablesUsd, displayCurrency, rates),
          displayCurrency
        ),

        net: formatReportDisplay(
          this.currencyService.fromUsd(netUsd, displayCurrency, rates),

          displayCurrency
        ),

        openingBalance: formatReportDisplay(
          this.currencyService.fromUsd(openingBalanceUsd, displayCurrency, rates),
          displayCurrency
        ),

        closingBalance: formatReportDisplay(
          this.currencyService.fromUsd(closingBalanceUsd, displayCurrency, rates),
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
    const purchasesRow = await db
      .from('purchases')
      .where('status', 'CONFIRMED')
      .where('is_credit', true)
      .where('balance_usd', '>', 0)
      .select(db.raw('COALESCE(SUM(balance_usd), 0) as total'))
      .first()

    return Number(purchasesRow?.total ?? 0)
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

    const asOfDate = todayIsoDate()
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

  private resolvePeriod(filters: AccountStatementFilters) {
    if (filters.month) {
      const start = DateTime.fromISO(`${filters.month}-01`, { zone: APP_TIMEZONE })

      return {
        from: start.startOf('month').toISODate()!,
        to: start.endOf('month').toISODate()!,
      }
    }

    const now = nowInAppZone()

    return {
      from: filters.from ?? now.startOf('month').toISODate()!,
      to: filters.to ?? now.endOf('month').toISODate()!,
    }
  }
}
