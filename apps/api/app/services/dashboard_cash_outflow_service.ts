import CurrencyService from '#services/currency_service'
import type { DailyExpenseItem, DailyExpensesResult } from '#services/dashboard_service'
import { todayIsoDate } from '#utils/app_timezone'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import db from '@adonisjs/lucid/services/db'

/**
 * Cash leaving the business for the dashboard, by DATE column: operating expenses (old
 * supplier invoices saved as expenses excluded), legacy machine expenses, supplier
 * payments and cash purchases.
 */
export default class DashboardCashOutflowService {
  private currencyService = new CurrencyService()

  private sumMachineExpensesUsd(
    rows: Array<{ amount: string | number; currency_code?: string | null }>,
    rates: Record<string, number>
  ): number {
    return sumMachineExpenseRowsUsd(rows, rates, this.currencyService)
  }
  private resolveDashboardDate(dateInput?: string): string {
    return dateInput?.trim() || todayIsoDate()
  }

  /**
   * Gastos operativos del día/turno.
   * Excluye `expenses.supplier_id` (facturas antiguas a proveedor guardadas como gasto):
   * eso es pago/compra a proveedor, no gasto de caja del día de ventas.
   */
  async gastosDelDia(dateInput?: string): Promise<{ cantidad: number; montoUsd: number }> {
    const date = this.resolveDashboardDate(dateInput)
    const rates = await this.currencyService.getActiveRates()

    const expenseRows = await db
      .from('expenses')
      .where('date', date)
      .whereNull('supplier_id')
      .select('amount_usd')

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

  async gastosForDates(dates: string[]): Promise<{ cantidad: number; montoUsd: number }> {
    if (dates.length === 0) {
      return { cantidad: 0, montoUsd: 0 }
    }

    const rates = await this.currencyService.getActiveRates()
    const expenses = await db
      .from('expenses')
      .whereIn('date', dates)
      .whereNull('supplier_id')
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

  /** Abonos a CxP: salida de caja / balance sheet — no es gasto del P&L ni reduce ventas. */
  async pagosProveedoresForDates(dates: string[]): Promise<{ cantidad: number; montoUsd: number }> {
    if (dates.length === 0) {
      return { cantidad: 0, montoUsd: 0 }
    }

    const row = await db
      .from('supplier_payments')
      .whereIn('date', dates)
      .select(db.raw('COUNT(*) as qty'), db.raw('COALESCE(SUM(amount_usd), 0) as total_usd'))
      .first()

    return {
      cantidad: Number(row?.qty ?? 0),
      montoUsd: Number(row?.total_usd ?? 0),
    }
  }

  /** Compras de inventario al contado (no crédito): salida de caja, activo inventario. */
  async comprasContadoForDates(dates: string[]): Promise<{ cantidad: number; montoUsd: number }> {
    if (dates.length === 0) {
      return { cantidad: 0, montoUsd: 0 }
    }

    const row = await db
      .from('purchases')
      .where('status', 'CONFIRMED')
      .where('is_credit', false)
      .whereIn('date', dates)
      .select(db.raw('COUNT(*) as qty'), db.raw('COALESCE(SUM(total_usd), 0) as total_usd'))
      .first()

    return {
      cantidad: Number(row?.qty ?? 0),
      montoUsd: Number(row?.total_usd ?? 0),
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
      .whereNull('expenses.supplier_id')
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
      .whereNull('expenses.supplier_id')
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
}
