import CuentaNoEncontradaException from '#exceptions/cuenta_no_encontrada_exception'
import NombreCuentaDuplicadoException from '#exceptions/nombre_cuenta_duplicado_exception'
import Account from '#models/account'
import Expense from '#models/expense'
import MachineExpense from '#models/machine_expense'
import Purchase from '#models/purchase'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type AccountInput = {
  name: string
  description?: string | null
  is_active?: boolean
}

export type ListAccountsFilters = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export type EliminarAccountResult = {
  id: number
  modo: 'soft' | 'hard'
}

export default class AccountService {
  async listar(filters: ListAccountsFilters = {}): Promise<ModelPaginatorContract<Account>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Account.query().orderBy('name', 'asc')

    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${filters.search}%`)
          .orWhereILike('description', `%${filters.search}%`)
      })
    }

    if (filters.active !== undefined) {
      query.where('isActive', filters.active)
    }

    return query.paginate(page, perPage)
  }

  async listarActivas(): Promise<Account[]> {
    return Account.query().where('isActive', true).orderBy('name', 'asc')
  }

  async obtener(id: number): Promise<Account> {
    const account = await Account.find(id)
    if (!account) {
      throw new CuentaNoEncontradaException()
    }
    return account
  }

  async assertExiste(id: number): Promise<Account> {
    return this.obtener(id)
  }

  async assertActiva(id: number): Promise<Account> {
    const account = await this.obtener(id)
    if (!account.isActive) {
      throw new CuentaNoEncontradaException()
    }
    return account
  }

  async crear(input: AccountInput): Promise<Account> {
    const data = this.prepareInput(input)
    await this.assertNombreUnico(data.name)

    return Account.create({
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    })
  }

  async actualizar(id: number, input: AccountInput): Promise<Account> {
    const account = await this.obtener(id)
    const data = this.prepareInput(input)
    await this.assertNombreUnico(data.name, id)

    account.merge({
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    })
    await account.save()

    return account
  }

  async eliminar(id: number): Promise<EliminarAccountResult> {
    const account = await this.obtener(id)

    const [purchase, expense, machineExpense] = await Promise.all([
      Purchase.query().where('accountId', Number(account.id)).first(),
      Expense.query().where('accountId', Number(account.id)).first(),
      MachineExpense.query().where('accountId', Number(account.id)).first(),
    ])

    if (purchase || expense || machineExpense) {
      account.isActive = false
      await account.save()
      return { id: Number(account.id), modo: 'soft' }
    }

    await account.delete()
    return { id: Number(account.id), modo: 'hard' }
  }

  private prepareInput(input: AccountInput) {
    return {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isActive: input.is_active ?? true,
    }
  }

  private async assertNombreUnico(name: string, excludeId?: number) {
    const query = Account.query().whereILike('name', name)
    if (excludeId) {
      query.whereNot('id', excludeId)
    }
    if (await query.first()) {
      throw new NombreCuentaDuplicadoException()
    }
  }
}
