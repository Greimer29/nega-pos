import ExpenseNoEncontradoException from '#exceptions/gasto_no_encontrado_exception'
import Expense from '#models/expense'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
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
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')

    if (filters.unassigned) {
      query.whereNull('accountId')
    } else if (filters.account_id) {
      query.where('accountId', filters.account_id)
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Expense> {
    const expense = await Expense.query()
      .where('id', id)
      .preload('account')
      .preload('currency')
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

    return Expense.create({
      date: DateTime.fromISO(input.date),
      description: input.description.trim(),
      amountUsd: resolved.amountUsd,
      currencyCode: resolved.currencyCode,
      entryRate: resolved.entryRate,
      accountId: accountId ?? null,
    })
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

    expense.merge({
      date: DateTime.fromISO(input.date),
      description: input.description.trim(),
      amountUsd: resolved.amountUsd,
      currencyCode: resolved.currencyCode,
      entryRate: resolved.entryRate,
      ...(accountId !== undefined ? { accountId } : {}),
    })
    await expense.save()

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
