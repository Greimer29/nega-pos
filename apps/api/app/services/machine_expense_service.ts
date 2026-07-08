import ArchivoComprobanteFaltanteException from '#exceptions/archivo_comprobante_faltante_exception'
import ArchivoComprobanteNoAdjuntoException from '#exceptions/archivo_comprobante_no_adjunto_exception'
import MachineExpenseNoEncontradoException from '#exceptions/gasto_maquina_no_encontrado_exception'
import MachineNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import SupplierNoEncontradoException from '#exceptions/proveedor_no_encontrado_exception'
import MachineExpense from '#models/machine_expense'
import Machine from '#models/machine'
import Supplier from '#models/supplier'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { assertRegistroMonedaUsd } from '#utils/monetary_registration'
import { sumMachineExpenseRowsUsd } from '#utils/machine_expense_totals'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type MachineExpenseInput = {
  date: string
  category: string
  description: string
  amount: number
  currency_code?: string
  supplier_id?: number
  notes?: string
  account_id?: number | null
}

export type ListGastosFilters = {
  page?: number
  perPage?: number
  machine_id?: number
  category?: string
  supplier_id?: number
  date_desde?: string
  date_hasta?: string
  account_id?: number
  unassigned?: boolean
}

export type ComprobanteDownload = {
  bytes: Buffer | Uint8Array
  contentType: string
  filename: string
}

export type ListGastosResult = {
  paginator: ModelPaginatorContract<MachineExpense>
  totalMonto: string
}

const COMPROBANTE_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export default class MachineExpenseService {
  private accountService = new AccountService()
  private currencyService = new CurrencyService()

  async listarPorMachine(
    machineId: number,
    filters: Omit<ListGastosFilters, 'machine_id'> = {}
  ): Promise<ListGastosResult> {
    await this.assertMachineExiste(machineId)
    return this.listar({ ...filters, machine_id: machineId })
  }

  async listar(filters: ListGastosFilters = {}): Promise<ListGastosResult> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = MachineExpense.query()
      .preload('supplier')
      .preload('machine')
      .preload('account')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')

    this.applyFilters(query, filters)

    const paginator = await query.paginate(page, perPage)

    const sumQuery = db.from('machine_expenses').select('amount', 'currency_code')
    this.applyFiltersToBuilder(sumQuery, filters)
    const sumRows = await sumQuery
    const rates = await this.currencyService.getActiveRates()
    const totalMonto = sumMachineExpenseRowsUsd(sumRows, rates, this.currencyService).toFixed(2)

    return { paginator, totalMonto }
  }

  async obtener(id: number): Promise<MachineExpense> {
    const expense = await MachineExpense.find(id)
    if (!expense) {
      throw new MachineExpenseNoEncontradoException()
    }
    return expense
  }

  async crear(machineId: number, input: MachineExpenseInput): Promise<MachineExpense> {
    await this.assertMachineExiste(machineId)
    await this.assertSupplierExiste(input.supplier_id)
    const currencyCode = (input.currency_code ?? 'USD').toUpperCase()
    assertRegistroMonedaUsd(currencyCode)
    await this.currencyService.assertActiva(currencyCode)
    const accountId = await this.resolveAccountId(input.account_id)

    return MachineExpense.create({
      machineId,
      accountId: accountId ?? null,
      ...this.prepareInput(input),
    })
  }

  async actualizar(id: number, input: MachineExpenseInput): Promise<MachineExpense> {
    const expense = await this.obtener(id)
    await this.assertSupplierExiste(input.supplier_id)
    const currencyCode = (input.currency_code ?? expense.currencyCode ?? 'USD').toUpperCase()
    assertRegistroMonedaUsd(currencyCode)
    await this.currencyService.assertActiva(currencyCode)
    const accountId = await this.resolveAccountId(input.account_id)

    expense.merge({
      ...this.prepareInput(input),
      ...(accountId !== undefined ? { accountId } : {}),
    })
    await expense.save()
    return expense
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const expense = await this.obtener(id)

    if (expense.receiptFile) {
      await drive
        .use()
        .delete(expense.receiptFile)
        .catch(() => undefined)
    }

    await expense.delete()
    return { id: Number(expense.id), eliminado: true }
  }

  async guardarComprobante(expenseId: number, file: MultipartFile): Promise<MachineExpense> {
    const expense = await this.obtener(expenseId)

    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = `machine-expenses/${expenseId}/${randomUUID()}.${extension}`

    if (expense.receiptFile) {
      await drive
        .use()
        .delete(expense.receiptFile)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    expense.receiptFile = key
    await expense.save()

    return expense
  }

  async obtenerComprobante(expenseId: number): Promise<ComprobanteDownload> {
    const expense = await this.obtener(expenseId)

    if (!expense.receiptFile) {
      throw new ArchivoComprobanteNoAdjuntoException()
    }

    const exists = await drive.use().exists(expense.receiptFile)
    if (!exists) {
      throw new ArchivoComprobanteFaltanteException()
    }

    const bytes = await drive.use().getBytes(expense.receiptFile)
    const extension = expense.receiptFile.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = COMPROBANTE_MIME[extension] ?? 'application/octet-stream'
    const filename = `comprobante-expense-${expense.id}.${extension}`

    return { bytes, contentType, filename }
  }

  private prepareInput(input: MachineExpenseInput) {
    const currencyCode = (input.currency_code ?? 'USD').toUpperCase()

    return {
      date: DateTime.fromISO(input.date),
      category: input.category,
      description: input.description.trim(),
      amount: input.amount.toFixed(2),
      currencyCode,
      supplierId: input.supplier_id ?? null,
      notes: input.notes?.trim() || null,
    }
  }

  private applyFilters(query: ReturnType<typeof MachineExpense.query>, filters: ListGastosFilters) {
    if (filters.machine_id) {
      query.where('machineId', filters.machine_id)
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.supplier_id) {
      query.where('supplierId', filters.supplier_id)
    }

    if (filters.date_desde) {
      query.where('date', '>=', filters.date_desde)
    }

    if (filters.date_hasta) {
      query.where('date', '<=', filters.date_hasta)
    }

    if (filters.unassigned) {
      query.whereNull('accountId')
    } else if (filters.account_id) {
      query.where('accountId', filters.account_id)
    }
  }

  private applyFiltersToBuilder(query: ReturnType<typeof db.from>, filters: ListGastosFilters) {
    if (filters.machine_id) {
      query.where('machine_id', filters.machine_id)
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.supplier_id) {
      query.where('supplier_id', filters.supplier_id)
    }

    if (filters.date_desde) {
      query.where('date', '>=', filters.date_desde)
    }

    if (filters.date_hasta) {
      query.where('date', '<=', filters.date_hasta)
    }

    if (filters.unassigned) {
      query.whereNull('account_id')
    } else if (filters.account_id) {
      query.where('account_id', filters.account_id)
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

  private async assertMachineExiste(machineId: number) {
    const machine = await Machine.find(machineId)
    if (!machine) {
      throw new MachineNoEncontradaException()
    }
  }

  private async assertSupplierExiste(supplierId?: number) {
    if (!supplierId) {
      return
    }

    const supplier = await Supplier.find(supplierId)
    if (!supplier) {
      throw new SupplierNoEncontradoException()
    }
  }
}
