import IncomeNoEncontradoException from '#exceptions/ingreso_no_encontrado_exception'
import Income from '#models/income'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { assertRegistroMonedaBase } from '#utils/monetary_registration'
import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { IncomeValidatorPayload } from '#validators/income'
import { resolveIncomeAmount } from '#validators/income'

export type IncomeInput = IncomeValidatorPayload

export type ListIncomesFilters = {
  page?: number
  perPage?: number
  account_id?: number
  unassigned?: boolean
}

export type IncomeSummary = {
  totalUsd: string
  count: number
  weeklyReceivedUsd: string
}

export default class IncomeService {
  private accountService = new AccountService()
  private currencyService = new CurrencyService()

  async listar(filters: ListIncomesFilters = {}): Promise<ModelPaginatorContract<Income>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Income.query()
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

  async obtener(id: number): Promise<Income> {
    const income = await Income.query()
      .where('id', id)
      .preload('account')
      .preload('currency')
      .first()
    if (!income) {
      throw new IncomeNoEncontradoException()
    }
    return income
  }

  async crear(input: IncomeInput): Promise<Income> {
    const amount = resolveIncomeAmount(input)
    const baseCode = await this.currencyService.getBaseCurrencyCode()
    const currencyCode = (input.currency_code ?? baseCode).toUpperCase()
    assertRegistroMonedaBase(currencyCode, baseCode)
    await this.currencyService.assertActiva(currencyCode)
    const accountId = await this.resolveAccountId(input.account_id)

    return Income.create({
      date: DateTime.fromISO(input.date),
      description: input.description.trim(),
      amountUsd: amount.toFixed(4),
      currencyCode,
      accountId: accountId ?? null,
    })
  }

  async actualizar(id: number, input: IncomeInput): Promise<Income> {
    const income = await this.obtener(id)
    const amount = resolveIncomeAmount(input)
    const baseCode = await this.currencyService.getBaseCurrencyCode()
    const currencyCode = (input.currency_code ?? income.currencyCode ?? baseCode).toUpperCase()
    assertRegistroMonedaBase(currencyCode, baseCode)
    await this.currencyService.assertActiva(currencyCode)
    const accountId = await this.resolveAccountId(input.account_id)

    income.merge({
      date: DateTime.fromISO(input.date),
      description: input.description.trim(),
      amountUsd: amount.toFixed(4),
      currencyCode,
      ...(accountId !== undefined ? { accountId } : {}),
    })
    await income.save()

    return income
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const income = await this.obtener(id)
    await income.delete()
    return { id: Number(income.id), eliminado: true }
  }

  async resumen(): Promise<IncomeSummary> {
    const [rates, baseCode] = await Promise.all([
      this.currencyService.getActiveRates(),
      this.currencyService.getBaseCurrencyCode(),
    ])
    const incomes = await Income.query().select(['amountUsd', 'currencyCode'])

    let totalUsd = 0
    for (const income of incomes) {
      totalUsd += this.currencyService.toUsd(
        Number(income.amountUsd ?? 0),
        income.currencyCode ?? baseCode,
        rates
      )
    }

    const count = incomes.length

    const now = DateTime.now()
    const weekStart = now.startOf('week').toISODate()!
    const weekEnd = now.endOf('week').toISODate()!

    const weeklyIncomes = await Income.query()
      .where('date', '>=', weekStart)
      .where('date', '<=', weekEnd)
      .select(['amountUsd', 'currencyCode'])

    let weeklyUsd = 0
    for (const income of weeklyIncomes) {
      weeklyUsd += this.currencyService.toUsd(
        Number(income.amountUsd ?? 0),
        income.currencyCode ?? baseCode,
        rates
      )
    }

    return {
      totalUsd: totalUsd.toFixed(4),
      count,
      weeklyReceivedUsd: weeklyUsd.toFixed(4),
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
