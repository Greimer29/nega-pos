import ExpenseNoEncontradoException from '#exceptions/gasto_no_encontrado_exception'
import MachineNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import Expense from '#models/expense'
import Machine from '#models/machine'
import MachineExpense from '#models/machine_expense'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { ExpenseValidatorPayload } from '#validators/expense'
import { resolveExpenseAmount } from '#validators/expense'

export type ExpenseInput = ExpenseValidatorPayload

export type ListExpensesFilters = {
  page?: number
  perPage?: number
  account_id?: number
  unassigned?: boolean
  machine_id?: number
}

export type ExpenseSummary = {
  totalUsd: string
  count: number
  weeklySpentUsd: string
}

export default class ExpenseService {
  private accountService = new AccountService()
  private currencyService = new CurrencyService()

  async listar(filters: ListExpensesFilters = {}): Promise<ModelPaginatorContract<Expense>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Expense.query()
      .preload('account')
      .preload('currency')
      .preload('machine')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')

    if (filters.unassigned) {
      query.whereNull('accountId')
    } else if (filters.account_id) {
      query.where('accountId', filters.account_id)
    }

    if (filters.machine_id) {
      query.where('machineId', filters.machine_id)
    }

    return query.paginate(page, perPage)
  }

  async listarPorMachine(
    machineId: number,
    filters: Omit<ListExpensesFilters, 'machine_id'> = {}
  ): Promise<{
    paginator: ModelPaginatorContract<Expense>
    totalUsd: string
    legacyExpenses: MachineExpense[]
    legacyTotalUsd: string
  }> {
    await this.assertMachineExiste(machineId, { requireActive: false })
    const paginator = await this.listar({ ...filters, machine_id: machineId })

    let totalUsd = 0
    const sumRows = await Expense.query().where('machineId', machineId).select(['amountUsd'])
    for (const row of sumRows) {
      totalUsd += Number(row.amountUsd ?? 0)
    }

    const legacyQuery = MachineExpense.query()
      .where('machineId', machineId)
      .preload('supplier')
      .preload('account')
      .preload('machine')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')

    if (filters.unassigned) {
      legacyQuery.whereNull('accountId')
    } else if (filters.account_id) {
      legacyQuery.where('accountId', filters.account_id)
    }

    const legacyExpenses = await legacyQuery.limit(50)
    const rates = await this.currencyService.getActiveRates()
    const legacySumRows = await db
      .from('machine_expenses')
      .where('machine_id', machineId)
      .select('amount', 'currency_code')
    const legacyTotalUsd = sumMachineExpenseRowsUsd(
      legacySumRows,
      rates,
      this.currencyService
    ).toFixed(4)

    return {
      paginator,
      totalUsd: totalUsd.toFixed(4),
      legacyExpenses,
      legacyTotalUsd,
    }
  }

  async obtener(id: number): Promise<Expense> {
    const expense = await Expense.query()
      .where('id', id)
      .preload('account')
      .preload('currency')
      .preload('machine')
      .first()
    if (!expense) {
      throw new ExpenseNoEncontradoException()
    }
    return expense
  }

  async crear(input: ExpenseInput): Promise<Expense> {
    const amountNative = resolveExpenseAmount(input)
    const resolved = await resolveMonetaryEntryAmount({
      amountNative,
      currencyCode: input.currency_code,
      entryRate: input.entry_rate,
      currencyService: this.currencyService,
    })
    const accountId = await this.resolveAccountId(input.account_id)
    const machine = await this.resolveMachine(input.machine_id)
    const description = this.resolveDescription(input.description, machine)

    const expense = await Expense.create({
      date: DateTime.fromISO(input.date),
      description,
      amountUsd: resolved.amountUsd,
      currencyCode: resolved.currencyCode,
      entryRate: resolved.entryRate,
      accountId: accountId ?? null,
      machineId: machine ? Number(machine.id) : null,
    })

    await expense.load('account')
    await expense.load('currency')
    await expense.load('machine')
    return expense
  }

  /**
   * Alta desde ficha de máquina: siempre vincula machine_id y descripción por defecto.
   */
  async crearParaMachine(machineId: number, input: ExpenseInput): Promise<Expense> {
    return this.crear({ ...input, machine_id: machineId })
  }

  async actualizar(id: number, input: ExpenseInput): Promise<Expense> {
    const expense = await this.obtener(id)
    const amountNative = resolveExpenseAmount(input)
    const resolved = await resolveMonetaryEntryAmount({
      amountNative,
      currencyCode: input.currency_code ?? expense.currencyCode,
      entryRate: input.entry_rate,
      currencyService: this.currencyService,
    })
    const accountId = await this.resolveAccountId(input.account_id)
    const machine =
      input.machine_id !== undefined
        ? await this.resolveMachine(input.machine_id)
        : expense.machineId
          ? await Machine.find(expense.machineId)
          : null
    const description = this.resolveDescription(input.description, machine)

    expense.merge({
      date: DateTime.fromISO(input.date),
      description,
      amountUsd: resolved.amountUsd,
      currencyCode: resolved.currencyCode,
      entryRate: resolved.entryRate,
      ...(accountId !== undefined ? { accountId } : {}),
      ...(input.machine_id !== undefined ? { machineId: machine ? Number(machine.id) : null } : {}),
    })
    await expense.save()
    await expense.load('account')
    await expense.load('currency')
    await expense.load('machine')

    return expense
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const expense = await this.obtener(id)
    await expense.delete()
    return { id: Number(expense.id), eliminado: true }
  }

  async resumen(): Promise<ExpenseSummary> {
    const expenses = await Expense.query().select(['amountUsd'])

    let totalUsd = 0
    for (const expense of expenses) {
      totalUsd += Number(expense.amountUsd ?? 0)
    }

    const count = expenses.length

    const now = DateTime.now()
    const weekStart = now.startOf('week').toISODate()!
    const weekEnd = now.endOf('week').toISODate()!

    const weeklyExpenses = await Expense.query()
      .where('date', '>=', weekStart)
      .where('date', '<=', weekEnd)
      .select(['amountUsd'])

    let weeklyUsd = 0
    for (const expense of weeklyExpenses) {
      weeklyUsd += Number(expense.amountUsd ?? 0)
    }

    return {
      totalUsd: totalUsd.toFixed(4),
      count,
      weeklySpentUsd: weeklyUsd.toFixed(4),
    }
  }

  private resolveDescription(description: string, machine: Machine | null): string {
    const trimmed = description.trim()
    if (trimmed) return trimmed
    if (machine) return `Gasto máquina — ${machine.name}`
    return 'Gasto'
  }

  private async resolveMachine(machineId?: number | null): Promise<Machine | null> {
    if (machineId === undefined || machineId === null) {
      return null
    }
    return this.assertMachineExiste(machineId, { requireActive: true })
  }

  private async assertMachineExiste(
    machineId: number,
    opts: { requireActive?: boolean } = {}
  ): Promise<Machine> {
    const machine = await Machine.find(machineId)
    if (!machine) {
      throw new MachineNoEncontradaException()
    }
    if (opts.requireActive !== false && !machine.active) {
      throw new MachineNoEncontradaException()
    }
    return machine
  }

  private async resolveAccountId(accountId?: number | null) {
    if (accountId === undefined) {
      return undefined
    }
    if (accountId === null) {
      return null
    }
    await this.accountService.assertActiva(accountId)
    return accountId
  }
}
