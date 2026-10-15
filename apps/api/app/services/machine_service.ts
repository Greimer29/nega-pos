import MachineNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import Expense from '#models/expense'
import MachineExpense from '#models/machine_expense'
import Machine from '#models/machine'
import MachinePayment from '#models/machine_payment'
import PurchaseItem from '#models/purchase_item'
import CurrencyService from '#services/currency_service'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type MachineInput = {
  name: string
  type: string
  brand?: string
  model?: string
  serialNumber?: string
  date_adquisicion?: string
  /** Monto de adquisición en moneda de ingreso (nativo). */
  costo_adquisicion?: number
  currency_code?: string
  entry_rate?: number
  status?: string
  location?: string
  notes?: string
  active?: boolean
}

export type ListMachinesFilters = {
  page?: number
  perPage?: number
  search?: string
  type?: string
  status?: string
  active?: boolean
}

export type EliminarMachineResult = {
  id: number
  modo: 'soft' | 'hard'
}

export type MachineDetalle = {
  machine: Machine
  totalSpent: string
  expenses: Expense[]
  legacyExpenses: MachineExpense[]
}

export default class MachineService {
  private currencyService = new CurrencyService()

  async listar(filters: ListMachinesFilters = {}): Promise<ModelPaginatorContract<Machine>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Machine.query().orderBy('name', 'asc')

    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${filters.search}%`)
          .orWhereILike('brand', `%${filters.search}%`)
          .orWhereILike('model', `%${filters.search}%`)
      })
    }

    if (filters.type) {
      query.whereILike('type', `%${filters.type}%`)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Machine> {
    const machine = await Machine.find(id)
    if (!machine) {
      throw new MachineNoEncontradaException()
    }
    return machine
  }

  async obtenerDetalle(id: number): Promise<MachineDetalle> {
    const machine = await this.obtener(id)
    const totalSpent = await MachineService.calcularTotalGastado(Number(machine.id))
    const expenses = await Expense.query()
      .where('machineId', Number(machine.id))
      .preload('account')
      .preload('currency')
      .preload('machine')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(20)

    const legacyExpenses = await MachineExpense.query()
      .where('machineId', Number(machine.id))
      .preload('supplier')
      .preload('account')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(20)

    return { machine, totalSpent, expenses, legacyExpenses }
  }

  async crear(input: MachineInput, trx?: TransactionClientContract): Promise<Machine> {
    const costNative = input.costo_adquisicion

    const monetary =
      costNative !== undefined && costNative > 0
        ? await resolveMonetaryEntryAmount({
            amountNative: costNative,
            currencyCode: input.currency_code,
            entryRate: input.entry_rate,
            currencyService: this.currencyService,
          })
        : null

    const costUsd = monetary?.amountUsd ?? null

    return Machine.create(
      {
        ...this.prepareInput(input),
        active: input.active ?? true,
        acquisitionCost: costUsd !== null ? Number(costUsd).toFixed(2) : null,
        acquisitionAmountNative: monetary?.amountNative ?? null,
        entryCurrencyCode: monetary?.currencyCode ?? null,
        entryRate: monetary?.entryRate ?? null,
        isCredit: false,
        amountPaidUsd: costUsd ?? '0.0000',
        balanceUsd: '0.0000',
        creditDueDate: null,
      },
      { client: trx }
    )
  }

  async actualizar(id: number, input: MachineInput): Promise<Machine> {
    const machine = await this.obtener(id)

    if (input.costo_adquisicion !== undefined) {
      const monetary = await resolveMonetaryEntryAmount({
        amountNative: Number(input.costo_adquisicion),
        currencyCode: input.currency_code,
        entryRate: input.entry_rate,
        currencyService: this.currencyService,
      })
      machine.merge(this.prepareInput(input))
      machine.acquisitionCost = Number(monetary.amountUsd).toFixed(2)
      machine.acquisitionAmountNative = monetary.amountNative
      machine.entryCurrencyCode = monetary.currencyCode
      machine.entryRate = monetary.entryRate
      machine.isCredit = false
      machine.amountPaidUsd = monetary.amountUsd
      machine.balanceUsd = '0.0000'
      machine.creditDueDate = null
      await machine.save()
      return machine
    }

    machine.merge(this.prepareInput(input))
    await machine.save()
    return machine
  }

  async eliminar(id: number): Promise<EliminarMachineResult> {
    const machine = await this.obtener(id)

    const tieneGastosUnificados = await Expense.query()
      .where('machineId', Number(machine.id))
      .first()
    const tieneGastosLegacy = await MachineExpense.query()
      .where('machineId', Number(machine.id))
      .first()
    const tienePagos = await MachinePayment.query().where('machineId', Number(machine.id)).first()
    const enPurchaseItems = await PurchaseItem.query()
      .where('machineId', Number(machine.id))
      .first()

    if (tieneGastosUnificados || tieneGastosLegacy || tienePagos || enPurchaseItems) {
      machine.active = false
      await machine.save()
      return { id: Number(machine.id), modo: 'soft' }
    }

    await machine.delete()
    return { id: Number(machine.id), modo: 'hard' }
  }

  static async calcularTotalGastado(machineId: number): Promise<string> {
    const currencyService = new CurrencyService()
    const rates = await currencyService.getActiveRates()

    const expenseRows = await Expense.query().where('machineId', machineId).select(['amountUsd'])
    let total = 0
    for (const row of expenseRows) {
      total += Number(row.amountUsd ?? 0)
    }

    const legacyRows = await db
      .from('machine_expenses')
      .where('machine_id', machineId)
      .select('amount', 'currency_code')

    total += sumMachineExpenseRowsUsd(legacyRows, rates, currencyService)
    return total.toFixed(2)
  }

  private prepareInput(input: MachineInput) {
    return {
      name: input.name.trim(),
      type: input.type,
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      acquisitionDate: input.date_adquisicion ? DateTime.fromISO(input.date_adquisicion) : null,
      status: input.status ?? 'OPERATIONAL',
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      ...(input.active !== undefined ? { active: input.active } : {}),
    }
  }
}
