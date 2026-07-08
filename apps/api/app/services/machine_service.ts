import MachineNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import MachineExpense from '#models/machine_expense'
import Machine from '#models/machine'
import CurrencyService from '#services/currency_service'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type MachineInput = {
  name: string
  type: string
  brand?: string
  model?: string
  serialNumber?: string
  date_adquisicion?: string
  costo_adquisicion?: number
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
  expenses: MachineExpense[]
}

export default class MachineService {
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
    const expenses = await MachineExpense.query()
      .where('machineId', Number(machine.id))
      .preload('supplier')
      .preload('account')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(20)

    return { machine, totalSpent, expenses }
  }

  async crear(input: MachineInput): Promise<Machine> {
    return Machine.create({
      ...this.prepareInput(input),
      active: input.active ?? true,
    })
  }

  async actualizar(id: number, input: MachineInput): Promise<Machine> {
    const machine = await this.obtener(id)
    machine.merge(this.prepareInput(input))
    await machine.save()
    return machine
  }

  async eliminar(id: number): Promise<EliminarMachineResult> {
    const machine = await this.obtener(id)

    const tieneGastos = await MachineExpense.query().where('machineId', Number(machine.id)).first()

    if (tieneGastos) {
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
    const rows = await db
      .from('machine_expenses')
      .where('machine_id', machineId)
      .select('amount', 'currency_code')

    const total = sumMachineExpenseRowsUsd(rows, rates, currencyService)
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
      acquisitionCost:
        input.costo_adquisicion !== undefined ? input.costo_adquisicion.toFixed(2) : null,
      status: input.status ?? 'OPERATIONAL',
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      ...(input.active !== undefined ? { active: input.active } : {}),
    }
  }
}
